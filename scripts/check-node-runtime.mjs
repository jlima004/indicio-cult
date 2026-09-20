import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function parseVersion(value, label) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim())
  if (!match) throw new Error(`${label} deve conter uma versão semver concreta`)

  return match.slice(1).map(Number)
}

function compareVersions(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index] - right[index]
    if (difference !== 0) return Math.sign(difference)
  }

  return 0
}

function parseRangeVersion(value) {
  const normalized = value.replace(/^v/, '')
  const parts = normalized.split('.')
  if (parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error(`versão inválida na faixa: ${value}`)
  }

  return {
    precision: parts.length,
    version: [...parts.map(Number), 0, 0].slice(0, 3),
  }
}

function satisfiesComparator(version, comparator) {
  if (comparator === '*' || /^x$/i.test(comparator)) return true

  const match = /^(>=|<=|>|<|\^|~|=)?(v?\d+(?:\.\d+){0,2})$/.exec(comparator)
  if (!match) throw new Error(`comparador de engine não suportado: ${comparator}`)

  const operator = match[1] ?? ''
  const { precision, version: boundary } = parseRangeVersion(match[2])
  const comparison = compareVersions(version, boundary)

  if (operator === '>=') return comparison >= 0
  if (operator === '<=') return comparison <= 0
  if (operator === '>') return comparison > 0
  if (operator === '<') return comparison < 0
  if (operator === '=') return comparison === 0

  if (operator === '^') {
    const upper =
      boundary[0] > 0
        ? [boundary[0] + 1, 0, 0]
        : boundary[1] > 0
          ? [0, boundary[1] + 1, 0]
          : [0, 0, boundary[2] + 1]
    return comparison >= 0 && compareVersions(version, upper) < 0
  }

  if (operator === '~') {
    const upper = precision === 1 ? [boundary[0] + 1, 0, 0] : [boundary[0], boundary[1] + 1, 0]
    return comparison >= 0 && compareVersions(version, upper) < 0
  }

  if (precision === 1) return version[0] === boundary[0]
  if (precision === 2) return version[0] === boundary[0] && version[1] === boundary[1]
  return comparison === 0
}

function satisfiesRange(version, range) {
  return range.split('||').some((alternative) => {
    const normalized = alternative.trim().replace(/([<>]=?|[=~^])\s+/g, '$1')
    if (normalized === '') return false
    return normalized.split(/\s+/).every((comparator) => satisfiesComparator(version, comparator))
  })
}

function matchesPlatform(constraints, value) {
  if (!Array.isArray(constraints) || constraints.length === 0) return true
  if (constraints.includes(`!${value}`)) return false
  const allowed = constraints.filter((constraint) => !constraint.startsWith('!'))
  return allowed.length === 0 || allowed.includes(value)
}

function isApplicablePackage(root, packagePath, metadata) {
  if (!matchesPlatform(metadata.os, process.platform)) return false
  if (!matchesPlatform(metadata.cpu, process.arch)) return false
  if (metadata.optional && !existsSync(path.join(root, packagePath))) return false
  return true
}

function validateLockedEngines(root, engine, minimum, pin, running) {
  const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
  const errors = []
  const lockedEngine = lock.packages?.['']?.engines?.node

  if (lockedEngine !== engine) {
    errors.push(
      `package-lock.json declara engines.node ${String(lockedEngine)}, esperado ${engine}`,
    )
  }

  for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
    if (packagePath === '' || !metadata?.engines?.node) continue
    if (!isApplicablePackage(root, packagePath, metadata)) continue

    const packageName = packagePath.replace(/^node_modules\//, '')
    const dependencyEngine = metadata.engines.node

    try {
      if (!satisfiesRange(minimum, dependencyEngine)) {
        errors.push(
          `${packageName} não aceita o piso ${minimum.join('.')} declarado: ${dependencyEngine}`,
        )
      }
      if (!satisfiesRange(pin, dependencyEngine)) {
        errors.push(`${packageName} não aceita o pin ${pin.join('.')}: ${dependencyEngine}`)
      }
      if (!satisfiesRange(running, dependencyEngine)) {
        errors.push(
          `${packageName} não aceita o Node em execução ${running.join('.')}: ${dependencyEngine}`,
        )
      }
    } catch (error) {
      errors.push(
        `${packageName} tem engines.node inválido (${dependencyEngine}): ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return errors
}

export function validateNodeRuntime(root = process.cwd(), currentNode = process.versions.node) {
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  const nvmVersion = readFileSync(path.join(root, '.nvmrc'), 'utf8').trim()
  const nodeVersion = readFileSync(path.join(root, '.node-version'), 'utf8').trim()
  const engine = packageJson.engines?.node
  const errors = []

  if (nvmVersion !== nodeVersion) {
    errors.push(`.nvmrc (${nvmVersion}) difere de .node-version (${nodeVersion})`)
  }

  const engineMatch = typeof engine === 'string' ? /^>=(\d+\.\d+\.\d+) <23$/.exec(engine) : null
  if (!engineMatch) {
    errors.push('engines.node deve usar o formato ">=22.x.y <23"')
    return errors
  }

  const minimum = parseVersion(engineMatch[1], 'engines.node')
  const pin = parseVersion(nvmVersion, '.nvmrc')
  const running = parseVersion(currentNode, 'Node em execução')

  if (minimum[0] !== 22) errors.push('engines.node deve começar na major 22')
  if (pin[0] !== 22 || compareVersions(pin, minimum) < 0) {
    errors.push(`o pin ${nvmVersion} não satisfaz ${engine}`)
  }
  if (running[0] !== 22 || compareVersions(running, minimum) < 0) {
    errors.push(`o Node em execução (${currentNode}) não satisfaz ${engine}`)
  }

  errors.push(...validateLockedEngines(root, engine, minimum, pin, running))

  return errors
}

function runCli(root) {
  try {
    const errors = validateNodeRuntime(root)
    for (const error of errors) console.error(error)
    return errors.length === 0 ? 0 : 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 2
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined
if (entryPoint === import.meta.url) {
  process.exitCode = runCli(process.argv[2] ? path.resolve(process.argv[2]) : process.cwd())
}
