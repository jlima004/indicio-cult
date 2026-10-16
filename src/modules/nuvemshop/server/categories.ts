import 'server-only'

import { nuvemshopRequest } from './client'
import { createNuvemshopPage, type Page } from './pagination'
import { parseCategory, parseCategoryList } from './schemas/category'
import { failProtocol, failValidation } from './schemas/fail'
import { parseCallerDecimalId } from './schemas/ids'
import type { Category } from './types'

type ResourceKind = 'category'

export type ListCategoriesInput = {
  readonly page: number
  readonly perPage: number
  readonly signal?: AbortSignal
  readonly correlationId?: string
}

export type GetCategoryInput = {
  readonly categoryId: string
  readonly signal?: AbortSignal
  readonly correlationId?: string
}

function readInput(
  value: unknown,
  allowed: readonly string[],
  required: readonly string[],
  resourceKind: ResourceKind,
): Record<string, unknown> {
  try {
    return snapshotInput(value, allowed, required, resourceKind)
  } catch {
    // Any thrown value is caller-controlled. Do not read it.
    failValidation(resourceKind)
  }
}

function snapshotInput(
  value: unknown,
  allowed: readonly string[],
  required: readonly string[],
  resourceKind: ResourceKind,
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    failValidation(resourceKind)
  }
  const prototype: unknown = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) failValidation(resourceKind)
  const keys = Reflect.ownKeys(value)
  if (keys.some((key) => typeof key !== 'string' || !allowed.includes(key))) {
    failValidation(resourceKind)
  }
  const snapshot: Record<string, unknown> = {}
  for (const key of allowed) {
    if (!keys.includes(key)) {
      if (required.includes(key)) failValidation(resourceKind)
      continue
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !('value' in descriptor)) failValidation(resourceKind)
    if (required.includes(key) && descriptor.value === undefined) failValidation(resourceKind)
    snapshot[key] = descriptor.value
  }
  return snapshot
}

function requestOptions(record: Record<string, unknown>): {
  signal?: AbortSignal
  correlationId?: string
} {
  return {
    ...(record.signal === undefined ? {} : { signal: record.signal as AbortSignal }),
    ...(record.correlationId === undefined
      ? {}
      : { correlationId: record.correlationId as string }),
  }
}

export async function listCategories(input: ListCategoriesInput): Promise<Page<Category>> {
  const record = readInput(
    input,
    ['page', 'perPage', 'signal', 'correlationId'],
    ['page', 'perPage'],
    'category',
  )
  const response = await nuvemshopRequest({
    method: 'GET',
    segments: ['categories'],
    operation: 'read',
    resourceKind: 'category',
    query: { page: record.page as number, perPage: record.perPage as number },
    ...requestOptions(record),
  })
  const page = createNuvemshopPage(parseCategoryList(response.rawBody), response.metadata)
  if (page.items.length > page.perPage) failProtocol('category')
  return page
}

export async function getCategory(input: GetCategoryInput): Promise<Category> {
  const record = readInput(
    input,
    ['categoryId', 'signal', 'correlationId'],
    ['categoryId'],
    'category',
  )
  const categoryId = parseCallerDecimalId(record.categoryId)
  const response = await nuvemshopRequest({
    method: 'GET',
    segments: ['categories', categoryId],
    operation: 'read',
    resourceKind: 'category',
    ...requestOptions(record),
  })
  const category = parseCategory(response.rawBody)
  if (category.id !== categoryId) failProtocol('category')
  return category
}
