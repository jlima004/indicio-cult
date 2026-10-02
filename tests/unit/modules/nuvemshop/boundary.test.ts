import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

const moduleRoot = path.resolve(process.cwd(), 'src/modules/nuvemshop')
const entrypoints = ['index.ts', 'server/index.ts'] as const
const publicEntry = '@/modules/nuvemshop'
const serverEntry = '@/modules/nuvemshop/server'
type Sources = Map<string, string>

function readSources(): Sources {
  return new Map(
    readdirSync(moduleRoot, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name))
      .map((entry) => {
        const filename = path.join(entry.parentPath, entry.name)
        return [path.relative(moduleRoot, filename), readFileSync(filename, 'utf8')]
      }),
  )
}

function dependencies(parsed: ts.SourceFile) {
  const result: { name: string; runtime: boolean; explicitMarker: boolean }[] = []
  function visit(node: ts.Node) {
    let specifier: ts.Node | undefined
    let runtime = false
    let explicitMarker = false
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      specifier = node.moduleSpecifier
      runtime = ts.isImportDeclaration(node) ? !node.importClause?.isTypeOnly : !node.isTypeOnly
      // Only an explicit side-effect import proves the entrypoint marker.
      explicitMarker = ts.isImportDeclaration(node) && !node.importClause
      const bindings = ts.isImportDeclaration(node)
        ? node.importClause?.namedBindings
        : node.exportClause
      if (
        bindings &&
        (ts.isNamedImports(bindings) || ts.isNamedExports(bindings)) &&
        bindings.elements.length > 0 &&
        bindings.elements.every((element) => element.isTypeOnly)
      ) {
        runtime = false
      }
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      specifier = node.argument.literal
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      specifier = node.arguments[0]
    }
    if (specifier && ts.isStringLiteral(specifier)) {
      result.push({ name: specifier.text, runtime, explicitMarker })
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  return result
}

function internalTarget(name: string, filename: string, sources: Sources) {
  const target = name.startsWith('.')
    ? path.posix.normalize(path.posix.join(path.posix.dirname(filename), name))
    : name === publicEntry || name.startsWith(`${publicEntry}/`)
      ? name.slice(publicEntry.length).replace(/^\//, '') || '.'
      : undefined
  if (target === undefined) return undefined
  return ['', '.ts', '.tsx', '.js', '.mjs', '.cjs', '/index.ts', '/index.tsx']
    .map((suffix) => path.posix.normalize(`${target}${suffix}`))
    .find((candidate) => sources.has(candidate))
}

function isCommonJsExport(node: ts.Node) {
  if (
    !ts.isBinaryExpression(node) ||
    node.operatorToken.kind < ts.SyntaxKind.FirstAssignment ||
    node.operatorToken.kind > ts.SyntaxKind.LastAssignment
  ) {
    return false
  }
  function unwrapParentheses(target: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(target)) target = target.expression
    return target
  }
  function getStaticPropertyName(target: ts.PropertyAccessExpression | ts.ElementAccessExpression) {
    if (ts.isPropertyAccessExpression(target)) return target.name.text
    const key = unwrapParentheses(target.argumentExpression)
    return ts.isStringLiteralLike(key) ? key.text : undefined
  }
  function propertyOwner(target: ts.Expression, name?: string): ts.Expression | undefined {
    target = unwrapParentheses(target)
    if (
      (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) &&
      (!name || getStaticPropertyName(target) === name)
    ) {
      return unwrapParentheses(target.expression)
    }
  }
  function isModuleExports(target: ts.Expression) {
    const owner = propertyOwner(target, 'exports')
    return owner !== undefined && ts.isIdentifier(owner) && owner.text === 'module'
  }
  // Inspect assignment targets, never matching export-like text in literals/comments.
  const owner = propertyOwner(node.left)
  return (
    isModuleExports(node.left) ||
    (owner !== undefined &&
      ((ts.isIdentifier(owner) && owner.text === 'exports') || isModuleExports(owner)))
  )
}

// The two-file tree and zero exports were NUV-01's initial state. Later owners
// may add server contracts; the dependency/client boundary remains permanent.
function assertBoundary(sources: Sources) {
  const parsed = new Map(
    [...sources].map(([filename, source]) => [
      filename,
      ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true),
    ]),
  )
  const imports = new Map([...parsed].map(([filename, source]) => [filename, dependencies(source)]))
  const hasMarker = (filename: string) =>
    imports
      .get(filename)
      ?.some((dependency) => dependency.name === 'server-only' && dependency.explicitMarker)

  for (const entrypoint of entrypoints) {
    expect(sources.has(entrypoint), `required entrypoint ${entrypoint}`).toBe(true)
    expect(hasMarker(entrypoint), `${entrypoint} must explicitly protect itself`).toBe(true)
  }
  expect(
    imports
      .get('index.ts')
      ?.some(
        ({ name, runtime }) =>
          runtime && internalTarget(name, 'index.ts', sources) === 'server/index.ts',
      ),
    'root must depend on server at runtime',
  ).toBe(true)

  function isGuarded(filename: string, visited = new Set<string>()): boolean {
    if (hasMarker(filename)) return true
    if (visited.has(filename)) return false
    visited.add(filename)
    return (
      imports.get(filename)?.some(({ name, runtime }) => {
        const target = internalTarget(name, filename, sources)
        return runtime && target !== undefined && isGuarded(target, new Set(visited))
      }) ?? false
    )
  }

  for (const [filename, source] of parsed) {
    for (const { name } of imports.get(filename) ?? []) {
      expect(
        /^(?:next\/cache|react(?:-dom)?(?:\/|$)|zustand(?:\/|$)|client-only$)/.test(name),
        `${filename}: forbidden client/cache dependency ${name}`,
      ).toBe(false)
      const resolved = name.startsWith('.')
        ? path.resolve(moduleRoot, path.dirname(filename), name)
        : name
      expect(
        /(?:^|\/)modules\/(?:orders|cart|catalog)(?:\/|$)/.test(resolved),
        `${filename}: consumer dependency ${name}`,
      ).toBe(false)
      if (filename.startsWith('server/')) {
        expect(internalTarget(name, filename, sources), 'server must not depend on root').not.toBe(
          'index.ts',
        )
      }
    }
    let exportsContract = false
    function visit(node: ts.Node) {
      if (
        ts.isExportDeclaration(node) ||
        ts.isExportAssignment(node) ||
        isCommonJsExport(node) ||
        (ts.canHaveModifiers(node) &&
          ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
      ) {
        exportsContract = true
      }
      expect(
        ts.isExpressionStatement(node) &&
          ts.isStringLiteral(node.expression) &&
          ['use client', 'use cache', 'use server'].includes(node.expression.text),
        `${filename}: client, cache or callable client action directive`,
      ).toBe(false)
      expect(
        ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node),
        `${filename}: UI surface`,
      ).toBe(false)
      if (ts.isIdentifier(node)) {
        expect(
          /^(?:checkout|createCart|createCheckoutSession|createDraftOrder|checkoutUrl|Customer|getCustomer|listCustomers|window|document|localStorage|sessionStorage)$/.test(
            node.text,
          ),
          `${filename}: forbidden checkout/Customer/client surface ${node.text}`,
        ).toBe(false)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    if (exportsContract || /\bprocess\.env\b/.test(sources.get(filename) ?? '')) {
      expect(
        isGuarded(filename),
        `${filename}: contracts and secrets must remain server-only`,
      ).toBe(true)
    }
  }
}

afterEach(() => {
  vi.doMock('server-only', () => ({}))
  vi.doUnmock('@/modules/nuvemshop/server')
  vi.resetModules()
})

describe('Nuvemshop server-only boundary', () => {
  it('preserves required entrypoints, explicit markers and dependency direction as owners add files', () => {
    assertBoundary(readSources())
  })

  it('imports the entrypoints without provider configuration', async () => {
    vi.stubEnv('NUVEMSHOP_STORE_ID', undefined)
    vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', undefined)
    vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', undefined)
    vi.resetModules()

    await expect(import(publicEntry)).resolves.toBeDefined()
    await expect(import(serverEntry)).resolves.toBeDefined()
  })

  it('rejects a client import through the public entrypoint using the real marker', async () => {
    // Isolate the root marker: a guarded descendant must not hide its removal.
    vi.doMock('@/modules/nuvemshop/server', () => ({}))
    vi.doUnmock('server-only')
    vi.resetModules()

    await expect(import(publicEntry)).rejects.toThrow(/cannot be imported from a Client Component/)
  })

  it('rejects a direct client import of the server entrypoint using the real marker', async () => {
    vi.doUnmock('server-only')
    vi.resetModules()

    await expect(import(serverEntry)).rejects.toThrow(/cannot be imported from a Client Component/)
  })

  // Synthetic owner contracts only, never added to production source.
  it('allows an additional internal owner file without freezing the module tree', () => {
    const sources = readSources()
    sources.set('server/__fixture-owner-contract.ts', 'const internal = true; void internal')
    assertBoundary(sources)
  })

  it('allows guarded server exports and normalized types, including server-only PII', () => {
    const sources = readSources()
    sources.set(
      'server/__fixture-owner-contract.ts',
      "import 'server-only'\nexport function ownerContract() { return true }",
    )
    sources.set(
      'server/index.ts',
      `${sources.get('server/index.ts')}\nexport { ownerContract } from './__fixture-owner-contract'`,
    )
    sources.set(
      'types.ts',
      "import 'server-only'\nexport type OwnerContact = { contactEmail: string }",
    )
    sources.set(
      'index.ts',
      `${sources.get('index.ts')}\nexport { ownerContract } from './server'\nexport type { OwnerContact } from './types'`,
    )
    assertBoundary(sources)
  })

  it.each(entrypoints)('detects removal of required entrypoint %s', (entrypoint) => {
    const sources = readSources()
    sources.delete(entrypoint)
    expect(() => assertBoundary(sources)).toThrow()
  })

  it.each(entrypoints)('detects removal of the server-only marker from %s', (entrypoint) => {
    const sources = readSources()
    sources.set(entrypoint, sources.get(entrypoint)!.replace(/import ['"]server-only['"];?/, ''))
    expect(() => assertBoundary(sources)).toThrow()
  })

  it('detects removal of the root → server dependency', () => {
    const sources = readSources()
    sources.set('index.ts', "import 'server-only'")
    expect(() => assertBoundary(sources)).toThrow()
  })

  it.each([
    "import '../index'",
    "export * from '@/modules/nuvemshop'",
    "import type { Owner } from '..'",
  ])('rejects server → root dependency: %s', (statement) => {
    const sources = readSources()
    sources.set('server/index.ts', `${sources.get('server/index.ts')}\n${statement}`)
    expect(() => assertBoundary(sources)).toThrow()
  })

  it.each([
    ['cache dependency', "import 'next/cache'"],
    ['UI dependency', "import 'react'"],
    ['client state', "import 'zustand'"],
    ['client directive', "'use client'"],
    ['checkout export', 'export function checkout() {}'],
    ['Customer export', 'export type Customer = { id: string }'],
    ['orders dependency', "import '@/modules/orders'"],
    ['cache re-export', "export { cacheTag } from 'next/cache'"],
    ['dynamic client dependency', "const state = import('zustand')"],
    ['CommonJS client dependency', "const ui = require('react')"],
  ])('detects an unauthorized %s in entrypoints and internal files', (_description, statement) => {
    for (const filename of ['index.ts', 'server/index.ts', 'server/__fixture-owner-contract.ts']) {
      const sources = readSources()
      sources.set(filename, `${statement}\n${sources.get(filename) ?? "import 'server-only'"}`)
      expect(() => assertBoundary(sources)).toThrow()
    }
  })

  it('rejects an internal JSX UI surface', () => {
    const sources = readSources()
    sources.set('server/__fixture-ui.tsx', "import 'server-only'\nexport const UI = () => <div />")
    expect(() => assertBoundary(sources)).toThrow()
  })

  it.each([
    'module.exports = { ownerContract: () => true }',
    'module.exports.ownerContract = () => true',
    'exports.ownerContract = () => true',
    "module['exports'] = { ownerContract: () => true }",
    "module['exports']['ownerContract'] = () => true",
    "exports['ownerContract'] = () => true",
    "module[('exports')] = {\n  ownerContract: () => true,\n}",
    "module[((('exports')))] = {\n  ownerContract: () => true,\n}",
    "module[('exports')].ownerContract = () => true",
    "module[('exports')][('ownerContract')] = () => true",
    "module['exports'][('ownerContract')] = () => true",
    "exports[('ownerContract')] = () => true",
    'module[`exports`] = { ownerContract: () => true }',
    'exports[`ownerContract`] = () => true',
    'module[(((`exports`)))][((`ownerContract`))] = () => true',
    "module[('exports')].ownerContract ??= () => true",
    "const ownerKey = 'ownerContract'; module[('exports')][ownerKey] = () => true",
    "const ownerKey = 'ownerContract'; module.exports[ownerKey] = () => true",
    "const ownerKey = 'ownerContract'; exports[ownerKey] = () => true",
    '(module.exports) = { ownerContract: () => true }',
    '(module.exports).ownerContract = () => true',
    '(exports).ownerContract = () => true',
    '(module).exports.ownerContract = () => true',
    'exports.ownerContract ||= () => true',
    'module.exports.ownerContract ??= () => true',
  ])('rejects an unguarded CommonJS facade: %s', (statement) => {
    for (const extension of ['cjs', 'js']) {
      const sources = readSources()
      sources.set(`owner.${extension}`, statement)
      expect(() => assertBoundary(sources)).toThrow(/contracts and secrets must remain server-only/)
    }
  })

  it.each([
    '// module.exports = { ownerContract: () => true }',
    '/* exports.ownerContract = () => true */',
    'const text = "module.exports = {}"; void text',
    "const text = 'exports.ownerContract = () => true'; void text",
    'const text = `module.exports.ownerContract = () => true`; void text',
    "// module[('exports')] = {}",
    'const text = "module[(\'exports\')] = {}"; void text',
    "const text = `module[('exports')] = {}`; void text",
    "const key = 'unrelated'; module[(key)] = {}",
    "const getKey = () => 'unrelated'; module[(getKey())] = {}",
    "const suffix = 'other'; module[(`exp${suffix}`)] = {}",
    'const owner = {}; owner.exports = {}; owner.exports.ownerContract = () => true',
    'const owner = {}; owner.module = {}; owner.module.exports = () => true',
  ])('allows CommonJS-like text and unrelated properties: %s', (source) => {
    const sources = readSources()
    sources.set('owner.cjs', source)
    assertBoundary(sources)
  })

  it.each([
    'export const ownerContract = () => true',
    'export class OwnerContract {}',
    'const ownerContract = () => true; export { ownerContract }',
    'export default () => true',
    "export * from 'node:fs'",
    "export { readFile as ownerContract } from 'node:fs'",
  ])('continues rejecting an unguarded ESM facade: %s', (source) => {
    const sources = readSources()
    sources.set('owner.js', source)
    expect(() => assertBoundary(sources)).toThrow(/contracts and secrets must remain server-only/)
  })

  it.each([
    ['browser-safe facade', 'export function ownerContract() { return true }'],
    ['client PII type', 'export type Contact = { email: string; address: string; phone: string }'],
    ['client secret access', 'export const token = process.env.NUVEMSHOP_ACCESS_TOKEN'],
    ['type-only facade', "export type { OwnerContact } from './types'"],
    [
      'type-only marker',
      "import type {} from 'server-only'\nexport type Contact = { email: string }",
    ],
  ])('rejects an unguarded %s bypassing the entrypoints', (_description, source) => {
    const sources = readSources()
    sources.set(
      'types.ts',
      "import 'server-only'\nexport type OwnerContact = { contactEmail: string }",
    )
    sources.set('client.ts', source)
    expect(() => assertBoundary(sources)).toThrow()
  })
})
