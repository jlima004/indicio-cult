import 'server-only'

import type { Category, CategoryVisibility } from '../types'
import { failProtocol } from './fail'
import { readDecimalId } from './ids'
import { decodeLosslessJson, decodeObject, isRecord } from './lossless-json'
import { readLocalized } from './text'

const VISIBILITY = ['visible', 'hidden', 'soft-hidden'] as const
const MAX_PAGE_ITEMS = 200

function readCategory(record: Record<string, unknown>): Category {
  const id = readDecimalId(record.id)
  const name = readLocalized(record.name, true)
  const handle = readLocalized(record.handle, false)
  const visibility = record.visibility
  if (!Object.hasOwn(record, 'parent')) failProtocol('category')
  const parentId = record.parent === null ? null : readDecimalId(record.parent)
  if (
    id === undefined ||
    name === undefined ||
    name === null ||
    handle === undefined ||
    typeof visibility !== 'string' ||
    !VISIBILITY.includes(visibility as CategoryVisibility) ||
    parentId === undefined
  ) {
    failProtocol('category')
  }
  return {
    id,
    name,
    handle,
    parentId,
    visibility: visibility as CategoryVisibility,
  }
}

export function parseCategory(raw: string): Category {
  return readCategory(decodeObject(raw))
}

export function parseCategoryList(raw: string): readonly Category[] {
  const value = decodeLosslessJson(raw)
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    failProtocol('category')
  }
  const length = value.length
  if (!Number.isSafeInteger(length) || length > MAX_PAGE_ITEMS) failProtocol('category')
  const categories: Category[] = []
  for (let index = 0; index < length; index += 1) {
    const item = value[index]
    if (!isRecord(item)) failProtocol('category')
    categories.push(readCategory(item))
  }
  return categories
}
