import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

const projectRoot = process.cwd()
const moduleRoot = path.resolve(projectRoot, 'src/modules/nuvemshop')
const entrypoints = ['index.ts', 'server/index.ts'] as const
const publicEntry = '@/modules/nuvemshop'
const serverEntry = '@/modules/nuvemshop/server'
type Sources = Map<string, string>
type ReferenceOrigin = 'triple-slash-path' | 'triple-slash-types-local'

function explicitLocalTypeReference(name: string) {
  return ts.isExternalModuleNameRelative(name)
}

function readSources(root = moduleRoot): Sources {
  return new Map(
    readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name))
      .map((entry) => {
        const filename = path.join(entry.parentPath, entry.name)
        return [path.relative(root, filename), readFileSync(filename, 'utf8')]
      }),
  )
}

// Normalize only the authorized source wrappers around a direct call callee.
// Also used for the direct module receiver. Capability escapes are rejected
// independently at their originating reference, without following aliases.
function unwrapTransparentCallee(expression: ts.Expression): ts.Expression {
  while (
    ts.isParenthesizedExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    expression = expression.expression
  }
  return expression
}

// The checker owns scope resolution. Declaration syntax only proves a local
// emitting binding; ambient/type-only declarations and missing symbols never do.
function isProvenLocalRuntimeBinding(identifier: ts.Identifier, checker?: ts.TypeChecker) {
  const parent = identifier.parent
  const symbol = ts.isShorthandPropertyAssignment(parent)
    ? checker?.getShorthandAssignmentValueSymbol(parent)
    : ts.isExportSpecifier(parent)
      ? checker?.getExportSpecifierLocalTargetSymbol(parent)
      : checker?.getSymbolAtLocation(identifier)
  const declarations = symbol?.getDeclarations()
  return (
    declarations !== undefined &&
    declarations.length > 0 &&
    declarations.every((declaration) => {
      if (
        declaration.getSourceFile() !== identifier.getSourceFile() ||
        declaration.getSourceFile().isDeclarationFile
      )
        return false
      for (let ancestor: ts.Node | undefined = declaration; ancestor; ancestor = ancestor.parent) {
        if (
          ts.canHaveModifiers(ancestor) &&
          ts
            .getModifiers(ancestor)
            ?.some((modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword)
        )
          return false
      }
      if (ts.isImportSpecifier(declaration))
        return !declaration.isTypeOnly && !declaration.parent.parent.isTypeOnly
      if (ts.isNamespaceImport(declaration)) return !declaration.parent.isTypeOnly
      if (ts.isImportClause(declaration) || ts.isImportEqualsDeclaration(declaration))
        return !declaration.isTypeOnly
      return (
        ts.isVariableDeclaration(declaration) ||
        ts.isBindingElement(declaration) ||
        ts.isParameter(declaration) ||
        (ts.isFunctionDeclaration(declaration) &&
          declarations.some((part) => ts.isFunctionDeclaration(part) && part.body !== undefined)) ||
        ts.isFunctionExpression(declaration) ||
        ts.isClassDeclaration(declaration) ||
        ts.isClassExpression(declaration) ||
        ts.isEnumDeclaration(declaration)
      )
    })
  )
}

function isRuntimeCapabilityIdentifier(identifier: ts.Identifier) {
  const parent = identifier.parent
  if (ts.isShorthandPropertyAssignment(parent)) return true
  if (ts.isExportSpecifier(parent)) {
    const exported = parent.parent.parent
    return (
      !parent.isTypeOnly &&
      !(ts.isExportDeclaration(exported) && (exported.isTypeOnly || exported.moduleSpecifier)) &&
      identifier === (parent.propertyName ?? parent.name)
    )
  }
  if (
    (ts.isPropertyAccessExpression(parent) && parent.name === identifier) ||
    (ts.isBindingElement(parent) && parent.propertyName === identifier) ||
    ('name' in parent && parent.name === identifier) ||
    (ts.isLabeledStatement(parent) && parent.label === identifier) ||
    ts.isBreakStatement(parent) ||
    ts.isContinueStatement(parent) ||
    ((ts.isJsxOpeningElement(parent) ||
      ts.isJsxClosingElement(parent) ||
      ts.isJsxSelfClosingElement(parent)) &&
      parent.tagName === identifier)
  )
    return false
  for (let ancestor: ts.Node | undefined = parent; ancestor; ancestor = ancestor.parent) {
    if (
      ts.isTypeNode(ancestor) ||
      ts.isImportClause(ancestor) ||
      ts.isImportSpecifier(ancestor) ||
      ts.isNamespaceImport(ancestor) ||
      (ts.canHaveModifiers(ancestor) &&
        ts
          .getModifiers(ancestor)
          ?.some((modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword))
    )
      return false
  }
  return !identifier.getSourceFile().isDeclarationFile
}

function outerTransparentExpression(expression: ts.Expression) {
  while (
    expression.parent &&
    (ts.isParenthesizedExpression(expression.parent) ||
      ts.isNonNullExpression(expression.parent) ||
      ts.isAsExpression(expression.parent) ||
      ts.isTypeAssertionExpression(expression.parent) ||
      ts.isSatisfiesExpression(expression.parent)) &&
    expression.parent.expression === expression
  )
    expression = expression.parent
  return expression
}

function requireConsumption(identifier: ts.Identifier) {
  const receiver = outerTransparentExpression(identifier)
  if (ts.isCallExpression(receiver.parent) && receiver.parent.expression === receiver)
    return 'SUPPORTED_DIRECT_REQUIRE'
  const property = receiver.parent
  if (
    (ts.isPropertyAccessExpression(property) || ts.isElementAccessExpression(property)) &&
    property.expression === receiver
  ) {
    const callee = outerTransparentExpression(property)
    if (ts.isCallExpression(callee.parent) && callee.parent.expression === callee)
      return ts.isPropertyAccessExpression(property) && property.name.text === 'call'
        ? 'SUPPORTED_REQUIRE_CALL'
        : 'ALREADY_FAIL_CLOSED_DIRECT_REQUIRE_PROPERTY'
  }
  return 'UNSUPPORTED_CAPABILITY_REFERENCE'
}

function moduleConsumption(identifier: ts.Identifier) {
  if (!isRuntimeCapabilityIdentifier(identifier)) return 'NON_RUNTIME_REFERENCE'
  const receiver = outerTransparentExpression(identifier)
  const property = receiver.parent
  if (
    (ts.isPropertyAccessExpression(property) || ts.isElementAccessExpression(property)) &&
    property.expression === receiver
  ) {
    // Preserve exactly the existing static exports classifier, including its
    // parentheses/bracket/template policy. No new facade semantics are added.
    if (isModuleExports(property)) return 'EXISTING_MODULE_EXPORTS_POLICY'
    const invoked = ts.isCallExpression(property.parent) && property.parent.expression === property
    if (ts.isPropertyAccessExpression(property) && property.name.text === 'require')
      return invoked ? 'SUPPORTED_MODULE_REQUIRE' : 'UNSUPPORTED_MODULE_REQUIRE_CAPABILITY_ESCAPE'
    if (invoked) return 'UNSUPPORTED_MODULE_REQUIRE_INVOCATION'
  }
  return ts.isCallExpression(receiver.parent) && receiver.parent.expression === receiver
    ? 'UNSUPPORTED_MODULE_REQUIRE_INVOCATION'
    : 'UNSUPPORTED_MODULE_OBJECT_ESCAPE'
}

// Reject the whole ambient root at its originating reference. Only an immediate
// static property receiver is authorized; never follow a receiving alias or
// evaluate a computed key. CommonJS properties retain their separate policy.
function globalRootConsumption(identifier: ts.Identifier) {
  const receiver = outerTransparentExpression(identifier)
  const property = receiver.parent
  if (
    (ts.isPropertyAccessExpression(property) || ts.isElementAccessExpression(property)) &&
    property.expression === receiver
  )
    return getStaticPropertyName(property) === undefined
      ? 'COMPUTED_GLOBAL_PROPERTY'
      : 'STATIC_GLOBAL_PROPERTY'
  return 'WHOLE_ROOT_ESCAPE'
}

// A finite syntactic chain rooted at the two authorized global identifiers.
// Literal property parsing and transparent wrappers reuse the existing helpers;
// no global-object alias, computed-key or arbitrary-property analysis is attempted.
function globalCommonJsCapability(expression: ts.Expression, checker?: ts.TypeChecker) {
  const capability = unwrapTransparentCallee(expression)
  if (!ts.isPropertyAccessExpression(capability) && !ts.isElementAccessExpression(capability))
    return undefined
  const property = getStaticPropertyName(capability)
  if (property !== 'require' && property !== 'module') return undefined
  let receiver = unwrapTransparentCallee(capability.expression)
  let kind: 'require' | 'module' | 'module.require' = property
  if (
    property === 'require' &&
    (ts.isPropertyAccessExpression(receiver) || ts.isElementAccessExpression(receiver)) &&
    getStaticPropertyName(receiver) === 'module'
  ) {
    kind = 'module.require'
    receiver = unwrapTransparentCallee(receiver.expression)
  }
  if (
    !ts.isIdentifier(receiver) ||
    (receiver.text !== 'globalThis' && receiver.text !== 'global') ||
    !isRuntimeCapabilityIdentifier(receiver) ||
    isProvenLocalRuntimeBinding(receiver, checker)
  )
    return undefined
  return { root: receiver, kind }
}

function globalCapabilityConsumption(
  expression: ts.PropertyAccessExpression | ts.ElementAccessExpression,
  kind: 'require' | 'module' | 'module.require',
  checker?: ts.TypeChecker,
) {
  const receiver = outerTransparentExpression(expression)
  const parent = receiver.parent
  if (kind !== 'module')
    return ts.isCallExpression(parent) && parent.expression === receiver
      ? 'SUPPORTED_GLOBAL_LOADER'
      : 'UNSUPPORTED_GLOBAL_CAPABILITY_REFERENCE'
  if (
    (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) &&
    parent.expression === receiver &&
    globalCommonJsCapability(parent, checker)?.kind === 'module.require'
  )
    return 'GLOBAL_MODULE_LOADER_RECEIVER'
  return 'UNSUPPORTED_GLOBAL_CAPABILITY_REFERENCE'
}

function dependencies(parsed: ts.SourceFile, checker?: ts.TypeChecker) {
  const result: {
    name: string
    runtime: boolean
    explicitMarker: boolean
    node: ts.Node
    origin?: ReferenceOrigin
    resolutionMode?: ts.ResolutionMode
    unproven?: boolean
    unsupportedCapability?: boolean
    moduleCapability?: 'module.require' | 'module'
    globalCapability?: string
    globalRootCapability?: 'WHOLE_ROOT_ESCAPE' | 'COMPUTED_GLOBAL_PROPERTY'
  }[] = []
  for (const reference of parsed.referencedFiles) {
    result.push({
      name: reference.fileName,
      runtime: false,
      explicitMarker: false,
      origin: 'triple-slash-path',
      node: parsed,
    })
  }
  for (const reference of parsed.typeReferenceDirectives) {
    if (!explicitLocalTypeReference(reference.fileName)) continue
    result.push({
      name: reference.fileName,
      runtime: false,
      explicitMarker: false,
      origin: 'triple-slash-types-local',
      resolutionMode: ts.getModeForFileReference(reference, parsed.impliedNodeFormat),
      node: parsed,
    })
  }
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
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      specifier = node.moduleReference.expression
      runtime = !node.isTypeOnly
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      specifier = node.argument.literal
    } else if (ts.isCallExpression(node)) {
      const callee = unwrapTransparentCallee(node.expression)
      let moduleArgument: number | undefined
      const globalCapability = globalCommonJsCapability(callee, checker)
      if (globalCapability && globalCapability.kind !== 'module') {
        moduleArgument = 0
      } else if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(callee) &&
          callee.text === 'require' &&
          !isProvenLocalRuntimeBinding(callee, checker))
      ) {
        moduleArgument = 0
      } else if (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) {
        const receiver = unwrapTransparentCallee(callee.expression)
        if (
          ts.isIdentifier(receiver) &&
          receiver.text === 'require' &&
          !isProvenLocalRuntimeBinding(receiver, checker)
        ) {
          if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'call') {
            // The first argument is thisArg; reuse the direct-loader parser on
            // the second argument, without evaluating thisArg or extra args.
            moduleArgument = 1
          } else {
            // Other direct properties and element invocations have no supported
            // semantics here. Reuse the existing fail-closed dependency sentinel.
            result.push({ name: '', runtime: true, explicitMarker, node, unproven: true })
          }
        } else if (
          ts.isIdentifier(receiver) &&
          receiver.text === 'module' &&
          !isProvenLocalRuntimeBinding(receiver, checker) &&
          moduleConsumption(receiver) === 'SUPPORTED_MODULE_REQUIRE'
        ) {
          // The same static parser and canonical resolver serve both loaders.
          moduleArgument = 0
        }
      }
      if (moduleArgument !== undefined) {
        specifier = node.arguments[moduleArgument]
        runtime = true
        if (!specifier || !ts.isStringLiteralLike(unwrapParentheses(specifier as ts.Expression))) {
          result.push({ name: '', runtime, explicitMarker, node, unproven: true })
        } else {
          specifier = unwrapParentheses(specifier as ts.Expression)
        }
      }
    }
    if (specifier && ts.isStringLiteralLike(specifier)) {
      result.push({ name: specifier.text, runtime, explicitMarker, node })
    }
    if (
      ts.isIdentifier(node) &&
      node.text === 'require' &&
      isRuntimeCapabilityIdentifier(node) &&
      !isProvenLocalRuntimeBinding(node, checker) &&
      requireConsumption(node) === 'UNSUPPORTED_CAPABILITY_REFERENCE'
    ) {
      result.push({
        name: '',
        runtime: true,
        explicitMarker: false,
        node,
        unproven: true,
        unsupportedCapability: true,
      })
    }
    if (
      ts.isIdentifier(node) &&
      node.text === 'module' &&
      !isProvenLocalRuntimeBinding(node, checker)
    ) {
      const consumption = moduleConsumption(node)
      if (
        consumption === 'UNSUPPORTED_MODULE_REQUIRE_INVOCATION' ||
        consumption === 'UNSUPPORTED_MODULE_REQUIRE_CAPABILITY_ESCAPE' ||
        consumption === 'UNSUPPORTED_MODULE_OBJECT_ESCAPE'
      )
        result.push({
          name: '',
          runtime: true,
          explicitMarker: false,
          node,
          unproven: true,
          moduleCapability:
            consumption === 'UNSUPPORTED_MODULE_REQUIRE_CAPABILITY_ESCAPE'
              ? 'module.require'
              : 'module',
        })
    }
    if (
      ts.isIdentifier(node) &&
      (node.text === 'globalThis' || node.text === 'global') &&
      isRuntimeCapabilityIdentifier(node) &&
      !isProvenLocalRuntimeBinding(node, checker)
    ) {
      const consumption = globalRootConsumption(node)
      if (consumption !== 'STATIC_GLOBAL_PROPERTY')
        result.push({
          name: '',
          runtime: true,
          explicitMarker: false,
          node,
          unproven: true,
          globalRootCapability: consumption,
        })
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const capability = globalCommonJsCapability(node, checker)
      if (
        capability &&
        globalCapabilityConsumption(node, capability.kind, checker) ===
          'UNSUPPORTED_GLOBAL_CAPABILITY_REFERENCE'
      )
        result.push({
          name: '',
          runtime: true,
          explicitMarker: false,
          node,
          unproven: true,
          globalCapability: `${capability.root.text}.${capability.kind}`,
        })
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  return result
}

// Use the installed compiler and repository options for both candidate resolution
// and type analysis. Sources is authoritative inside the module, even for deletes.
const configPath = path.join(projectRoot, 'tsconfig.json')
const config = ts.readConfigFile(configPath, ts.sys.readFile)
const compilerOptions = ts.parseJsonConfigFileContent(config.config, ts.sys, projectRoot).options

