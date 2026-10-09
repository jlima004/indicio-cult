import 'server-only'

import type {
  AddressProjection,
  BoundedCollection,
  Consulted,
  FulfillmentOrder,
  InvoiceReference,
  LineItem,
  Order,
  OrderParseOptions,
  OrderStatus,
  PaymentSummary,
  StatusTransition,
  TrackingEvent,
  TrackingInfo,
} from '../types'
import { minimizeFulfillmentAddress, emptyMinimizedAddress, minimizeLegacyAddress } from './address'
import { readDateTime } from './datetime'
import { failProtocol } from './fail'
import { readDecimalId, readOrderNumber, readUlid } from './ids'
import { decodeLosslessJson, decodeObject, isRecord } from './lossless-json'
import { readMoney } from './money'
import { readBoundedString, readContactEmail, readHttpUrl } from './text'

const ORDER_STATUS = ['open', 'closed', 'cancelled'] as const
const PAYMENT_STATUS = [
  'authorized',
  'pending',
  'paid',
  'partially_paid',
  'abandoned',
  'refunded',
  'partially_refunded',
  'voided',
] as const
const SHIPMENT_STATUS = /^[A-Za-z0-9_]{1,64}$/
const INVOICE_KEY = /^[A-Za-z0-9]{1,64}$/
const MAX_INVOICE_VALUE = 65_536
const MAX_INVOICES = 50

function history<T>(
  present: boolean,
  items: readonly T[],
  parent: 'incomplete' | 'confirmed',
): BoundedCollection<T> {
  if (!present) return { completeness: 'not_consulted' }
  return parent === 'confirmed'
    ? { completeness: 'confirmed', items }
    : { completeness: 'incomplete', items }
}

function readShipmentStatus(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value !== 'string' || !SHIPMENT_STATUS.test(value)) return undefined
  return value
}

function notConsulted<T>(): Consulted<T> {
  return { completeness: 'not_consulted' }
}

function confirmed<T>(value: T): Consulted<T> {
  return { completeness: 'confirmed', value }
}

function readConsultedStatus(
  record: Record<string, unknown>,
): Consulted<string | null> | undefined {
  if (!Object.hasOwn(record, 'status')) return notConsulted()
  const status = readShipmentStatus(record.status)
  if (status === undefined) return undefined
  return confirmed(status)
}

function readConsultedTracking(
  record: Record<string, unknown>,
): Consulted<TrackingInfo | null> | undefined {
  if (!Object.hasOwn(record, 'tracking_info')) return notConsulted()
  if (record.tracking_info === null) return confirmed(null)
  const tracking = readTracking(record.tracking_info)
  if (tracking === undefined || tracking === null) return undefined
  return confirmed(tracking)
}

function readRecipientName(recipient: unknown): string | null | undefined {
  if (recipient === null) return null
  if (!isRecord(recipient)) return undefined
  if (!Object.hasOwn(recipient, 'name') || recipient.name === null) return null
  if (typeof recipient.name !== 'string' || recipient.name.length > 300) return undefined
  return recipient.name
}

function readConsultedDestination(
  record: Record<string, unknown>,
): Consulted<AddressProjection | null> | undefined {
  const hasDestination = Object.hasOwn(record, 'destination')
  const hasRecipient = Object.hasOwn(record, 'recipient')
  if (!hasDestination && !hasRecipient) return notConsulted()
  const recipientName = hasRecipient ? readRecipientName(record.recipient) : null
  if (recipientName === undefined) return undefined
  const named =
    recipientName === null
      ? null
      : {
          provenance: 'fulfillment' as const,
          address: emptyMinimizedAddress(recipientName),
        }
  if (!hasDestination) return named === null ? notConsulted() : confirmed(named)
  if (record.destination === null) return confirmed(named)
  const address = minimizeFulfillmentAddress(record.destination, record.recipient)
  if (address === undefined || address === null) return undefined
  return confirmed({ provenance: 'fulfillment', address })
}

function readTracking(value: unknown): TrackingInfo | null | undefined {
  if (value === undefined || value === null) return null
  if (!isRecord(value)) return undefined
  const code =
    value.code === undefined || value.code === null ? null : readBoundedString(value.code, 128)
  const url = value.url === undefined || value.url === null ? null : readHttpUrl(value.url)
  if (code === undefined || url === undefined) return undefined
  return { code, url }
}

function readOptionalStatus(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null
  return readShipmentStatus(value)
}

function readTransition(value: unknown): StatusTransition | undefined {
  if (!isRecord(value)) return undefined
  const fromStatus = readOptionalStatus(value.from_status)
  const toStatus = readOptionalStatus(value.to_status)
  const happenedAt = readDateTime(value.happened_at)
  if (fromStatus === undefined || toStatus === undefined || happenedAt === undefined) {
    return undefined
  }
  return { fromStatus, toStatus, happenedAt }
}

