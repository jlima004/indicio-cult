import 'server-only'

import type { CanonicalDateTime } from '../types'

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/

function digits(value: string): number | undefined {
  if (!/^\d{1,6}$/.test(value)) return undefined
  let parsed = 0
  for (const char of value) parsed = parsed * 10 + (char.charCodeAt(0) - 48)
  return parsed
}

function milliseconds(fraction: string | undefined): number | undefined {
  if (fraction === undefined) return 0
  const digitsOnly = fraction.slice(1)
  if (digitsOnly.length < 1 || digitsOnly.length > 3) return undefined
  const padded = digitsOnly.padEnd(3, '0')
  return digits(padded)
}

function offsetMinutes(token: string): number | undefined {
  if (token === 'Z') return 0
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(token)
  if (!match) return undefined
  const hours = digits(match[2] ?? '')
  const minutes = digits(match[3] ?? '')
  if (hours === undefined || minutes === undefined || hours > 23 || minutes > 59) return undefined
  const magnitude = hours * 60 + minutes
  return match[1] === '-' ? -magnitude : magnitude
}

export function readDateTime(value: unknown): CanonicalDateTime | undefined {
  if (typeof value !== 'string' || value.length > 40) return undefined
  const match = DATE_TIME.exec(value)
  if (!match) return undefined
  const year = digits(match[1] ?? '')
  const month = digits(match[2] ?? '')
  const day = digits(match[3] ?? '')
  const hour = digits(match[4] ?? '')
  const minute = digits(match[5] ?? '')
  const second = digits(match[6] ?? '')
  const millis = milliseconds(match[7])
  const offset = match[8]
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined ||
    millis === undefined ||
    offset === undefined ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return undefined
  }
  const shift = offsetMinutes(offset)
  if (shift === undefined) return undefined
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millis))
  if (
    wall.getUTCFullYear() !== year ||
    wall.getUTCMonth() !== month - 1 ||
    wall.getUTCDate() !== day ||
    wall.getUTCHours() !== hour ||
    wall.getUTCMinutes() !== minute ||
    wall.getUTCSeconds() !== second
  ) {
    return undefined
  }
  const instant = new Date(wall.getTime() - shift * 60_000).toISOString()
  return { raw: value, offset, instant }
}
