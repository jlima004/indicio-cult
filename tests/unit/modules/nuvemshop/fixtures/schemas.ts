/**
 * Synthetic NUV-07 fixtures.
 * Shapes follow the public Tiendanube/Nuvemshop API docs for Product, Category,
 * Order and Fulfillment Order (fetched 2026-10-08). No store account was queried.
 * Names, emails, streets and fiscal keys are fictional.
 */
export const HUGE_ID = '9007199254740993'
export const ABOVE_INT32_ID = '2147483648'
export const ABOVE_INT64_ID = '9223372036854775808'
export const CREATED_AT = '2022-11-15T19:36:59+0000'
export const UPDATED_AT = '2022-11-15T19:37:08+0000'
export const OFFSET_CREATED_AT = '2013-01-03T09:11:51-03:00'
export const FULFILLMENT_A = '01BX5ZZKBKACTAV9WEVGEMMVRZ'
export const FULFILLMENT_B = '01FHZXHK8PTP9FVK99Z66GXKKK'
export const TRACKING_EVENT_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
export const CORRELATION_ID = 'corr-9007199254740993'
export const THUMB_A = 'https://cdn.example.test/synthetic/line-a.jpg'
export const THUMB_B = 'https://cdn.example.test/synthetic/line-b.jpg'
export const INVOICE_LINK = 'http://files.example.test/synthetic/nfe/1'
export const INVOICE_KEY = '35260612345678000123550010000000011000000011'

export function productRaw(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: 1234,
    name: { pt: 'Peça sintética' },
    handle: { pt: 'peca-sintetica' },
    description: { pt: '<p>Descrição sintética</p>' },
    attributes: [{ pt: 'Cor' }, { pt: 'Tamanho' }],
    tags: 'tema, cor, tamanho',
    visibility: 'visible',
    published: true,
    categories: [{ id: 4567, name: { pt: 'Série' }, description: { pt: 'não exportar' } }],
    images: [
      {
        id: 101,
        src: 'https://cdn.example.test/synthetic/peca.jpg',
        position: 1,
        alt: 'ignorar',
      },
    ],
    variants: [
      {
        id: 101,
        product_id: 1234,
        price: '25.00',
        promotional_price: '19.00',
        values: [{ pt: 'Azul' }, { pt: 'M' }],
        stock_management: true,
        stock: 5,
        inventory_levels: [{ location_id: 'loc', stock: 5 }],
        created_at: CREATED_AT,
        updated_at: UPDATED_AT,
      },
    ],
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    seo_title: 'não exportar',
    ...overrides,
  })
}

export function categoryRaw(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: 4567,
    name: { pt: 'Série sintética', es: 'Serie' },
    handle: { pt: 'serie-sintetica' },
    parent: null,
    visibility: 'visible',
    description: { pt: 'texto curatorial' },
    subcategories: [99],
    google_shopping_category: 'Apparel',
    created_at: OFFSET_CREATED_AT,
    updated_at: OFFSET_CREATED_AT,
    ...overrides,
  })
}

export function orderRaw(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: 871254203,
    number: 306,
    token: 'synthetic-token-not-exported',
    contact_email: 'buyer@example.test',
    contact_phone: '+5500000000000',
    contact_identification: '00000000000',
    customer: { id: 1, name: 'Pessoa Sintética', email: 'buyer@example.test' },
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    completed_at: { date: '2022-11-15 19:36:59.000000', timezone: 'UTC' },
    status: 'open',
    payment_status: 'pending',
    gateway: 'offline',
    gateway_name: 'Transferência sintética',
    gateway_link: 'https://payments.example.test/tx/1',
    currency: 'BRL',
    subtotal: '80.00',
    total: '80.00',
    payment_details: { method: 'custom', credit_card_company: null, installments: 1 },
    paid_at: null,
    products: [
      {
        id: 1069053829,
        product_id: 111,
        variant_id: '426215948',
        name: 'Peça A',
        price: '40.00',
        quantity: '1',
        image: { id: 9, src: THUMB_A, position: 1, alt: [] },
      },
    ],
    shipping_address: null,
    ...overrides,
  })
}
