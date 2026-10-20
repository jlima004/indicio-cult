import 'server-only'

import { nuvemshopRequest } from './client'
import { createNuvemshopPage, type Page } from './pagination'
import { failProtocol, failValidation } from './schemas/fail'
import { parseCallerDecimalId } from './schemas/ids'
import {
  parseFulfillmentOrder,
  parseFulfillmentOrderList,
  parseInvoiceListValue,
  parseOrder,
  parseOrderList,
  parseOrderMetafieldValues,
} from './schemas/order'
import type {
  BoundedCollection,
  CanonicalDateTime,
  FulfillmentOrder,
  InvoiceReference,
  Order,
  StatusTransition,
} from './types'

// Per Order: at most four 25-record fulfillment pages, 25 detail reads and
// four one-record fiscal pages; at most 100 fulfillments and 50 invoice refs.
// Each request also remains subject to NUV-05's process budget and timeout.
const SUBREAD_PER_PAGE = 25
const METAFIELD_PER_PAGE = 1
const MAX_SUBREAD_PAGES = 4
const MAX_FULFILLMENTS = 100
const MAX_FULFILLMENT_DETAILS = 25
const MAX_INVOICES = 50

export type GetOrderInput = {
  readonly orderId: string
  readonly includeFulfillments?: boolean
  readonly includeInvoices?: boolean
  readonly signal?: AbortSignal
  readonly correlationId?: string
}

export type ListOrdersInput = {
  readonly page: number
  readonly perPage: number
  /** Provider candidate discovery only; identity/ownership belongs to the consumer. */
  readonly q?: string
  readonly signal?: AbortSignal
  readonly correlationId?: string
}

function readInput(
  value: unknown,
  allowed: readonly string[],
  required: readonly string[],
): Record<string, unknown> {
  try {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      failValidation('order')
    }
    const prototype: unknown = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) failValidation('order')
    const keys = Reflect.ownKeys(value)
    if (
      keys.length > allowed.length ||
      keys.some((key) => typeof key !== 'string' || !allowed.includes(key))
    ) {
      failValidation('order')
    }
    const snapshot: Record<string, unknown> = {}
    for (const key of allowed) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (keys.includes(key) !== (descriptor !== undefined)) failValidation('order')
      if (descriptor === undefined) {
        if (required.includes(key)) failValidation('order')
        continue
      }
      if (!('value' in descriptor) || (required.includes(key) && descriptor.value === undefined)) {
        failValidation('order')
      }
      snapshot[key] = descriptor.value
    }
    return snapshot
  } catch {
    // Discard hostile getters/proxies and thrown values without inspecting them.
    failValidation('order')
  }
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

function retainedHistory<T>(
  previous: BoundedCollection<T>,
  current: BoundedCollection<T>,
  matches: (previous: T, current: T) => boolean,
  reconcile: (previous: T, current: T) => T,
): BoundedCollection<T> {
  if (current.completeness === 'not_consulted') return previous
  if (previous.completeness === 'not_consulted') return current
  const used = new Set<number>()
  const reconciled = new Map<number, T>()
  for (const item of previous.items) {
    const index = current.items.findIndex(
      (candidate, candidateIndex) => !used.has(candidateIndex) && matches(item, candidate),
    )
    // Neither an undocumented replacement rule nor an invented union can
    // justify silently discarding a previously supplied historical record.
    if (index === -1) failProtocol('order')
    used.add(index)
    reconciled.set(index, reconcile(item, current.items[index]!))
  }
  return {
    completeness: current.completeness,
    items: current.items.map((item, index) => reconciled.get(index) ?? item),
  }
}

function retainedTime(
  previous: CanonicalDateTime | null | undefined,
  current: CanonicalDateTime | null | undefined,
): boolean {
  return previous === undefined || previous === null || previous.raw === current?.raw
}

function reconcileTime(
  previous: CanonicalDateTime | null | undefined,
  current: CanonicalDateTime | null | undefined,
): CanonicalDateTime | null | undefined {
  if (previous === undefined) return current
  if (current === undefined) return previous
  if (previous === null && current === null) return null
  if (previous !== null && current !== null && previous.raw === current.raw) return current
  failProtocol('order')
}

function transitionAttributesMatch(known: StatusTransition, candidate: StatusTransition): boolean {
  return (
    (known.fromStatus === null || known.fromStatus === candidate.fromStatus) &&
    (known.toStatus === null || known.toStatus === candidate.toStatus) &&
    known.happenedAt.raw === candidate.happenedAt.raw
  )
}

function transitionIdsCompatible(known: StatusTransition, candidate: StatusTransition): boolean {
  return known.id === undefined || candidate.id === undefined || known.id === candidate.id
}

