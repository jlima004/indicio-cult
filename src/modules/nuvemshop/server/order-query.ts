import 'server-only'

import { readDecimalId } from './schemas/ids'

/** Closed Order policies; consumers cannot select namespace, fields or arbitrary query keys. */
export type OrderReadFilter =
  | { readonly kind: 'orders-q'; readonly q: string; readonly queryId: string }
  | { readonly kind: 'order-nfe'; readonly orderId: string }

/** Navigation identity carries no email/search text. It is never an authorization proof. */
export type OrderFilterIdentity =
  | { readonly kind: 'orders-q'; readonly queryId: string }
  | { readonly kind: 'order-nfe'; readonly orderId: string }

export function isOrderCollection(segments: readonly string[]): boolean {
  return segments.length === 1 && segments[0] === 'orders'
}
export function isFiscalCollection(segments: readonly string[]): boolean {
  return segments.length === 2 && segments[0] === 'metafields' && segments[1] === 'orders'
}
export function isFulfillmentCollection(segments: readonly string[]): boolean {
  return segments.length === 3 && segments[0] === 'orders' && segments[2] === 'fulfillment-orders'
}
function invalid(): never {
  throw new Error('Invalid Order query')
}
function data(record: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key)
  if (descriptor === undefined) return undefined
  if (!('value' in descriptor)) invalid()
  return descriptor.value
}

/** Called inside transport preparation's caller-input catch. */
export function readOrderFilter(
  value: unknown,
  method: string,
  segments: readonly string[],
): OrderReadFilter | undefined {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  const q = data(value, 'q')
  const orderId = data(value, 'orderId')
  if (q === undefined && orderId === undefined) return undefined
  if (method !== 'GET') invalid()
  if (q !== undefined) {
    if (
      !isOrderCollection(segments) ||
      orderId !== undefined ||
      typeof q !== 'string' ||
      q.trim().length === 0 ||
      q.length > 320 ||
      /[\u0000-\u001f\u007f]/.test(q)
    )
      invalid()
    // Reject unpaired surrogates before URL encoding.
    encodeURIComponent(q)
    return Object.freeze({ kind: 'orders-q', q, queryId: crypto.randomUUID() })
  }
  if (
    !isFiscalCollection(segments) ||
    typeof orderId !== 'string' ||
    readDecimalId(orderId) !== orderId
  )
    invalid()
  return Object.freeze({ kind: 'order-nfe', orderId })
}

export function filterIdentity(
  filter: OrderReadFilter | undefined,
): OrderFilterIdentity | undefined {
  if (filter === undefined) return undefined
  return filter.kind === 'orders-q'
    ? Object.freeze({
        kind: 'orders-q',
        queryId: filter.queryId,
      })
    : Object.freeze({ kind: 'order-nfe', orderId: filter.orderId })
}

/** HTTPS URL.search encodes apostrophes in addition to encodeURIComponent. */
function encodeSearch(value: string): string {
  return encodeURIComponent(value).replaceAll("'", '%27')
}

export function filterQuery(filter: OrderReadFilter | undefined): string[] {
  if (filter === undefined) return []
  return filter.kind === 'orders-q'
    ? [`q=${encodeSearch(filter.q)}`]
    : [`owner_id=${filter.orderId}`, 'namespace=nfe', 'key=list', 'fields=value']
}

/** Strict projected identity validator used by the pager on unknown metadata. */
export function readFilterIdentity(
  value: unknown,
  segments: readonly string[],
): OrderFilterIdentity {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  const proto: unknown = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) invalid()
  const keys = Reflect.ownKeys(value)
  const kind = data(value, 'kind')
  const field = kind === 'orders-q' ? 'queryId' : 'orderId'
  if (keys.length !== 2 || !keys.includes('kind') || !keys.includes(field)) invalid()
  const content = data(value, field)
  if (typeof content !== 'string') invalid()
  if (
    kind === 'orders-q' &&
    isOrderCollection(segments) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(content)
  )
    return { kind, queryId: content }
  if (kind === 'order-nfe' && isFiscalCollection(segments) && readDecimalId(content) === content)
    return { kind, orderId: content }
  return invalid()
}

export function sameFilter(
  a: OrderFilterIdentity | undefined,
  b: OrderFilterIdentity | undefined,
): boolean {
  return a === undefined
    ? b === undefined
    : b !== undefined &&
        a.kind === b.kind &&
        (a.kind === 'orders-q'
          ? b.kind === 'orders-q' && a.queryId === b.queryId
          : b.kind === 'order-nfe' && a.orderId === b.orderId)
}

/** Only fixed filter fields or a canonical percent-encoded q are admitted in Links. */
export function filterFromLink(
  fields: readonly string[],
  segments: readonly string[],
  expected?: OrderReadFilter,
): OrderFilterIdentity | undefined {
  if (fields.length === 0) return undefined
  if (isOrderCollection(segments) && fields.length === 1 && fields[0]!.startsWith('q=')) {
    const encoded = fields[0]!.slice(2)
    const q = decodeURIComponent(encoded)
    if (encodeSearch(q) !== encoded || expected?.kind !== 'orders-q' || q !== expected.q) invalid()
    return filterIdentity(expected)
  }
  if (isFiscalCollection(segments) && fields.length === 4) {
    const values = new Map(
      fields.map((entry) => {
        const pair = entry.split('=')
        if (pair.length !== 2) invalid()
        return [pair[0]!, pair[1]!] as const
      }),
    )
    if (
      values.size !== 4 ||
      values.get('namespace') !== 'nfe' ||
      values.get('key') !== 'list' ||
      values.get('fields') !== 'value'
    )
      invalid()
    return filterIdentity(readOrderFilter({ orderId: values.get('owner_id') }, 'GET', segments))
  }
  return invalid()
}
