import 'server-only'

import type { Product, ProductVisibility, Variant } from '../types'
import { readDateTime } from './datetime'
import { failProtocol } from './fail'
import { readDecimalId } from './ids'
import { decodeObject } from './lossless-json'
import { readMoney } from './money'
import { readHttpUrl, readLocalized } from './text'

const VISIBILITY = ['visible', 'unlisted', 'hidden'] as const

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

export function parseProduct(raw: string): Product {
  const record = decodeObject(raw)
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
    record.attributes.length > 3 ||
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
  const variants: Variant[] = []
  for (const variant of record.variants) {
    if (typeof variant !== 'object' || variant === null || Array.isArray(variant))
      failProtocol('product')
    const item = variant as Record<string, unknown>
    const variantId = readDecimalId(item.id)
    const productId = readDecimalId(item.product_id)
    const regular =
      Object.hasOwn(item, 'price') && item.price !== null ? readMoney(item.price) : null
    const promotional =
      !Object.hasOwn(item, 'promotional_price') || item.promotional_price === null
        ? null
        : readMoney(item.promotional_price)
    const variantCreatedAt = readDateTime(item.created_at)
    const variantUpdatedAt = readDateTime(item.updated_at)
    if (
      variantId === undefined ||
      productId === undefined ||
      regular === undefined ||
      promotional === undefined ||
      variantCreatedAt === undefined ||
      variantUpdatedAt === undefined ||
      !Array.isArray(item.values) ||
      item.values.length !== attributes.length
    ) {
      failProtocol('product')
    }
    const values = item.values.map((value) => readLocalized(value, true))
    if (values.some((value) => value === undefined || value === null)) failProtocol('product')
    variants.push({
      id: variantId,
      productId,
      values: values as Exclude<(typeof values)[number], undefined | null>[],
      regular,
      promotional,
      effective: regular === null ? null : (promotional ?? regular),
      createdAt: variantCreatedAt,
      updatedAt: variantUpdatedAt,
    })
  }
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
