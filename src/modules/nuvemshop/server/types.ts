import 'server-only'

declare const decimalIdBrand: unique symbol
declare const orderNumberBrand: unique symbol

/** Exact provider decimal identifier. Never a JS number. */
export type NuvemshopDecimalId = string & { readonly [decimalIdBrand]: true }

/** Canonical positive decimal order number, distinct from the provider id. */
export type OrderNumber = string & { readonly [orderNumberBrand]: true }

export type CanonicalDateTime = {
  readonly raw: string
  readonly offset: string
  readonly instant: string
}

export type LocalizedText = Readonly<Record<string, string>>

export type ProductVisibility = 'visible' | 'unlisted' | 'hidden'
export type CategoryVisibility = 'visible' | 'hidden' | 'soft-hidden'
export type OrderStatus = 'open' | 'closed' | 'cancelled'

export type ProductImage = {
  readonly id: NuvemshopDecimalId
  readonly src: string
}

export type Variant = {
  readonly id: NuvemshopDecimalId
  readonly productId: NuvemshopDecimalId
  readonly values: readonly LocalizedText[]
  readonly regular: string | null
  readonly promotional: string | null
  readonly effective: string | null
  readonly createdAt: CanonicalDateTime
  readonly updatedAt: CanonicalDateTime
}

export type Product = {
  readonly id: NuvemshopDecimalId
  readonly name: LocalizedText
  readonly handle: LocalizedText | null
  readonly description: LocalizedText | null
  readonly visibility: ProductVisibility
  readonly attributes: readonly LocalizedText[]
  readonly tags: readonly string[]
  readonly categoryIds: readonly NuvemshopDecimalId[]
  readonly images: readonly ProductImage[]
  readonly variants: readonly Variant[]
  readonly createdAt: CanonicalDateTime
  readonly updatedAt: CanonicalDateTime
}

export type Category = {
  readonly id: NuvemshopDecimalId
  readonly name: LocalizedText
  readonly handle: LocalizedText | null
  readonly parentId: NuvemshopDecimalId | null
  readonly visibility: CategoryVisibility
}

export type LineThumbnail =
  | { readonly availability: 'available'; readonly src: string }
  | { readonly availability: 'unavailable' }

export type LineItem = {
  readonly id: NuvemshopDecimalId
  readonly productId: NuvemshopDecimalId
  readonly variantId: NuvemshopDecimalId
  readonly name: string
  readonly price: string
  readonly quantity: string
  readonly thumbnail: LineThumbnail
}

export type PaymentSummary = {
  readonly status: string
  readonly gateway: string | null
  readonly gatewayName: string | null
  readonly method: string | null
  readonly cardBrand: string | null
  readonly installments: number | null
  readonly paidAt: CanonicalDateTime | null
}

export type MinimizedAddress = {
  readonly recipientName: string | null
  readonly street: string | null
  readonly number: string | null
  readonly floor: string | null
  readonly locality: string | null
  readonly city: string | null
  readonly zipcode: string | null
  readonly provinceName: string | null
  readonly provinceCode: string | null
  readonly countryName: string | null
  readonly countryCode: string | null
}

export type AddressProvenance = 'fulfillment' | 'order_legacy_provisional'

export type AddressProjection = {
  readonly provenance: AddressProvenance
  readonly address: MinimizedAddress
}

export type CollectionCompleteness = 'not_consulted' | 'incomplete' | 'confirmed'

export type BoundedCollection<T> =
  | { readonly completeness: 'not_consulted' }
  | { readonly completeness: 'incomplete'; readonly items: readonly T[] }
  | { readonly completeness: 'confirmed'; readonly items: readonly T[] }

export type StatusTransition = {
  readonly fromStatus: string | null
  readonly toStatus: string | null
  readonly happenedAt: CanonicalDateTime
}

export type TrackingEvent = {
  readonly id: string
  readonly status: string
  readonly happenedAt: CanonicalDateTime | null
}

export type TrackingInfo = {
  readonly code: string | null
  readonly url: string | null
}

/** A field that was either not in the payload or explicitly read. */
export type Consulted<T> =
  | { readonly completeness: 'not_consulted' }
  | { readonly completeness: 'confirmed'; readonly value: T }

export type FulfillmentOrder = {
  readonly id: string
  readonly status: Consulted<string | null>
  readonly tracking: Consulted<TrackingInfo | null>
  readonly destination: Consulted<AddressProjection | null>
  readonly statusHistory: BoundedCollection<StatusTransition>
  readonly trackingEvents: BoundedCollection<TrackingEvent>
}

export type InvoiceReference = {
  readonly key: string
  readonly link: string
  readonly fulfillmentOrderId: string | null
}

export type OrderParseOptions = {
  readonly fulfillmentCompleteness?: CollectionCompleteness
  readonly invoiceCompleteness?: CollectionCompleteness
  /** Metafield `nfe` / `list` JSON string. Omit when that read did not happen. */
  readonly invoiceValue?: string | null
}

export type Order = {
  readonly id: NuvemshopDecimalId
  readonly number: OrderNumber
  readonly createdAt: CanonicalDateTime
  readonly status: OrderStatus
  readonly contactEmail: string | null
  readonly currency: string
  readonly total: string
  readonly subtotal: string | null
  readonly payment: PaymentSummary
  readonly lineItems: readonly LineItem[]
  readonly fulfillments: BoundedCollection<FulfillmentOrder>
  readonly provisionalAddress: AddressProjection | null
  readonly invoices: BoundedCollection<InvoiceReference>
}
