import 'server-only'

import type { Category, CategoryVisibility } from '../types'
import { failProtocol } from './fail'
import { readDecimalId } from './ids'
import { decodeObject } from './lossless-json'
import { readLocalized } from './text'

const VISIBILITY = ['visible', 'hidden', 'soft-hidden'] as const

export function parseCategory(raw: string): Category {
  const record = decodeObject(raw)
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
