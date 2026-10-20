/**
 * NUV-11 contract tests. Only fetch is replaced; schemas, HTTP, budget and pager are real.
 * All names, addresses, email addresses, tokens and fiscal references are synthetic.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NUVEMSHOP_API_ORIGIN, NUVEMSHOP_API_VERSION } from '@/modules/nuvemshop/server/client'
import type { Order } from '@/modules/nuvemshop/server/types'

import {
  ABOVE_INT64_ID,
  CREATED_AT,
  FULFILLMENT_A,
  FULFILLMENT_B,
  HUGE_ID,
  OFFSET_CREATED_AT,
  THUMB_A,
  THUMB_B,
  TRACKING_EVENT_ID,
  UPDATED_AT,
  orderRaw,
} from './fixtures/schemas'

type GetInput = {
  orderId: string
  includeFulfillments?: boolean
  includeInvoices?: boolean
  signal?: AbortSignal
  correlationId?: string
}
type ListInput = {
  page: number
  perPage: number
  q?: string
  signal?: AbortSignal
  correlationId?: string
}
type OrderPage = {
  items: Order[]
  page: number
  perPage: number
  nextPage?: number
  totalCount?: number
}

const STORE_ID = '123456789012345678901234567890'
const TOKEN = 'synthetic-nuv11-access-token'
const ORDER_ID = '871254203'
const ROOT = `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/${STORE_ID}`
const ORDER_URL = `${ROOT}/orders/${ORDER_ID}`
const FO_URL = `${ORDER_URL}/fulfillment-orders`
const CORE = { orderId: ORDER_ID, includeFulfillments: false, includeInvoices: false }
const PII = ['synthetic-pii-email@example.test', 'SYNTHETIC-PRIVATE-STREET', 'SYNTHETIC-RAW-SECRET']

let getOrder: (input: GetInput) => Promise<Order>
let listOrders: (input: ListInput) => Promise<OrderPage>
let errors: typeof import('@/modules/nuvemshop/server/errors')

function json(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function installFetch(impl: typeof fetch = async () => json(orderRaw())) {
  const mock = vi.fn(impl)
  vi.stubGlobal('fetch', mock)
  return mock
}

function urlAt(mock: ReturnType<typeof vi.fn>, index = 0): string {
  return String(mock.mock.calls[index]?.[0] ?? '')
}

async function capture<T>(run: () => Promise<T>): Promise<{ value?: T; error?: unknown }> {
  const pending = Promise.resolve()
    .then(run)
    .then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    )
  await vi.advanceTimersByTimeAsync(9_000)
  return pending
}

function serialized(error: unknown) {
  if (!(error instanceof Error)) return JSON.stringify(error)
  const publicError = 'toJSON' in error && typeof error.toJSON === 'function' ? error.toJSON() : {}
  return JSON.stringify({
    name: error.name,
    message: error.message,
    stack: error.stack,
    publicError,
  })
}

function expectSafe(error: unknown) {
  const result = serialized(error)
  for (const marker of [...PII, TOKEN, 'Bearer ', 'Authorization:']) {
    expect(result).not.toContain(marker)
  }
}

function line(overrides: Record<string, unknown> = {}) {
  return {
    id: '1069053829',
    product_id: '111',
    variant_id: '426215948',
    name: 'Synthetic line',
    quantity: '1',
    price: '40.00',
    image: { src: THUMB_A },
    ...overrides,
  }
}

function fulfillment(overrides: Record<string, unknown> = {}) {
  return {
    id: FULFILLMENT_A,
    status: 'UNPACKED',
    tracking_info: { code: null, url: null },
    status_history: [],
    tracking_events: [],
    destination: null,
    ...overrides,
  }
}

const legacy = {
  name: 'Synthetic recipient',
  address: 'SYNTHETIC-LEGACY-STREET',
  number: '10',
  floor: null,
  locality: 'Synthetic neighborhood',
  city: 'Synthetic city',
  zipcode: '00000000',
  province: { name: 'Synthetic province', code: 'SP' },
  country: { name: 'Synthetic country', code: 'BR' },
  phone: '+5500000000000',
  latitude: 1,
}

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] })
  vi.spyOn(Math, 'random').mockReturnValue(0)
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NUVEMSHOP_STORE_ID', STORE_ID)
  vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', TOKEN)
  vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', 'synthetic-nuv11-client-secret')
  vi.stubEnv('NUVEMSHOP_APP_ID', 'synthetic-nuv11-app-id')
  const server = (await import('@/modules/nuvemshop/server')) as unknown as {
    getOrder: typeof getOrder
    listOrders: typeof listOrders
  }
  getOrder = server.getOrder
  listOrders = server.listOrders
  errors = await import('@/modules/nuvemshop/server/errors')
})

afterEach(async () => {
  await vi.advanceTimersByTimeAsync(9_000)
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.doMock('server-only', () => ({}))
})

describe('NUV-11 A: Order precision and canonical creation date', () => {
  it('uses the exact large resource id in the route and keeps number distinct', async () => {
    const raw = orderRaw().replace(`"id":${ORDER_ID}`, `"id":${HUGE_ID}`)
    const mock = installFetch(async () => json(raw))
    const result = await capture(() => getOrder({ ...CORE, orderId: HUGE_ID }))
    expect(result.error).toBeUndefined()
    expect(result.value).toMatchObject({ id: HUGE_ID, number: '306' })
    expect(urlAt(mock)).toBe(`${ROOT}/orders/${HUGE_ID}`)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('keeps exact nested line, Product and Variant references from numeric JSON tokens', async () => {
    const raw = orderRaw({ products: [line()] })
      .replace('"id":"1069053829"', `"id":${HUGE_ID}`)
      .replace('"product_id":"111"', '"product_id":9223372036854775808')
      .replace('"variant_id":"426215948"', '"variant_id":900719925474099312345')
    installFetch(async () => json(raw))
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.lineItems[0]).toMatchObject({
      id: HUGE_ID,
      productId: '9223372036854775808',
      variantId: '900719925474099312345',
    })
  })

  it.each([
    [CREATED_AT, '+0000', '2022-11-15T19:36:59.000Z'],
    [OFFSET_CREATED_AT, '-03:00', '2013-01-03T12:11:51.000Z'],
    ['2026-10-19T12:30:00+0530', '+0530', '2026-10-19T07:00:00.000Z'],
  ])('preserves created_at %s with its exact offset and instant', async (raw, offset, instant) => {
    installFetch(async () => json(orderRaw({ created_at: raw, updated_at: UPDATED_AT })))
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.createdAt).toEqual({ raw, offset, instant })
    expect(result.value).not.toHaveProperty('completedAt')
  })

  it.each([
    undefined,
    null,
    '2026-10-19',
    '2026-02-30T12:30:00Z',
    '2026-10-19T12:30:00',
    '2026-10-19T12:30:00.1234Z',
  ])(
    'rejects unusable created_at %s despite alternative provider timestamps',
    async (createdAt) => {
      installFetch(async () =>
        json(
          orderRaw({
            created_at: createdAt,
            updated_at: CREATED_AT,
            paid_at: CREATED_AT,
            closed_at: CREATED_AT,
            completed_at: { date: '2022-11-15 19:36:59.000000', timezone: 'UTC' },
          }),
        ),
      )
      const result = await capture(() => getOrder(CORE))
      expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
      expectSafe(result.error)
    },
  )

  it.each(['id', 'number', 'status', 'currency', 'total', 'payment_status', 'products'])(
    'rejects missing required %s',
    async (field) => {
      const value = JSON.parse(orderRaw()) as Record<string, unknown>
      delete value[field]
      installFetch(async () => json(JSON.stringify(value)))
      const result = await capture(() => getOrder(CORE))
      expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
    },
  )

  it('rejects a returned resource id different from the requested resource', async () => {
    installFetch(async () => json(orderRaw({ id: 999 })))
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('preserves only the approved nullable payment summary', async () => {
    installFetch(async () =>
      json(
        orderRaw({
          gateway: null,
          gateway_name: null,
          payment_details: null,
          paid_at: null,
        }),
      ),
    )
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.payment).toEqual({
      status: 'pending',
      gateway: null,
      gatewayName: null,
      method: null,
      cardBrand: null,
      installments: null,
      paidAt: null,
    })
    expect(result.value).not.toHaveProperty('payment_details')
    expect(result.value).not.toHaveProperty('gateway_link')
  })
})

describe('NUV-11 B: historical line snapshots', () => {
  it('preserves independent images for repeated Product and Variant ids without enrichment or image egress', async () => {
    const mock = installFetch(async () =>
      json(
        orderRaw({
          products: [
            line({ id: '1', image: { src: THUMB_A, metadata: PII[2] } }),
            line({ id: '2', image: null }),
            line({ id: '3', image: { src: THUMB_B } }),
          ],
        }),
      ),
    )
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.lineItems.map((item) => item.thumbnail)).toEqual([
      { availability: 'available', src: THUMB_A },
      { availability: 'unavailable' },
      { availability: 'available', src: THUMB_B },
    ])
    expect(result.value?.lineItems.map((item) => item.id)).toEqual(['1', '2', '3'])
    expect(mock).toHaveBeenCalledTimes(1)
    expect(urlAt(mock)).toBe(ORDER_URL)
    expect(JSON.stringify(result.value)).not.toContain(PII[2])
  })

  it.each([undefined, null])('keeps image %s explicitly unavailable', async (image) => {
    const mock = installFetch(async () => json(orderRaw({ products: [line({ image })] })))
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.lineItems[0]?.thumbnail).toEqual({ availability: 'unavailable' })
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it.each([
    {},
    [],
    'invalid',
    { src: null },
    { src: '' },
    { src: 'javascript:alert(1)' },
    { src: 'https://user:pass@cdn.example.test/a' },
  ])('rejects a present malformed image %#', async (image) => {
    installFetch(async () => json(orderRaw({ products: [line({ image })] })))
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })
})

describe('NUV-11 C: aggregate fulfillment completeness', () => {
  it('keeps an unqueried collection distinct from confirmed zero', async () => {
    const mock = installFetch(async () => json(orderRaw()))
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toEqual({ completeness: 'not_consulted' })
    expect(result.value?.invoices).toEqual({ completeness: 'not_consulted' })
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('keeps multiple summaries and their unqueried details incomplete', async () => {
    installFetch(async () =>
      json(orderRaw({ fulfillment_orders: [FULFILLMENT_A, { id: FULFILLMENT_B }] })),
    )
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      completeness: 'incomplete',
      items: [
        { id: FULFILLMENT_A, destination: { completeness: 'not_consulted' } },
        { id: FULFILLMENT_B, statusHistory: { completeness: 'not_consulted' } },
      ],
    })
  })

  it('preserves legitimate null tracking, empty history and custom status from summaries', async () => {
    installFetch(async () =>
      json(
        orderRaw({
          fulfillment_orders: [
            fulfillment({ tracking_info: null }),
            fulfillment({
              id: FULFILLMENT_B,
              status: 'custom_in_transit',
              tracking_info: { code: null, url: null },
            }),
          ],
        }),
      ),
    )
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      completeness: 'incomplete',
      items: [
        {
          tracking: { completeness: 'confirmed', value: null },
          statusHistory: { completeness: 'incomplete', items: [] },
        },
        {
          status: { completeness: 'confirmed', value: 'custom_in_transit' },
          tracking: { completeness: 'confirmed', value: { code: null, url: null } },
        },
      ],
    })
  })

  it('preserves available transition ids independently from tracking event and fulfillment ids', async () => {
    const historyId = '9223372036854775808'
    const raw = orderRaw({
      fulfillment_orders: [
        fulfillment({
          status_history: [
            {
              id: historyId,
              from_status: 'UNPACKED',
              to_status: 'PACKED',
              happened_at: CREATED_AT,
            },
          ],
        }),
      ],
    }).replace(`"id":"${historyId}"`, `"id":${historyId}`)
    installFetch(async () => json(raw))
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      completeness: 'incomplete',
      items: [{ id: FULFILLMENT_A, statusHistory: { items: [{ id: historyId }] } }],
    })
  })

  it('rejects ambiguous simultaneous fulfillment aliases instead of silently selecting one collection', async () => {
    installFetch(async () =>
      json(
        orderRaw({
          fulfillment_orders: [fulfillment()],
          fulfillments: [fulfillment({ id: FULFILLMENT_B })],
        }),
      ),
    )
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('preserves supplied history and tracking timestamps even when happened_at is null', async () => {
    installFetch(async () =>
      json(
        orderRaw({
          fulfillment_orders: [
            fulfillment({
              status_history: [
                {
                  from_status: 'UNPACKED',
                  to_status: 'PACKED',
                  happened_at: CREATED_AT,
                  created_at: OFFSET_CREATED_AT,
                },
              ],
              tracking_events: [
                {
                  id: TRACKING_EVENT_ID,
                  status: 'dispatched',
                  happened_at: null,
                  created_at: CREATED_AT,
                  updated_at: UPDATED_AT,
                  estimated_delivery_at: OFFSET_CREATED_AT,
                },
              ],
            }),
          ],
        }),
      ),
    )
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      items: [
        {
          statusHistory: {
            items: [
              {
                happenedAt: { raw: CREATED_AT, offset: '+0000' },
                createdAt: {
                  raw: OFFSET_CREATED_AT,
                  offset: '-03:00',
                  instant: '2013-01-03T12:11:51.000Z',
                },
              },
            ],
          },
          trackingEvents: {
            items: [
              {
                happenedAt: null,
                createdAt: { raw: CREATED_AT, offset: '+0000' },
                updatedAt: { raw: UPDATED_AT, offset: '+0000' },
                estimatedDeliveryAt: { raw: OFFSET_CREATED_AT, offset: '-03:00' },
              },
            ],
          },
        },
      ],
    })
  })

  it.each([
    ['history', 'created_at'],
    ['tracking', 'created_at'],
    ['tracking', 'updated_at'],
    ['tracking', 'estimated_delivery_at'],
  ])('rejects a malformed present %s %s timestamp instead of dropping it', async (kind, field) => {
    const event = { id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: null }
    const transition = { from_status: 'UNPACKED', to_status: 'PACKED', happened_at: CREATED_AT }
    const history = kind === 'history' ? [{ ...transition, [field]: '2026-02-30T00:00:00Z' }] : []
    const tracking = kind === 'tracking' ? [{ ...event, [field]: '2026-02-30T00:00:00Z' }] : []
    installFetch(async () =>
      json(
        orderRaw({
          fulfillment_orders: [fulfillment({ status_history: history, tracking_events: tracking })],
        }),
      ),
    )
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
    expectSafe(result.error)
  })
})

describe('NUV-11 D: minimized addresses and provenance', () => {
  it('keeps a historical provisional address separate from each shipment destination', async () => {
    installFetch(async () =>
      json(
        orderRaw({
          shipping_address: legacy,
          fulfillment_orders: [
            fulfillment({
              recipient: { name: 'Synthetic fulfillment recipient', email: PII[0], phone: PII[2] },
              destination: {
                street: 'Synthetic fulfillment street',
                city: null,
                latitude: 3,
                geolocation: { longitude: 4 },
              },
            }),
            fulfillment({ id: FULFILLMENT_B, destination: null }),
          ],
        }),
      ),
    )
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.provisionalAddress).toMatchObject({
      provenance: 'order_legacy_provisional',
      address: { street: legacy.address },
    })
    expect(result.value?.fulfillments).toMatchObject({
      completeness: 'incomplete',
      items: [
        {
          destination: {
            completeness: 'confirmed',
            value: {
              provenance: 'fulfillment',
              address: {
                street: 'Synthetic fulfillment street',
                recipientName: 'Synthetic fulfillment recipient',
              },
            },
          },
        },
        { destination: { completeness: 'confirmed', value: null } },
      ],
    })
    const projected = JSON.stringify(result.value)
    for (const forbidden of ['latitude', 'longitude', 'geolocation', 'phone', PII[0], PII[2]])
      expect(projected).not.toContain(forbidden)
  })

  it.each([undefined, null])('allows absent legacy address %s', async (shippingAddress) => {
    installFetch(async () => json(orderRaw({ shipping_address: shippingAddress })))
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.provisionalAddress).toBeNull()
  })

  it.each([
    { shipping_address: [] },
    { shipping_address: { address: 123 } },
    { fulfillment_orders: [fulfillment({ destination: { street: 123 } })] },
    { fulfillment_orders: [fulfillment({ recipient: { name: {} } })] },
  ])('rejects a structurally malformed present address %#', async (overrides) => {
    installFetch(async () => json(orderRaw(overrides)))
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
    expectSafe(result.error)
  })
})

describe('NUV-11 F: caller safety, privacy and shared transport', () => {
  it.each([undefined, null, 'not-an-email', 123, {}, 'too long '.repeat(100)])(
    'keeps an unusable contact email %# unbindable while retaining the Order',
    async (contactEmail) => {
      installFetch(async () => json(orderRaw({ contact_email: contactEmail })))
      const result = await capture(() => getOrder(CORE))
      expect(result.error).toBeUndefined()
      expect(result.value?.contactEmail).toBeNull()
    },
  )

  it('preserves a valid contactEmail server-side without raw customer or contact extras', async () => {
    installFetch(async () => json(orderRaw({ contact_email: PII[0] })))
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value?.contactEmail).toBe(PII[0])
    for (const raw of [
      'customer',
      'contact_email',
      'contact_phone',
      'token',
      'raw',
      'payment_details',
    ])
      expect(result.value).not.toHaveProperty(raw)
  })

  it.each(['../orders', '1/2', ' 123', '-1', '0', '1e3', Number.MAX_SAFE_INTEGER + 2, null])(
    'rejects invalid order id %# before fetch',
    async (orderId) => {
      const mock = installFetch()
      const result = await capture(() => getOrder({ ...CORE, orderId: orderId as string }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
      expect(mock).not.toHaveBeenCalled()
      expectSafe(result.error)
    },
  )

  it('contains a hostile input Proxy without inspecting its exception or fetching', async () => {
    const mock = installFetch()
    const hostile = new Proxy(CORE, {
      ownKeys() {
        throw new Error(PII[2])
      },
    })
    const result = await capture(() => getOrder(hostile))
    expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
    expect(mock).not.toHaveBeenCalled()
    expectSafe(result.error)
  })

  it('rejects input getters without invoking caller code', async () => {
    const mock = installFetch()
    const getter = vi.fn(() => ORDER_ID)
    const input = { ...CORE }
    Object.defineProperty(input, 'orderId', { get: getter, enumerable: true })
    const result = await capture(() => getOrder(input))
    expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
    expect(getter).not.toHaveBeenCalled()
    expect(mock).not.toHaveBeenCalled()
  })

  it('fails without echoing raw payload, email, address, invoice or provider errors into logs', async () => {
    const logs = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
    ]
    installFetch(async () =>
      json(
        orderRaw({
          created_at: null,
          contact_email: PII[0],
          shipping_address: { address: PII[1] },
          raw_secret: PII[2],
        }),
      ),
    )
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
    expectSafe(result.error)
    for (const log of logs)
      for (const marker of [...PII, TOKEN])
        expect(JSON.stringify(log.mock.calls)).not.toContain(marker)
  })

  it.each([
    [401, 'NuvemshopAuthenticationError', 1],
    [403, 'NuvemshopAuthorizationError', 1],
    [404, 'NuvemshopNotFoundError', 1],
    [429, 'NuvemshopRateLimitError', 1],
    [503, 'NuvemshopProviderError', 2],
  ] as const)(
    'uses the shared transport taxonomy and retry bound for HTTP %s',
    async (status, kind, count) => {
      const mock = installFetch(async () => json(JSON.stringify({ raw: PII[2] }), status))
      const result = await capture(() => getOrder(CORE))
      expect(result.error).toBeInstanceOf(errors[kind])
      expect(mock).toHaveBeenCalledTimes(count)
      expectSafe(result.error)
    },
  )

  it('honors an already aborted signal without a provider call', async () => {
    const mock = installFetch()
    const controller = new AbortController()
    controller.abort()
    const result = await capture(() => getOrder({ ...CORE, signal: controller.signal }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopNetworkError)
    expect(mock).not.toHaveBeenCalled()
  })
})

describe('NUV-11 listOrders: one typed page without N+1 requests', () => {
  it('preserves typed items, page navigation and total count with one request', async () => {
    const url = `${ROOT}/orders?page=2&per_page=30`
    const mock = installFetch(async () =>
      json(`[${orderRaw()}]`, 200, {
        link: `<${ROOT}/orders?page=3&per_page=30>; rel="next"`,
        'x-total-count': '42',
      }),
    )
    const result = await capture(() => listOrders({ page: 2, perPage: 30 }))
    expect(result.error).toBeUndefined()
    expect(result.value).toMatchObject({
      page: 2,
      perPage: 30,
      nextPage: 3,
      totalCount: 42,
      items: [
        {
          id: ORDER_ID,
          number: '306',
          createdAt: { raw: CREATED_AT },
          invoices: { completeness: 'not_consulted' },
        },
      ],
    })
    expect(urlAt(mock)).toBe(url)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('keeps empty intermediate pages with a next relation incomplete for consumers', async () => {
    const mock = installFetch(async () =>
      json('[]', 200, { link: `<${ROOT}/orders?page=3&per_page=30>; rel="next"` }),
    )
    const result = await capture(() => listOrders({ page: 2, perPage: 30 }))
    expect(result.error).toBeUndefined()
    expect(result.value).toMatchObject({ items: [], nextPage: 3 })
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('rejects external pagination targets before any followup egress', async () => {
    const mock = installFetch(async () =>
      json('[]', 200, {
        link: '<https://evil.example.test/orders?page=2&per_page=30>; rel="next"',
      }),
    )
    const result = await capture(() => listOrders({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('rejects an oversized page instead of silently dropping orders', async () => {
    installFetch(async () => json(`[${orderRaw()},${orderRaw({ id: 999 })}]`))
    const result = await capture(() => listOrders({ page: 1, perPage: 1 }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it.each([
    [0, 30],
    [1.5, 30],
    [1, 201],
    [1, 0],
  ])('rejects invalid page=%s/perPage=%s locally', async (page, perPage) => {
    const mock = installFetch()
    const result = await capture(() => listOrders({ page, perPage }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
    expect(mock).not.toHaveBeenCalled()
  })

  it('encodes discovery q without claiming email ownership or making followup requests', async () => {
    const mock = installFetch(async () =>
      json(`[${orderRaw({ contact_email: 'different@example.test' })}]`),
    )
    const q = 'synthetic+candidate@example.test & value'
    const result = await capture(() => listOrders({ page: 1, perPage: 30, q }))
    expect(result.error).toBeUndefined()
    expect(new URL(urlAt(mock)).searchParams.get('q')).toBe(q)
    expect(result.value?.items[0]?.contactEmail).toBe('different@example.test')
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('preserves an apostrophe in discovery q using the canonical HTTPS query encoding', async () => {
    const q = "o'brien@example.invalid"
    const mock = installFetch(async () => json('[]'))
    const result = await capture(() => listOrders({ page: 1, perPage: 30, q }))
    expect(result.error).toBeUndefined()
    expect(result.value?.items).toEqual([])
    expect(urlAt(mock)).toBe(`${ROOT}/orders?page=1&per_page=30&q=o%27brien%40example.invalid`)
    expect(new URL(urlAt(mock)).searchParams.get('q')).toBe(q)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('accepts a next-page Link carrying the same canonical apostrophe-bearing q', async () => {
    const q = "o'brien@example.invalid"
    const mock = installFetch(async () =>
      json('[]', 200, {
        link: `<${ROOT}/orders?page=2&per_page=30&q=o%27brien%40example.invalid>; rel="next"`,
      }),
    )
    const result = await capture(() => listOrders({ page: 1, perPage: 30, q }))
    expect(result.error).toBeUndefined()
    expect(result.value).toMatchObject({ items: [], page: 1, perPage: 30, nextPage: 2 })
    expect(new URL(urlAt(mock)).searchParams.get('q')).toBe(q)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it.each(['', 'x'.repeat(321), 'query\ncontrol', 1, {}])(
    'rejects invalid discovery q %# before fetch',
    async (q) => {
      const mock = installFetch()
      const result = await capture(() => listOrders({ page: 1, perPage: 30, q: q as string }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
      expect(mock).not.toHaveBeenCalled()
    },
  )

  it('redacts discovery q from shared transport errors and console output', async () => {
    const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'error')]
    installFetch(async () => json('{"error":"synthetic"}', 403))
    const result = await capture(() => listOrders({ page: 1, perPage: 30, q: PII[0] }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopAuthorizationError)
    expectSafe(result.error)
    for (const log of logs) expect(JSON.stringify(log.mock.calls)).not.toContain(PII[0])
  })

  it('keeps canonical dates and each historical thumbnail on the list path', async () => {
    const mock = installFetch(async () =>
      json(
        `[${orderRaw({ created_at: OFFSET_CREATED_AT, products: [line({ id: '1' }), line({ id: '2', image: undefined }), line({ id: '3', image: { src: THUMB_B } })] })}]`,
      ),
    )
    const result = await capture(() => listOrders({ page: 1, perPage: 30 }))
    expect(result.error).toBeUndefined()
    expect(result.value?.items[0]?.createdAt).toEqual({
      raw: OFFSET_CREATED_AT,
      offset: '-03:00',
      instant: '2013-01-03T12:11:51.000Z',
    })
    expect(result.value?.items[0]?.lineItems.map((item) => item.thumbnail)).toEqual([
      { availability: 'available', src: THUMB_A },
      { availability: 'unavailable' },
      { availability: 'available', src: THUMB_B },
    ])
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it.each([
    { created_at: undefined },
    { created_at: null },
    { created_at: '2026-02-30T00:00:00Z' },
    { products: [line({ image: {} })] },
  ])('rejects an invalid list item without returning a partial valid page %#', async (invalid) => {
    installFetch(async () => json(`[${orderRaw()},${orderRaw(invalid)}]`))
    const result = await capture(() => listOrders({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
    expect(result.value).toBeUndefined()
  })
})

describe('NUV-11 C/D: bounded Fulfillment Order reads', () => {
  function fetchFulfillments(
    items: unknown[],
    orderOverrides: Record<string, unknown> = {},
    headers: Record<string, string> = { 'x-total-count': String(items.length) },
  ) {
    return installFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/orders/${ORDER_ID}`)) return json(orderRaw(orderOverrides))
      if (url.pathname.endsWith(`/orders/${ORDER_ID}/fulfillment-orders`))
        return json(JSON.stringify(items), 200, headers)
      return json('{}', 404)
    })
  }

  it.each([undefined, null, legacy])(
    'confirms zero shipments only after a bounded read and preserves optional legacy address %#',
    async (address) => {
      const mock = fetchFulfillments([], { shipping_address: address })
      const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
      expect(result.error).toBeUndefined()
      expect(result.value?.fulfillments).toEqual({ completeness: 'confirmed', items: [] })
      expect(result.value?.provisionalAddress).toEqual(
        address == null
          ? null
          : expect.objectContaining({
              provenance: 'order_legacy_provisional',
              address: expect.objectContaining({ street: legacy.address }),
            }),
      )
      expect(mock).toHaveBeenCalledTimes(2)
    },
  )

  it('retains a metadata-less empty page as incomplete instead of confirmed absence', async () => {
    fetchFulfillments([], {}, {})
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toEqual({ completeness: 'incomplete', items: [] })
  })

  it('preserves multiple full records, nullable tracking and per-shipment histories without requiring order_id', async () => {
    const items = [
      fulfillment({
        recipient: { name: 'Synthetic shipment A' },
        destination: { street: 'Shipment A street' },
      }),
      fulfillment({
        id: FULFILLMENT_B,
        status: 'custom_in_transit',
        tracking_info: null,
        destination: null,
        status_history: [
          { from_status: 'UNPACKED', to_status: 'custom_in_transit', happened_at: CREATED_AT },
        ],
        tracking_events: [{ id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: null }],
      }),
    ]
    const mock = fetchFulfillments(items, { shipping_address: legacy })
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      completeness: 'confirmed',
      items: [
        {
          id: FULFILLMENT_A,
          statusHistory: { completeness: 'confirmed', items: [] },
          destination: {
            completeness: 'confirmed',
            value: { provenance: 'fulfillment', address: { street: 'Shipment A street' } },
          },
        },
        {
          id: FULFILLMENT_B,
          status: { completeness: 'confirmed', value: 'custom_in_transit' },
          tracking: { completeness: 'confirmed', value: null },
          destination: { completeness: 'confirmed', value: null },
          statusHistory: {
            completeness: 'confirmed',
            items: [
              {
                fromStatus: 'UNPACKED',
                toStatus: 'custom_in_transit',
                happenedAt: { raw: CREATED_AT },
              },
            ],
          },
          trackingEvents: {
            completeness: 'confirmed',
            items: [{ id: TRACKING_EVENT_ID, status: 'dispatched', happenedAt: null }],
          },
        },
      ],
    })
    expect(result.value?.provisionalAddress?.provenance).toBe('order_legacy_provisional')
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it('resolves a partial summary through its own order-scoped detail route', async () => {
    const detail = fulfillment({
      status: 'custom_ready',
      recipient: { name: 'Synthetic recipient' },
    })
    const mock = installFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/orders/${ORDER_ID}`)) return json(orderRaw())
      if (url.pathname.endsWith(`/fulfillment-orders/${FULFILLMENT_A}`))
        return json(JSON.stringify(detail))
      if (url.pathname.endsWith('/fulfillment-orders'))
        return json(JSON.stringify([{ id: FULFILLMENT_A }]), 200, { 'x-total-count': '1' })
      return json('{}', 404)
    })
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      completeness: 'confirmed',
      items: [
        {
          id: FULFILLMENT_A,
          status: { completeness: 'confirmed', value: 'custom_ready' },
          statusHistory: { completeness: 'confirmed', items: [] },
        },
      ],
    })
    expect(mock.mock.calls.map((call) => String(call[0]))).toContain(`${FO_URL}/${FULFILLMENT_A}`)
    expect(mock).toHaveBeenCalledTimes(3)
  })

  it('reads details when aggregate history remains incomplete after a collection summary', async () => {
    const complete = fulfillment({
      status_history: [{ from_status: 'UNPACKED', to_status: 'PACKED', happened_at: CREATED_AT }],
      tracking_events: [{ id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: null }],
    })
    const summary = { id: FULFILLMENT_A, status: 'PACKED', tracking_info: null, destination: null }
    const mock = installFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/orders/${ORDER_ID}`)) {
        return json(orderRaw({ fulfillment_orders: [complete] }))
      }
      if (url.pathname.endsWith(`/fulfillment-orders/${FULFILLMENT_A}`)) {
        return json(JSON.stringify(complete))
      }
      return json(JSON.stringify([summary]), 200, { 'x-total-count': '1' })
    })
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      completeness: 'confirmed',
      items: [
        {
          id: FULFILLMENT_A,
          statusHistory: { completeness: 'confirmed', items: [{ toStatus: 'PACKED' }] },
          trackingEvents: { completeness: 'confirmed', items: [{ id: TRACKING_EVENT_ID }] },
        },
      ],
    })
    expect(mock.mock.calls.map((call) => String(call[0]))).toContain(`${FO_URL}/${FULFILLMENT_A}`)
  })

  it('preserves an aggregate street across recipient-only summaries', async () => {
    installFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/orders/${ORDER_ID}`)) {
        return json(
          orderRaw({
            fulfillment_orders: [
              fulfillment({
                recipient: { name: 'Synthetic aggregate recipient' },
                destination: { street: 'Synthetic aggregate street' },
              }),
            ],
          }),
        )
      }
      if (url.pathname.endsWith(`/fulfillment-orders/${FULFILLMENT_A}`)) {
        return json(JSON.stringify({ id: FULFILLMENT_A, status_history: [], tracking_events: [] }))
      }
      return json(
        JSON.stringify([{ id: FULFILLMENT_A, recipient: { name: 'Synthetic scoped recipient' } }]),
        200,
        { 'x-total-count': '1' },
      )
    })
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      items: [
        {
          id: FULFILLMENT_A,
          destination: {
            completeness: 'confirmed',
            value: { provenance: 'fulfillment', address: { street: 'Synthetic aggregate street' } },
          },
        },
      ],
    })
  })

  it.each(['whole', 'field'])(
    'preserves explicit %s destination null as authoritative while retaining omitted fields',
    async (kind) => {
      const aggregate = fulfillment({
        recipient: { name: 'Synthetic aggregate recipient' },
        destination: { street: 'Synthetic aggregate street', city: 'Synthetic aggregate city' },
      })
      const scoped = fulfillment({
        destination: kind === 'whole' ? null : { street: null },
        ...(kind === 'whole' ? { recipient: null } : {}),
      })
      installFetch(async (input) =>
        String(input).endsWith(`/orders/${ORDER_ID}`)
          ? json(orderRaw({ fulfillment_orders: [aggregate] }))
          : json(JSON.stringify([scoped]), 200, { 'x-total-count': '1' }),
      )
      const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
      expect(result.error).toBeUndefined()
      expect(result.value?.fulfillments).toMatchObject({
        items: [
          {
            destination: {
              completeness: 'confirmed',
              value:
                kind === 'whole'
                  ? null
                  : {
                      provenance: 'fulfillment',
                      address: {
                        street: null,
                        city: 'Synthetic aggregate city',
                        recipientName: 'Synthetic aggregate recipient',
                      },
                    },
            },
          },
        ],
      })
    },
  )

  it('clears explicit destination null while preserving an independently omitted recipient across detail reads', async () => {
    const aggregate = fulfillment({
      recipient: { name: 'Synthetic independent recipient' },
      destination: { street: 'Synthetic prior street' },
    })
    installFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/orders/${ORDER_ID}`))
        return json(orderRaw({ fulfillment_orders: [aggregate] }))
      if (url.pathname.endsWith(`/fulfillment-orders/${FULFILLMENT_A}`)) {
        return json(JSON.stringify({ id: FULFILLMENT_A, status_history: [], tracking_events: [] }))
      }
      return json(
        JSON.stringify([
          { id: FULFILLMENT_A, status: 'PACKED', tracking_info: null, destination: null },
        ]),
        200,
        { 'x-total-count': '1' },
      )
    })
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      items: [
        {
          destination: {
            completeness: 'confirmed',
            value: {
              provenance: 'fulfillment',
              address: { recipientName: 'Synthetic independent recipient', street: null },
            },
          },
        },
      ],
    })
  })

  it.each(['omitted-url', 'null-url', 'null-tracking'])(
    'keeps tracking omission distinct from explicit null across scoped reads: %s',
    async (kind) => {
      const trackingUrl = 'https://tracking.example.test/synthetic/shipment-a'
      const aggregate = fulfillment({
        tracking_info: { code: 'SYNTHETIC-CODE-A', url: trackingUrl },
      })
      const tracking =
        kind === 'null-tracking'
          ? null
          : { code: 'SYNTHETIC-CODE-B', ...(kind === 'null-url' ? { url: null } : {}) }
      const scoped = fulfillment({ tracking_info: tracking })
      installFetch(async (input) =>
        String(input).endsWith(`/orders/${ORDER_ID}`)
          ? json(orderRaw({ fulfillment_orders: [aggregate] }))
          : json(JSON.stringify([scoped]), 200, { 'x-total-count': '1' }),
      )
      const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
      expect(result.error).toBeUndefined()
      expect(result.value?.fulfillments).toMatchObject({
        items: [
          {
            tracking: {
              completeness: 'confirmed',
              value:
                kind === 'null-tracking'
                  ? null
                  : { code: 'SYNTHETIC-CODE-B', url: kind === 'null-url' ? null : trackingUrl },
            },
          },
        ],
      })
    },
  )

  it.each(['history', 'tracking'])(
    'preserves supplied %s rows across an empty scoped snapshot or rejects the contradiction',
    async (kind) => {
      const transition = { from_status: 'UNPACKED', to_status: 'PACKED', happened_at: CREATED_AT }
      const event = { id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: null }
      const aggregate = fulfillment({
        status_history: kind === 'history' ? [transition] : [],
        tracking_events: kind === 'tracking' ? [event] : [],
      })
      installFetch(async (input) => {
        if (String(input).endsWith(`/orders/${ORDER_ID}`)) {
          return json(orderRaw({ fulfillment_orders: [aggregate] }))
        }
        return json(JSON.stringify([fulfillment()]), 200, { 'x-total-count': '1' })
      })
      const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
    },
  )

  it.each([
    ['history', 'created_at', 'createdAt'],
    ['tracking', 'created_at', 'createdAt'],
    ['tracking', 'updated_at', 'updatedAt'],
    ['tracking', 'estimated_delivery_at', 'estimatedDeliveryAt'],
  ])(
    'retains supplied %s %s when matching scoped rows omit it or rejects the contradiction',
    async (kind, providerField, normalizedField) => {
      const transition = { from_status: 'UNPACKED', to_status: 'PACKED', happened_at: CREATED_AT }
      const event = { id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: null }
      const aggregate = fulfillment({
        status_history:
          kind === 'history' ? [{ ...transition, [providerField]: OFFSET_CREATED_AT }] : [],
        tracking_events:
          kind === 'tracking' ? [{ ...event, [providerField]: OFFSET_CREATED_AT }] : [],
      })
      const scoped = fulfillment({
        status_history: kind === 'history' ? [transition] : [],
        tracking_events: kind === 'tracking' ? [event] : [],
      })
      installFetch(async (input) =>
        String(input).endsWith(`/orders/${ORDER_ID}`)
          ? json(orderRaw({ fulfillment_orders: [aggregate] }))
          : json(JSON.stringify([scoped]), 200, { 'x-total-count': '1' }),
      )
      const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
      expect(result.error).toBeUndefined()
      expect(result.value?.fulfillments).toMatchObject({
        items: [
          {
            [kind === 'history' ? 'statusHistory' : 'trackingEvents']: {
              items: [{ [normalizedField]: { raw: OFFSET_CREATED_AT, offset: '-03:00' } }],
            },
          },
        ],
      })
    },
  )

  it('retains all optional tracking timestamps when a scoped row omits them together', async () => {
    const event = {
      id: TRACKING_EVENT_ID,
      status: 'dispatched',
      happened_at: CREATED_AT,
      created_at: OFFSET_CREATED_AT,
      updated_at: UPDATED_AT,
      estimated_delivery_at: OFFSET_CREATED_AT,
    }
    const aggregate = fulfillment({ tracking_events: [event] })
    const scoped = fulfillment({
      tracking_events: [{ id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: CREATED_AT }],
    })
    installFetch(async (input) =>
      String(input).endsWith(`/orders/${ORDER_ID}`)
        ? json(orderRaw({ fulfillment_orders: [aggregate] }))
        : json(JSON.stringify([scoped]), 200, { 'x-total-count': '1' }),
    )
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      items: [
        {
          trackingEvents: {
            items: [
              {
                createdAt: { raw: OFFSET_CREATED_AT, offset: '-03:00' },
                updatedAt: { raw: UPDATED_AT, offset: '+0000' },
                estimatedDeliveryAt: { raw: OFFSET_CREATED_AT, offset: '-03:00' },
              },
            ],
          },
        },
      ],
    })
  })

  it('retains optional timestamps when a detail read omits them after a scoped summary supplied them', async () => {
    const transition = {
      from_status: 'UNPACKED',
      to_status: 'PACKED',
      happened_at: CREATED_AT,
      created_at: OFFSET_CREATED_AT,
    }
    const event = {
      id: TRACKING_EVENT_ID,
      status: 'dispatched',
      happened_at: CREATED_AT,
      created_at: OFFSET_CREATED_AT,
      updated_at: UPDATED_AT,
    }
    const summary = {
      id: FULFILLMENT_A,
      status: 'UNPACKED',
      tracking_info: { code: null, url: null },
      destination: null,
      status_history: [{ from_status: 'UNPACKED', to_status: 'PACKED', happened_at: CREATED_AT }],
      tracking_events: [{ id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: CREATED_AT }],
    }
    const detail = fulfillment({
      status: 'UNPACKED',
      status_history: [{ from_status: 'UNPACKED', to_status: 'PACKED', happened_at: CREATED_AT }],
      tracking_events: [{ id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: CREATED_AT }],
    })
    installFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/orders/${ORDER_ID}`)) {
        return json(
          orderRaw({
            fulfillment_orders: [
              fulfillment({
                status_history: [transition],
                tracking_events: [event],
              }),
            ],
          }),
        )
      }
      if (url.pathname.endsWith(`/fulfillment-orders/${FULFILLMENT_A}`)) {
        return json(JSON.stringify(detail))
      }
      return json(JSON.stringify([summary]), 200, { 'x-total-count': '1' })
    })
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      items: [
        {
          statusHistory: {
            items: [{ createdAt: { raw: OFFSET_CREATED_AT, offset: '-03:00' } }],
          },
          trackingEvents: {
            items: [
              {
                createdAt: { raw: OFFSET_CREATED_AT, offset: '-03:00' },
                updatedAt: { raw: UPDATED_AT, offset: '+0000' },
              },
            ],
          },
        },
      ],
    })
  })

  it('keeps identical optional timestamps when both projections supply the same value', async () => {
    const transition = {
      from_status: 'UNPACKED',
      to_status: 'PACKED',
      happened_at: CREATED_AT,
      created_at: OFFSET_CREATED_AT,
    }
    const aggregate = fulfillment({ status_history: [transition] })
    const scoped = fulfillment({ status_history: [transition] })
    installFetch(async (input) =>
      String(input).endsWith(`/orders/${ORDER_ID}`)
        ? json(orderRaw({ fulfillment_orders: [aggregate] }))
        : json(JSON.stringify([scoped]), 200, { 'x-total-count': '1' }),
    )
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      items: [
        {
          statusHistory: {
            items: [{ createdAt: { raw: OFFSET_CREATED_AT, offset: '-03:00' } }],
          },
        },
      ],
    })
  })

  it('rejects contradictory optional timestamps across projections', async () => {
    const transition = {
      from_status: 'UNPACKED',
      to_status: 'PACKED',
      happened_at: CREATED_AT,
      created_at: OFFSET_CREATED_AT,
    }
    const aggregate = fulfillment({ status_history: [transition] })
    const scoped = fulfillment({
      status_history: [{ ...transition, created_at: UPDATED_AT }],
    })
    installFetch(async (input) =>
      String(input).endsWith(`/orders/${ORDER_ID}`)
        ? json(orderRaw({ fulfillment_orders: [aggregate] }))
        : json(JSON.stringify([scoped]), 200, { 'x-total-count': '1' }),
    )
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('rejects explicit null after a known history timestamp', async () => {
    const transition = {
      from_status: 'UNPACKED',
      to_status: 'PACKED',
      happened_at: CREATED_AT,
      created_at: OFFSET_CREATED_AT,
    }
    const aggregate = fulfillment({ status_history: [transition] })
    const scoped = fulfillment({
      status_history: [{ ...transition, created_at: null }],
    })
    installFetch(async (input) =>
      String(input).endsWith(`/orders/${ORDER_ID}`)
        ? json(orderRaw({ fulfillment_orders: [aggregate] }))
        : json(JSON.stringify([scoped]), 200, { 'x-total-count': '1' }),
    )
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('rejects a later timestamp after an explicit null history field', async () => {
    const transition = {
      from_status: 'UNPACKED',
      to_status: 'PACKED',
      happened_at: CREATED_AT,
      created_at: null,
    }
    const aggregate = fulfillment({ status_history: [transition] })
    const scoped = fulfillment({
      status_history: [{ ...transition, created_at: OFFSET_CREATED_AT }],
    })
    installFetch(async (input) =>
      String(input).endsWith(`/orders/${ORDER_ID}`)
        ? json(orderRaw({ fulfillment_orders: [aggregate] }))
        : json(JSON.stringify([scoped]), 200, { 'x-total-count': '1' }),
    )
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('retains explicit null when a later scoped row omits the timestamp field', async () => {
    const transition = {
      from_status: 'UNPACKED',
      to_status: 'PACKED',
      happened_at: CREATED_AT,
      created_at: null,
    }
    const aggregate = fulfillment({ status_history: [transition] })
    const scoped = fulfillment({
      status_history: [{ from_status: 'UNPACKED', to_status: 'PACKED', happened_at: CREATED_AT }],
    })
    installFetch(async (input) =>
      String(input).endsWith(`/orders/${ORDER_ID}`)
        ? json(orderRaw({ fulfillment_orders: [aggregate] }))
        : json(JSON.stringify([scoped]), 200, { 'x-total-count': '1' }),
    )
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      items: [
        {
          statusHistory: {
            items: [{ createdAt: null }],
          },
        },
      ],
    })
  })

  it('rejects a scoped snapshot that replaces a known tracking event id', async () => {
    const event = { id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: null }
    const aggregate = fulfillment({ tracking_events: [event] })
    const scoped = fulfillment({
      tracking_events: [{ id: FULFILLMENT_B, status: 'dispatched', happened_at: null }],
    })
    installFetch(async (input) =>
      String(input).endsWith(`/orders/${ORDER_ID}`)
        ? json(orderRaw({ fulfillment_orders: [aggregate] }))
        : json(JSON.stringify([scoped]), 200, { 'x-total-count': '1' }),
    )
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('does not rewrite happenedAt when retaining an omitted createdAt', async () => {
    const event = {
      id: TRACKING_EVENT_ID,
      status: 'dispatched',
      happened_at: CREATED_AT,
      created_at: OFFSET_CREATED_AT,
    }
    const aggregate = fulfillment({ tracking_events: [event] })
    const scoped = fulfillment({
      tracking_events: [{ id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: CREATED_AT }],
    })
    installFetch(async (input) =>
      String(input).endsWith(`/orders/${ORDER_ID}`)
        ? json(orderRaw({ fulfillment_orders: [aggregate] }))
        : json(JSON.stringify([scoped]), 200, { 'x-total-count': '1' }),
    )
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      items: [
        {
          trackingEvents: {
            items: [
              {
                happenedAt: { raw: CREATED_AT, offset: '+0000' },
                createdAt: { raw: OFFSET_CREATED_AT, offset: '-03:00' },
              },
            ],
          },
        },
      ],
    })
  })

  it('rejects a detail response with a swapped fulfillment id', async () => {
    installFetch(async (input) => {
      const url = String(input)
      if (url.endsWith(`/orders/${ORDER_ID}`)) return json(orderRaw())
      if (url.includes(`/fulfillment-orders/${FULFILLMENT_A}`))
        return json(JSON.stringify(fulfillment({ id: FULFILLMENT_B })))
      return json(JSON.stringify([{ id: FULFILLMENT_A }]), 200, { 'x-total-count': '1' })
    })
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('bounds a still-growing paginated collection without asserting completeness', async () => {
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
    const mock = installFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/orders/${ORDER_ID}`)) return json(orderRaw())
      const page = Number(url.searchParams.get('page'))
      const perPage = Number(url.searchParams.get('per_page'))
      const items = Array.from({ length: perPage }, (_, index) => {
        const ordinal = (page - 1) * perPage + index
        const tail = `${alphabet[Math.floor(ordinal / 32)]}${alphabet[ordinal % 32]}`
        return fulfillment({ id: `${FULFILLMENT_A.slice(0, 24)}${tail}` })
      })
      const next = new URL(url)
      next.searchParams.set('page', String(page + 1))
      return json(JSON.stringify(items), 200, {
        'x-total-count': '500',
        link: `<${next}>; rel="next"`,
      })
    })
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    if (result.error === undefined) {
      expect(result.value?.fulfillments.completeness).toBe('incomplete')
      if (result.value?.fulfillments.completeness === 'incomplete')
        expect(result.value.fulfillments.items.length).toBeLessThanOrEqual(100)
    } else {
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
    }
    expect(mock.mock.calls.length).toBeLessThanOrEqual(5)
    expect(mock.mock.calls.length).toBeGreaterThan(1)
  })

  it('surfaces an exhausted provider budget as an error instead of zero shipments', async () => {
    const mock = installFetch(async (input) =>
      String(input).endsWith(`/orders/${ORDER_ID}`) ? json(orderRaw()) : json('{}', 429),
    )
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeInvoices: false }))
    expect(result.error).toBeInstanceOf(errors.NuvemshopRateLimitError)
    expect(result.value).toBeUndefined()
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it('honors abort during the fulfillment read and never reports absent fulfillments', async () => {
    const controller = new AbortController()
    const mock = installFetch(async (input, init) => {
      if (String(input).endsWith(`/orders/${ORDER_ID}`)) return json(orderRaw())
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('synthetic abort', 'AbortError')),
        )
        controller.abort()
      })
    })
    const result = await capture(() =>
      getOrder({ orderId: ORDER_ID, includeInvoices: false, signal: controller.signal }),
    )
    expect(result.error).toBeInstanceOf(errors.NuvemshopNetworkError)
    expect(result.value).toBeUndefined()
    expect(mock).toHaveBeenCalledTimes(2)
  })
})

describe('NUV-11-R2 optional transition ids', () => {
  const INT64_LESS_ONE = '9223372036854775807'
  const GET = { orderId: ORDER_ID, includeInvoices: false }

  function transition(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      from_status: 'UNPACKED',
      to_status: 'PACKED',
      happened_at: CREATED_AT,
      ...overrides,
    }
  }

  function fetchAggregateAndList(
    aggregateFulfillment: Record<string, unknown>,
    listItems: unknown[],
  ) {
    return installFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/orders/${ORDER_ID}`)) {
        return json(orderRaw({ fulfillment_orders: [aggregateFulfillment] }))
      }
      if (url.pathname.endsWith(`/orders/${ORDER_ID}/fulfillment-orders`)) {
        return json(JSON.stringify(listItems), 200, { 'x-total-count': String(listItems.length) })
      }
      return json('{}', 404)
    })
  }

  function consultedFulfillment(result: { value?: Order }) {
    const fulfillments = result.value?.fulfillments
    if (fulfillments === undefined || fulfillments.completeness === 'not_consulted') {
      expect(fulfillments).toMatchObject({ completeness: 'confirmed' })
      throw new Error('expected consulted fulfillments')
    }
    const item = fulfillments.items[0]
    expect(item).toBeDefined()
    if (item === undefined) throw new Error('expected a fulfillment')
    return item
  }

  function statusRows(result: { value?: Order }) {
    const history = consultedFulfillment(result).statusHistory
    if (history.completeness === 'not_consulted') {
      expect(history).toMatchObject({ completeness: 'confirmed' })
      throw new Error('expected consulted status history')
    }
    return history.items
  }

  function trackingRows(result: { value?: Order }) {
    const events = consultedFulfillment(result).trackingEvents
    if (events.completeness === 'not_consulted') {
      expect(events).toMatchObject({ completeness: 'confirmed' })
      throw new Error('expected consulted tracking events')
    }
    return events.items
  }

  it('R2-01 preserves aggregate transition id when scoped list omits id', async () => {
    const aggregate = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID })],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [transition()],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeUndefined()
    const item = statusRows(result)[0]
    expect(item).toMatchObject({
      id: ABOVE_INT64_ID,
      fromStatus: 'UNPACKED',
      toStatus: 'PACKED',
      happenedAt: { raw: CREATED_AT },
    })
  })

  it('R2-02 preserves list transition id when detail read omits id', async () => {
    const aggregateTransition = transition({ id: ABOVE_INT64_ID })
    const listTransition = transition({ id: ABOVE_INT64_ID })
    const summary = {
      id: FULFILLMENT_A,
      status: 'UNPACKED',
      tracking_info: { code: null, url: null },
      destination: null,
      status_history: [listTransition],
    }
    const detail = fulfillment({
      status_history: [transition()],
      tracking_events: [],
    })
    installFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/orders/${ORDER_ID}`)) {
        return json(
          orderRaw({
            fulfillment_orders: [fulfillment({ status_history: [aggregateTransition] })],
          }),
        )
      }
      if (url.pathname.endsWith(`/fulfillment-orders/${FULFILLMENT_A}`)) {
        return json(JSON.stringify(detail))
      }
      return json(JSON.stringify([summary]), 200, { 'x-total-count': '1' })
    })
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeUndefined()
    expect(statusRows(result)[0]?.id).toBe(ABOVE_INT64_ID)
  })

  it('R2-03 preserves list-supplied transition id when aggregate omits id', async () => {
    const aggregate = fulfillment({
      status_history: [transition()],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID })],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeUndefined()
    expect(statusRows(result)[0]?.id).toBe(ABOVE_INT64_ID)
  })

  it('R2-04 preserves matching transition id on aggregate and list', async () => {
    const aggregate = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID })],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID })],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeUndefined()
    expect(statusRows(result)[0]?.id).toBe(ABOVE_INT64_ID)
  })

  it('R2-05 rejects conflicting transition ids across aggregate and list', async () => {
    const aggregate = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID })],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [transition({ id: INT64_LESS_ONE })],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('R2-06 keeps omitted transition id absent when both projections omit id', async () => {
    const aggregate = fulfillment({
      status_history: [transition()],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [transition()],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeUndefined()
    const item = statusRows(result)[0]
    expect(item?.id).toBeUndefined()
    expect(item).toMatchObject({
      fromStatus: 'UNPACKED',
      toStatus: 'PACKED',
      happenedAt: { raw: CREATED_AT },
    })
  })

  it('R2-07 rejects ambiguous ids when aggregate supplies ids and list omits them', async () => {
    const aggregate = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID }), transition({ id: INT64_LESS_ONE })],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [transition(), transition()],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('R2-07b rejects ambiguous ids when list supplies ids and aggregate omits them', async () => {
    const aggregate = fulfillment({
      status_history: [transition(), transition()],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID }), transition({ id: INT64_LESS_ONE })],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('R2-08 preserves both large string transition ids when list omits them', async () => {
    const aggregate = fulfillment({
      status_history: [
        transition({ id: ABOVE_INT64_ID, happened_at: CREATED_AT }),
        transition({
          id: INT64_LESS_ONE,
          from_status: 'PACKED',
          to_status: 'DISPATCHED',
          happened_at: UPDATED_AT,
        }),
      ],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [
        transition({ happened_at: CREATED_AT }),
        transition({
          from_status: 'PACKED',
          to_status: 'DISPATCHED',
          happened_at: UPDATED_AT,
        }),
      ],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeUndefined()
    const items = statusRows(result)
    const first = items.find((row) => row.happenedAt.raw === CREATED_AT)
    const second = items.find((row) => row.happenedAt.raw === UPDATED_AT)
    expect(first?.id).toBe(ABOVE_INT64_ID)
    expect(second?.id).toBe(INT64_LESS_ONE)
  })

  it('R2-09 rejects aggregate transition when scoped list returns empty status_history', async () => {
    const aggregate = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID })],
      tracking_events: [],
    })
    const scoped = fulfillment({ status_history: [], tracking_events: [] })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('R2-10 rejects malformed transition id on aggregate without leaking secrets', async () => {
    const aggregate = fulfillment({
      status_history: [transition({ id: '12.5' })],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [
      fulfillment({ status_history: [transition()], tracking_events: [] }),
    ])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
    expectSafe(result.error)
  })

  it('R2-11 preserves transition id and created_at when list omits both optional fields', async () => {
    const aggregate = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID, created_at: OFFSET_CREATED_AT })],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [transition()],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeUndefined()
    const item = statusRows(result)[0]
    expect(item?.id).toBe(ABOVE_INT64_ID)
    expect(item?.createdAt).toMatchObject({ raw: OFFSET_CREATED_AT, offset: '-03:00' })
  })

  it('R2-12 rejects conflicting created_at for the same transition id', async () => {
    const aggregate = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID, created_at: OFFSET_CREATED_AT })],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID, created_at: UPDATED_AT })],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('R2-13 rejects conflicting happened_at for the same transition id', async () => {
    const aggregate = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID, happened_at: CREATED_AT })],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [transition({ id: ABOVE_INT64_ID, happened_at: UPDATED_AT })],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })

  it('R2-14 retains tracking event id and created_at when scoped list omits created_at', async () => {
    const event = {
      id: TRACKING_EVENT_ID,
      status: 'dispatched',
      happened_at: CREATED_AT,
      created_at: OFFSET_CREATED_AT,
    }
    const aggregate = fulfillment({ status_history: [], tracking_events: [event] })
    const scoped = fulfillment({
      status_history: [],
      tracking_events: [{ id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: CREATED_AT }],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeUndefined()
    expect(trackingRows(result)[0]).toMatchObject({
      id: TRACKING_EVENT_ID,
      createdAt: { raw: OFFSET_CREATED_AT, offset: '-03:00' },
    })
  })

  it('R2-15 confirms empty consulted status_history and tracking_events as complete', async () => {
    const aggregate = fulfillment({ status_history: [], tracking_events: [] })
    const scoped = fulfillment({ status_history: [], tracking_events: [] })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeUndefined()
    expect(result.value?.fulfillments).toMatchObject({
      completeness: 'confirmed',
      items: [
        {
          statusHistory: { completeness: 'confirmed', items: [] },
        },
      ],
    })
  })

  it('R2-wildcard rejects stamping id when list rows differ only by from_status', async () => {
    const aggregate = fulfillment({
      status_history: [
        {
          id: ABOVE_INT64_ID,
          from_status: null,
          to_status: 'PACKED',
          happened_at: CREATED_AT,
        },
      ],
      tracking_events: [],
    })
    const scoped = fulfillment({
      status_history: [
        { from_status: 'UNPACKED', to_status: 'PACKED', happened_at: CREATED_AT },
        { from_status: 'PACKED', to_status: 'PACKED', happened_at: CREATED_AT },
      ],
      tracking_events: [],
    })
    fetchAggregateAndList(aggregate, [scoped])
    const result = await capture(() => getOrder(GET))
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
  })
})

describe('NUV-11 E: bounded fiscal metafields with unreconciled legacy', () => {
  const invoiceA = {
    key: '35260612345678000123550010000000011000000011',
    link: 'http://files.example.test/synthetic/nfe/a',
    fulfillment_order_id: FULFILLMENT_B,
  }
  const invoiceB = {
    key: '35260612345678000123550010000000021000000022',
    link: 'https://files.example.test/synthetic/nfe/b',
  }

  function fetchInvoices(value: unknown, options: { orderId?: string; empty?: boolean } = {}) {
    const orderId = options.orderId ?? ORDER_ID
    return installFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/orders/${orderId}`)) return json(orderRaw({ id: orderId }))
      if (url.pathname.endsWith('/metafields/orders'))
        return json(JSON.stringify(options.empty ? [] : [{ value }]), 200, {
          'x-total-count': options.empty ? '0' : '1',
        })
      return json('{}', 404)
    })
  }

  it('preserves every modern note, HTTP/HTTPS link and exact optional fulfillment association without external egress', async () => {
    const mock = fetchInvoices(JSON.stringify([invoiceA, invoiceB]))
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeFulfillments: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.invoices).toEqual({
      completeness: 'incomplete',
      items: [
        { key: invoiceA.key, link: invoiceA.link, fulfillmentOrderId: FULFILLMENT_B },
        { key: invoiceB.key, link: invoiceB.link, fulfillmentOrderId: null },
      ],
    })
    expect(mock).toHaveBeenCalledTimes(2)
    for (const call of mock.mock.calls)
      expect(new URL(String(call[0])).origin).toBe(NUVEMSHOP_API_ORIGIN)
  })

  it('applies exact Order id and the documented modern filters to the fiscal GET', async () => {
    const mock = fetchInvoices(JSON.stringify([invoiceA]), { orderId: HUGE_ID })
    const result = await capture(() => getOrder({ orderId: HUGE_ID, includeFulfillments: false }))
    expect(result.error).toBeUndefined()
    const fiscal = mock.mock.calls
      .map((call) => new URL(String(call[0])))
      .find((url) => url.pathname.endsWith('/metafields/orders'))
    expect(fiscal).toBeDefined()
    expect(Object.fromEntries(fiscal!.searchParams)).toMatchObject({
      owner_id: HUGE_ID,
      namespace: 'nfe',
      key: 'list',
      fields: 'value',
      page: '1',
    })
    expect(Number(fiscal!.searchParams.get('per_page'))).toBeGreaterThanOrEqual(1)
    expect(Number(fiscal!.searchParams.get('per_page'))).toBeLessThanOrEqual(200)
  })

  it('keeps absent modern metadata incomplete while legacy was not reconciled', async () => {
    fetchInvoices(undefined, { empty: true })
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeFulfillments: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.invoices).toEqual({ completeness: 'incomplete', items: [] })
  })

  it('does not confuse per_page=1 metafield with the internal note cardinality', async () => {
    const notes = Array.from({ length: 50 }, (_, index) => ({
      key: `SYNTHETIC${index}`,
      link: `https://files.example.test/synthetic/${index}`,
    }))
    fetchInvoices(JSON.stringify(notes))
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeFulfillments: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.invoices).toMatchObject({
      completeness: 'incomplete',
      items: expect.any(Array),
    })
    if (result.value?.invoices.completeness !== 'not_consulted')
      expect(result.value?.invoices.items).toHaveLength(50)
  })

  it('keeps a modern value containing an empty JSON array incomplete without inferring fiscal absence', async () => {
    const mock = fetchInvoices('[]')
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeFulfillments: false }))
    expect(result.error).toBeUndefined()
    expect(result.value?.invoices).toEqual({ completeness: 'incomplete', items: [] })
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it.each([
    '{',
    JSON.stringify({ key: 'SYNTHETIC' }),
    JSON.stringify([null]),
    JSON.stringify([{ key: 'SYNTHETIC', link: 'javascript:alert(1)' }]),
    JSON.stringify([{ key: 'SYNTHETIC', link: 'data:text/html,private' }]),
    JSON.stringify([{ key: 'SYNTHETIC', link: 'https://user:secret@files.example.test/nfe' }]),
    JSON.stringify([
      {
        key: 'SYNTHETIC',
        link: 'https://files.example.test/nfe',
        fulfillment_order_id: 'not-a-ulid',
      },
    ]),
    JSON.stringify(Array.from({ length: 51 }, () => invoiceB)),
    ' '.repeat(65_537),
    1,
    null,
  ])(
    'fails a present malformed or oversized fiscal value %# without logging its content',
    async (value) => {
      fetchInvoices(value)
      const result = await capture(() =>
        getOrder({ orderId: ORDER_ID, includeFulfillments: false }),
      )
      expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
      expectSafe(result.error)
      expect(serialized(result.error)).not.toContain('files.example.test')
    },
  )

  it('leaves truncated modern records explicitly incomplete', async () => {
    const mock = installFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/orders/${ORDER_ID}`)) return json(orderRaw())
      const next = new URL(url)
      next.searchParams.set('page', String(Number(url.searchParams.get('page')) + 1))
      return json(JSON.stringify([{ value: JSON.stringify([invoiceA]) }]), 200, {
        'x-total-count': '500',
        link: `<${next}>; rel="next"`,
      })
    })
    const result = await capture(() => getOrder({ orderId: ORDER_ID, includeFulfillments: false }))
    if (result.error === undefined) expect(result.value?.invoices.completeness).toBe('incomplete')
    else expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
    expect(mock.mock.calls.length).toBeLessThanOrEqual(5)
  })
})