function sourceEnvironment(sources: Sources, clients: Sources) {
  const files = new Map([
    ...[...clients].map(([name, source]) => [path.resolve(projectRoot, name), source] as const),
    ...[...sources].map(([name, source]) => [path.resolve(moduleRoot, name), source] as const),
  ])
  const inModule = (filename: string) => filename.startsWith(`${moduleRoot}${path.sep}`)
  const host = ts.createCompilerHost(compilerOptions)
  host.fileExists = (filename) =>
    files.has(filename) || (!inModule(filename) && ts.sys.fileExists(filename))
  host.readFile = (filename) =>
    files.get(filename) ?? (inModule(filename) ? undefined : ts.sys.readFile(filename))
  host.directoryExists = (directory) => {
    directory = path.resolve(directory)
    return (
      [...files.keys()].some((filename) => filename.startsWith(`${directory}${path.sep}`)) ||
      (directory !== moduleRoot && !inModule(directory) && ts.sys.directoryExists(directory))
    )
  }
  host.getSourceFile = (filename, languageVersion) => {
    const source = host.readFile(filename)
    return source === undefined
      ? undefined
      : ts.createSourceFile(filename, source, languageVersion, true)
  }
  const resolve = (name: string, filename: string) =>
    ts.resolveModuleName(name, filename, compilerOptions, host).resolvedModule?.resolvedFileName
  // Public triple-slash normalization is distinct from module resolution.
  // Exact project code paths only: no extension probing, package/type lookup,
  // or assets. The authoritative overlay and compiler must recognize the target.
  const resolveReferencePath = (name: string, filename: string) => {
    const target = host.getCanonicalFileName(ts.resolveTripleslashReference(name, filename))
    return projectSource(target) &&
      /\.[cm]?[jt]sx?$/.test(target) &&
      host.fileExists(target) &&
      program().getSourceFile(target)
      ? target
      : undefined
  }
  // Explicit local type directives use their own public compiler resolver.
  // Keep packages/lib outside this grammar and reuse canonical project identity.
  const resolveReferenceTypesLocal = (
    name: string,
    filename: string,
    resolutionMode?: ts.ResolutionMode,
  ) => {
    if (!explicitLocalTypeReference(name)) return undefined
    const resolved = ts.resolveTypeReferenceDirective(
      name,
      filename,
      compilerOptions,
      host,
      undefined,
      undefined,
      resolutionMode,
    ).resolvedTypeReferenceDirective
    if (!resolved?.resolvedFileName || resolved.isExternalLibraryImport) return undefined
    const target = host.getCanonicalFileName(resolved.resolvedFileName)
    return projectSource(target) &&
      /\.[cm]?[jt]sx?$/.test(target) &&
      host.fileExists(target) &&
      program().getSourceFile(target)
      ? target
      : undefined
  }
  const resolveDependency = (
    name: string,
    filename: string,
    origin?: ReferenceOrigin,
    resolutionMode?: ts.ResolutionMode,
  ) =>
    origin === 'triple-slash-path'
      ? resolveReferencePath(name, filename)
      : origin === 'triple-slash-types-local'
        ? resolveReferenceTypesLocal(name, filename, resolutionMode)
        : resolve(name, filename)
  const internalTarget = (
    name: string,
    filename: string,
    origin?: ReferenceOrigin,
    resolutionMode?: ts.ResolutionMode,
  ) => {
    const resolved = resolveDependency(
      name,
      path.resolve(moduleRoot, filename),
      origin,
      resolutionMode,
    )
    return resolved && inModule(resolved) ? path.relative(moduleRoot, resolved) : undefined
  }
  // Reuse one checker-owned AST environment for graph binding classification.
  // Standard libraries are unnecessary for proving local binding declarations.
  // Missing ambient symbols stay unproven; no semantic privacy or custom resolver.
  let bindingProgram: ts.Program | undefined
  const program = () =>
    (bindingProgram ??= ts.createProgram(
      [...files.keys()],
      { ...compilerOptions, types: [], noLib: true },
      host,
    ))
  return {
    files,
    host,
    inModule,
    resolve,
    resolveReferencePath,
    resolveReferenceTypesLocal,
    resolveDependency,
    internalTarget,
    program,
  }
}

function projectSource(filename: string) {
  return (
    filename.startsWith(`${projectRoot}${path.sep}`) &&
    !path.relative(projectRoot, filename).split(path.sep).includes('node_modules')
  )
}

// CSS is a terminal asset, separate from canonical TypeScript code resolution.
// No extension probing, package lookup or content inspection. Multiple existing
// configured targets are rejected rather than inventing a precedence policy.
function resolveCssAsset(
  name: string,
  importer: string,
  host: ts.CompilerHost,
  options = compilerOptions,
) {
  if (!name.endsWith('.css')) return { target: undefined, ambiguous: false }
  const candidates: string[] = []
  if (name.startsWith('./') || name.startsWith('../')) {
    candidates.push(path.resolve(path.dirname(importer), name))
  } else {
    for (const [pattern, targets] of Object.entries(options.paths ?? {})) {
      const parts = pattern.split('*')
      if (parts.length > 2) continue
      const [prefix = '', suffix = ''] = parts
      if (
        parts.length === 1 ? name !== pattern : !name.startsWith(prefix) || !name.endsWith(suffix)
      )
        continue
      const capture = name.slice(prefix.length, name.length - suffix.length)
      if (parts.length === 2 && name.length < prefix.length + suffix.length) continue
      for (const target of targets) {
        if (target.split('*').length > 2) continue
        candidates.push(path.resolve(options.baseUrl ?? projectRoot, target.replace('*', capture)))
      }
    }
  }
  const existing = [...new Set(candidates)].filter(
    (target) => projectSource(target) && target.endsWith('.css') && host.fileExists(target),
  )
  return { target: existing.length === 1 ? existing[0] : undefined, ambiguous: existing.length > 1 }
}

// Adapter ownership is independent of exported fields and type erasure.
// Follow conventional static runtime AND type edges through all project source
// wrappers, including disk-backed sources absent from a synthetic overlay.
// Recognized computed import()/direct require()/require.call()/module.require() and bounded
// globalThis/global require/module.require loaders reuse canonical code resolution. Unsupported
// direct require property/element invocations fail closed in checked closures.
// Unsupported ambient/unproven require/module loader references fail at acquisition;
// module.exports retains the existing bounded CommonJS export policy.
// Whole ambient globalThis/global values and non-static root properties fail closed;
// ordinary direct static properties and proven local roots are exempt.
// No alias/data-flow, general global/property/reflection completeness, package-internal
// traversal or TypeScript shape proof is attempted.
function assertClientIsolation(environment: ReturnType<typeof sourceEnvironment>) {
  const { files, host, inModule, resolveDependency } = environment
  const localSpecifier = (name: string) =>
    name.startsWith('.') ||
    path.isAbsolute(name) ||
    Object.keys(compilerOptions.paths ?? {}).some((pattern) => {
      const star = pattern.indexOf('*')
      return star < 0
        ? name === pattern
        : name.startsWith(pattern.slice(0, star)) && name.endsWith(pattern.slice(star + 1))
    })
  const inventory = {
    clientRoots: [] as string[],
    codeEdges: [] as {
      importer: string
      name: string
      target: string
      origin?: ReferenceOrigin
      runtime?: false
      explicitMarker?: false
    }[],
    terminalCssEdges: [] as { importer: string; name: string; target: string }[],
  }
  const parsed = new Map<string, ts.SourceFile>()
  function sourceFile(filename: string) {
    if (!parsed.has(filename)) {
      const source = host.readFile(filename)
      if (source !== undefined)
        parsed.set(filename, ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true))
    }
    return parsed.get(filename)
  }
  const visited = new Set<string>()
  function visit(filename: string) {
    if (visited.has(filename)) return
    visited.add(filename)
    const program = environment.program()
    const source = program.getSourceFile(filename)
    const checker = program.getTypeChecker()
    expect(source, `${filename}: unreadable project dependency`).toBeDefined()
    for (const {
      name,
      origin,
      resolutionMode,
      unproven,
      unsupportedCapability,
      moduleCapability,
      globalCapability,
      globalRootCapability,
    } of dependencies(source!, checker)) {
      expect(
        unproven,
        `${filename}: ${globalRootCapability === 'WHOLE_ROOT_ESCAPE' ? 'unsupported whole-global capability escape' : globalRootCapability === 'COMPUTED_GLOBAL_PROPERTY' ? 'unproven global property' : globalCapability ? `unsupported ${globalCapability} capability reference` : moduleCapability ? `unsupported ${moduleCapability} capability reference` : unsupportedCapability ? 'unsupported require capability reference' : 'unproven computed client dependency'}`,
      ).not.toBe(true)
      const target = resolveDependency(name, filename, origin, resolutionMode)
      if (origin === 'triple-slash-path') {
        expect(
          target,
          `${filename}: unresolved or unsupported project-local triple-slash path ${name}`,
        ).toBeDefined()
      }
      if (origin === 'triple-slash-types-local') {
        expect(
          target,
          `${filename}: UNRESOLVED PROJECT-LOCAL TRIPLE-SLASH TYPES ${name}`,
        ).toBeDefined()
      }
      if (!origin && !target && name.endsWith('.css')) {
        const asset = resolveCssAsset(name, filename, host)
        expect(asset.ambiguous, `${filename}: ambiguous CSS asset ${name}`).toBe(false)
        expect(
          asset.target,
          `${filename}: unresolved project-local dependency ${name}`,
        ).toBeDefined()
        inventory.terminalCssEdges.push({ importer: filename, name, target: asset.target! })
        continue
      }
      if (target)
        inventory.codeEdges.push({
          importer: filename,
          name,
          target,
          ...(origin ? { origin, runtime: false as const, explicitMarker: false as const } : {}),
        })
      if (localSpecifier(name))
        expect(target, `${filename}: unresolved project-local dependency ${name}`).toBeDefined()
      expect(
        target !== undefined && inModule(target),
        `${filename}: client runtime/type dependency reaches adapter ${name}`,
      ).toBe(false)
      if (target && projectSource(target)) visit(target)
    }
  }
  for (const filename of files.keys()) {
    if (inModule(filename) || !projectSource(filename) || !/\.[cm]?[jt]sx?$/.test(filename))
      continue
    for (const statement of sourceFile(filename)?.statements ?? []) {
      if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break
      if (statement.expression.text === 'use client') {
        inventory.clientRoots.push(filename)
        visit(filename)
        break
      }
    }
  }
  return inventory
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

