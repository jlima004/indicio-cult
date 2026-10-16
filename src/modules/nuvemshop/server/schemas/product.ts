import 'server-only'

import type { Product, ProductVisibility, Variant } from '../types'
import { readDateTime } from './datetime'
import { failProtocol } from './fail'
import { readDecimalId } from './ids'
import { decodeLosslessJson, decodeObject, isRecord } from './lossless-json'
import { readMoney } from './money'
import { readHttpUrl, readLocalized } from './text'

const VISIBILITY = ['visible', 'unlisted', 'hidden'] as const
const MAX_ATTRIBUTES = 3
const MAX_PAGE_ITEMS = 200

function readTags(value: unknown): readonly string[] | undefined {
  if (value === undefined || value === null) return []
  if (typeof value !== 'string' || value.length > 5_000) return undefined
  const tags = value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
  if (tags.length > 200 || tags.some((tag) => tag.length > 100)) return undefined
  return tags
}

function readVisibility(record: Record<string, unknown>): ProductVisibility | undefined {
  const visibility = record.visibility
  if (typeof visibility !== 'string' || !VISIBILITY.includes(visibility as ProductVisibility)) {
    return undefined
  }
  const published = record.published
  if (typeof published === 'boolean') {
    const expectsPublished = visibility === 'visible'
    if (published !== expectsPublished) return undefined
  }
  return visibility as ProductVisibility
}

function readProduct(record: Record<string, unknown>): Product {
  const id = readDecimalId(record.id)
  const name = readLocalized(record.name, true)
  const handle = readLocalized(record.handle, false)
  const description = readLocalized(record.description, false)
  const visibility = readVisibility(record)
  const createdAt = readDateTime(record.created_at)
  const updatedAt = readDateTime(record.updated_at)
  const tags = readTags(record.tags)
  if (
    id === undefined ||
    name === undefined ||
    name === null ||
    handle === undefined ||
    description === undefined ||
    visibility === undefined ||
    createdAt === undefined ||
    updatedAt === undefined ||
    tags === undefined ||
    !Array.isArray(record.attributes) ||
    !Array.isArray(record.variants) ||
    !Array.isArray(record.images) ||
    !Array.isArray(record.categories) ||
    record.attributes.length > MAX_ATTRIBUTES ||
    record.variants.length > 1000 ||
    record.images.length > 250 ||
    record.categories.length > 1000
  ) {
    failProtocol('product')
  }
  const attributes = record.attributes.map((attribute) => readLocalized(attribute, true))
  if (attributes.some((attribute) => attribute === undefined || attribute === null)) {
    failProtocol('product')
  }
  const images = record.images.map((image) => {
    if (typeof image !== 'object' || image === null || Array.isArray(image)) return undefined
    const imageRecord = image as Record<string, unknown>
    const imageId = readDecimalId(imageRecord.id)
    const src = readHttpUrl(imageRecord.src)
    if (imageId === undefined || src === undefined) return undefined
    return { id: imageId, src }
  })
  if (images.some((image) => image === undefined)) failProtocol('product')
  const categoryIds = record.categories.map((category) => {
    if (typeof category === 'object' && category !== null && !Array.isArray(category)) {
      return readDecimalId((category as Record<string, unknown>).id)
    }
    return readDecimalId(category)
  })
  if (categoryIds.some((categoryId) => categoryId === undefined)) failProtocol('product')
  const variants = record.variants.map((variant) =>
    readVariant(variant, { attributeCount: attributes.length, resourceKind: 'product' }),
  )
  return {
    id,
    name,
    handle,
    description,
    visibility,
    attributes: attributes as Exclude<(typeof attributes)[number], undefined | null>[],
    tags,
    categoryIds: categoryIds as Exclude<(typeof categoryIds)[number], undefined>[],
    images: images as Exclude<(typeof images)[number], undefined>[],
    variants,
    createdAt,
    updatedAt,
  }
}

function readVariant(
  value: unknown,
  options: {
    readonly attributeCount?: number
    readonly resourceKind: 'product' | 'variant'
  },
): Variant {
  if (!isRecord(value)) failProtocol(options.resourceKind)
  const item = value
  const variantId = readDecimalId(item.id)
  const productId = readDecimalId(item.product_id)
  const regular = Object.hasOwn(item, 'price') && item.price !== null ? readMoney(item.price) : null
  const promotional =
    !Object.hasOwn(item, 'promotional_price') || item.promotional_price === null
      ? null
      : readMoney(item.promotional_price)
  const createdAt = readDateTime(item.created_at)
  const updatedAt = readDateTime(item.updated_at)
  const rawValues = item.values
  if (
    variantId === undefined ||
    productId === undefined ||
    regular === undefined ||
    promotional === undefined ||
    createdAt === undefined ||
    updatedAt === undefined ||
    !Array.isArray(rawValues) ||
    (options.attributeCount === undefined
      ? rawValues.length > MAX_ATTRIBUTES
      : rawValues.length !== options.attributeCount)
  ) {
    failProtocol(options.resourceKind)
  }
  const values = rawValues.map((entry) => readLocalized(entry, true))
  if (values.some((entry) => entry === undefined || entry === null)) {
    failProtocol(options.resourceKind)
  }
  return {
    id: variantId,
    productId,
    values: values as Exclude<(typeof values)[number], undefined | null>[],
    regular,
    promotional,
    effective: regular === null ? null : (promotional ?? regular),
    createdAt,
    updatedAt,
  }
}

export function parseProduct(raw: string): Product {
  return readProduct(decodeObject(raw))
}

export function parseProductList(raw: string): readonly Product[] {
  const value = decodeLosslessJson(raw)
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    failProtocol('product')
  }
  const length = value.length
  if (!Number.isSafeInteger(length) || length > MAX_PAGE_ITEMS) failProtocol('product')
  const products: Product[] = []
  for (let index = 0; index < length; index += 1) {
    const item = value[index]
    if (!isRecord(item)) failProtocol('product')
    products.push(readProduct(item))
  }
  return products
}

export function parseVariant(raw: string): Variant {
  return readVariant(decodeObject(raw), { resourceKind: 'variant' })
}
