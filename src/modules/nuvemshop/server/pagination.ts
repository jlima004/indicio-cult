import 'server-only'

import { NuvemshopProtocolError } from './errors'
import {
  NUVEMSHOP_API_ORIGIN,
  NUVEMSHOP_API_VERSION,
  nuvemshopListProjection,
  prepareNuvemshopAttempt,
  type NuvemshopPagePosition,
  type NuvemshopResponseMetadata,
} from './request'

export type Page<T> = {
  items: T[]
  page: number
  perPage: number
  totalCount?: number
  nextPage?: number
  previousPage?: number
}

export interface NuvemshopPageNavigation {
  readonly page: number
  readonly perPage: number
  readonly totalCount?: number
  readonly nextPage?: number
  readonly previousPage?: number
}

function failProtocol(): never {
  throw new NuvemshopProtocolError()
}

/** Snapshot only own data: no inherited fields, accessors or caller methods. */
function record(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) failProtocol()
  const prototype: unknown = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) failProtocol()
  const keys = Reflect.ownKeys(value)
  if (
    keys.length > required.length + optional.length ||
    keys.some((key) => typeof key !== 'string' || ![...required, ...optional].includes(key))
  ) {
    failProtocol()
  }
  const snapshot: Record<string, unknown> = {}
  for (const key of [...required, ...optional]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (keys.includes(key) !== (descriptor !== undefined)) failProtocol()
    if (descriptor === undefined) {
      if (required.includes(key)) failProtocol()
    } else {
      if (!('value' in descriptor)) failProtocol()
      snapshot[key] = descriptor.value
    }
  }
  return snapshot
}

function array(value: unknown, maxLength: number, minLength = 0): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) failProtocol()
  const descriptor = Object.getOwnPropertyDescriptor(value, 'length')
  const length: unknown = descriptor?.value
  if (
    typeof length !== 'number' ||
    !Number.isSafeInteger(length) ||
    length < minLength ||
    length > maxLength
  ) {
    failProtocol()
  }
  const keys = new Set(Reflect.ownKeys(value))
  // Reflected keys and indexed descriptors must agree, including for proxies.
  if (keys.size !== length + 1 || !keys.has('length')) failProtocol()
  const snapshot: unknown[] = []
  for (let index = 0; index < length; index += 1) {
    const key = String(index)
    if (!keys.has(key)) failProtocol()
    const entry = Object.getOwnPropertyDescriptor(value, key)
    if (entry === undefined || !('value' in entry)) failProtocol()
    snapshot.push(entry.value)
  }
  return snapshot
}

function integer(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    failProtocol()
  }
  return value
}

function position(value: unknown): NuvemshopPagePosition {
  const snapshot = record(value, ['page', 'perPage'])
  return { page: integer(snapshot.page, 1), perPage: integer(snapshot.perPage, 1, 200) }
}

function segments(value: unknown): string[] {
  return array(value, 3, 1).map((part) => {
    if (typeof part !== 'string') failProtocol()
    return part
  })
}

function field(value: unknown): { kind: 'absent' | 'invalid' | 'valid'; value?: unknown } {
  const snapshot = record(value, ['kind'], ['value'])
  const kind = snapshot.kind
  if (kind !== 'absent' && kind !== 'invalid' && kind !== 'valid') failProtocol()
  if (Object.hasOwn(snapshot, 'value') !== (kind === 'valid')) failProtocol()
  return kind === 'valid' ? { kind, value: snapshot.value } : { kind }
}

function scalar(value: unknown, min = 0): number | undefined {
  const snapshot = field(value)
  return snapshot.kind === 'valid' ? integer(snapshot.value, min) : undefined
}

