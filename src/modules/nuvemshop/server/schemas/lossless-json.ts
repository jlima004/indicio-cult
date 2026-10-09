import 'server-only'

import { failProtocol } from './fail'

const MAX_RAW_CHARS = 1_048_576
const SAFE_INTEGER_CEILING = '9007199254740991'
const INTEGER_LEXEME = /^-?(?:0|[1-9]\d*)$/

function exceedsSafeInteger(digits: string): boolean {
  if (digits.length > SAFE_INTEGER_CEILING.length) return true
  if (digits.length < SAFE_INTEGER_CEILING.length) return false
  return digits > SAFE_INTEGER_CEILING
}

/**
 * Unsafe integer lexemes become bigint from `context.source`.
 * TypeScript 5.9 types JSON.parse's reviver with two parameters; Node 22 still
 * passes the source text as the third argument. Strings, fractions, and
 * exponents are left unchanged. Invalid JSON never reaches this function.
 */
function reviveLosslessInteger(
  _key: string,
  value: unknown,
  context?: { readonly source?: string },
): unknown {
  if (typeof value !== 'number') return value
  const source = context?.source
  if (source === undefined) {
    if (!Number.isSafeInteger(value)) throw new Error('incompatible')
    return value
  }
  if (!INTEGER_LEXEME.test(source)) return value
  const digits = source.startsWith('-') ? source.slice(1) : source
  if (!exceedsSafeInteger(digits)) return value
  return BigInt(source)
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
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function decodeObject(raw: string): Record<string, unknown> {
  const value = decodeLosslessJson(raw)
  if (!isRecord(value)) failProtocol()
  return value
}
