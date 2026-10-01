import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

const moduleRoot = path.resolve(process.cwd(), 'src/modules/nuvemshop')
const entrypoints = ['index.ts', 'server/index.ts'] as const
const publicEntry = '@/modules/nuvemshop'
const serverEntry = '@/modules/nuvemshop/server'

function readEntrypoint(entrypoint: (typeof entrypoints)[number]) {
  return readFileSync(path.join(moduleRoot, entrypoint), 'utf8')
}

// NUV-01 only establishes the dependency boundary. Public contracts belong to
// the later tasks that define them; no type or runtime export is needed yet.
function assertBoundary(source: string, entrypoint: (typeof entrypoints)[number]) {
  const parsed = ts.createSourceFile(entrypoint, source, ts.ScriptTarget.Latest, true)
  const imports: string[] = []

  for (const statement of parsed.statements) {
    expect(ts.isImportDeclaration(statement), 'only boundary imports are allowed').toBe(true)
    if (!ts.isImportDeclaration(statement)) continue

    expect(statement.importClause, 'no imported API or re-export is needed yet').toBeUndefined()
    expect(ts.isStringLiteral(statement.moduleSpecifier)).toBe(true)
    if (ts.isStringLiteral(statement.moduleSpecifier)) {
      imports.push(statement.moduleSpecifier.text)
    }
  }

  expect(imports, 'every entrypoint must explicitly protect itself').toContain('server-only')
  const allowed = entrypoint === 'index.ts' ? ['server-only', './server'] : ['server-only']
  expect(imports.sort(), 'only root → server dependencies are allowed').toEqual(allowed.sort())
}

afterEach(() => {
  vi.doMock('server-only', () => ({}))
  vi.doUnmock('@/modules/nuvemshop/server')
  vi.resetModules()
})

describe('Nuvemshop server-only boundary', () => {
  it('contains only the two entrypoints, without HTTP, resources, UI or public types', () => {
    expect(
      readdirSync(moduleRoot, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.relative(moduleRoot, path.join(entry.parentPath, entry.name)))
        .sort(),
    ).toEqual([...entrypoints].sort())
  })

  it.each(entrypoints)(
    '%s explicitly marks the boundary and restricts dependencies',
    (entrypoint) => {
      assertBoundary(readEntrypoint(entrypoint), entrypoint)
    },
  )

  it('exposes no runtime API and imports without provider configuration', async () => {
    vi.stubEnv('NUVEMSHOP_STORE_ID', undefined)
    vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', undefined)
    vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', undefined)
    vi.resetModules()

    expect(Object.keys(await import(publicEntry))).toEqual([])
    expect(Object.keys(await import(serverEntry))).toEqual([])
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

  it.each(entrypoints)('detects removal of the server-only marker from %s', (entrypoint) => {
    const mutant = readEntrypoint(entrypoint).replace(/import ['"]server-only['"];?/, '')
    expect(() => assertBoundary(mutant, entrypoint)).toThrow()
  })

  it.each([
    ['HTTP export', "export { request } from './server/request'"],
    ['cache dependency', "import 'next/cache'"],
    ['UI dependency', "import 'react'"],
    ['client state', "import 'zustand'"],
    ['client directive', "'use client'"],
    ['checkout export', 'export function checkout() {}'],
    ['Customer export', 'export type Customer = { id: string }'],
    ['orders dependency', "import '@/modules/orders'"],
    ['public PII type', 'export type Contact = { email: string; address: string; phone: string }'],
    ['secret access', 'const token = process.env.NUVEMSHOP_ACCESS_TOKEN'],
  ])('detects an unauthorized %s introduced into the boundary', (_description, statement) => {
    const mutant = `${readEntrypoint('index.ts')}\n${statement}\n`
    expect(() => assertBoundary(mutant, 'index.ts')).toThrow()
  })
})
