import 'server-only'

import { failProtocol } from './fail'

const MAX_RAW_CHARS = 1_048_576
const SAFE_INTEGER_CEILING = '9007199254740991'

function exceedsSafeInteger(digits: string): boolean {
  if (digits.length > SAFE_INTEGER_CEILING.length) return true
  if (digits.length < SAFE_INTEGER_CEILING.length) return false
  return digits > SAFE_INTEGER_CEILING
}

/** Quote integers JS cannot represent exactly, before JSON.parse. Strings are left untouched. */
export function quoteUnsafeIntegers(raw: string): string {
  let out = ''
  let index = 0
  const at = (position: number) => raw.charAt(position)
  while (index < raw.length) {
    const char = at(index)
    if (char === '"') {
      const start = index
      index += 1
      while (index < raw.length) {
        if (at(index) === '\\') {
          index += 2
          continue
        }
        if (at(index) === '"') {
          index += 1
          break
        }
        index += 1
      }
      out += raw.slice(start, index)
      continue
    }
    if (char === '-' || (char >= '0' && char <= '9')) {
      const next = at(index + 1)
      if (char === '-' && !(next >= '0' && next <= '9')) {
        out += char
        index += 1
        continue
      }
      const start = index
      if (at(index) === '-') index += 1
      const digitsStart = index
      while (index < raw.length && at(index) >= '0' && at(index) <= '9') index += 1
      const digits = raw.slice(digitsStart, index)
      const follower = at(index)
      const integer = follower !== '.' && follower !== 'e' && follower !== 'E' && digits.length > 0
      if (integer && exceedsSafeInteger(digits)) {
        const sign = at(start) === '-' ? '-' : ''
        out += `"${sign}${digits}"`
      } else {
        out += raw.slice(start, index)
      }
      continue
    }
    out += char
    index += 1
  }
  return out
}

export function decodeLosslessJson(raw: string): unknown {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_RAW_CHARS) failProtocol()
  try {
    return JSON.parse(quoteUnsafeIntegers(raw)) as unknown
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
