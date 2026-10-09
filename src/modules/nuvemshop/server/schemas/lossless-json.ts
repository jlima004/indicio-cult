import 'server-only'

import { failProtocol } from './fail'

const MAX_RAW_CHARS = 1_048_576
const SAFE_INTEGER_CEILING = '9007199254740991'
const MAX_EXPONENT_DIGITS = 9
const INTEGER_LEXEME = /^-?(?:0|[1-9]\d*)$/
const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/
const unprovenNumeric = Symbol('nuvemshop.unproven-numeric')
const unprovenSource = Symbol('nuvemshop.unproven-numeric-source')

function exceedsCeiling(digits: string, ceiling: string): boolean {
  if (digits.length > ceiling.length) return true
  if (digits.length < ceiling.length) return false
  return digits > ceiling
}

function unprovenJsonNumber(source: string | undefined): object {
  const box: object = Object.create(null)
  Object.defineProperty(box, unprovenNumeric, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  })
  Object.defineProperty(box, unprovenSource, {
    value: source,
    enumerable: false,
    writable: false,
    configurable: false,
  })
  return Object.freeze(box)
}

function isUnprovenJsonNumber(value: unknown): boolean {
  return typeof value === 'object' && value !== null && unprovenNumeric in value
}

function readUnprovenJsonNumberSource(value: unknown): string | undefined {
  if (!isUnprovenJsonNumber(value)) return undefined
  const source = (value as { readonly [unprovenSource]?: unknown })[unprovenSource]
  return typeof source === 'string' && source.length > 0 ? source : undefined
}

/**
 * Canonical integer lexemes stay a safe number or become bigint from `context.source`.
 * Fractions, exponents, and numbers without a proven lexeme stay boxed with that source
 * so readers can prove exact integers without trusting a rounded JavaScript number.
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
    if (!exceedsCeiling(digits, SAFE_INTEGER_CEILING)) return value
    return BigInt(source)
  }
  return unprovenJsonNumber(source)
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= '0' && char <= '9'
}

function allZero(digits: string): boolean {
  for (let index = 0; index < digits.length; index += 1) {
    if (digits[index] !== '0') return false
  }
  return true
}

function canonicalDigits(digits: string): string {
  let index = 0
  while (index < digits.length && digits[index] === '0') index += 1
  return index === digits.length ? '0' : digits.slice(index)
}

function boundedExponent(expDigits: string, negative: boolean): number | undefined {
  let index = 0
  while (index < expDigits.length && expDigits[index] === '0') index += 1
  const stripped = expDigits.slice(index)
  if (stripped.length === 0) return 0
  if (stripped.length > MAX_EXPONENT_DIGITS) return undefined
  let magnitude = 0
  for (let cursor = 0; cursor < stripped.length; cursor += 1) {
    magnitude = magnitude * 10 + stripped.charCodeAt(cursor) - 48
  }
  return negative ? -magnitude : magnitude
}

function exactUnsignedIntegerDigits(source: string, maxInclusive: string): string | undefined {
  if (source.length === 0 || source.length > MAX_RAW_CHARS || !JSON_NUMBER.test(source)) {
    return undefined
  }

  let index = 0
  const negative = source[0] === '-'
  if (negative) index += 1

  const intStart = index
  if (source[index] === '0') index += 1
  else while (isDigit(source[index])) index += 1
  const intDigits = source.slice(intStart, index)

  let fracDigits = ''
  if (source[index] === '.') {
    index += 1
    const fracStart = index
    while (isDigit(source[index])) index += 1
    fracDigits = source.slice(fracStart, index)
  }

  let exponent: number | undefined = 0
  if (source[index] === 'e' || source[index] === 'E') {
    index += 1
    let expNegative = false
    if (source[index] === '+' || source[index] === '-') {
      expNegative = source[index] === '-'
      index += 1
    }
    const expStart = index
    while (isDigit(source[index])) index += 1
    exponent = boundedExponent(source.slice(expStart, index), expNegative)
  }
  if (index !== source.length) return undefined

  const significand = intDigits + fracDigits
  if (allZero(significand)) return exceedsCeiling('0', maxInclusive) ? undefined : '0'
  if (negative || exponent === undefined) return undefined

  const point = intDigits.length + exponent
  if (point < 0) return undefined

  let digits: string
  if (point >= significand.length) {
    const extraZeros = point - significand.length
    const body = canonicalDigits(significand)
    if (body.length + extraZeros > maxInclusive.length) return undefined
    digits = extraZeros === 0 ? body : `${body}${'0'.repeat(extraZeros)}`
  } else {
    for (let cursor = point; cursor < significand.length; cursor += 1) {
      if (significand[cursor] !== '0') return undefined
    }
    digits = canonicalDigits(significand.slice(0, point))
  }

  if (exceedsCeiling(digits, maxInclusive)) return undefined
  return digits
}

/**
 * Plain numbers are exact only when `reviveLosslessInteger` already proved a canonical
 * integer lexeme. Boxed tokens are exact only when their preserved source is a
 * mathematical non-negative integer inside `maxInclusive`. Missing source fails closed.
 */
export function readExactUnsignedInteger(value: unknown, maxInclusive: string): string | undefined {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) return undefined
    const digits = String(value)
    if (!INTEGER_LEXEME.test(digits) || exceedsCeiling(digits, maxInclusive)) return undefined
    return digits
  }
  const source = readUnprovenJsonNumberSource(value)
  if (source === undefined) return undefined
  return exactUnsignedIntegerDigits(source, maxInclusive)
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
