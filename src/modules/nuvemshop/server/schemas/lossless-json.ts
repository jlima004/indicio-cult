import 'server-only'

import { failProtocol } from './fail'

const MAX_RAW_CHARS = 1_048_576
const SAFE_INTEGER_CEILING = '9007199254740991'
const INTEGER_LEXEME = /^-?(?:0|[1-9]\d*)$/
const unprovenNumeric = Symbol('nuvemshop.unproven-numeric')

function exceedsSafeInteger(digits: string): boolean {
  if (digits.length > SAFE_INTEGER_CEILING.length) return true
  if (digits.length < SAFE_INTEGER_CEILING.length) return false
  return digits > SAFE_INTEGER_CEILING
}

function unprovenJsonNumber(value: number): object {
  const box: object = Object.create(null)
  Object.defineProperty(box, unprovenNumeric, {
    value,
    enumerable: false,
    writable: false,
    configurable: false,
  })
  return Object.freeze(box)
}

function isUnprovenJsonNumber(value: unknown): boolean {
  return typeof value === 'object' && value !== null && unprovenNumeric in value
}

export function readUnprovenJsonNumber(value: unknown): number | undefined {
  if (!isUnprovenJsonNumber(value)) return undefined
  const numeric = (value as { readonly [unprovenNumeric]?: unknown })[unprovenNumeric]
  return typeof numeric === 'number' ? numeric : undefined
}

/**
 * Canonical integer lexemes stay a safe number or become bigint from `context.source`.
 * Fractions, exponents, and numbers without a proven lexeme stay boxed so ID readers
 * cannot treat a rounded JavaScript number as a canonical identifier.
 * TypeScript 5.9 types JSON.parse's reviver with two parameters; Node 22 still
 * passes the source text as the third argument. Invalid JSON never reaches this function.
 */
export function reviveLosslessInteger(
  _key: string,
  value: unknown,
  context?: { readonly source?: string },
): unknown {
  if (typeof value !== 'number') return value
  const source = context?.source
  if (source !== undefined && INTEGER_LEXEME.test(source)) {
    const digits = source.startsWith('-') ? source.slice(1) : source
    if (!exceedsSafeInteger(digits)) return value
    return BigInt(source)
  }
  return unprovenJsonNumber(value)
}

export function decodeLosslessJson(raw: string): unknown {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_RAW_CHARS) failProtocol()
  try {
    return JSON.parse(
      raw,
      reviveLosslessInteger as (this: unknown, key: string, value: unknown) => unknown,
    ) as unknown
  } catch {
    failProtocol()
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !isUnprovenJsonNumber(value)
  )
}

export function decodeObject(raw: string): Record<string, unknown> {
  const value = decodeLosslessJson(raw)
  if (!isRecord(value)) failProtocol()
  return value
}