function readTrackingEvent(value: unknown): TrackingEvent | undefined {
  if (!isRecord(value)) return undefined
  const id = readUlid(value.id)
  const status = readShipmentStatus(value.status)
  if (!Object.hasOwn(value, 'happened_at')) return undefined
  const happenedAt = value.happened_at === null ? null : readDateTime(value.happened_at)
  if (id === undefined || status === null || status === undefined || happenedAt === undefined) {
    return undefined
  }
  return { id, status, happenedAt }
}

function readFulfillment(
  value: unknown,
  parent: 'incomplete' | 'confirmed',
): FulfillmentOrder | undefined {
  if (typeof value === 'string') {
    const id = readUlid(value)
    if (id === undefined) return undefined
    return {
      id,
      status: notConsulted(),
      tracking: notConsulted(),
      destination: notConsulted(),
      statusHistory: { completeness: 'not_consulted' },
      trackingEvents: { completeness: 'not_consulted' },
    }
  }
  if (!isRecord(value)) return undefined
  const id = readUlid(value.id)
  const status = readConsultedStatus(value)
  const tracking = readConsultedTracking(value)
  const destination = readConsultedDestination(value)
  if (
    id === undefined ||
    status === undefined ||
    tracking === undefined ||
    destination === undefined
  ) {
    return undefined
  }
  const statusPresent = Object.hasOwn(value, 'status_history')
  const eventsPresent = Object.hasOwn(value, 'tracking_events')
  const transitions =
    statusPresent && Array.isArray(value.status_history)
      ? value.status_history.map(readTransition)
      : []
  const events =
    eventsPresent && Array.isArray(value.tracking_events)
      ? value.tracking_events.map(readTrackingEvent)
      : []
  if (
    (statusPresent && !Array.isArray(value.status_history)) ||
    (eventsPresent && !Array.isArray(value.tracking_events)) ||
    transitions.some((item) => item === undefined) ||
    events.some((item) => item === undefined) ||
    transitions.length > 200 ||
    events.length > 200
  ) {
    return undefined
  }
  return {
    id,
    status,
    tracking,
    destination,
    statusHistory: history(statusPresent, transitions as StatusTransition[], parent),
    trackingEvents: history(eventsPresent, events as TrackingEvent[], parent),
  }
}

function isIdOnlySummary(value: unknown): boolean {
  if (typeof value === 'string') return true
  if (!isRecord(value)) return false
  const keys = Object.keys(value)
  return keys.length === 1 && keys[0] === 'id'
}

function fulfillmentCollection(
  record: Record<string, unknown>,
  requested: OrderParseOptions['fulfillmentCompleteness'],
): BoundedCollection<FulfillmentOrder> {
  const key = Object.hasOwn(record, 'fulfillment_orders')
    ? 'fulfillment_orders'
    : Object.hasOwn(record, 'fulfillments')
      ? 'fulfillments'
      : undefined
  const present = key !== undefined
  if ((requested === 'confirmed' || requested === 'incomplete') && !present) {
    failProtocol('order')
  }
  const completeness = requested ?? (present ? 'incomplete' : 'not_consulted')
  if (completeness === 'not_consulted') {
    if (present && Array.isArray(record[key]) && record[key].length > 0) failProtocol('order')
    return { completeness: 'not_consulted' }
  }
  const source = present ? record[key] : []
  if (!Array.isArray(source) || source.length > 100) return failProtocol('order')
  const resolved =
    completeness === 'confirmed' && source.some(isIdOnlySummary) ? 'incomplete' : completeness
  const items = source.map((item) => readFulfillment(item, resolved))
  if (items.some((item) => item === undefined)) failProtocol('order')
  return { completeness: resolved, items: items as FulfillmentOrder[] }
}

export function parseInvoiceListValue(value: string): readonly InvoiceReference[] {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_INVOICE_VALUE) {
    failProtocol('order')
  }
  let decoded: unknown
  try {
    decoded = decodeLosslessJson(value)
  } catch {
    failProtocol('order')
  }
  if (!Array.isArray(decoded) || decoded.length > MAX_INVOICES) failProtocol('order')
  const items = decoded.map((item) => {
    if (!isRecord(item)) return undefined
    const key = typeof item.key === 'string' && INVOICE_KEY.test(item.key) ? item.key : undefined
    const link = readHttpUrl(item.link)
    const fulfillmentOrderId =
      item.fulfillment_order_id === undefined || item.fulfillment_order_id === null
        ? null
        : readUlid(item.fulfillment_order_id)
    if (key === undefined || link === undefined || fulfillmentOrderId === undefined)
      return undefined
    return { key, link, fulfillmentOrderId }
  })
  if (items.some((item) => item === undefined)) failProtocol('order')
  return items as InvoiceReference[]
}

function invoiceCollection(options: OrderParseOptions): BoundedCollection<InvoiceReference> {
  const completeness = options.invoiceCompleteness
  const value = options.invoiceValue
  if (completeness === 'not_consulted' || (completeness === undefined && value === undefined)) {
    if (value !== undefined && value !== null) failProtocol('order')
    return { completeness: 'not_consulted' }
  }
  const resolved = completeness ?? 'confirmed'
  if (value === undefined) failProtocol('order')
  if (value === null) return { completeness: resolved, items: [] }
  return { completeness: resolved, items: parseInvoiceListValue(value) }
}