function navigation(metadata: unknown): NuvemshopPageNavigation {
  const snapshot = record(metadata, ['request', 'rateLimit', 'pagination'])
  const request = record(
    snapshot.request,
    ['origin', 'apiVersion', 'storeId', 'method', 'segments', 'pagination'],
    ['projection'],
  )
  if (
    request.origin !== NUVEMSHOP_API_ORIGIN ||
    request.apiVersion !== NUVEMSHOP_API_VERSION ||
    typeof request.storeId !== 'string' ||
    request.storeId.length === 0 ||
    request.storeId.length > 256 ||
    /[^0-9]/.test(request.storeId) ||
    !/[1-9]/.test(request.storeId) ||
    (request.method !== 'GET' && request.method !== 'HEAD')
  ) {
    failProtocol()
  }
  const current = position(request.pagination)
  // Reuse the transport's canonical route/ID and collection admission policy.
  // The fresh explicit query prevents default inference; preparation does no I/O.
  const prepared = prepareNuvemshopAttempt({
    method: request.method,
    segments: segments(request.segments),
    query: current,
  })
  const projection = nuvemshopListProjection(prepared.method, prepared.segments)
  if (
    Object.hasOwn(request, 'projection') !== (projection !== undefined) ||
    request.projection !== projection
  )
    failProtocol()
  const rate = record(snapshot.rateLimit, ['limit', 'remaining', 'resetMs'])
  // Validate the declared envelope only; invalid/absent quota stays NUV-05-owned.
  scalar(rate.limit, 1)
  scalar(rate.remaining)
  scalar(rate.resetMs)

  const headers = record(snapshot.pagination, ['totalCount', 'links'])
  const count = field(headers.totalCount)
  const links = field(headers.links)
  if (count.kind === 'invalid' || links.kind === 'invalid') failProtocol()
  const totalCount = count.kind === 'valid' ? integer(count.value, 0) : undefined
  let nextPage: number | undefined
  let previousPage: number | undefined
  let lastPage: number | undefined
  const seen = new Set<string>()
  if (links.kind === 'valid') {
    for (const value of array(links.value, 4, 1)) {
      const target = record(
        value,
        ['relation', 'origin', 'apiVersion', 'storeId', 'segments', 'pagination'],
        ['projection'],
      )
      const route = segments(target.segments)
      const page = position(target.pagination)
      if (
        target.origin !== request.origin ||
        target.apiVersion !== request.apiVersion ||
        target.storeId !== request.storeId ||
        route.length !== prepared.segments.length ||
        route.some((part, index) => part !== prepared.segments[index]) ||
        page.perPage !== current.perPage ||
        Object.hasOwn(target, 'projection') !== (projection !== undefined) ||
        target.projection !== projection ||
        typeof target.relation !== 'string' ||
        seen.has(target.relation)
      ) {
        failProtocol()
      }
      seen.add(target.relation)
      switch (target.relation) {
        case 'first':
          if (page.page !== 1) failProtocol()
          break
        case 'next':
          if (current.page === Number.MAX_SAFE_INTEGER || page.page !== current.page + 1) {
            failProtocol()
          }
          nextPage = page.page
          break
        case 'prev':
          if (current.page <= 1 || page.page !== current.page - 1) failProtocol()
          previousPage = page.page
          break
        case 'last':
          if (page.page < current.page) failProtocol()
          lastPage = page.page
          break
        default:
          failProtocol()
      }
    }
  }
  if (nextPage !== undefined && lastPage !== undefined && nextPage > lastPage) failProtocol()
  // Count and missing links are not evidence of complete coverage on a mutable list.
  return {
    ...current,
    ...(totalCount === undefined ? {} : { totalCount }),
    ...(nextPage === undefined ? {} : { nextPage }),
    ...(previousPage === undefined ? {} : { previousPage }),
  }
}

export function parseNuvemshopPageNavigation(
  metadata: NuvemshopResponseMetadata,
): NuvemshopPageNavigation {
  try {
    return navigation(metadata)
  } catch {
    // Never inspect or propagate a hostile exception, including Error subclasses.
    throw new NuvemshopProtocolError()
  }
}

export function createNuvemshopPage<T>(
  items: readonly T[],
  metadata: NuvemshopResponseMetadata,
): Page<T> {
  const page = parseNuvemshopPageNavigation(metadata)
  try {
    // Items are resource-schema-owned. Copy their references without iterators/species.
    return { items: array(items, Number.MAX_SAFE_INTEGER) as T[], ...page }
  } catch {
    throw new NuvemshopProtocolError()
  }
}