function reconcileTransition(
  known: StatusTransition,
  candidate: StatusTransition,
): StatusTransition {
  const createdAt = reconcileTime(known.createdAt, candidate.createdAt)
  if (known.id !== undefined && candidate.id !== undefined && known.id !== candidate.id) {
    failProtocol('order')
  }
  const id = known.id === undefined ? candidate.id : known.id
  return {
    ...candidate,
    ...(id === undefined ? {} : { id }),
    ...(createdAt === undefined ? {} : { createdAt }),
  }
}

function retainedStatusHistory(
  previous: BoundedCollection<StatusTransition>,
  current: BoundedCollection<StatusTransition>,
): BoundedCollection<StatusTransition> {
  if (current.completeness === 'not_consulted') return previous
  if (previous.completeness === 'not_consulted') return current
  const compatible = (known: StatusTransition, candidate: StatusTransition) =>
    transitionAttributesMatch(known, candidate) && transitionIdsCompatible(known, candidate)
  for (const known of previous.items) {
    for (const candidate of current.items) {
      if (!compatible(known, candidate)) continue
      if ((known.id === undefined) === (candidate.id === undefined)) continue
      let knownMatches = 0
      for (const item of current.items) {
        if (compatible(known, item)) knownMatches += 1
      }
      let candidateMatches = 0
      for (const item of previous.items) {
        if (compatible(item, candidate)) candidateMatches += 1
      }
      if (knownMatches !== 1 || candidateMatches !== 1) failProtocol('order')
    }
  }
  return retainedHistory(previous, current, compatible, reconcileTransition)
}

function mergeFulfillment(
  previous: FulfillmentOrder | undefined,
  current: FulfillmentOrder,
): FulfillmentOrder {
  if (previous === undefined) return current
  return {
    id: current.id,
    status: current.status.completeness === 'not_consulted' ? previous.status : current.status,
    tracking:
      current.tracking.completeness === 'not_consulted' ? previous.tracking : current.tracking,
    destination:
      current.destination.completeness === 'not_consulted'
        ? previous.destination
        : current.destination,
    statusHistory: retainedStatusHistory(previous.statusHistory, current.statusHistory),
    trackingEvents: retainedHistory(
      previous.trackingEvents,
      current.trackingEvents,
      (known, candidate) =>
        known.id === candidate.id &&
        known.status === candidate.status &&
        retainedTime(known.happenedAt, candidate.happenedAt),
      (known, candidate) => {
        const createdAt = reconcileTime(known.createdAt, candidate.createdAt)
        const updatedAt = reconcileTime(known.updatedAt, candidate.updatedAt)
        const estimatedDeliveryAt = reconcileTime(
          known.estimatedDeliveryAt,
          candidate.estimatedDeliveryAt,
        )
        return {
          ...candidate,
          ...(createdAt === undefined ? {} : { createdAt }),
          ...(updatedAt === undefined ? {} : { updatedAt }),
          ...(estimatedDeliveryAt === undefined ? {} : { estimatedDeliveryAt }),
        }
      },
    ),
  }
}

function needsFulfillmentDetail(item: FulfillmentOrder): boolean {
  return (
    item.status.completeness === 'not_consulted' ||
    item.tracking.completeness === 'not_consulted' ||
    item.destination.completeness === 'not_consulted' ||
    item.statusHistory.completeness !== 'confirmed' ||
    item.trackingEvents.completeness !== 'confirmed'
  )
}

