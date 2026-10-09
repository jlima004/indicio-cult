import 'server-only'

import type { NuvemshopDecimalId, OrderNumber } from '../types'
import { failValidation } from './fail'

const DECIMAL_ID = /^[1-9]\d*$/
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i
const CORRELATION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

export function readDecimalId(value: unknown): NuvemshopDecimalId | undefined {
  if (typeof value === 'string') {
    if (value.length > 40 || !DECIMAL_ID.test(value)) return undefined
    return value as NuvemshopDecimalId
  }
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value) as NuvemshopDecimalId
  }
  return undefined
}

export function readOrderNumber(value: unknown): OrderNumber | undefined {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) return undefined
    return String(value) as OrderNumber
  }
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 40 ||
    !/^\d+$/.test(value)
  ) {
    return undefined
  }
  const canonical = value.replace(/^0+/, '')
  if (canonical.length === 0) return undefined
  return canonical as OrderNumber
}

export function readUlid(value: unknown): string | undefined {
  if (typeof value !== 'string' || !ULID.test(value)) return undefined
  return value
}

export function parseCallerDecimalId(value: unknown): NuvemshopDecimalId {
  const id = readDecimalId(value)
  if (id === undefined) failValidation()
  return id
}

export function parseCorrelationId(value: unknown): string {
  if (typeof value !== 'string' || !CORRELATION.test(value)) failValidation()
  return value
}
