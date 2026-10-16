import 'server-only'

import { nuvemshopRequest } from './client'
import { createNuvemshopPage, type Page } from './pagination'
import { failProtocol, failValidation } from './schemas/fail'
import { parseCallerDecimalId } from './schemas/ids'
import { parseProduct, parseProductList, parseVariant } from './schemas/product'
import type { Product, Variant } from './types'

type ResourceKind = 'product' | 'variant'

export type ListProductsInput = {
  readonly page: number
  readonly perPage: number
  readonly signal?: AbortSignal
  readonly correlationId?: string
}

export type GetProductInput = {
  readonly productId: string
  readonly signal?: AbortSignal
  readonly correlationId?: string
}

export type GetVariantInput = {
  readonly productId: string
  readonly variantId: string
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

export async function listProducts(input: ListProductsInput): Promise<Page<Product>> {
  const record = readInput(
    input,
    ['page', 'perPage', 'signal', 'correlationId'],
    ['page', 'perPage'],
    'product',
  )
  const response = await nuvemshopRequest({
    method: 'GET',
    segments: ['products'],
    operation: 'read',
    resourceKind: 'product',
    query: { page: record.page as number, perPage: record.perPage as number },
    ...requestOptions(record),
  })
  const page = createNuvemshopPage(parseProductList(response.rawBody), response.metadata)
  if (page.items.length > page.perPage) failProtocol('product')
  return page
}

export async function getProduct(input: GetProductInput): Promise<Product> {
  const record = readInput(
    input,
    ['productId', 'signal', 'correlationId'],
    ['productId'],
    'product',
  )
  const productId = parseCallerDecimalId(record.productId)
  const response = await nuvemshopRequest({
    method: 'GET',
    segments: ['products', productId],
    operation: 'read',
    resourceKind: 'product',
    ...requestOptions(record),
  })
  const product = parseProduct(response.rawBody)
  if (product.id !== productId) failProtocol('product')
  return product
}

export async function getVariant(input: GetVariantInput): Promise<Variant> {
  const record = readInput(
    input,
    ['productId', 'variantId', 'signal', 'correlationId'],
    ['productId', 'variantId'],
    'variant',
  )
  const productId = parseCallerDecimalId(record.productId)
  const variantId = parseCallerDecimalId(record.variantId)
  const response = await nuvemshopRequest({
    method: 'GET',
    segments: ['products', productId, 'variants', variantId],
    operation: 'read',
    resourceKind: 'variant',
    ...requestOptions(record),
  })
  const variant = parseVariant(response.rawBody)
  if (variant.id !== variantId || variant.productId !== productId) failProtocol('variant')
  return variant
}