async function readFulfillments(
  order: Order,
  options: ReturnType<typeof requestOptions>,
): Promise<BoundedCollection<FulfillmentOrder>> {
  const items = new Map<string, FulfillmentOrder>()
  if (order.fulfillments.completeness !== 'not_consulted') {
    for (const item of order.fulfillments.items) {
      if (items.has(item.id)) failProtocol('order')
      items.set(item.id, item)
    }
  }
  const scopedIds = new Set<string>()
  let expectedCount: number | undefined
  let consistentCount = true
  let membershipConfirmed = false
  let pageNumber = 1
  for (let read = 0; read < MAX_SUBREAD_PAGES; read += 1) {
    const response = await nuvemshopRequest({
      method: 'GET',
      segments: ['orders', order.id, 'fulfillment-orders'],
      query: { page: pageNumber, perPage: SUBREAD_PER_PAGE },
      operation: 'read',
      resourceKind: 'order',
      ...options,
    })
    const page = createNuvemshopPage(
      parseFulfillmentOrderList(response.rawBody, 'confirmed', [...items.values()]),
      response.metadata,
    )
    if (page.items.length > page.perPage) failProtocol('order')
    if (page.totalCount === undefined) consistentCount = false
    else if (expectedCount === undefined) expectedCount = page.totalCount
    else if (page.totalCount !== expectedCount) consistentCount = false
    for (const item of page.items) {
      if (scopedIds.has(item.id)) failProtocol('order')
      scopedIds.add(item.id)
      items.set(item.id, mergeFulfillment(items.get(item.id), item))
      if (items.size > MAX_FULFILLMENTS) failProtocol('order')
    }
    if (page.nextPage === undefined) {
      membershipConfirmed = consistentCount && expectedCount === scopedIds.size
      break
    }
    pageNumber = page.nextPage
  }
  if (membershipConfirmed && [...items.keys()].some((id) => !scopedIds.has(id))) {
    // Contradictory aggregate/scoped membership must not discard a supplied shipment.
    failProtocol('order')
  }
  let detailReads = 0
  for (const item of items.values()) {
    if (!needsFulfillmentDetail(item)) continue
    if (detailReads >= MAX_FULFILLMENT_DETAILS) {
      membershipConfirmed = false
      break
    }
    detailReads += 1
    const response = await nuvemshopRequest({
      method: 'GET',
      segments: ['orders', order.id, 'fulfillment-orders', item.id],
      operation: 'read',
      resourceKind: 'order',
      ...options,
    })
    const detail = parseFulfillmentOrder(response.rawBody, 'confirmed', item)
    if (detail.id !== item.id) failProtocol('order')
    items.set(item.id, mergeFulfillment(item, detail))
  }
  return {
    completeness: membershipConfirmed ? 'confirmed' : 'incomplete',
    items: [...items.values()],
  }
}

async function readInvoices(
  orderId: string,
  options: ReturnType<typeof requestOptions>,
): Promise<BoundedCollection<InvoiceReference>> {
  const items: InvoiceReference[] = []
  let pageNumber = 1
  for (let read = 0; read < MAX_SUBREAD_PAGES; read += 1) {
    const response = await nuvemshopRequest({
      method: 'GET',
      segments: ['metafields', 'orders'],
      query: { page: pageNumber, perPage: METAFIELD_PER_PAGE, orderId },
      operation: 'read',
      resourceKind: 'order',
      ...options,
    })
    const page = createNuvemshopPage(parseOrderMetafieldValues(response.rawBody), response.metadata)
    if (page.items.length > page.perPage) failProtocol('order')
    for (const value of page.items) {
      items.push(...parseInvoiceListValue(value))
      if (items.length > MAX_INVOICES) failProtocol('order')
    }
    if (page.nextPage === undefined) break
    pageNumber = page.nextPage
  }
  // The official legacy names remain unverified. Modern nfe/list alone cannot
  // establish fiscal absence or full coverage; retain every validated reference.
  return { completeness: 'incomplete', items }
}

export async function getOrder(input: GetOrderInput): Promise<Order> {
  const record = readInput(
    input,
    ['orderId', 'includeFulfillments', 'includeInvoices', 'signal', 'correlationId'],
    ['orderId'],
  )
  const orderId = parseCallerDecimalId(record.orderId)
  for (const key of ['includeFulfillments', 'includeInvoices']) {
    if (record[key] !== undefined && typeof record[key] !== 'boolean') failValidation('order')
  }
  const response = await nuvemshopRequest({
    method: 'GET',
    segments: ['orders', orderId],
    operation: 'read',
    resourceKind: 'order',
    ...requestOptions(record),
  })
  const order = parseOrder(response.rawBody)
  if (order.id !== orderId) failProtocol('order')
  const options = requestOptions(record)
  const fulfillments =
    record.includeFulfillments === false
      ? order.fulfillments
      : await readFulfillments(order, options)
  const invoices =
    record.includeInvoices === false ? order.invoices : await readInvoices(order.id, options)
  return { ...order, fulfillments, invoices }
}

/** Read one explicit page; never issue per-Order fulfillment or fiscal subreads. */
export async function listOrders(input: ListOrdersInput): Promise<Page<Order>> {
  const record = readInput(
    input,
    ['page', 'perPage', 'q', 'signal', 'correlationId'],
    ['page', 'perPage'],
  )
  const response = await nuvemshopRequest({
    method: 'GET',
    segments: ['orders'],
    operation: 'read',
    resourceKind: 'order',
    query: {
      page: record.page as number,
      perPage: record.perPage as number,
      ...(record.q === undefined ? {} : { q: record.q as string }),
    },
    ...requestOptions(record),
  })
  const page = createNuvemshopPage(parseOrderList(response.rawBody), response.metadata)
  if (page.items.length > page.perPage) failProtocol('order')
  return page
}