// Static ambient process.env access requires the file guard, irrespective of
// the env key. Reuse bounded syntax and binding checks; never inspect env values.
function hasAmbientProcessEnvAccess(source: ts.SourceFile, checker: ts.TypeChecker) {
  let found = false
  function visit(node: ts.Node) {
    if (found) return
    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
      getStaticPropertyName(node) === 'env'
    ) {
      const owner = unwrapTransparentCallee(node.expression)
      if (
        ts.isIdentifier(owner) &&
        owner.text === 'process' &&
        isRuntimeCapabilityIdentifier(owner) &&
        !isProvenLocalRuntimeBinding(owner, checker)
      ) {
        found = true
        return
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
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

function isExportObject(target: ts.Expression): boolean {
  target = unwrapParentheses(target)
  return (ts.isIdentifier(target) && target.text === 'exports') || isModuleExports(target)
}

function isCommonJsExport(node: ts.Node) {
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
  ) {
    const owner = propertyOwner(node.left)
    return isModuleExports(node.left) || (owner !== undefined && isExportObject(owner))
  }
  if (ts.isCallExpression(node)) {
    const callee = unwrapParentheses(node.expression)
    if (!ts.isPropertyAccessExpression(callee) && !ts.isElementAccessExpression(callee))
      return false
    const owner = unwrapParentheses(callee.expression)
    const method = getStaticPropertyName(callee)
    const target = node.arguments[0]
    // Conventional Object/Reflect names are assumed unshadowed and unaliased.
    // No general data-flow/reflection guarantee or source-text matching.
    return (
      ts.isIdentifier(owner) &&
      ((owner.text === 'Object' &&
        ['assign', 'defineProperty', 'defineProperties'].includes(method ?? '')) ||
        (owner.text === 'Reflect' && method === 'defineProperty')) &&
      target !== undefined &&
      (isExportObject(target) ||
        (propertyOwner(target) !== undefined && isExportObject(propertyOwner(target)!)))
    )
  }
  return false
}

// The two-file tree and zero exports were NUV-01's initial state. Later owners
// may add server contracts; the dependency/client boundary remains permanent.
function assertBoundary(sources: Sources, clients: Sources = new Map()) {
  const environment = sourceEnvironment(sources, clients)
  const { internalTarget } = environment
  const program = environment.program()
  const checker = program.getTypeChecker()
  const parsed = new Map(
    [...sources.keys()].map((filename) => {
      const source = program.getSourceFile(path.resolve(moduleRoot, filename))
      expect(source, `${filename}: unreadable adapter source`).toBeDefined()
      return [filename, source!] as const
    }),
  )
  const imports = new Map(
    [...parsed].map(([filename, source]) => [filename, dependencies(source, checker)]),
  )
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
        ({ name, runtime, origin, resolutionMode }) =>
          runtime && internalTarget(name, 'index.ts', origin, resolutionMode) === 'server/index.ts',
      ),
    'root must depend on server at runtime',
  ).toBe(true)

  function isGuarded(filename: string, visited = new Set<string>()): boolean {
    if (hasMarker(filename)) return true
    if (visited.has(filename)) return false
    visited.add(filename)
    return (
      imports.get(filename)?.some(({ name, runtime, origin, resolutionMode }) => {
        const target = internalTarget(name, filename, origin, resolutionMode)
        return runtime && target !== undefined && isGuarded(target, new Set(visited))
      }) ?? false
    )
  }

  for (const [filename, source] of parsed) {
    for (const { name, origin, resolutionMode } of imports.get(filename) ?? []) {
      expect(
        /^(?:next\/cache|react(?:-dom)?(?:\/|$)|zustand(?:\/|$)|client-only$)/.test(name),
        `${filename}: forbidden client/cache dependency ${name}`,
      ).toBe(false)
      const referenceTarget = origin
        ? environment.resolveDependency(
            name,
            path.resolve(moduleRoot, filename),
            origin,
            resolutionMode,
          )
        : undefined
      if (origin === 'triple-slash-types-local') {
        expect(
          referenceTarget,
          `${filename}: UNRESOLVED PROJECT-LOCAL TRIPLE-SLASH TYPES ${name}`,
        ).toBeDefined()
      }
      const resolved = origin
        ? (referenceTarget ?? name)
        : name.startsWith('.')
          ? path.resolve(moduleRoot, path.dirname(filename), name)
          : name
      expect(
        /(?:^|\/)modules\/(?:orders|cart|catalog)(?:\/|$)/.test(resolved),
        `${filename}: consumer dependency ${name}`,
      ).toBe(false)
      if (filename.startsWith('server/')) {
        expect(
          internalTarget(name, filename, origin, resolutionMode),
          'server must not depend on root',
        ).not.toBe('index.ts')
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
    if (exportsContract || hasAmbientProcessEnvAccess(source, checker)) {
      expect(
        isGuarded(filename),
        `${filename}: contracts and secrets must remain server-only`,
      ).toBe(true)
    }
  }
  assertClientIsolation(environment)
}

afterEach(() => {
  vi.doMock('server-only', () => ({}))
  vi.doUnmock('@/modules/nuvemshop/server')
  vi.resetModules()
})

describe('Nuvemshop server-only boundary', () => {
  describe('triple-slash local types dependency matrix', () => {
    const clientName = 'src/__b-types-client.ts'
    const wrapperName = 'src/__b-types-wrapper.d.ts'
    const rejection = /client runtime\/type dependency reaches adapter/
    const unresolved = /UNRESOLVED PROJECT-LOCAL TRIPLE-SLASH TYPES/
    const globalWrapper = `import type { BContract } from '@/modules/nuvemshop/__b-types-contract';
declare global { type BGlobal = BContract; } export {};`
    function fixture(
      reference = './__b-types-wrapper.d.ts',
      wrapper = 'export {};',
      additions: Sources = new Map(),
      client = `'use client'; export {};`,
    ) {
      const sources = readSources()
      sources.set(
        '__b-types-contract.ts',
        "import 'server-only'; export type BContract = { id: string };",
      )
      const clients = new Map([
        [clientName, `/// <reference types="${reference}" />\n${client}`],
        [wrapperName, wrapper],
        ...additions,
      ])
      return compile(sources, clients)
    }
    function compile(
      sources: Sources,
      clients: Sources,
      roots = [path.join(projectRoot, clientName)],
    ) {
      const environment = sourceEnvironment(sources, clients)
      const program = ts.createProgram(
        roots,
        { ...compilerOptions, incremental: false, skipLibCheck: false, types: [] },
        environment.host,
      )
      return { sources, clients, environment, program }
    }
    function assertRealChecks(result: ReturnType<typeof fixture>, message?: RegExp) {
      if (message) {
        expect(() => assertClientIsolation(result.environment)).toThrow(message)
        expect(() => assertBoundary(result.sources, result.clients)).toThrow(message)
      } else {
        expect(() => assertClientIsolation(result.environment)).not.toThrow()
        expect(() => assertBoundary(result.sources, result.clients)).not.toThrow()
      }
    }
    function clean(result: ReturnType<typeof fixture>) {
      expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
    }

    it('TSTYPES-01 rejects the diagnostics-clean original global-contract finding', () => {
      const result = fixture(
        './__b-types-wrapper.d.ts',
        globalWrapper,
        new Map(),
        "'use client'; export const observed: BGlobal = { id: 'synthetic' };",
      )
      clean(result)
      const source = result.program.getSourceFile(path.join(projectRoot, clientName))!
      expect(source.referencedFiles).toEqual([])
      expect(source.typeReferenceDirectives.map((reference) => reference.fileName)).toEqual([
        './__b-types-wrapper.d.ts',
      ])
      expect(result.program.getSourceFile(path.join(projectRoot, wrapperName))).toBeDefined()
      expect(
        result.program.getSourceFile(path.join(moduleRoot, '__b-types-contract.ts')),
      ).toBeDefined()
      assertRealChecks(result, rejection)
      expect(dependencies(source, result.program.getTypeChecker())).toMatchObject([
        {
          name: './__b-types-wrapper.d.ts',
          origin: 'triple-slash-types-local',
          runtime: false,
          explicitMarker: false,
        },
      ])
    })

    it('TSTYPES-02 traverses two diagnostics-clean declaration wrappers', () => {
      const result = fixture(
        './__b-types-wrapper.d.ts',
        '/// <reference types="./__b-types-second.d.ts" />\nexport {};',
        new Map([
          [
            'src/__b-types-second.d.ts',
            "export type { BContract } from '@/modules/nuvemshop/__b-types-contract';",
          ],
        ]),
      )
      clean(result)
      expect(
        result.program.getSourceFile(path.join(projectRoot, 'src/__b-types-second.d.ts')),
      ).toBeDefined()
      assertRealChecks(result, rejection)
    })

    it('TSTYPES-03 permits a diagnostics-clean harmless wrapper with a type-only edge', () => {
      const result = fixture()
      clean(result)
      assertRealChecks(result)
      expect(assertClientIsolation(result.environment).codeEdges).toEqual([
        {
          importer: path.join(projectRoot, clientName),
          name: './__b-types-wrapper.d.ts',
          target: path.join(projectRoot, wrapperName),
          origin: 'triple-slash-types-local',
          runtime: false,
          explicitMarker: false,
        },
      ])
    })

    it('TSTYPES-04 fails closed for missing local types with expected compiler diagnostics', () => {
      const result = fixture('./__b-types-missing.d.ts')
      expect(ts.getPreEmitDiagnostics(result.program).map((diagnostic) => diagnostic.code)).toEqual(
        [2688],
      )
      assertRealChecks(result, unresolved)
    })

    it('TSTYPES-05 rejects diagnostics-clean declare-global namespace ownership', () => {
      const result = fixture(
        './__b-types-wrapper.d.ts',
        `import type { BContract } from '@/modules/nuvemshop/__b-types-contract';
declare global { namespace BNamespace { type Contract = BContract; } } export {};`,
        new Map(),
        "'use client'; export const observed: BNamespace.Contract = { id: 'synthetic' };",
      )
      clean(result)
      assertRealChecks(result, rejection)
    })

    it.each([
      '.\\__b-types-wrapper.d.ts',
      './nested/../__b-types-wrapper.d.ts',
      '../src/__b-types-wrapper.d.ts',
      path.join(projectRoot, wrapperName),
    ])('TSTYPES-06 canonicalizes effective local filename %s', (reference) => {
      const result = fixture(reference)
      clean(result)
      const target = result.environment.resolveDependency(
        reference,
        path.join(projectRoot, clientName),
        'triple-slash-types-local',
      )
      expect(target).toBe(path.join(projectRoot, wrapperName))
      expect(result.program.getSourceFile(target!)?.fileName).toBe(target)
      expect(
        assertClientIsolation(result.environment).codeEdges.map((edge) => edge.target),
      ).toEqual([target])
      assertRealChecks(result)
    })

    it.each([
      ['TSTYPES-07', 'types', 'node'],
      ['TSTYPES-08', 'lib', 'es2020.string'],
    ])('%s preserves the separate %s package/library channel', (_id, channel, name) => {
      const result = fixture()
      result.clients.set(
        clientName,
        `/// <reference ${channel}="${name}" />\n'use client'; export {};`,
      )
      const current = compile(result.sources, result.clients)
      clean(current)
      const source = current.program.getSourceFile(path.join(projectRoot, clientName))!
      expect(
        channel === 'types' ? source.typeReferenceDirectives : source.libReferenceDirectives,
      ).toHaveLength(1)
      expect(dependencies(source, current.program.getTypeChecker())).toEqual([])
      expect(assertClientIsolation(current.environment).codeEdges).toEqual([])
      assertRealChecks(current)
    })

    it.each([
      [
        'TSTYPES-09-ROOT',
        'index.ts',
        '/// <reference types="./server/__b-types-guard.d.ts" />\nimport "server-only"; export {};',
        /root must depend on server at runtime/,
      ],
      [
        'TSTYPES-09-MARKER',
        'index.ts',
        '/// <reference types="./__b-types-marker.d.ts" />\nexport * from "./server";',
        /index.ts must explicitly protect itself/,
      ],
      [
        'TSTYPES-15',
        '__b-types-unguarded.d.ts',
        '/// <reference types="./server/__b-types-guard.d.ts" />\nexport type UnguardedContract = { id: string };',
        /contracts and secrets must remain server-only/,
      ],
    ])(
      '%s cannot fabricate runtime or explicit-marker protection',
      (_id, filename, source, message) => {
        const sources = readSources()
        sources.set('server/__b-types-guard.d.ts', "import 'server-only'; export {};")
        sources.set('__b-types-marker.d.ts', "import 'server-only'; export {};")
        sources.set(filename as string, source as string)
        const result = compile(sources, new Map(), [
          ...sourceEnvironment(sources, new Map()).files.keys(),
        ])
        clean(result)
        const parsed = result.program.getSourceFile(path.join(moduleRoot, filename as string))!
        const edge = dependencies(parsed, result.program.getTypeChecker()).find(
          (dependency) => dependency.origin === 'triple-slash-types-local',
        )!
        expect(edge).toMatchObject({ runtime: false, explicitMarker: false })
        expect(
          result.environment.internalTarget(
            edge.name,
            filename as string,
            edge.origin,
            edge.resolutionMode,
          ),
        ).toBe(
          _id === 'TSTYPES-09-MARKER' ? '__b-types-marker.d.ts' : 'server/__b-types-guard.d.ts',
        )
        expect(() => assertBoundary(sources)).toThrow(message as RegExp)
      },
    )

    it.each([
      ['TSTYPES-10', false],
      ['TSTYPES-11', true],
    ] as const)(
      '%s terminates diagnostics-clean declaration cycles (adapter branch: %s)',
      (_id, adapter) => {
        const result = fixture(
          './__b-types-wrapper.d.ts',
          '/// <reference types="./__b-types-second.d.ts" />\nexport {};',
          new Map([
            [
              'src/__b-types-second.d.ts',
              `/// <reference types="./__b-types-wrapper.d.ts" />\n${adapter ? "export type { BContract } from '@/modules/nuvemshop/__b-types-contract';" : 'export {};'} `,
            ],
          ]),
        )
        clean(result)
        assertRealChecks(result, adapter ? rejection : undefined)
        if (!adapter) expect(assertClientIsolation(result.environment).codeEdges).toHaveLength(3)
      },
    )

    it.each([
      ['path', 'types'],
      ['types', 'path'],
    ])('TSTYPES-12 traverses diagnostics-clean combined %s then %s channels', (first, second) => {
      const result = fixture(
        './__b-types-wrapper.d.ts',
        `/// <reference ${second}="./__b-types-second.d.ts" />\nexport {};`,
        new Map([['src/__b-types-second.d.ts', globalWrapper]]),
      )
      result.clients.set(
        clientName,
        `/// <reference ${first}="./__b-types-wrapper.d.ts" />\n'use client'; export const observed: BGlobal = { id: 'synthetic' };`,
      )
      const current = compile(result.sources, result.clients)
      clean(current)
      assertRealChecks(current, rejection)
    })

    it('TSTYPES-13 rejects diagnostics-clean direct adapter declaration reference', () => {
      const result = fixture('./modules/nuvemshop/__b-types-direct.d.ts')
      result.sources.set(
        '__b-types-direct.d.ts',
        "import 'server-only'; export type BDirect = { id: string };",
      )
      const current = compile(result.sources, result.clients)
      clean(current)
      expect(
        current.program.getSourceFile(path.join(moduleRoot, '__b-types-direct.d.ts')),
      ).toBeDefined()
      assertRealChecks(current, rejection)
    })

    it('TSTYPES-14 permits diagnostics-clean ordinary sources without references', () => {
      const result = fixture()
      result.clients.set(clientName, "'use client'; export const id = 'safe';")
      const current = compile(result.sources, result.clients)
      clean(current)
      expect(
        dependencies(
          current.program.getSourceFile(path.join(projectRoot, clientName))!,
          current.program.getTypeChecker(),
        ),
      ).toEqual([])
      expect(assertClientIsolation(current.environment).codeEdges).toEqual([])
      assertRealChecks(current)
    })

    it.each(['.d.mts', '.d.cts'])(
      'TSTYPES-EXT allows effective diagnostics-clean local %s declarations',
      (extension) => {
        const name = `src/__b-types-extension${extension}`
        const result = fixture(
          `./__b-types-extension${extension}`,
          'export {};',
          new Map([[name, 'export {};']]),
        )
        clean(result)
        expect(result.program.getSourceFile(path.join(projectRoot, name))).toBeDefined()
        const edges = assertClientIsolation(result.environment).codeEdges
        expect(edges).toHaveLength(1)
        expect(edges[0]!.target).toBe(path.join(projectRoot, name))
        assertRealChecks(result)
      },
    )

    it.each(['.d.mts', '.d.cts'])(
      'TSTYPES-EXT rejects diagnostics-clean adapter ownership through local %s declarations',
      (extension) => {
        const name = `src/__b-types-extension${extension}`
        const result = fixture(
          `./__b-types-extension${extension}`,
          'export {};',
          new Map([[name, globalWrapper]]),
          "'use client'; export const observed: BGlobal = { id: 'synthetic' };",
        )
        clean(result)
        expect(result.program.getSourceFile(path.join(projectRoot, name))).toBeDefined()
        assertRealChecks(result, rejection)
      },
    )

    it.each(['import', 'require'] as const)(
      'TSTYPES-MODE preserves public directive resolution-mode=%s',
      (mode) => {
        const result = fixture()
        result.clients.set(
          clientName,
          `/// <reference types="./__b-types-wrapper.d.ts" resolution-mode="${mode}" />\n'use client'; export {};`,
        )
        const current = compile(result.sources, result.clients)
        clean(current)
        const source = current.program.getSourceFile(path.join(projectRoot, clientName))!
        const edges = dependencies(source, current.program.getTypeChecker())
        expect(edges).toHaveLength(1)
        const edge = edges[0]!
        expect(edge.resolutionMode).toBe(
          mode === 'import' ? ts.ModuleKind.ESNext : ts.ModuleKind.CommonJS,
        )
        expect(
          current.environment.resolveDependency(
            edge.name,
            source.fileName,
            edge.origin,
            edge.resolutionMode,
          ),
        ).toBe(path.join(projectRoot, wrapperName))
        assertRealChecks(current)
      },
    )

    it.each([
      './__b-types-wrapper.d.ts?raw',
      './__b-types-wrapper.css',
      '../node_modules/typescript/lib/typescript.d.ts',
      '/tmp/__b-types-external.d.ts',
    ])('TSTYPES-BOUNDED fails closed for unsupported explicit-local %s', (reference) => {
      const result = fixture(reference)
      // Policy-only controls: compiler diagnostics vary by unsupported target.
      expect(
        result.environment.resolveDependency(
          reference,
          path.join(projectRoot, clientName),
          'triple-slash-types-local',
        ),
      ).toBeUndefined()
      assertRealChecks(result, unresolved)
    })

    it('TSTYPES-LOCAL-SEPARATOR rejects diagnostics-clean Windows-relative wrapper ownership', () => {
      const result = fixture(
        '.\\__b-types-wrapper.d.ts',
        globalWrapper,
        new Map(),
        "'use client'; export const observed: BGlobal = { id: 'synthetic' };",
      )
      clean(result)
      expect(result.program.getSourceFile(path.join(projectRoot, wrapperName))).toBeDefined()
      assertRealChecks(result, rejection)
    })

    it('TSTYPES-CONSUMER rejects diagnostics-clean adapter-local types reaching a consumer module', () => {
      const sources = readSources()
      sources.set(
        '__b-types-consumer.d.ts',
        '/// <reference types="../catalog/__b-types-consumer.d.ts" />\nimport "server-only"; export {};',
      )
      const clients = new Map([['src/modules/catalog/__b-types-consumer.d.ts', 'export {};']])
      const result = compile(sources, clients, [
        ...sourceEnvironment(sources, clients).files.keys(),
      ])
      clean(result)
      expect(
        result.environment.internalTarget(
          '../catalog/__b-types-consumer.d.ts',
          '__b-types-consumer.d.ts',
          'triple-slash-types-local',
        ),
      ).toBeUndefined()
      expect(
        result.environment.resolveDependency(
          '../catalog/__b-types-consumer.d.ts',
          path.join(moduleRoot, '__b-types-consumer.d.ts'),
          'triple-slash-types-local',
        ),
      ).toBe(path.join(projectRoot, 'src/modules/catalog/__b-types-consumer.d.ts'))
      expect(() => assertBoundary(sources, clients)).toThrow(/consumer dependency/)
    })

    it('TSTYPES-ADAPTER-MISSING fails closed for missing adapter-local declarations', () => {
      const sources = readSources()
      sources.set(
        '__b-types-missing-source.d.ts',
        '/// <reference types="./__b-types-missing.d.ts" />\nimport "server-only"; export {};',
      )
      const result = compile(sources, new Map(), [
        ...sourceEnvironment(sources, new Map()).files.keys(),
      ])
      expect(ts.getPreEmitDiagnostics(result.program).map((diagnostic) => diagnostic.code)).toEqual(
        [2688],
      )
      expect(() => assertBoundary(sources)).toThrow(unresolved)
    })
  })

  it('TSREF-01 rejects diagnostics-clean triple-slash declaration wrapper ownership', () => {
    const sources = readSources()
    sources.set(
      '__tsref-contracts.ts',
      "import 'server-only'; export type FixtureContract = { id: string };",
    )
    const name = 'src/__tsref-client.ts'
    const clients = new Map([
      [
        name,
        `/// <reference path="./__tsref-globals.d.ts" />
'use client'; export const observed: FixtureGlobal = { id: 'synthetic' };`,
      ],
      [
        'src/__tsref-globals.d.ts',
        `import type { FixtureContract } from '@/modules/nuvemshop/__tsref-contracts';
declare global { type FixtureGlobal = FixtureContract; }
export {};`,
      ],
    ])
    const environment = sourceEnvironment(sources, clients)
    const program = ts.createProgram(
      [path.join(projectRoot, name)],
      { ...compilerOptions, incremental: false, skipLibCheck: false, types: [] },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    const source = program.getSourceFile(path.join(projectRoot, name))!
    expect(source.referencedFiles.map((reference) => reference.fileName)).toEqual([
      './__tsref-globals.d.ts',
    ])
    expect(program.getSourceFile(path.join(projectRoot, 'src/__tsref-globals.d.ts'))).toBeDefined()
    expect(dependencies(source, program.getTypeChecker())).toEqual([
      {
        name: './__tsref-globals.d.ts',
        runtime: false,
        explicitMarker: false,
        origin: 'triple-slash-path',
        node: source,
      },
    ])
    expect(() => assertClientIsolation(environment)).toThrow(
      /client runtime\/type dependency reaches adapter/,
    )
    expect(() => assertBoundary(sources, clients)).toThrow(
      /client runtime\/type dependency reaches adapter/,
    )
  })

  describe('triple-slash path dependency matrix', () => {
    const clientName = 'src/__tsref-client.ts'
    const wrapperName = 'src/__tsref-wrapper.d.ts'
    const rejection = /client runtime\/type dependency reaches adapter/
    const unresolved = /unresolved or unsupported project-local triple-slash path/
    function fixture(reference = './__tsref-wrapper.d.ts', wrapper = 'export {};') {
      const sources = readSources()
      sources.set(
        '__tsref-contracts.ts',
        "import 'server-only'; export type FixtureContract = { id: string };",
      )
      const clients = new Map([
        [
          clientName,
          `/// <reference path="${reference}" />
'use client'; export {};`,
        ],
        [wrapperName, wrapper],
      ])
      const environment = sourceEnvironment(sources, clients)
      // Only the client is a root: wrapper inclusion must come from its reference.
      const program = ts.createProgram(
        [path.join(projectRoot, clientName)],
        { ...compilerOptions, incremental: false, skipLibCheck: false, types: [] },
        environment.host,
      )
      return { sources, clients, environment, program }
    }
    function assertRealChecks(result: ReturnType<typeof fixture>, message?: RegExp) {
      const source = result.program.getSourceFile(path.join(projectRoot, clientName))!
      const edges = dependencies(source, result.program.getTypeChecker())
      expect(edges.filter((edge) => edge.origin === 'triple-slash-path')).toHaveLength(1)
      expect(edges[0]).toMatchObject({
        runtime: false,
        explicitMarker: false,
        origin: 'triple-slash-path',
      })
      if (message) {
        expect(() => assertClientIsolation(result.environment)).toThrow(message)
        expect(() => assertBoundary(result.sources, result.clients)).toThrow(message)
      } else {
        expect(() => assertClientIsolation(result.environment)).not.toThrow()
        expect(() => assertBoundary(result.sources, result.clients)).not.toThrow()
      }
    }

    it('TSREF-02 traverses two diagnostics-clean declaration wrappers', () => {
      const result = fixture(
        './__tsref-wrapper.d.ts',
        `/// <reference path="./__tsref-second.d.ts" />
export {};`,
      )
      result.clients.set(
        'src/__tsref-second.d.ts',
        "export type { FixtureContract } from '@/modules/nuvemshop/__tsref-contracts';",
      )
      const environment = sourceEnvironment(result.sources, result.clients)
      const program = ts.createProgram(
        [path.join(projectRoot, clientName)],
        { ...compilerOptions, incremental: false, skipLibCheck: false, types: [] },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      expect(program.getSourceFile(path.join(projectRoot, 'src/__tsref-second.d.ts'))).toBeDefined()
      assertRealChecks({ ...result, environment, program }, rejection)
    })

    it('TSREF-03 allows a diagnostics-clean harmless declaration wrapper', () => {
      const result = fixture(
        './__tsref-wrapper.d.ts',
        'export interface HarmlessContract { id: string }',
      )
      expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
      assertRealChecks(result)
      expect(assertClientIsolation(result.environment).codeEdges).toEqual([
        {
          importer: path.join(projectRoot, clientName),
          name: './__tsref-wrapper.d.ts',
          target: path.join(projectRoot, wrapperName),
          origin: 'triple-slash-path',
          runtime: false,
          explicitMarker: false,
        },
      ])
    })

    it('TSREF-04 fails closed for missing exact project-local paths', () => {
      const result = fixture('./__tsref-missing.d.ts')
      expect(
        ts.getPreEmitDiagnostics(result.program).map((diagnostic) => diagnostic.code),
      ).toContain(6053)
      expect(
        result.environment.resolveReferencePath(
          './__tsref-missing.d.ts',
          path.join(projectRoot, clientName),
        ),
      ).toBeUndefined()
      assertRealChecks(result, unresolved)
    })

    it('TSREF-05 rejects a diagnostics-clean direct adapter declaration reference', () => {
      const result = fixture('./modules/nuvemshop/__tsref-direct.d.ts')
      result.sources.set(
        '__tsref-direct.d.ts',
        "import 'server-only'; export type DirectContract = { id: string };",
      )
      const environment = sourceEnvironment(result.sources, result.clients)
      const program = ts.createProgram(
        [path.join(projectRoot, clientName)],
        { ...compilerOptions, incremental: false, skipLibCheck: false, types: [] },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      expect(program.getSourceFile(path.join(moduleRoot, '__tsref-direct.d.ts'))).toBeDefined()
      assertRealChecks({ ...result, environment, program }, rejection)
    })

    it('TSREF-06 rejects diagnostics-clean global namespace wrapper ownership', () => {
      const result = fixture(
        './__tsref-wrapper.d.ts',
        `import type { FixtureContract } from '@/modules/nuvemshop/__tsref-contracts';
declare global { namespace FixtureNamespace { type Contract = FixtureContract; } }
export {};`,
      )
      expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
      assertRealChecks(result, rejection)
    })

    it('TSREF-07 allows diagnostics-clean sources without triple-slash references', () => {
      const result = fixture()
      result.clients.set(clientName, "'use client'; export const id = 'safe';")
      const environment = sourceEnvironment(result.sources, result.clients)
      const program = ts.createProgram(
        [path.join(projectRoot, clientName)],
        { ...compilerOptions, incremental: false, skipLibCheck: false, types: [] },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      expect(
        dependencies(
          program.getSourceFile(path.join(projectRoot, clientName))!,
          program.getTypeChecker(),
        ),
      ).toEqual([])
      expect(assertClientIsolation(environment).codeEdges).toEqual([])
      expect(() => assertBoundary(result.sources, result.clients)).not.toThrow()
    })

    it.each([
      ['TSREF-08', 'lib', 'es2020.string'],
      ['TSREF-09', 'types', 'node'],
    ])('%s keeps other directive channels separate', (_id, channel, name) => {
      const result = fixture()
      result.clients.set(
        clientName,
        `/// <reference ${channel}="${name}" />
'use client'; export {};`,
      )
      const environment = sourceEnvironment(result.sources, result.clients)
      const program = ts.createProgram(
        [path.join(projectRoot, clientName)],
        { ...compilerOptions, incremental: false, skipLibCheck: false, types: [] },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      const source = program.getSourceFile(path.join(projectRoot, clientName))!
      expect(source.referencedFiles).toEqual([])
      expect(
        channel === 'lib' ? source.libReferenceDirectives : source.typeReferenceDirectives,
      ).toHaveLength(1)
      expect(dependencies(source, program.getTypeChecker())).toEqual([])
      expect(assertClientIsolation(environment).codeEdges).toEqual([])
      expect(() => assertBoundary(result.sources, result.clients)).not.toThrow()
    })

    it.each([
      [
        'TSREF-10-ROOT',
        'index.ts',
        `/// <reference path="./server/index.ts" />
import 'server-only'; export {};`,
        /root must depend on server at runtime/,
      ],
      [
        'TSREF-10-MARKER',
        'index.ts',
        `/// <reference path="./server-only.ts" />
export * from './server';`,
        /index.ts must explicitly protect itself/,
      ],
      [
        'TSREF-10-GUARDED',
        '__tsref-unguarded.d.ts',
        `/// <reference path="./server/index.ts" />
export type UnguardedContract = { id: string };`,
        /contracts and secrets must remain server-only/,
      ],
    ])('%s cannot fabricate positive runtime guards', (_id, filename, source, message) => {
      const sources = readSources()
      sources.set('server-only.ts', "import 'server-only'; export {};")
      sources.set(filename, source)
      const environment = sourceEnvironment(sources, new Map())
      const program = ts.createProgram(
        [...environment.files.keys()],
        { ...compilerOptions, incremental: false, skipLibCheck: false, types: [] },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      const parsed = program.getSourceFile(path.join(moduleRoot, filename))!
      const reference = dependencies(parsed, program.getTypeChecker()).find(
        (edge) => edge.origin === 'triple-slash-path',
      )!
      expect(reference).toMatchObject({ runtime: false, explicitMarker: false })
      expect(environment.internalTarget(reference.name, filename, reference.origin)).toBe(
        filename === 'index.ts' && _id === 'TSREF-10-MARKER' ? 'server-only.ts' : 'server/index.ts',
      )
      expect(assertClientIsolation(environment).codeEdges).toEqual([])
      expect(() => assertBoundary(sources)).toThrow(message)
    })

    it.each([
      ['TSREF-11', false],
      ['TSREF-12', true],
    ] as const)('%s terminates declaration cycles (adapter branch: %s)', (_id, adapter) => {
      const result = fixture(
        './__tsref-wrapper.d.ts',
        `/// <reference path="./__tsref-second.d.ts" />
export {};`,
      )
      result.clients.set(
        'src/__tsref-second.d.ts',
        `/// <reference path="./__tsref-wrapper.d.ts" />
${adapter ? "export type { FixtureContract } from '@/modules/nuvemshop/__tsref-contracts';" : 'export {};'} `,
      )
      const environment = sourceEnvironment(result.sources, result.clients)
      const program = ts.createProgram(
        [path.join(projectRoot, clientName)],
        { ...compilerOptions, incremental: false, skipLibCheck: false, types: [] },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      assertRealChecks({ ...result, environment, program }, adapter ? rejection : undefined)
      if (!adapter) expect(assertClientIsolation(environment).codeEdges).toHaveLength(3)
    })

    it.each([
      './nested/../__tsref-wrapper.d.ts',
      '__tsref-wrapper.d.ts',
      path.join(projectRoot, wrapperName),
    ])('converges exact reference %s to compiler and overlay identity', (reference) => {
      const result = fixture(reference)
      expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
      const target = result.environment.resolveReferencePath(
        reference,
        path.join(projectRoot, clientName),
      )
      expect(target).toBe(path.join(projectRoot, wrapperName))
      expect(result.program.getSourceFile(target!)?.fileName).toBe(target)
      assertRealChecks(result)
      expect(
        assertClientIsolation(result.environment).codeEdges.map((edge) => edge.target),
      ).toEqual([target])
    })

    it.each([
      ['./__tsref-wrapper', 'extensionless path'],
      ['./__tsref-wrapper.d.ts?raw', 'query path'],
      ['./__tsref-wrapper.css', 'asset path'],
      ['../node_modules/typescript/lib/typescript.d.ts', 'package path'],
      ['/tmp/__tsref-external.d.ts', 'external path'],
      ['@/modules/nuvemshop/__tsref-contracts.ts', 'module alias path'],
    ])('fails closed for bounded unsupported %s (%s)', (reference) => {
      const result = fixture(reference)
      // Extensionless references can be accepted by TypeScript via extension
      // probing. This policy intentionally requires the exact named code file.
      if (reference === './__tsref-wrapper') {
        expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
        expect(result.program.getSourceFile(path.join(projectRoot, wrapperName))).toBeDefined()
      }
      expect(
        result.environment.resolveReferencePath(reference, path.join(projectRoot, clientName)),
      ).toBeUndefined()
      assertRealChecks(result, unresolved)
    })

    it('resolves adapter server-to-root reference paths without module extension substitution', () => {
      const sources = readSources()
      sources.set(
        'server/__tsref-root.d.ts',
        `/// <reference path="../index.ts" />
import 'server-only'; export {};`,
      )
      const environment = sourceEnvironment(sources, new Map())
      const program = ts.createProgram(
        [...environment.files.keys()],
        { ...compilerOptions, incremental: false, skipLibCheck: false, types: [] },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      expect(
        environment.internalTarget('../index.ts', 'server/__tsref-root.d.ts', 'triple-slash-path'),
      ).toBe('index.ts')
      expect(() => assertBoundary(sources)).toThrow(/server must not depend on root/)
    })
  })

  const secretAccessCases = [
    ['SECRET-GREEN-01', 'void process.env.SECRET;'],
    ['SECRET-RED-01', "void process['env'].NUVEMSHOP_ACCESS_TOKEN;"],
    ['SECRET-RED-02', 'void process /* comment */ . env.NUVEMSHOP_ACCESS_TOKEN;'],
    ['SECRET-DOUBLE-BRACKET', 'void process["env"].SECRET;'],
    ['SECRET-PARENTHESIZED', 'void (process).env.SECRET;'],
    ['SECRET-NONNULL', "void process!['env'].SECRET;"],
    ['SECRET-AS', 'void (process as typeof process).env.SECRET;'],
    ['SECRET-ASSERTION', 'void (<typeof process>process).env.SECRET;'],
    ['SECRET-SATISFIES', "void (process satisfies typeof process)['env'].SECRET;"],
    [
      'SECRET-NESTED-WRAPPERS',
      "void (((<typeof process>(process as typeof process)) satisfies typeof process)!)['env'].SECRET;",
    ],
    ['SECRET-STATIC-KEY-PARENS', "void process[(('env'))].SECRET;"],
    ['SECRET-STATIC-TEMPLATE-KEY', 'void process[`env`].SECRET;'],
  ] as const
  const harmlessSecretCases = [
    [
      'SECRET-GREEN-05',
      "{ const process = { env: { SECRET: 'local-fixture' } }; void process.env.SECRET; }",
    ],
    [
      'SECRET-LOCAL-BRACKET',
      "{ const process = { env: { SECRET: 'local-fixture' } }; void (process as typeof process)['env'].SECRET; }",
    ],
    [
      'SECRET-LOCAL-PARAMETER',
      'function local(process: { env: { SECRET: string } }) { return process.env.SECRET; } void local;',
    ],
    ['SECRET-TYPE-ONLY', 'type LocalEnv = typeof process.env;'],
    ['SECRET-COMMENT-TEXT', '// process.env.SECRET'],
    ['SECRET-STRING-TEXT', "const secretText = 'process.env.SECRET'; void secretText;"],
    ['SECRET-DYNAMIC-KEY', "const envKey = 'env'; void process[envKey].SECRET;"],
    [
      'SECRET-DYNAMIC-TEMPLATE',
      "const envSuffix = 'nv'; void (process as unknown as Record<string, { SECRET?: string }>)[`e${envSuffix}`]?.SECRET;",
    ],
    ['SECRET-UNRELATED-STATIC', 'void process.version;'],
    ['SECRET-GREEN-06', 'const ordinarySafe = 1; void ordinarySafe;'],
  ] as const

  it('SECRET-DIAGNOSTICS keeps every static and harmless secret fixture diagnostics-clean', () => {
    const sources = readSources()
    for (const [id, statement] of [...secretAccessCases, ...harmlessSecretCases]) {
      sources.set(`__fixture-${id}.ts`, statement)
    }
    sources.set('__fixture-SECRET-GREEN-04.ts', "import 'server-only'; void process['env'].SECRET;")
    const environment = sourceEnvironment(sources, new Map())
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
  })

  it.each(secretAccessCases)(
    '%s rejects unguarded static ambient process.env through the full boundary',
    (_id, statement) => {
      const sources = readSources()
      sources.set('__fixture-secret.ts', statement)
      expect(() => assertBoundary(sources)).toThrow(/contracts and secrets must remain server-only/)
    },
  )

  it('SECRET-GREEN-04 accepts guarded bracket process.env through the full boundary', () => {
    const sources = readSources()
    sources.set('__fixture-secret.ts', "import 'server-only'; void process['env'].SECRET;")
    expect(() => assertBoundary(sources)).not.toThrow()
  })

  it.each(harmlessSecretCases)(
    '%s preserves harmless process-like sources through the full boundary',
    (_id, statement) => {
      const sources = readSources()
      sources.set('__fixture-secret.ts', statement)
      expect(() => assertBoundary(sources)).not.toThrow()
    },
  )

  it.each([
    [
      'generic',
      "type Box<T> = { value: T }; const safe: Box<string> = { value: 'safe' }; void safe;",
    ],
    [
      'conditional',
      "type Select<T> = T extends string ? { id: T } : { count: number }; const safe: Select<'safe'> = { id: 'safe' }; void safe;",
    ],
    [
      'keyof',
      "type Keys = keyof { id: string; count: number }; const safe: Keys = 'id'; void safe;",
    ],
    [
      'IndexedAccess',
      "type Item = { id: string; count: number }; const safe: Item['id'] = 'safe'; void safe;",
    ],
    [
      'mapped',
      "type Mapped<T> = { [K in keyof T]: T[K] }; const safe: Mapped<{ id: string }> = { id: 'safe' }; void safe;",
    ],
  ])('POST-RETIREMENT allows unrelated client %s types', (_shape, statement) => {
    const sources = readSources()
    const name = 'src/__fixture-local-types.ts'
    const clients = new Map([[name, "'use client';\nexport {};\n" + statement]])
    const environment = sourceEnvironment(sources, clients)
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    expect(
      dependencies(program.getSourceFile(path.join(projectRoot, name))!, program.getTypeChecker()),
    ).toEqual([])
    expect(() => assertBoundary(sources, clients)).not.toThrow()
  })

  it('POST-RETIREMENT accepts exact CSS overlays through the full boundary', () => {
    const clients = new Map([
      [
        'src/__fixture-retired-css.ts',
        "'use client';\nexport {};\nimport './__fixture-retired.css';",
      ],
      ['src/__fixture-retired.css', 'body { color: black }'],
    ])
    const sources = readSources()
    expect(
      assertClientIsolation(sourceEnvironment(sources, clients)).terminalCssEdges,
    ).toHaveLength(1)
    expect(() => assertBoundary(sources, clients)).not.toThrow()
  })

  it.each([
    ['GROOT-globalThis-01', 'const g=globalThis;', 'escape'],
    ['GROOT-globalThis-02', 'let g=globalThis;', 'escape'],
    ['GROOT-globalThis-03', 'let g;g=globalThis;', 'escape'],
    ['GROOT-globalThis-04', 'const consume=(x:unknown)=>x;consume(globalThis);', 'escape'],
    ['GROOT-globalThis-05', 'function f(){return globalThis;}', 'escape'],
    ['GROOT-globalThis-06', 'const xs=[globalThis];', 'escape'],
    ['GROOT-globalThis-07', 'const x={root:globalThis};', 'escape'],
    ['GROOT-globalThis-08', 'const x={globalThis};', 'escape'],
    ['GROOT-globalThis-09', 'Boolean(globalThis);', 'escape'],
    ['GROOT-globalThis-10', 'void globalThis;', 'escape'],
    [
      'GROOT-globalThis-EXACT-ALIAS',
      "const g=globalThis;const observed=g.module?.require('@/modules/nuvemshop/contracts').id;",
      'escape',
    ],
    ['GROOT-globalThis-WRAPPER-1', 'const g=(globalThis);', 'escape'],
    ['GROOT-globalThis-WRAPPER-2', 'const g=globalThis!;', 'escape'],
    ['GROOT-globalThis-WRAPPER-3', 'const g=(globalThis as typeof globalThis);', 'escape'],
    ['GROOT-globalThis-WRAPPER-4', 'const g=(<typeof globalThis>globalThis);', 'escape'],
    ['GROOT-globalThis-WRAPPER-5', 'const g=(globalThis satisfies typeof globalThis);', 'escape'],
    [
      'GROOT-globalThis-COMPUTED-KEY',
      "const key:keyof typeof globalThis='module';void globalThis[key];",
      'computed',
    ],
    [
      'GROOT-globalThis-COMPUTED-TEMPLATE',
      "const key:'module'='module';void globalThis[`${key}`];",
      'computed',
    ],
    [
      'GROOT-globalThis-COMPUTED-EXPRESSION',
      "void globalThis[true?'module':'require'];",
      'computed',
    ],
    ['GROOT-globalThis-BENIGN-DOT-1', 'void globalThis.crypto;', 'safe'],
    ['GROOT-globalThis-BENIGN-BRACKET-1', "void globalThis[('crypto')];", 'safe'],
    ['GROOT-globalThis-BENIGN-DOT-2', 'void globalThis.fetch;', 'safe'],
    ['GROOT-globalThis-BENIGN-BRACKET-2', "void globalThis[('fetch')];", 'safe'],
    ['GROOT-globalThis-BENIGN-DOT-3', 'void globalThis.location;', 'safe'],
    ['GROOT-globalThis-BENIGN-BRACKET-3', "void globalThis[('location')];", 'safe'],
    [
      'GROOT-globalThis-LOCAL',
      'const globalThis={value:1};const g=globalThis;void g.value;',
      'safe',
    ],
    ['GROOT-globalThis-PARAM', 'function f(globalThis:{value:number}){return globalThis;}', 'safe'],
    [
      'GROOT-globalThis-NESTED',
      '{const globalThis={value:1};const g=globalThis;void g.value;}',
      'safe',
    ],
    [
      'GROOT-globalThis-LOCAL-COMPUTED',
      "const globalThis={value:1};const key:'value'='value';void globalThis[key];",
      'safe',
    ],
    [
      'GROOT-globalThis-TOKENS',
      'type G=typeof globalThis;const x={globalThis:1};void x.globalThis;',
      'safe',
    ],
    ['GROOT-globalThis-BENIGN-WRAPPED', 'void (globalThis as typeof globalThis)[`Math`];', 'safe'],
    ['GROOT-global-01', 'const g=global;', 'escape'],
    ['GROOT-global-02', 'let g=global;', 'escape'],
    ['GROOT-global-03', 'let g;g=global;', 'escape'],
    ['GROOT-global-04', 'const consume=(x:unknown)=>x;consume(global);', 'escape'],
    ['GROOT-global-05', 'function f(){return global;}', 'escape'],
    ['GROOT-global-06', 'const xs=[global];', 'escape'],
    ['GROOT-global-07', 'const x={root:global};', 'escape'],
    ['GROOT-global-08', 'const x={global};', 'escape'],
    ['GROOT-global-09', 'Boolean(global);', 'escape'],
    ['GROOT-global-10', 'void global;', 'escape'],
    [
      'GROOT-global-EXACT-ALIAS',
      "const g=global;const observed=g.module?.require('@/modules/nuvemshop/contracts').id;",
      'escape',
    ],
    ['GROOT-global-WRAPPER-1', 'const g=(global);', 'escape'],
    ['GROOT-global-WRAPPER-2', 'const g=global!;', 'escape'],
    ['GROOT-global-WRAPPER-3', 'const g=(global as typeof global);', 'escape'],
    ['GROOT-global-WRAPPER-4', 'const g=(<typeof global>global);', 'escape'],
    ['GROOT-global-WRAPPER-5', 'const g=(global satisfies typeof global);', 'escape'],
    [
      'GROOT-global-COMPUTED-KEY',
      "const key:keyof typeof global='module';void global[key];",
      'computed',
    ],
    [
      'GROOT-global-COMPUTED-TEMPLATE',
      "const key:'module'='module';void global[`${key}`];",
      'computed',
    ],
    ['GROOT-global-COMPUTED-EXPRESSION', "void global[true?'module':'require'];", 'computed'],
    ['GROOT-global-BENIGN-DOT-1', 'void global.process;', 'safe'],
    ['GROOT-global-BENIGN-BRACKET-1', "void global[('process')];", 'safe'],
    ['GROOT-global-BENIGN-DOT-2', 'void global.console;', 'safe'],
    ['GROOT-global-BENIGN-BRACKET-2', "void global[('console')];", 'safe'],
    ['GROOT-global-BENIGN-DOT-3', 'void global.Math;', 'safe'],
    ['GROOT-global-BENIGN-BRACKET-3', "void global[('Math')];", 'safe'],
    ['GROOT-global-LOCAL', 'const global={value:1};const g=global;void g.value;', 'safe'],
    ['GROOT-global-PARAM', 'function f(global:{value:number}){return global;}', 'safe'],
    ['GROOT-global-NESTED', '{const global={value:1};const g=global;void g.value;}', 'safe'],
    [
      'GROOT-global-LOCAL-COMPUTED',
      "const global={value:1};const key:'value'='value';void global[key];",
      'safe',
    ],
    ['GROOT-global-TOKENS', 'type G=typeof global;const x={global:1};void x.global;', 'safe'],
    ['GROOT-global-BENIGN-WRAPPED', 'void (global as typeof global)[`Math`];', 'safe'],
  ])(
    '%s applies the whole-global root policy through graph and full boundary',
    (_id, statement, policy) => {
      const sources = readSources()
      sources.set('contracts.ts', "import 'server-only';export const id='adapter';")
      const name = 'src/__fixture-whole-global-client.ts'
      const filename = path.join(projectRoot, name)
      const clients = new Map([[name, "'use client';\nexport {};\n" + statement]])
      const environment = sourceEnvironment(sources, clients)
      const program = ts.createProgram(
        [...environment.files.keys()],
        { ...compilerOptions, incremental: false },
        environment.host,
      )
      const parsed = program.getSourceFile(filename)!
      const diagnostics = ts.getPreEmitDiagnostics(program)
      expect(diagnostics).toEqual([])
      const collected = dependencies(parsed, program.getTypeChecker())
      if (policy === 'safe') {
        expect(collected).toEqual([])
        expect(() => assertClientIsolation(environment)).not.toThrow()
        expect(() => assertBoundary(sources, clients)).not.toThrow()
      } else {
        const message =
          policy === 'escape'
            ? /unsupported whole-global capability escape/
            : /unproven global property/
        expect(() => assertClientIsolation(environment)).toThrow(message)
        expect(() => assertBoundary(sources, clients)).toThrow(message)
        expect(collected).toHaveLength(1)
        expect(collected[0]).toMatchObject({
          name: '',
          runtime: true,
          unproven: true,
          node: expect.objectContaining({ kind: ts.SyntaxKind.Identifier }),
        })
      }
    },
    120000,
  )

  it.each([
    [
      'GLOBAL-globalThis-STATIC-1',
      "const observed = globalThis.module?.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-2',
      "const observed = globalThis.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-3',
      "const observed = globalThis.module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-4',
      "const observed = globalThis?.require?.('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-5',
      "const observed = globalThis?.module?.require?.('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-6',
      "const observed = globalThis['module']?.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-7',
      "const observed = globalThis.module?.['require']('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-8',
      "const observed = globalThis['module']?.['require']('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-9',
      "const observed = globalThis['require']('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-10',
      "const observed = globalThis[('module')][('require')]('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-11',
      "const observed = globalThis[`module`][`require`]('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-12',
      "const observed = (globalThis).module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-13',
      "const observed = globalThis!.module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-14',
      "const observed = (globalThis as typeof globalThis).module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-15',
      "const observed = (<typeof globalThis>globalThis).module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-16',
      "const observed = (globalThis satisfies typeof globalThis).module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-17',
      "const observed = ((globalThis.module)!).require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-18',
      "const observed = (globalThis.module.require)('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-STATIC-19',
      "const observed = (globalThis.require as typeof globalThis.require)('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-globalThis-DYNAMIC',
      "const name:string='@/modules/nuvemshop/contracts'; globalThis.module?.require(name);",
      'unproven',
    ],
    [
      'GLOBAL-globalThis-MISSING',
      'declare global { namespace NodeJS { interface Module { require(): unknown } } } globalThis.module?.require();',
      'unproven',
    ],
    ['GLOBAL-globalThis-ESC-1-1', 'const r=globalThis.require;', 'capability'],
    ['GLOBAL-globalThis-ESC-1-2', 'let r; r=globalThis.require;', 'capability'],
    [
      'GLOBAL-globalThis-ESC-1-3',
      'const consume=(x:unknown)=>x; consume(globalThis.require);',
      'capability',
    ],
    ['GLOBAL-globalThis-ESC-1-4', 'function f(){return globalThis.require;}', 'capability'],
    ['GLOBAL-globalThis-ESC-1-5', 'const xs=[globalThis.require];', 'capability'],
    ['GLOBAL-globalThis-ESC-1-6', 'const box={value:globalThis.require};', 'capability'],
    ['GLOBAL-globalThis-ESC-2-1', 'const r=globalThis.module?.require;', 'capability'],
    ['GLOBAL-globalThis-ESC-2-2', 'let r; r=globalThis.module?.require;', 'capability'],
    [
      'GLOBAL-globalThis-ESC-2-3',
      'const consume=(x:unknown)=>x; consume(globalThis.module?.require);',
      'capability',
    ],
    ['GLOBAL-globalThis-ESC-2-4', 'function f(){return globalThis.module?.require;}', 'capability'],
    ['GLOBAL-globalThis-ESC-2-5', 'const xs=[globalThis.module?.require];', 'capability'],
    ['GLOBAL-globalThis-ESC-2-6', 'const box={value:globalThis.module?.require};', 'capability'],
    ['GLOBAL-globalThis-ESC-3-1', 'const r=globalThis.module;', 'capability'],
    ['GLOBAL-globalThis-ESC-3-2', 'let r; r=globalThis.module;', 'capability'],
    [
      'GLOBAL-globalThis-ESC-3-3',
      'const consume=(x:unknown)=>x; consume(globalThis.module);',
      'capability',
    ],
    ['GLOBAL-globalThis-ESC-3-4', 'function f(){return globalThis.module;}', 'capability'],
    ['GLOBAL-globalThis-ESC-3-5', 'const xs=[globalThis.module];', 'capability'],
    ['GLOBAL-globalThis-ESC-3-6', 'const box={value:globalThis.module};', 'capability'],
    [
      'GLOBAL-globalThis-call',
      "globalThis.module.require.call(null, '@/modules/nuvemshop/contracts');",
      'capability',
    ],
    [
      'GLOBAL-globalThis-apply',
      "globalThis.module.require.apply(null, ['@/modules/nuvemshop/contracts']);",
      'capability',
    ],
    [
      'GLOBAL-globalThis-bind',
      "globalThis.module.require.bind(null, '@/modules/nuvemshop/contracts');",
      'capability',
    ],
    [
      'GLOBAL-globalThis-REQUIRE-CALL',
      "globalThis.require.call(null,'@/modules/nuvemshop/contracts');",
      'capability',
    ],
    [
      'GLOBAL-globalThis-SHADOW',
      "const globalThis={require:(x:string)=>x,module:{require:(x:string)=>x}};const m=globalThis.module;const r=globalThis.require;globalThis.module.require('@/modules/nuvemshop/contracts');r('safe');m.require('safe');",
      'safe',
    ],
    [
      'GLOBAL-globalThis-PARAM',
      "function f(globalThis:{module:{require(x:string):string}}){return globalThis['module']?.['require']('@/modules/nuvemshop/contracts');}",
      'safe',
    ],
    [
      'GLOBAL-globalThis-NESTED',
      "{const globalThis={require:(x:string)=>x};globalThis.require('@/modules/nuvemshop/contracts');}",
      'safe',
    ],
    [
      'GLOBAL-globalThis-TOKENS',
      "const obj={globalThis:{module:{require:(x:string)=>x}}};obj.globalThis.module.require('@/modules/nuvemshop/contracts');type G=typeof globalThis;void globalThis.Math;",
      'safe',
    ],
    [
      'GLOBAL-global-STATIC-1',
      "const observed = global.module?.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-2',
      "const observed = global.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-3',
      "const observed = global.module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-4',
      "const observed = global?.require?.('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-5',
      "const observed = global?.module?.require?.('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-6',
      "const observed = global['module']?.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-7',
      "const observed = global.module?.['require']('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-8',
      "const observed = global['module']?.['require']('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-9',
      "const observed = global['require']('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-10',
      "const observed = global[('module')][('require')]('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-11',
      "const observed = global[`module`][`require`]('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-12',
      "const observed = (global).module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-13',
      "const observed = global!.module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-14',
      "const observed = (global as typeof global).module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-15',
      "const observed = (<typeof global>global).module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-16',
      "const observed = (global satisfies typeof global).module.require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-17',
      "const observed = ((global.module)!).require('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-18',
      "const observed = (global.module.require)('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-STATIC-19',
      "const observed = (global.require as typeof global.require)('@/modules/nuvemshop/contracts').id;",
      'adapter',
    ],
    [
      'GLOBAL-global-DYNAMIC',
      "const name:string='@/modules/nuvemshop/contracts'; global.module?.require(name);",
      'unproven',
    ],
    [
      'GLOBAL-global-MISSING',
      'declare global { namespace NodeJS { interface Module { require(): unknown } } } global.module?.require();',
      'unproven',
    ],
    ['GLOBAL-global-ESC-1-1', 'const r=global.require;', 'capability'],
    ['GLOBAL-global-ESC-1-2', 'let r; r=global.require;', 'capability'],
    [
      'GLOBAL-global-ESC-1-3',
      'const consume=(x:unknown)=>x; consume(global.require);',
      'capability',
    ],
    ['GLOBAL-global-ESC-1-4', 'function f(){return global.require;}', 'capability'],
    ['GLOBAL-global-ESC-1-5', 'const xs=[global.require];', 'capability'],
    ['GLOBAL-global-ESC-1-6', 'const box={value:global.require};', 'capability'],
    ['GLOBAL-global-ESC-2-1', 'const r=global.module?.require;', 'capability'],
    ['GLOBAL-global-ESC-2-2', 'let r; r=global.module?.require;', 'capability'],
    [
      'GLOBAL-global-ESC-2-3',
      'const consume=(x:unknown)=>x; consume(global.module?.require);',
      'capability',
    ],
    ['GLOBAL-global-ESC-2-4', 'function f(){return global.module?.require;}', 'capability'],
    ['GLOBAL-global-ESC-2-5', 'const xs=[global.module?.require];', 'capability'],
    ['GLOBAL-global-ESC-2-6', 'const box={value:global.module?.require};', 'capability'],
    ['GLOBAL-global-ESC-3-1', 'const r=global.module;', 'capability'],
    ['GLOBAL-global-ESC-3-2', 'let r; r=global.module;', 'capability'],
    [
      'GLOBAL-global-ESC-3-3',
      'const consume=(x:unknown)=>x; consume(global.module);',
      'capability',
    ],
    ['GLOBAL-global-ESC-3-4', 'function f(){return global.module;}', 'capability'],
    ['GLOBAL-global-ESC-3-5', 'const xs=[global.module];', 'capability'],
    ['GLOBAL-global-ESC-3-6', 'const box={value:global.module};', 'capability'],
    [
      'GLOBAL-global-call',
      "global.module.require.call(null, '@/modules/nuvemshop/contracts');",
      'capability',
    ],
    [
      'GLOBAL-global-apply',
      "global.module.require.apply(null, ['@/modules/nuvemshop/contracts']);",
      'capability',
    ],
    [
      'GLOBAL-global-bind',
      "global.module.require.bind(null, '@/modules/nuvemshop/contracts');",
      'capability',
    ],
    [
      'GLOBAL-global-REQUIRE-CALL',
      "global.require.call(null,'@/modules/nuvemshop/contracts');",
      'capability',
    ],
    [
      'GLOBAL-global-SHADOW',
      "const global={require:(x:string)=>x,module:{require:(x:string)=>x}};const m=global.module;const r=global.require;global.module.require('@/modules/nuvemshop/contracts');r('safe');m.require('safe');",
      'safe',
    ],
    [
      'GLOBAL-global-PARAM',
      "function f(global:{module:{require(x:string):string}}){return global['module']?.['require']('@/modules/nuvemshop/contracts');}",
      'safe',
    ],
    [
      'GLOBAL-global-NESTED',
      "{const global={require:(x:string)=>x};global.require('@/modules/nuvemshop/contracts');}",
      'safe',
    ],
    [
      'GLOBAL-global-TOKENS',
      "const obj={global:{module:{require:(x:string)=>x}}};obj.global.module.require('@/modules/nuvemshop/contracts');type G=typeof global;void global.Math;",
      'safe',
    ],
  ])(
    '%s applies the finite global capability policy through graph and full boundary',
    (_id, statement, policy) => {
      const sources = readSources()
      sources.set('contracts.ts', "import 'server-only'; export const id = 'adapter';")
      const name = 'src/__fixture-global-client.ts'
      const filename = path.join(projectRoot, name)
      const clients = new Map([[name, "'use client';\nexport {};\n" + statement]])
      const environment = sourceEnvironment(sources, clients)
      const program = ts.createProgram(
        [...environment.files.keys()],
        { ...compilerOptions, incremental: false },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      const collected = dependencies(program.getSourceFile(filename)!, program.getTypeChecker())
      if (policy === 'safe') {
        expect(collected).toEqual([])
        expect(() => assertClientIsolation(environment)).not.toThrow()
        expect(() => assertBoundary(sources, clients)).not.toThrow()
      } else {
        const message =
          policy === 'adapter'
            ? /client runtime\/type dependency reaches adapter/
            : policy === 'unproven'
              ? /unproven computed client dependency/
              : /unsupported global(?:This)?\.(?:module(?:\.require)?|require) capability reference/
        expect(() => assertClientIsolation(environment)).toThrow(message)
        expect(() => assertBoundary(sources, clients)).toThrow(message)
        expect(collected).toHaveLength(1)
        if (policy === 'adapter') {
          expect(collected[0]).toMatchObject({
            name: '@/modules/nuvemshop/contracts',
            runtime: true,
          })
          const target = environment.resolve(collected[0]!.name, filename)
          for (const loader of ['require', 'module.require']) {
            const direct = ts.createSourceFile(
              filename,
              loader + "('@/modules/nuvemshop/contracts')",
              ts.ScriptTarget.Latest,
              true,
            )
            expect(target).toBe(environment.resolve(dependencies(direct)[0]!.name, filename))
          }
          expect(target).toBe(path.join(moduleRoot, 'contracts.ts'))
        } else {
          expect(collected[0]).toMatchObject({ name: '', runtime: true, unproven: true })
        }
      }
    },
  )

  it.each([
    ['MODREQ-01', "const observed = module.require('@/modules/nuvemshop/contracts').id;"],
    ['MODREQ-02', "const observed = (module).require('@/modules/nuvemshop/contracts').id;"],
    ['MODREQ-03', "const observed = module!.require('@/modules/nuvemshop/contracts').id;"],
    [
      'MODREQ-04',
      "type ApprovedFixtureModuleType = typeof module; const observed = (module as ApprovedFixtureModuleType).require('@/modules/nuvemshop/contracts').id;",
    ],
    [
      'MODREQ-05',
      "const observed = (((<typeof module>(module as typeof module)) satisfies typeof module)!).require('@/modules/nuvemshop/contracts').id;",
    ],
    [
      'MODREQ-TYPEASSERT',
      "const observed = (<typeof module>module).require('@/modules/nuvemshop/contracts').id;",
    ],
    [
      'MODREQ-SATISFIES',
      "const observed = (module satisfies typeof module).require('@/modules/nuvemshop/contracts').id;",
    ],
  ])(
    '%s rejects diagnostics-clean static module.require through the full boundary',
    (_id, statement) => {
      const sources = readSources()
      sources.set('contracts.ts', "import 'server-only'; export const id = 'adapter';")
      const name = 'src/__fixture-module-client.ts'
      const filename = path.join(projectRoot, name)
      const clients = new Map([[name, "'use client';\nexport {};\n" + statement]])
      const environment = sourceEnvironment(sources, clients)
      const program = ts.createProgram(
        [...environment.files.keys()],
        { ...compilerOptions, incremental: false },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      expect(() => assertBoundary(sources, clients)).toThrow(
        /client runtime\/type dependency reaches adapter/,
      )
      expect(() => assertClientIsolation(environment)).toThrow(
        /client runtime\/type dependency reaches adapter/,
      )
      const collected = dependencies(program.getSourceFile(filename)!, program.getTypeChecker())
      expect(collected).toHaveLength(1)
      expect(collected[0]).toMatchObject({ name: '@/modules/nuvemshop/contracts', runtime: true })
      const direct = ts.createSourceFile(
        filename,
        "require('@/modules/nuvemshop/contracts')",
        ts.ScriptTarget.Latest,
        true,
      )
      expect(environment.resolve(collected[0]!.name, filename)).toBe(
        environment.resolve(dependencies(direct)[0]!.name, filename),
      )
      expect(environment.resolve(collected[0]!.name, filename)).toBe(
        path.join(moduleRoot, 'contracts.ts'),
      )
      const references: ts.Identifier[] = []
      function visit(node: ts.Node) {
        if (ts.isIdentifier(node) && node.text === 'module' && isRuntimeCapabilityIdentifier(node))
          references.push(node)
        ts.forEachChild(node, visit)
      }
      visit(program.getSourceFile(filename)!)
      expect(references.map(moduleConsumption)).toEqual(['SUPPORTED_MODULE_REQUIRE'])
    },
  )

  it.each([
    [
      'MODREQ-06',
      "const dynamicSpecifier: string = '@/modules/nuvemshop/contracts'; module.require(dynamicSpecifier);",
      'unproven',
    ],
    [
      'MODREQ-07',
      'declare global { namespace NodeJS { interface Module { require(): unknown } } } module.require();',
      'unproven',
    ],
    ['MODCAP-01', 'const r = module.require;', 'capability'],
    ['MODCAP-02', 'let r = module.require;', 'capability'],
    ['MODCAP-03', 'let r; r = module.require;', 'capability'],
    ['MODCAP-04', 'const consume = (x: unknown) => x; consume(module.require);', 'capability'],
    ['MODCAP-05', 'function loader() { return module.require; }', 'capability'],
    ['MODCAP-06', 'const xs = [module.require];', 'capability'],
    ['MODCAP-07', 'const x = { loader: module.require };', 'capability'],
    [
      'MODCAP-08',
      "Reflect.apply(module.require, null, ['@/modules/nuvemshop/contracts']);",
      'capability',
    ],
    ['MODULE-ESC-01', 'const m = module;', 'capability'],
    ['MODULE-ESC-02', 'const consume = (x: unknown) => x; consume(module);', 'capability'],
    ['MODULE-ESC-03', 'function loader() { return module; }', 'capability'],
    ['MODULE-ESC-04', 'const xs = [module];', 'capability'],
    ['MODULE-ESC-05', 'const x = { commonjs: module };', 'capability'],
    ['MODULE-ESC-LET', 'let m = module;', 'capability'],
    ['MODULE-ESC-SHORTHAND', 'const value = { module };', 'capability'],
    ['MODULE-ELEMENT', "module['require']('@/modules/nuvemshop/contracts');", 'capability'],
    [
      'MODULE-COMPUTED',
      "const key: 'require' = 'require'; module[key]('@/modules/nuvemshop/contracts');",
      'capability',
    ],
    [
      'MODULE-PROPERTY',
      "declare global { namespace NodeJS { interface Module { foo(name: string): unknown } } } module.foo('@/modules/nuvemshop/contracts');",
      'capability',
    ],
    ['MODULE-BOOL', 'Boolean(module);', 'capability'],
    ['MODULE-VOID', 'void module;', 'capability'],
    ['MODULE-COMPARE', 'const other: unknown = null; void (module === other);', 'capability'],
    [
      'MODULE-UNPROVEN',
      'declare const module: { require(name: string): unknown }; const loader = module.require;',
      'capability',
    ],
  ])(
    '%s rejects diagnostics-clean unproven module capability use at acquisition',
    (_id, statement, policy) => {
      const sources = readSources()
      sources.set('contracts.ts', "import 'server-only'; export const id = 'adapter';")
      const name = 'src/__fixture-module-client.ts'
      const clients = new Map([[name, "'use client';\nexport {};\n" + statement]])
      const environment = sourceEnvironment(sources, clients)
      const program = ts.createProgram(
        [...environment.files.keys()],
        { ...compilerOptions, incremental: false },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      const message =
        policy === 'unproven'
          ? /unproven computed client dependency/
          : /unsupported module(?:\.require)? capability reference/
      expect(() => assertBoundary(sources, clients)).toThrow(message)
      expect(() => assertClientIsolation(environment)).toThrow(message)
      const collected = dependencies(
        program.getSourceFile(path.join(projectRoot, name))!,
        program.getTypeChecker(),
      )
      expect(collected).toHaveLength(1)
      expect(collected[0]).toMatchObject({ name: '', runtime: true, unproven: true })
    },
  )

  it.each([
    [
      'MODULE-SHADOW-01',
      "const module = { require: (x: string) => x }; const result = module.require('safe');",
    ],
    [
      'MODULE-SHADOW-02',
      "function f(module: { require(x: string): string }) { return module.require('safe'); }",
    ],
    [
      'MODULE-SHADOW-03',
      "{ const module = { require: (x: string) => x }; module.require('safe'); }",
    ],
    [
      'MODULE-SHADOW-04',
      "const module = { require: (x: string) => x }; const m = module; m.require('safe');",
    ],
    [
      'MODULE-SHADOW-IMPORT',
      "import { loaderModule as module } from './__fixture-module-safe'; const m = module; m.require('safe');",
    ],
  ])(
    '%s preserves diagnostics-clean local module shadows in graph and full boundary',
    (_id, statement) => {
      const sources = readSources()
      const clients = new Map([
        ['src/__fixture-module-client.ts', "'use client';\nexport {};\n" + statement],
        [
          'src/__fixture-module-looking.ts',
          "'use client';\nexport {};\n" +
            statement.replaceAll("'safe'", "'@/modules/nuvemshop/__missing-adapter'"),
        ],
        [
          'src/__fixture-module-safe.ts',
          'export const loaderModule = { require: (x: string) => x };',
        ],
      ])
      const environment = sourceEnvironment(sources, clients)
      const program = ts.createProgram(
        [...environment.files.keys()],
        { ...compilerOptions, incremental: false },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      for (const name of clients.keys()) {
        const collected = dependencies(
          program.getSourceFile(path.join(projectRoot, name))!,
          program.getTypeChecker(),
        )
        expect(collected.filter((edge) => ts.isCallExpression(edge.node) || edge.unproven)).toEqual(
          [],
        )
      }
      expect(() => assertClientIsolation(environment)).not.toThrow()
      expect(() => assertBoundary(sources, clients)).not.toThrow()
    },
  )

  it.each([
    'module.exports = { safe: true };',
    'module.exports.safe = true;',
    "module['exports'] = { safe: true };",
    "module[('exports')][('safe')] = true;",
    '(module).exports.safe = true;',
    'module[(((`exports`)))][((`safe`))] = true;',
    'Object.assign(module.exports, { safe: true });',
    "Object.defineProperty(module.exports, 'safe', { value: true });",
    'Object.defineProperties(module.exports, { safe: { value: true } });',
    "Reflect.defineProperty(module.exports, 'safe', { value: true });",
  ])('preserves existing module.exports client consumption: %s', (statement) => {
    const sources = readSources()
    const name = 'src/__fixture-module-client.ts'
    const clients = new Map([[name, "'use client';\nexport {};\n" + statement]])
    const environment = sourceEnvironment(sources, clients)
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    const parsed = program.getSourceFile(path.join(projectRoot, name))!
    const references: ts.Identifier[] = []
    function visit(node: ts.Node) {
      if (ts.isIdentifier(node) && node.text === 'module' && isRuntimeCapabilityIdentifier(node))
        references.push(node)
      ts.forEachChild(node, visit)
    }
    visit(parsed)
    expect(references.map(moduleConsumption)).toEqual(['EXISTING_MODULE_EXPORTS_POLICY'])
    expect(dependencies(parsed, program.getTypeChecker())).toEqual([])
    expect(() => assertClientIsolation(environment)).not.toThrow()
    expect(() => assertBoundary(sources, clients)).not.toThrow()
  })

  it('excludes property-name and type-only module tokens from runtime references', () => {
    const sources = readSources()
    const name = 'src/__fixture-module-client.ts'
    const clients = new Map([
      [
        name,
        "'use client'; export {}; const obj = { module: { require: (x: string) => x } }; obj.module.require('./__missing'); type ApprovedFixtureModuleType = typeof module;",
      ],
    ])
    const environment = sourceEnvironment(sources, clients)
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    expect(
      dependencies(program.getSourceFile(path.join(projectRoot, name))!, program.getTypeChecker()),
    ).toEqual([])
    expect(() => assertBoundary(sources, clients)).not.toThrow()
  })

  it('traverses static module.require of unrelated project wrappers', () => {
    const name = 'src/__fixture-module-client.ts'
    const clients = new Map([
      [
        name,
        "'use client'; export {}; const observed = module.require('./__fixture-module-wrapper').id;",
      ],
      ['src/__fixture-module-wrapper.ts', "export { id } from './__fixture-module-safe';"],
      ['src/__fixture-module-safe.ts', "export const id = 'safe';"],
    ])
    const sources = readSources()
    const environment = sourceEnvironment(sources, clients)
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    expect(assertClientIsolation(environment).codeEdges.map((edge) => edge.target)).toEqual([
      path.join(projectRoot, 'src/__fixture-module-wrapper.ts'),
      path.join(projectRoot, 'src/__fixture-module-safe.ts'),
    ])
    expect(() => assertBoundary(sources, clients)).not.toThrow()
  })

  it.each([
    [
      'BIND-INT-01',
      "const require = (x: string) => x; const observed = require('@/modules/nuvemshop/__independent_contracts'); void observed;",
    ],
    [
      'BIND-INT-02',
      "function local(require: (x: string) => string) { return require('@/modules/nuvemshop/__independent_contracts'); } void local;",
    ],
    [
      'BIND-INT-03',
      "{ const require = (x: string) => x; const observed = require('@/modules/nuvemshop/__independent_contracts'); void observed; }",
    ],
    [
      'BIND-INT-04',
      "function require(x: string) { return x; } const observed = require('@/modules/nuvemshop/__independent_contracts'); void observed;",
    ],
    [
      'BIND-INT-05',
      "import { loader as require } from './__fixture-binding-safe'; const observed = require('@/modules/nuvemshop/__independent_contracts'); void observed;",
    ],
  ])('%s preserves local require binding classification in the full boundary', (_id, statement) => {
    const sources = readSources()
    sources.set('__independent_contracts.ts', "import 'server-only'; export const id = 'adapter';")
    const name = 'src/__fixture-binding-client.ts'
    const clients = new Map([
      [name, `'use client';\nexport {};\n${statement}`],
      ['src/__fixture-binding-safe.ts', 'export const loader = (x: string) => x;'],
    ])
    const environment = sourceEnvironment(sources, clients)
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    expect(
      dependencies(
        program.getSourceFile(path.join(projectRoot, name))!,
        program.getTypeChecker(),
      ).filter((edge) => ts.isCallExpression(edge.node) || edge.unproven),
    ).toEqual([])
    expect(() => assertClientIsolation(environment)).not.toThrow()
    expect(() => assertBoundary(sources, clients)).not.toThrow()
  })

  it.each([
    ['RCAP-01', "const r = require; r('@/modules/nuvemshop/__fixture-contracts');", 'ts'],
    ['RCAP-02', "let r = require; r('@/modules/nuvemshop/__fixture-contracts');", 'ts'],
    ['RCAP-03', "let r; r = require; r('@/modules/nuvemshop/__fixture-contracts');", 'ts'],
    ['RCAP-04', 'const consume = (loader: unknown) => loader; consume(require);', 'ts'],
    ['RCAP-05', 'function getLoader() { return require; } void getLoader;', 'ts'],
    ['RCAP-06', 'const loaders = [require]; void loaders;', 'ts'],
    ['RCAP-07', 'const value = { loader: require }; void value;', 'ts'],
    ['RCAP-08', 'const value = { require }; void value;', 'ts'],
    ['RCAP-09', "(0, require)('@/modules/nuvemshop/__fixture-contracts');", 'js'],
    ['RCAP-10', "Reflect.apply(require, null, ['@/modules/nuvemshop/__fixture-contracts']);", 'ts'],
    ['RCAP-BOOL', 'Boolean(require);', 'ts'],
    ['RCAP-COMPARE', 'const other: unknown = null; void (require === other);', 'ts'],
    ['RCAP-VOID', 'void require;', 'ts'],
  ])(
    '%s rejects diagnostics-clean acquisition of the require capability',
    (_id, statement, ext) => {
      const sources = readSources()
      sources.set('__fixture-contracts.ts', "import 'server-only'; export const id = 'adapter';")
      const name = `src/__fixture-capability-client.${ext}`
      const clients = new Map([[name, `'use client';\n${statement}`]])
      const environment = sourceEnvironment(sources, clients)
      const program = ts.createProgram(
        [...environment.files.keys()],
        { ...compilerOptions, incremental: false },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      // Reject at acquisition; no alias dependency resolution or propagation.
      expect(() => assertBoundary(sources, clients)).toThrow(
        /unsupported require capability reference/,
      )
      expect(() => assertClientIsolation(environment)).toThrow(
        /unsupported require capability reference/,
      )
    },
  )

  it.each([
    [
      'SHADOW-01',
      "const require = (value: string) => value; const result = require('safe'); void result;",
    ],
    ['SHADOW-02', "const require = (value: string) => value; const r = require; r('safe');"],
    [
      'SHADOW-03',
      "function local(require: (value: string) => string) { return require('safe'); } void local;",
    ],
    ['SHADOW-04', "const localRequire = (value: string) => value; localRequire('safe');"],
    [
      'SHADOW-FUNCTION',
      "function require(value: string) { return value; } const r = require; r('safe');",
    ],
    [
      'SHADOW-OVERLOAD',
      "function require(value: string): string; function require(value: string) { return value; } const r = require; r('safe');",
    ],
    [
      'SHADOW-IMPORT',
      "import { loader as require } from './__fixture-capability-safe'; const r = require; r('safe');",
    ],
    ['SHADOW-BLOCK', "{ const require = (value: string) => value; const r = require; r('safe'); }"],
  ])('%s allows diagnostics-clean proven local runtime bindings', (_id, statement) => {
    const sources = readSources()
    const clients = new Map([
      ['src/__fixture-capability-client.ts', `'use client';\nexport {};\n${statement}`],
      [
        'src/__fixture-capability-looking.ts',
        `'use client';\nexport {};\n${statement.replaceAll("'safe'", "'@/modules/nuvemshop/__missing-adapter'")}`,
      ],
      ['src/__fixture-capability-safe.ts', 'export const loader = (value: string) => value;'],
    ])
    const environment = sourceEnvironment(sources, clients)
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    for (const filename of clients.keys()) {
      const collected = dependencies(
        program.getSourceFile(path.join(projectRoot, filename))!,
        program.getTypeChecker(),
      )
      expect(collected.filter((edge) => ts.isCallExpression(edge.node) || edge.unproven)).toEqual(
        [],
      )
    }
    expect(() => assertBoundary(sources, clients)).not.toThrow()
    expect(() => assertClientIsolation(environment)).not.toThrow()
  })

  it('excludes property-name and type-only require tokens from runtime capability references', () => {
    const sources = readSources()
    const clients = new Map([
      [
        'src/__fixture-capability-client.ts',
        "'use client'; export {}; const obj = { require: (value: string) => value }; obj.require('./__missing'); type Loader = typeof require;",
      ],
    ])
    const environment = sourceEnvironment(sources, clients)
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    expect(
      dependencies(
        program.getSourceFile(path.join(projectRoot, 'src/__fixture-capability-client.ts'))!,
        program.getTypeChecker(),
      ),
    ).toEqual([])
    expect(() => assertBoundary(sources, clients)).not.toThrow()
  })

  it.each([
    ['RCALL-01', "require.call(null, '@/modules/nuvemshop/__fixture-contracts')"],
    ['RCALL-02', "(require).call(null, '@/modules/nuvemshop/__fixture-contracts')"],
    ['RCALL-03', "require!.call(null, '@/modules/nuvemshop/__fixture-contracts')"],
    [
      'RCALL-04',
      "(require as typeof require).call(null, '@/modules/nuvemshop/__fixture-contracts')",
    ],
    [
      'RCALL-05',
      "(((<typeof require>(require as typeof require)) satisfies typeof require)!).call(null, '@/modules/nuvemshop/__fixture-contracts')",
    ],
  ])('%s rejects diagnostics-clean direct require.call of adapter code', (_id, expression) => {
    const sources = readSources()
    sources.set('__fixture-contracts.ts', "import 'server-only'\nexport const id = 'adapter'")
    const name = 'src/__fixture-client.ts'
    const filename = path.join(projectRoot, name)
    const clients = new Map([[name, `'use client';\nexports.observed = ${expression}.id;`]])
    const environment = sourceEnvironment(sources, clients)
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    // Full-boundary assertion comes first so RED proves the actual harness bypass.
    expect(() => assertBoundary(sources, clients)).toThrow(
      /client runtime\/type dependency reaches adapter/,
    )
    expect(() => assertClientIsolation(environment)).toThrow(
      /client runtime\/type dependency reaches adapter/,
    )
    const collected = dependencies(program.getSourceFile(filename)!)
    const bare = ts.createSourceFile(
      filename,
      "require('@/modules/nuvemshop/__fixture-contracts')",
      ts.ScriptTarget.Latest,
      true,
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]!.runtime).toBe(true)
    expect(collected[0]!.unproven).not.toBe(true)
    expect(environment.resolve(collected[0]!.name, filename)).toBe(
      environment.resolve(dependencies(bare)[0]!.name, filename),
    )
    expect(environment.resolve(collected[0]!.name, filename)).toBe(
      path.join(moduleRoot, '__fixture-contracts.ts'),
    )
  })

  it.each([
    [
      'RCALL-06',
      "const dynamicSpecifier: string = '@/modules/nuvemshop/__fixture-contracts'; require.call(null, dynamicSpecifier)",
    ],
    ['RPROP-01', "require.apply(null, ['@/modules/nuvemshop/__fixture-contracts'])"],
    ['RPROP-02', "require.bind(null, '@/modules/nuvemshop/__fixture-contracts')"],
    [
      'RPROP-03',
      "declare namespace NodeJS { interface Require { foo(name: string): unknown } }\nrequire.foo('@/modules/nuvemshop/__fixture-contracts')",
    ],
    ['RPROP-04', "require['call'](null, '@/modules/nuvemshop/__fixture-contracts')"],
    [
      'RCALL-MISSING',
      // Widen the fixture's call signature so fail-closed behavior is proved
      // independently of TypeScript's usual missing-argument diagnostic.
      'declare namespace NodeJS { interface Require { call(thisArg: unknown): unknown } }\nrequire.call(null)',
    ],
  ])('%s rejects diagnostics-clean unproven direct require invocation', (_id, statement) => {
    const sources = readSources()
    sources.set('__fixture-contracts.ts', "import 'server-only'\nexport const id = 'adapter'")
    const name = 'src/__fixture-client.ts'
    const filename = path.join(projectRoot, name)
    const clients = new Map([[name, `'use client';\n${statement};`]])
    const environment = sourceEnvironment(sources, clients)
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    expect(() => assertBoundary(sources, clients)).toThrow(/unproven computed client dependency/)
    expect(() => assertClientIsolation(environment)).toThrow(/unproven computed client dependency/)
    const collected = dependencies(program.getSourceFile(filename)!)
    expect(collected).toHaveLength(1)
    expect(collected[0]).toMatchObject({ name: '', runtime: true, unproven: true })
  })

  it('allows static direct require.call of unrelated project code', () => {
    const name = 'src/__fixture-client.ts'
    const clients = new Map([
      [
        name,
        "'use client';\nexports.observed = (((<typeof require>(require as typeof require)) satisfies typeof require)!).call({ ignored: true }, ((`./__fixture-safe`))).id;",
      ],
      ['src/__fixture-safe.ts', 'export const id = 1'],
    ])
    const environment = sourceEnvironment(readSources(), clients)
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    assertBoundary(readSources(), clients)
    expect(assertClientIsolation(environment).codeEdges).toEqual([
      {
        importer: path.join(projectRoot, name),
        name: './__fixture-safe',
        target: path.join(projectRoot, 'src/__fixture-safe.ts'),
      },
    ])
  })

  it.each([
    ['TR-01', "require!('@/modules/nuvemshop/__fixture-contracts')"],
    ['TR-02', "(require!)('@/modules/nuvemshop/__fixture-contracts')"],
    ['TR-03', "((require)!)('@/modules/nuvemshop/__fixture-contracts')"],
    ['TR-04', "(((require as typeof require)!)!)('@/modules/nuvemshop/__fixture-contracts')"],
    ['TR-05', "((require as typeof require))('@/modules/nuvemshop/__fixture-contracts')"],
    ['TR-06', "((require satisfies typeof require))('@/modules/nuvemshop/__fixture-contracts')"],
    ['TR-07', "(<typeof require>require)('@/modules/nuvemshop/__fixture-contracts')"],
  ])(
    '%s rejects diagnostics-clean transparent direct require of adapter code',
    (_id, expression) => {
      const sources = readSources()
      sources.set('__fixture-contracts.ts', "import 'server-only'\nexport const id = 'adapter'")
      // A .ts source also supports the angle-bracket TypeAssertionExpression.
      const name = 'src/__fixture-client.ts'
      const filename = path.join(projectRoot, name)
      const source = `'use client';\nexports.observed = ${expression}.id;`
      const clients = new Map([[name, source]])
      const environment = sourceEnvironment(sources, clients)
      const program = ts.createProgram(
        [...environment.files.keys()],
        { ...compilerOptions, incremental: false },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      expect(() => assertClientIsolation(environment)).toThrow(
        /client runtime\/type dependency reaches adapter/,
      )
      expect(() => assertBoundary(sources, clients)).toThrow(
        /client runtime\/type dependency reaches adapter/,
      )
      const collected = dependencies(program.getSourceFile(filename)!)
      const bare = ts.createSourceFile(
        filename,
        "require('@/modules/nuvemshop/__fixture-contracts')",
        ts.ScriptTarget.Latest,
        true,
      )
      expect(collected).toHaveLength(1)
      expect(collected[0]!.runtime).toBe(true)
      expect(environment.resolve(collected[0]!.name, filename)).toBe(
        environment.resolve(dependencies(bare)[0]!.name, filename),
      )
      expect(environment.resolve(collected[0]!.name, filename)).toBe(
        path.join(moduleRoot, '__fixture-contracts.ts'),
      )
    },
  )

  it('allows transparent direct require wrappers for unrelated project code', () => {
    const name = 'src/__fixture-client.ts'
    const clients = new Map([
      [
        name,
        "'use client';\nexports.observed = (((<typeof require>(require as typeof require)) satisfies typeof require)!)('./__fixture-safe').id;",
      ],
      ['src/__fixture-safe.ts', 'export const id = 1'],
    ])
    const environment = sourceEnvironment(readSources(), clients)
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    assertBoundary(readSources(), clients)
    const inventory = assertClientIsolation(environment)
    expect(inventory.codeEdges).toEqual([
      {
        importer: path.join(projectRoot, name),
        name: './__fixture-safe',
        target: path.join(projectRoot, 'src/__fixture-safe.ts'),
      },
    ])
  })

  it.each([
    ['REQ-PAREN-01', "(require)('@/modules/nuvemshop/__fixture-contracts')"],
    ['REQ-PAREN-02', "((require))('@/modules/nuvemshop/__fixture-contracts')"],
    ['REQ-PAREN-03', "(((require)))('@/modules/nuvemshop/__fixture-contracts')"],
    ['REQ-PAREN-04', "(require)(('@/modules/nuvemshop/__fixture-contracts'))"],
    ['REQ-PAREN-05', "((require))((('@/modules/nuvemshop/__fixture-contracts')))"],
  ])('%s rejects adapter ownership through transparent require parentheses', (_id, expression) => {
    const sources = readSources()
    sources.set('__fixture-contracts.ts', "import 'server-only'\nexport type ProductId = string")
    const filename = path.join(projectRoot, 'src/__fixture-client.tsx')
    const source = `'use client';\n${expression}`
    const clients = new Map([['src/__fixture-client.tsx', source]])
    const environment = sourceEnvironment(sources, clients)
    expect(() => assertClientIsolation(environment)).toThrow(
      /client runtime\/type dependency reaches adapter/,
    )
    expect(() => assertBoundary(sources, clients)).toThrow(
      /client runtime\/type dependency reaches adapter/,
    )
    const bare = ts.createSourceFile(
      filename,
      "require('@/modules/nuvemshop/__fixture-contracts')",
      ts.ScriptTarget.Latest,
      true,
    )
    const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true)
    const collected = dependencies(parsed)
    expect(collected).toHaveLength(1)
    expect(collected[0]!.runtime).toBe(true)
    expect(environment.resolve(collected[0]!.name, filename)).toBe(
      environment.resolve(dependencies(bare)[0]!.name, filename),
    )
    expect(environment.resolve(collected[0]!.name, filename)).toBe(
      path.join(moduleRoot, '__fixture-contracts.ts'),
    )
  })

  it('allows a parenthesized direct require of an unrelated project dependency', () => {
    const clients = new Map([
      ['src/__fixture-client.tsx', "'use client';\n((require))((('./__fixture-safe')))"],
      ['src/__fixture-safe.ts', 'export const id = 1'],
    ])
    assertBoundary(readSources(), clients)
    const inventory = assertClientIsolation(sourceEnvironment(readSources(), clients))
    expect(inventory.codeEdges).toEqual([
      {
        importer: path.join(projectRoot, 'src/__fixture-client.tsx'),
        name: './__fixture-safe',
        target: path.join(projectRoot, 'src/__fixture-safe.ts'),
      },
    ])
  })

  it.each([
    [
      'NL-01 alias',
      "import type { Adapter } from '@/modules/nuvemshop/__fixture-contract'; export type Result = Adapter",
    ],
    [
      'NL-02 interface extends alias',
      "import type { Adapter } from '@/modules/nuvemshop/__fixture-contract'; type Alias = Adapter; export interface Result extends Alias {}",
    ],
    [
      'NL-03 Pick',
      "import type { Adapter } from '@/modules/nuvemshop/__fixture-contract'; export type Result = Pick<Adapter, 'id'>",
    ],
    [
      'NL-04 ReturnType',
      "import type { owner } from '@/modules/nuvemshop/__fixture-contract'; export type Result = ReturnType<typeof owner>",
    ],
    [
      'NL-05 namespace',
      "import type * as Contracts from '@/modules/nuvemshop/__fixture-contract'; export type Result = Contracts.Adapter",
    ],
    ['NL-06 barrel chain', "export type { Result } from './__fixture-barrel'"],
    [
      'NL-07 configured alias wrapper',
      "export type { Adapter as Result } from '@/modules/nuvemshop/__fixture-contract'",
    ],
    [
      'NL-08 ImportType wrapper',
      "export type Result = import('@/modules/nuvemshop/__fixture-contract').Adapter",
    ],
    [
      'NL-09 relative export type wrapper',
      "export type { Adapter as Result } from './modules/nuvemshop/__fixture-contract'",
    ],
    ['NL-10 star reexport', "export * from '@/modules/nuvemshop/__fixture-contract'"],
    [
      'NL-11 namespace reexport',
      "export type * as Result from '@/modules/nuvemshop/__fixture-contract'",
    ],
    [
      'NL-12 explicit JS to TS',
      "export type { Adapter as Result } from '@/modules/nuvemshop/__fixture-contract.js'",
    ],
  ])('%s blocks by source dependency', (_description, wrapper) => {
    const sources = readSources()
    sources.set(
      '__fixture-contract.ts',
      "import 'server-only'\nexport type Adapter = { id: string }; export function owner() { return { id: '' } }",
    )
    const clients: Sources = new Map([
      [
        'src/__fixture-client.tsx',
        "'use client'\nimport type * as Contract from '@/__fixture-wrapper'; void (null as unknown as Contract.Result)",
      ],
      ['src/__fixture-wrapper.ts', wrapper],
      [
        'src/__fixture-barrel.ts',
        "export type { Adapter as Result } from '@/modules/nuvemshop/__fixture-contract'",
      ],
    ])
    expect(() => assertClientIsolation(sourceEnvironment(sources, clients))).toThrow(
      /client runtime\/type dependency reaches adapter/,
    )
  })

  it.each([
    "import '@/modules/nuvemshop'",
    "import type { Contract } from '@/modules/nuvemshop'",
    "export type * from '@/modules/nuvemshop'",
    "export * as Contract from '@/modules/nuvemshop'",
    "type Contract = typeof import('@/modules/nuvemshop')",
    "import Contract = require('@/modules/nuvemshop')",
    "const contract = import('@/modules/nuvemshop')",
    "const contract = require('@/modules/nuvemshop')",
    'const contract = require((`@/modules/nuvemshop`))',
  ])('isolates conventional runtime/type edge %s', (statement) => {
    const clients = new Map([['src/__fixture-client.tsx', `'use client'\n${statement}`]])
    expect(() => assertClientIsolation(sourceEnvironment(readSources(), clients))).toThrow(
      /client runtime\/type dependency reaches adapter/,
    )
  })

  it.each([false, true])('terminates canonical graph cycles (adapter branch: %s)', (adapter) => {
    const clients = new Map([
      ['src/__fixture-client.tsx', "'use client'\nimport './__fixture-cycle-a.js'"],
      ['src/__fixture-cycle-a.ts', "export * from './__fixture-cycle-b'"],
      [
        'src/__fixture-cycle-b.ts',
        `export * from './__fixture-cycle-a'${adapter ? "\nexport * from '@/modules/nuvemshop'" : ''}`,
      ],
    ])
    const check = () => assertClientIsolation(sourceEnvironment(readSources(), clients))
    if (adapter) expect(check).toThrow(/client runtime\/type dependency reaches adapter/)
    else expect(check().codeEdges).toHaveLength(3)
  })

  it.each([
    'const value = import(cssVariable)',
    'const value = require(cssVariable)',
    'const value = import(`./${name}.css`)',
    'const value = require()',
  ])('rejects unproven loader in checked client wrapper: %s', (statement) => {
    const clients = new Map([
      ['src/__fixture-client.tsx', "'use client'\nimport './__fixture-wrapper'"],
      ['src/__fixture-wrapper.ts', statement],
    ])
    expect(() => assertClientIsolation(sourceEnvironment(readSources(), clients))).toThrow(
      /unproven computed client dependency/,
    )
  })

  it('allows unrelated client type expressions and a server consumer adapter dependency', () => {
    const clients = new Map([
      ['src/__fixture-client.tsx', "'use client'\nimport type { Result } from './__fixture-safe'"],
      [
        'src/__fixture-safe.ts',
        'type Local = { id: string }; type Generic<T> = T; type Conditional<T> = T extends string ? Local : never; export type Result = { [K in keyof Local]: Generic<Conditional<Local[K]>> }',
      ],
      ['src/__fixture-server.ts', "import type { Owner } from '@/modules/nuvemshop/server'"],
    ])
    expect(() => assertClientIsolation(sourceEnvironment(readSources(), clients))).not.toThrow()
  })

  it('treats exact CSS as terminal without reading or parsing code-looking contents', () => {
    const clients = new Map([
      ['src/__fixture-client.tsx', "'use client'\nimport '@/__fixture-wrapper.css'"],
      [
        'src/__fixture-wrapper.css',
        "'use client'\nimport '@/modules/nuvemshop'; const value = import(variable)",
      ],
    ])
    const environment = sourceEnvironment(readSources(), clients)
    const read = vi.spyOn(environment.host, 'readFile')
    const inventory = assertClientIsolation(environment)
    expect(inventory.terminalCssEdges).toHaveLength(1)
    expect(read.mock.calls.some(([filename]) => filename.endsWith('__fixture-wrapper.css'))).toBe(
      false,
    )
  })

  it.each([
    './__fixture-fake.css',
    '@/modules/nuvemshop/fake.css',
    './__fixture-style.scss',
    './__fixture-style.svg',
    './__fixture-style.css?raw',
    './__fixture-style',
    './__fixture-style.css.ts',
    'unconfigured/__fixture-style.css',
    'package/__fixture-style.css',
  ])('keeps missing, unsupported and code edges fail-closed: %s', (specifier) => {
    const clients = new Map([
      ['src/__fixture-client.tsx', `'use client'\nimport '${specifier}'`],
      ['src/__fixture-style.css', 'body {}'],
    ])
    expect(() => assertClientIsolation(sourceEnvironment(readSources(), clients))).toThrow(
      /unresolved project-local dependency/,
    )
  })

  it('rejects multiple viable CSS alias targets and requires an exact CSS file', () => {
    const clients = new Map([
      ['src/__fixture-first/style.css', 'body {}'],
      ['src/__fixture-second/style.css', 'body {}'],
      ['src/__fixture-directory.css/child.ts', 'export {}'],
    ])
    const { host } = sourceEnvironment(readSources(), clients)
    const importer = path.join(projectRoot, 'src/__fixture-client.tsx')
    const options = {
      ...compilerOptions,
      paths: { '__fixture/*': ['./src/__fixture-first/*', './src/__fixture-second/*'] },
    }
    expect(resolveCssAsset('__fixture/style.css', importer, host, options)).toEqual({
      target: undefined,
      ambiguous: true,
    })
    expect(resolveCssAsset('./__fixture-directory.css', importer, host).target).toBeUndefined()
    expect(resolveCssAsset('../../../../outside.css', importer, host).target).toBeUndefined()
  })

  it('inventories actual repository client closures with the real terminal CSS edge', () => {
    const clients = new Map(
      [...readSources(path.join(projectRoot, 'src'))].map(([name, source]) => [
        path.join('src', name),
        source,
      ]),
    )
    const inventory = assertClientIsolation(sourceEnvironment(readSources(), clients))
    expect(inventory.clientRoots.length).toBeGreaterThan(0)
    expect(inventory.terminalCssEdges).toContainEqual({
      importer: path.join(projectRoot, 'src/app/global-error.tsx'),
      name: '@/styles/globals.css',
      target: path.join(projectRoot, 'src/styles/globals.css'),
    })
  })

  it.each([
    ['CSS-01 existing relative CSS', './__fixture-style.css', 'src/__fixture-style.css', true],
    [
      'CSS-02 existing configured-alias CSS',
      '@/styles/__fixture-style.css',
      'src/styles/__fixture-style.css',
      true,
    ],
    ['CSS-03 missing relative CSS', './__fixture-missing.css', undefined, false],
    ['CSS-04 missing alias CSS', '@/styles/__fixture-missing.css', undefined, false],
    ['CSS-05 unresolved code', './__fixture-missing.js', undefined, false],
    ['CSS-06 adapter code', '@/modules/nuvemshop/index.js', undefined, false],
    [
      'CSS-07 adapter-like CSS filename',
      './__fixture-nuvemshop-server.css',
      'src/__fixture-nuvemshop-server.css',
      true,
    ],
  ] as const)('%s', (_description, specifier, asset, allowed) => {
    const clients: Sources = new Map([
      ['src/__fixture-client.tsx', `'use client'\nimport '${specifier}'`],
    ])
    if (asset) clients.set(asset, 'body { color: black }')
    const check = () => assertClientIsolation(sourceEnvironment(readSources(), clients))
    if (allowed) expect(check).not.toThrow()
    else
      expect(check).toThrow(
        /unresolved project-local dependency|client runtime\/type dependency reaches adapter/,
      )
  })

  it.each([
    [
      'RED-ARCH-01 harmless adapter type is rejected by ownership',
      "import type { ProductId } from '@/modules/nuvemshop/__fixture-contracts'",
      [],
    ],
    [
      'RED-ARCH-02 known keyof OwnerFactory is rejected by dependency, without evaluating keyof',
      "import type { OwnerFactory } from '@/modules/nuvemshop/__fixture-contracts'",
      [],
    ],
    [
      'RED-ARCH-03 client wrapper adapter type-only closure',
      "import type { ProductId } from './__fixture-wrapper'",
      [
        [
          'src/__fixture-wrapper.ts',
          "import type { ProductId as AdapterId } from '@/modules/nuvemshop/__fixture-contracts'; export type ProductId = AdapterId",
        ],
      ],
    ],
    [
      'RED-ARCH-04 barrel namespace adapter reexport closure',
      "import type { Contracts } from './__fixture-barrel'",
      [
        [
          'src/__fixture-barrel.ts',
          "export type * as Contracts from '@/modules/nuvemshop/__fixture-contracts'",
        ],
      ],
    ],
    [
      'RED-ARCH-05 client ImportTypeNode adapter closure',
      "type ProductId = import('@/modules/nuvemshop/__fixture-contracts').ProductId",
      [],
    ],
  ] as const)('%s', (_description, statement, wrappers) => {
    const sources = readSources()
    sources.set(
      '__fixture-contracts.ts',
      `import 'server-only'
export type ProductId = string
type Select<T extends boolean, U> = T extends true ? U[keyof U] : { id: string }
export type OwnerFactory = <T extends boolean>() => Select<T, { owner: { contactEmail: string } }>`,
    )
    const clients: Sources = new Map([
      ['src/__fixture-client.tsx', `'use client'\n${statement}`],
      ...wrappers,
    ])
    expect(() => assertBoundary(sources, clients)).toThrow(
      /client runtime\/type dependency reaches adapter/,
    )
  })

  it('preserves required entrypoints, explicit markers and dependency direction as owners add files', () => {
    assertBoundary(
      readSources(),
      new Map(
        [...readSources(path.join(projectRoot, 'src'))].map(([name, source]) => [
          path.join('src', name),
          source,
        ]),
      ),
    )
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

  it('allows guarded normalized contracts for server consumers', () => {
    const sources = readSources()
    sources.set(
      'server/__fixture-owner-contract.ts',
      "import 'server-only'\nexport function ownerContract() { return true }",
    )
    sources.set(
      'server/index.ts',
      `${sources.get('server/index.ts')}\nexport { ownerContract } from './__fixture-owner-contract'`,
    )
    sources.set('types.ts', "import 'server-only'\nexport type OwnerContact = { id: string }")
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
    [
      'GUARD-BIND-RED-01 root edge',
      'index.ts',
      "import 'server-only'; const require = (specifier: string) => specifier; require('./server');",
      /root must depend on server at runtime/,
    ],
    [
      'GUARD-BIND-RED-02 contract guard',
      'server/__fixture-guard-contract.ts',
      "export const ownerContract = true; const require = (specifier: string) => specifier; require('./index');",
      /contracts and secrets must remain server-only/,
    ],
    [
      'GUARD-BIND-RED-03 secret guard',
      'server/__fixture-guard-secret.ts',
      "{ const require = (specifier: string) => specifier; require('./index'); void process.env.NUVEMSHOP_ACCESS_TOKEN; }",
      /contracts and secrets must remain server-only/,
    ],
  ])(
    '%s rejects local require as positive proof through the full boundary',
    (_id, name, source, message) => {
      const sources = readSources()
      sources.set(name, source)
      const environment = sourceEnvironment(sources, new Map())
      const program = ts.createProgram(
        [...environment.files.keys()],
        { ...compilerOptions, incremental: false },
        environment.host,
      )
      expect(ts.getPreEmitDiagnostics(program)).toEqual([])
      expect(() => assertBoundary(sources)).toThrow(message)
    },
  )

  it.each([
    [
      'GUARD-POS-01 static import guard',
      'server/__fixture-guard-contract.ts',
      "import './index'; export const ownerContract = true;",
    ],
    ['GUARD-POS-02 runtime root require', 'index.ts', "import 'server-only'; require('./server');"],
    [
      'GUARD-POS-03 transitive guard',
      'server/__fixture-guard-contract.ts',
      "import './__fixture-guard-bridge'; export const ownerContract = true;",
    ],
    [
      'GUARD-POS-04 local require',
      'server/__fixture-guard-contract.ts',
      "import 'server-only'; const require = (specifier: string) => specifier; require('./__missing'); export const ownerContract = true;",
    ],
    [
      'GUARD-POS-05 ambient require guard',
      'server/__fixture-guard-contract.ts',
      "require('./index'); export const ownerContract = true;",
    ],
  ])('%s retains genuine positive proof through the full boundary', (_id, name, source) => {
    const sources = readSources()
    sources.set(name, source)
    sources.set('server/__fixture-guard-bridge.ts', "import './index';")
    const environment = sourceEnvironment(sources, new Map())
    const program = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(program)).toEqual([])
    expect(() => assertBoundary(sources)).not.toThrow()
  })

  it('GUARD-PROGRAM-IDENTITY collects guard evidence with one Program and its checker', () => {
    const sources = readSources()
    const name = 'server/__fixture-guard-contract.ts'
    sources.set(
      name,
      "import './index'; const require = (specifier: string) => specifier; require('./__missing'); export const ownerContract = true;",
    )
    const environment = sourceEnvironment(sources, new Map())
    const diagnosticsProgram = ts.createProgram(
      [...environment.files.keys()],
      { ...compilerOptions, incremental: false },
      environment.host,
    )
    expect(ts.getPreEmitDiagnostics(diagnosticsProgram)).toEqual([])
    const program = environment.program()
    const checker = program.getTypeChecker()
    const source = program.getSourceFile(path.resolve(moduleRoot, name))!
    expect(environment.program()).toBe(program)
    expect(environment.program().getTypeChecker()).toBe(checker)
    expect(source).toBe(environment.program().getSourceFile(path.resolve(moduleRoot, name)))
    const collected = dependencies(source, checker)
    expect(collected.map(({ name }) => name)).toEqual(['./index'])
    expect(collected.every(({ node }) => node.getSourceFile() === source)).toBe(true)
    const references: ts.Identifier[] = []
    function visit(node: ts.Node) {
      if (ts.isIdentifier(node) && node.text === 'require' && ts.isCallExpression(node.parent))
        references.push(node)
      ts.forEachChild(node, visit)
    }
    visit(source)
    expect(references).toHaveLength(1)
    expect(isProvenLocalRuntimeBinding(references[0]!, checker)).toBe(true)
    expect(
      checker
        .getSymbolAtLocation(references[0]!)!
        .getDeclarations()!
        .every((declaration) => declaration.getSourceFile() === source),
    ).toBe(true)
    expect(() => assertBoundary(sources)).not.toThrow()
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

  it('RED-B rejects TypeScript JS-extension substitution into root', () => {
    const sources = readSources()
    sources.set('server/index.ts', `${sources.get('server/index.ts')}\nimport '../index.js'`)
    expect(() => assertBoundary(sources)).toThrow(/server must not depend on root/)
  })

  it.each([
    'Object.assign(module.exports, { ownerContract: () => true })',
    'Object.assign(exports, { ownerContract: () => true })',
    "Object.defineProperty(module.exports, 'ownerContract', { value: () => true })",
    "Object.defineProperty(exports, 'ownerContract', { value: () => true })",
  ])('RED-C rejects conventional call facade: %s', (source) => {
    const sources = readSources()
    sources.set('owner.cjs', source)
    expect(() => assertBoundary(sources)).toThrow(/contracts and secrets must remain server-only/)
  })

  it.each([
    ['../index', 'index.ts'],
    ['..', 'index.ts'],
    ['../index.js', 'index.ts'],
    ['../__fixture-esm.mjs', '__fixture-esm.mts'],
    ['../__fixture-common.cjs', '__fixture-common.cts'],
    [publicEntry, 'index.ts'],
    [serverEntry, 'server/index.ts'],
    ['@/modules/nuvemshop/index.js', 'index.ts'],
  ])('uses compiler resolution for %s → %s in synthetic Sources', (name, target) => {
    const sources = readSources()
    sources.set('__fixture-esm.mts', 'export {}')
    sources.set('__fixture-common.cts', 'export {}')
    const environment = sourceEnvironment(sources, new Map())
    expect(environment.resolve(name, path.join(moduleRoot, 'server/index.ts'))).toBe(
      path.join(moduleRoot, target),
    )
  })

  it('does not restore deleted candidate files from physical module sources', () => {
    const sources = readSources()
    sources.delete('index.ts')
    expect(
      sourceEnvironment(sources, new Map()).resolve(
        '../index.js',
        path.join(moduleRoot, 'server/index.ts'),
      ),
    ).toBeUndefined()
  })

  it.each([
    "import '../index.js'",
    "export * from '../index.js'",
    "import type { X } from '../index.js'",
    "import '@/modules/nuvemshop/index.js'",
    "export * from '@/modules/nuvemshop/index.js'",
    "import type { X } from '@/modules/nuvemshop/index.js'",
    "import type { X } from '@/modules/nuvemshop'",
  ])('blocks resolved server → root mutation: %s', (statement) => {
    const sources = readSources()
    sources.set('server/index.ts', `${sources.get('server/index.ts')}\n${statement}`)
    expect(() => assertBoundary(sources)).toThrow(/server must not depend on root/)
  })

  it('preserves exported internal PII contracts for server consumers', () => {
    const sources = readSources()
    sources.set(
      'types.ts',
      "import 'server-only'\nexport interface OwnerContact { contactEmail: string }",
    )
    sources.set(
      'server/__fixture-contract.ts',
      "import 'server-only'\nimport type { OwnerContact } from '../types'\nexport function ownerContract(): OwnerContact { return { contactEmail: '' } }",
    )
    sources.set(
      'server/index.ts',
      `${sources.get('server/index.ts')}\nexport { ownerContract } from './__fixture-contract'`,
    )
    assertBoundary(sources)
  })

  it.each([
    "import '@/modules/nuvemshop'",
    "import '@/modules/nuvemshop/server'",
    "export * from '@/modules/nuvemshop/server'",
    "const owner = import('@/modules/nuvemshop/types')",
    "const owner = require('@/modules/nuvemshop/types')",
  ])('blocks client runtime module imports: %s', (statement) => {
    const sources = readSources()
    sources.set('types.ts', "import 'server-only'\nexport type Product = { id: string }")
    expect(() =>
      assertBoundary(
        sources,
        new Map([['src/__fixture-client.tsx', `'use client'\n${statement}`]]),
      ),
    ).toThrow(/client runtime\/type dependency reaches adapter/)
  })

  it('does not treat directive-like text as a client importer', () => {
    const sources = readSources()
    sources.set('types.ts', "import 'server-only'\nexport type Contact = { contactEmail: string }")
    const clients = new Map([
      [
        'src/__fixture-server.ts',
        "// 'use client'\nconst text = 'use client'; void text\nimport type { Contact } from '@/modules/nuvemshop/types'",
      ],
    ])
    assertBoundary(sources, clients)
  })

  it.each([
    'Object.assign(module.exports, { ownerContract() {} })',
    'Object.assign(exports, { ownerContract() {} })',
    'Object.defineProperties(module.exports, { ownerContract: { value: () => true } })',
    'Object.defineProperties(exports, { ownerContract: { value: () => true } })',
    "Reflect.defineProperty(module.exports, 'ownerContract', { value: () => true })",
    "Reflect.defineProperty(exports, 'ownerContract', { value: () => true })",
    "Object['assign'](module.exports, { ownerContract() {} })",
    "Object[('assign')](module[('exports')], { ownerContract() {} })",
    '(Object[((`assign`))])((module.exports), { ownerContract() {} })',
    "Object[('defineProperty')]((exports), 'ownerContract', { value: () => true })",
    "Reflect[`defineProperty`](module[((('exports')))], 'ownerContract', { value: () => true })",
    'Object.assign(module.exports.ownerContract, { method() {} })',
  ])('rejects conventional static call-based CommonJS mutations: %s', (statement) => {
    for (const extension of ['js', 'cjs']) {
      const sources = readSources()
      sources.set(`owner.${extension}`, statement)
      expect(() => assertBoundary(sources)).toThrow(/contracts and secrets must remain server-only/)
    }
  })

  it.each([
    '// Object.assign(module.exports, { ownerContract() {} })',
    "/* Object.defineProperty(exports, 'ownerContract', {}) */",
    'const text = "Object.assign(module.exports, {})"; void text',
    'const text = `Reflect.defineProperty(exports, "ownerContract", {})`; void text',
    'const otherObject = {}; Object.assign(otherObject, { ownerContract() {} })',
    "const otherObject = {}; Object.defineProperty(otherObject, 'ownerContract', { value: () => true })",
    'const otherObject = {}; Object.defineProperties(otherObject, { ownerContract: { value: () => true } })',
    "const otherObject = {}; Reflect.defineProperty(otherObject, 'ownerContract', { value: () => true })",
  ])('allows call-like text and unrelated mutation targets: %s', (source) => {
    const sources = readSources()
    sources.set('owner.cjs', source)
    assertBoundary(sources)
  })

  it('resolves virtual intermediary directories before filesystem fallback', () => {
    const sources = readSources()
    const clients = new Map([
      ['src/__fixture-virtual/types.ts', 'export type Product = { id: string }'],
    ])
    expect(
      sourceEnvironment(sources, clients).resolve(
        './__fixture-virtual/types.js',
        path.join(projectRoot, 'src/__fixture-client.ts'),
      ),
    ).toBe(path.join(projectRoot, 'src/__fixture-virtual/types.ts'))
  })
})