function readQuantity(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value)
  if (typeof value === 'string' && /^(?:0|[1-9]\d*)$/.test(value) && value.length <= 18)
    return value
  return undefined
}

function readInstallments(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 48) {
    return value
  }
  return undefined
}

function readLineItem(value: unknown): LineItem | undefined {
  if (!isRecord(value)) return undefined
  const id = readDecimalId(value.id)
  const productId = readDecimalId(value.product_id)
  const variantId = readDecimalId(value.variant_id)
  const name = readBoundedString(value.name, 500)
  const price = readMoney(value.price)
  const quantity = readQuantity(value.quantity)
  if (
    id === undefined ||
    productId === undefined ||
    variantId === undefined ||
    name === undefined ||
    name.trim().length === 0 ||
    price === undefined ||
    quantity === undefined
  ) {
    return undefined
  }
  if (!Object.hasOwn(value, 'image') || value.image === null) {
    return {
      id,
      productId,
      variantId,
      name,
      price,
      quantity,
      thumbnail: { availability: 'unavailable' },
    }
  }
  if (!isRecord(value.image) || !Object.hasOwn(value.image, 'src')) return undefined
  const src = readHttpUrl(value.image.src)
  if (src === undefined) return undefined
  return {
    id,
    productId,
    variantId,
    name,
    price,
    quantity,
    thumbnail: { availability: 'available', src },
  }
}

function readPayment(record: Record<string, unknown>): PaymentSummary | undefined {
  const status = record.payment_status
  if (
    typeof status !== 'string' ||
    !PAYMENT_STATUS.includes(status as (typeof PAYMENT_STATUS)[number])
  ) {
    return undefined
  }
  const gateway =
    record.gateway === undefined || record.gateway === null
      ? null
      : readBoundedString(record.gateway, 120)
  const gatewayName =
    record.gateway_name === undefined || record.gateway_name === null
      ? null
      : readBoundedString(record.gateway_name, 120)
  if (gateway === undefined || gatewayName === undefined) return undefined
  const details = record.payment_details
  if (details !== undefined && details !== null && !isRecord(details)) return undefined
  const detail = isRecord(details) ? details : {}
  const method =
    detail.method === undefined || detail.method === null
      ? null
      : readBoundedString(detail.method, 64)
  const cardBrand =
    detail.credit_card_company === undefined || detail.credit_card_company === null
      ? null
      : readBoundedString(detail.credit_card_company, 64)
  const installments = readInstallments(detail.installments)
  const paidAt =
    record.paid_at === undefined || record.paid_at === null ? null : readDateTime(record.paid_at)
  if (
    method === undefined ||
    cardBrand === undefined ||
    installments === undefined ||
    paidAt === undefined
  ) {
    return undefined
  }
  return { status, gateway, gatewayName, method, cardBrand, installments, paidAt }
}

export function parseOrder(raw: string, options: OrderParseOptions = {}): Order {
  const record = decodeObject(raw)
  const id = readDecimalId(record.id)
  const number = readOrderNumber(record.number)
  const createdAt = readDateTime(record.created_at)
  const status = record.status
  const currency = record.currency
  const total = readMoney(record.total)
  const subtotal =
    record.subtotal === undefined || record.subtotal === null ? null : readMoney(record.subtotal)
  const contactEmail = readContactEmail(
    Object.hasOwn(record, 'contact_email') ? record.contact_email : null,
  )
  const payment = readPayment(record)
  const provisional = minimizeLegacyAddress(
    Object.hasOwn(record, 'shipping_address') ? record.shipping_address : null,
  )
  if (
    id === undefined ||
    number === undefined ||
    createdAt === undefined ||
    typeof status !== 'string' ||
    !ORDER_STATUS.includes(status as OrderStatus) ||
    typeof currency !== 'string' ||
    !/^[A-Z]{3}$/.test(currency) ||
    total === undefined ||
    subtotal === undefined ||
    contactEmail === undefined ||
    payment === undefined ||
    provisional === undefined ||
    !Array.isArray(record.products) ||
    record.products.length > 1000
  ) {
    failProtocol('order')
  }
  const lineItems = record.products.map(readLineItem)
  if (lineItems.some((item) => item === undefined)) failProtocol('order')
  return {
    id,
    number,
    createdAt,
    status: status as OrderStatus,
    contactEmail,
    currency,
    total,
    subtotal,
    payment,
    lineItems: lineItems as LineItem[],
    fulfillments: fulfillmentCollection(record, options.fulfillmentCompleteness),
    provisionalAddress:
      provisional === null
        ? null
        : { provenance: 'order_legacy_provisional', address: provisional },
    invoices: invoiceCollection(options),
  }
}
