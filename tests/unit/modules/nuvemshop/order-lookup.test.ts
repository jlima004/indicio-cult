/**
 * NUV-12 partial exact order lookup — adversarial RED matrix (T01–T16).
 * Synthetic data only; fetch is stubbed. Schemas, HTTP, budget and pager are real.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NUVEMSHOP_API_ORIGIN, NUVEMSHOP_API_VERSION } from '@/modules/nuvemshop/server/client'
import type { Order } from '@/modules/nuvemshop/server/types'

import { HUGE_ID, orderRaw } from './fixtures/schemas'

type FindInput = {
  number: unknown
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
const CANONICAL_Q = '306'
const LIST_URL = `${ROOT}/orders?page=1&per_page=200&q=${CANONICAL_Q}`
const PII_Q = '30600123456789012345'
const BUYER_EMAIL = 'buyer@example.test'
const HIDDEN_TOKEN = 'synthetic-token-not-exported'
const PII = [
  'synthetic-pii-email@example.test',
  'SYNTHETIC-PRIVATE-STREET',
  'SYNTHETIC-RAW-SECRET',
  PII_Q,
  BUYER_EMAIL,
  HIDDEN_TOKEN,
  TOKEN,
]

let findOrderByNumber: (input: FindInput) => Promise<Order | null>
let listOrders: (input: ListInput) => Promise<OrderPage>
let errors: typeof import('@/modules/nuvemshop/server/errors')

function json(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function installFetch(impl: typeof fetch = async () => json(`[${orderRaw()}]`)) {
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

function ordersLink(rel: 'next' | 'last' | 'prev', page: number, q: string) {
  const target = `${ROOT}/orders?page=${page}&per_page=200&q=${encodeURIComponent(q)}`
  return `<${target}>; rel="${rel}"`
}

function listUrl(q: string) {
  return `${ROOT}/orders?page=1&per_page=200&q=${encodeURIComponent(q)}`
}

function expectPage1OrdersQuery(mock: ReturnType<typeof vi.fn>, q: string, callCount: number) {
  expect(mock).toHaveBeenCalledTimes(callCount)
  for (let index = 0; index < callCount; index += 1) {
    const url = new URL(urlAt(mock, index))
    expect(url.href.startsWith(`${NUVEMSHOP_API_ORIGIN}/`)).toBe(true)
    expect(url.searchParams.get('page')).toBe('1')
    expect(url.searchParams.get('per_page')).toBe('200')
    expect(url.searchParams.get('q')).toBe(q)
    expect(url.pathname.endsWith('/orders')).toBe(true)
    expect(url.href).not.toContain('/products')
    expect(url.href).not.toContain('fulfillment')
    expect(url.href).not.toContain('metafields')
    expect(url.searchParams.get('page')).not.toBe('2')
  }
}

function assertNoExtraEgress(mock: ReturnType<typeof vi.fn>) {
  for (const call of mock.mock.calls) {
    const href = String(call[0])
    expect(href).not.toMatch(/\/orders\/\d/)
    expect(href).not.toContain('/products')
    expect(href).not.toContain('fulfillment-orders')
    expect(href).not.toContain('metafields')
  }
}

function syntheticOrders(count: number, matchIndex: number | null, q: string) {
  return Array.from({ length: count }, (_, index) => {
    const id = 880_000_000 + index
    const number = matchIndex === index ? Number(q) : 10_000 + index
    return orderRaw({
      id,
      number,
      contact_email: index === 1 ? `user-${q}-hint@example.test` : `shopper-${index}@example.test`,
      customer: {
        id: index + 1,
        name: index === 2 ? `Pedido ${q} promo` : `Cliente ${index}`,
        email: `shopper-${index}@example.test`,
      },
    })
  })
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
    findOrderByNumber: typeof findOrderByNumber
    listOrders: typeof listOrders
  }
  findOrderByNumber = server.findOrderByNumber
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

describe('NUV-12 findOrderByNumber — partial exact lookup', () => {
  describe('T01 — sufficient page, one exact number', () => {
    it('returns the exact order when a false-positive candidate shares text but not number', async () => {
      const body = `[${orderRaw()},${orderRaw({
        id: 999_001_002,
        number: 999,
        contact_email: 'contains-306@example.test',
        customer: { id: 2, name: 'Cliente 306', email: 'contains-306@example.test' },
      })}]`
      const mock = installFetch(async () =>
        json(body, 200, {
          'x-total-count': '2',
          link: ordersLink('last', 1, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeUndefined()
      expect(result.value).toMatchObject({ id: ORDER_ID, number: CANONICAL_Q })
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
      assertNoExtraEgress(mock)
    })

    it('accepts JavaScript number 306 as canonical input', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('last', 1, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: 306 }))
      expect(result.error).toBeUndefined()
      expect(result.value?.number).toBe(CANONICAL_Q)
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('returns the sole match on a full page of 200 valid orders', async () => {
      const items = syntheticOrders(200, 17, CANONICAL_Q)
      const mock = installFetch(async () =>
        json(`[${items.join(',')}]`, 200, {
          'x-total-count': '200',
          link: ordersLink('last', 1, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeUndefined()
      expect(result.value?.number).toBe(CANONICAL_Q)
      expect(result.value?.id).toBe('880000017')
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('returns the match when rel=last points to page 1 with coherent totals', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('last', 1, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeUndefined()
      expect(result.value).toMatchObject({ id: ORDER_ID, number: CANONICAL_Q })
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })

  describe('T02 — false positives only', () => {
    it('returns null when q hits email/name but every Order.number differs', async () => {
      const body = `[${orderRaw({
        id: 306,
        number: 999,
        contact_email: BUYER_EMAIL,
        customer: { id: 1, name: '306', email: BUYER_EMAIL },
      })}]`
      const mock = installFetch(async () =>
        json(body, 200, { 'x-total-count': '1', link: ordersLink('last', 1, CANONICAL_Q) }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeUndefined()
      expect(result.value).toBeNull()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('returns null for a page containing only false-positive candidates', async () => {
      const body = `[${orderRaw({ id: 111, number: 111 })},${orderRaw({
        id: 222,
        number: 222,
        contact_email: `x-${CANONICAL_Q}@example.test`,
      })}]`
      const mock = installFetch(async () =>
        json(body, 200, { 'x-total-count': '2', link: ordersLink('last', 1, CANONICAL_Q) }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeUndefined()
      expect(result.value).toBeNull()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })

  describe('T03-P — negative subset (multi-page positive T03-GENERAL pending)', () => {
    // T03-GENERAL / PENDING_COVERAGE_EVIDENCE — posterior-page exact match remains out of scope.

    it('T03-P rejects rel=next with exactly one page-1 fetch', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('next', 2, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
      expect(result.value).toBeUndefined()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
      assertNoExtraEgress(mock)
    })

    it('T03-P rejects rel=last>1 without next using one fetch', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('last', 2, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
      expect(result.value).toBeUndefined()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('T03-P stays incomplete when rel=next is present even though the body already contains an exact match', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('next', 2, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
      expect(result.value).toBeUndefined()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })

  describe('T04 — empty intermediate page with next', () => {
    it('throws LookupIncomplete instead of null when next is present without matches', async () => {
      const mock = installFetch(async () =>
        json('[]', 200, {
          'x-total-count': '0',
          link: ordersLink('next', 2, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
      expect(result.value).toBeUndefined()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })

  describe('T05 — sufficient page, zero exact matches', () => {
    it('returns null for an empty coherent page', async () => {
      const mock = installFetch(async () => json('[]', 200, { 'x-total-count': '0' }))
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeUndefined()
      expect(result.value).toBeNull()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('returns null after examining false positives on an otherwise sufficient page', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw({ id: 555, number: 555 })}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('last', 1, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeUndefined()
      expect(result.value).toBeNull()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })

  describe('T06 — metadata insufficiency', () => {
    it('throws LookupIncomplete when x-total-count is absent', async () => {
      const mock = installFetch(async () => json(`[${orderRaw()}]`))
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
      expect(result.value).toBeUndefined()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('throws LookupIncomplete when totalCount=1 but the body is empty', async () => {
      const mock = installFetch(async () => json('[]', 200, { 'x-total-count': '1' }))
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
      expect(result.value).toBeUndefined()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('throws LookupIncomplete when totalCount=0 but an item is present', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, {
          'x-total-count': '0',
          link: ordersLink('last', 1, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
      expect(result.value).toBeUndefined()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('throws LookupIncomplete when totalCount exceeds the parsed page size', async () => {
      const items = syntheticOrders(200, null, CANONICAL_Q)
      const mock = installFetch(async () =>
        json(`[${items.join(',')}]`, 200, {
          'x-total-count': '201',
          link: ordersLink('last', 1, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
      expect(result.value).toBeUndefined()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })

  describe('T07 — last>1 without next hides incomplete coverage', () => {
    it('T07 rejects a lone exact match when rel=last points to page 2 without rel=next', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('last', 2, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
      expect(result.value).toBeUndefined()
      expect(urlAt(mock)).toBe(LIST_URL)
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
      assertNoExtraEgress(mock)
    })

    it('T07-doc listOrders on the same fixture hides lastPage and exposes no nextPage', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('last', 2, CANONICAL_Q),
        }),
      )
      const result = await capture(() => listOrders({ page: 1, perPage: 200, q: CANONICAL_Q }))
      expect(result.error).toBeUndefined()
      expect(result.value?.nextPage).toBeUndefined()
      expect(result.value).not.toHaveProperty('lastPage')
      expect(result.value?.items).toHaveLength(1)
      expect(urlAt(mock)).toBe(LIST_URL)
      expect(mock).toHaveBeenCalledTimes(1)
    })
  })

  describe('T08 — ambiguity and duplicate ids', () => {
    it('throws LookupIncomplete for two items sharing the same id', async () => {
      const duplicate = orderRaw({ id: ORDER_ID, number: 306 })
      const mock = installFetch(async () =>
        json(`[${duplicate},${duplicate}]`, 200, {
          'x-total-count': '2',
          link: ordersLink('last', 1, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
      expect(result.value).toBeUndefined()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('throws LookupIncomplete for two distinct ids with the same exact number', async () => {
      const mock = installFetch(async () =>
        json(
          `[${orderRaw({ id: ORDER_ID, number: 306 })},${orderRaw({ id: 999_003, number: 306 })}]`,
          200,
          { 'x-total-count': '2', link: ordersLink('last', 1, CANONICAL_Q) },
        ),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopLookupIncompleteError)
      expect(result.value).toBeUndefined()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })

  describe('T09 — provider retry bounds', () => {
    it('retries the same page-1 URL at most twice on 503 and surfaces ProviderError', async () => {
      const mock = installFetch(async () => json('{"error":"synthetic"}', 503))
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopProviderError)
      expect(mock).toHaveBeenCalledTimes(2)
      expect(urlAt(mock, 0)).toBe(LIST_URL)
      expect(urlAt(mock, 1)).toBe(LIST_URL)
      assertNoExtraEgress(mock)
    })

    it('maps 429 to RateLimitError with a single fetch', async () => {
      const mock = installFetch(async () => json('{"error":"synthetic"}', 429))
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopRateLimitError)
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })

  describe('T10 — lossless large decimal numbers', () => {
    const huge = '900719925474099312345'

    it('matches Order.number losslessly for string input on a sufficient page', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw({ id: HUGE_ID, number: huge })}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('last', 1, huge),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: huge }))
      expect(result.error).toBeUndefined()
      expect(result.value).toMatchObject({ id: HUGE_ID, number: huge })
      expectPage1OrdersQuery(mock, huge, 1)
    })

    it('matches Order.number losslessly for bigint input on a sufficient page', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw({ id: HUGE_ID, number: huge })}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('last', 1, huge),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: BigInt(huge) }))
      expect(result.error).toBeUndefined()
      expect(result.value?.number).toBe(huge)
      expectPage1OrdersQuery(mock, huge, 1)
    })
  })

  describe('T11 — canonical decimal q', () => {
    it('canonicalizes leading zeros in input to q=306 and matches number 306', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('last', 1, CANONICAL_Q),
        }),
      )
      const result = await capture(() => findOrderByNumber({ number: '000306' }))
      expect(result.error).toBeUndefined()
      expect(result.value?.number).toBe(CANONICAL_Q)
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('does not treat padded text in names as an exact Order.number match', async () => {
      const mock = installFetch(async () =>
        json(
          `[${orderRaw({
            id: 777,
            number: 777,
            customer: { id: 1, name: '000306', email: 'zero@example.test' },
          })}]`,
          200,
          { 'x-total-count': '1', link: ordersLink('last', 1, CANONICAL_Q) },
        ),
      )
      const result = await capture(() => findOrderByNumber({ number: '000306' }))
      expect(result.error).toBeUndefined()
      expect(result.value).toBeNull()
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })

  describe('T12 — input validation before fetch', () => {
    let getterCalls = 0

    beforeEach(() => {
      getterCalls = 0
    })

    it.each([
      0,
      -1,
      306.5,
      Number.MAX_SAFE_INTEGER + 1,
      '',
      'abc',
      'x'.repeat(41),
      '1'.repeat(41),
      {},
      null,
    ])('rejects invalid number %# before fetch', async (number) => {
      const mock = installFetch()
      const result = await capture(() => findOrderByNumber({ number }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
      expect(mock).not.toHaveBeenCalled()
    })

    it('rejects unsafe JavaScript numbers before fetch', async () => {
      const mock = installFetch()
      const result = await capture(() => findOrderByNumber({ number: 9007199254740992 }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
      expect(mock).not.toHaveBeenCalled()
    })

    it('rejects getter-based input without invoking fetch', async () => {
      const mock = installFetch()
      const input = {
        get number() {
          getterCalls += 1
          return CANONICAL_Q
        },
      }
      const result = await capture(() => findOrderByNumber(input))
      expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
      expect(getterCalls).toBe(0)
      expect(mock).not.toHaveBeenCalled()
    })

    it('rejects proxy input without invoking fetch', async () => {
      const mock = installFetch()
      const input = new Proxy(
        { number: CANONICAL_Q },
        {
          ownKeys() {
            throw new Error('synthetic-proxy-trap')
          },
        },
      )
      const result = await capture(() => findOrderByNumber(input))
      expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
      expect(mock).not.toHaveBeenCalled()
      expectSafe(result.error)
    })
  })

  describe('T13 — hostile Link targets', () => {
    it.each([
      [
        'host',
        `<https://evil.example.test/orders?page=2&per_page=200&q=${CANONICAL_Q}>; rel="next"`,
      ],
      [
        'store',
        `<${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/999999999999999999999999999999/orders?page=2&per_page=200&q=${CANONICAL_Q}>; rel="next"`,
      ],
      ['q filter', `<${ROOT}/orders?page=2&per_page=200&q=999>; rel="next"`],
      ['route', `<${ROOT}/products?page=2&per_page=200>; rel="next"`],
      [
        'version',
        `<${NUVEMSHOP_API_ORIGIN}/v0/${STORE_ID}/orders?page=2&per_page=200&q=${CANONICAL_Q}>; rel="next"`,
      ],
    ])('T13 rejects Link that changes %s with one fetch', async (_label, link) => {
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, { 'x-total-count': '1', link }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })

  describe('T14 — structural protocol errors', () => {
    it('rejects a non-array JSON body with ProtocolError', async () => {
      const mock = installFetch(async () => json(JSON.stringify({ orders: [] }), 200))
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('rejects an invalid Order field without a second page fetch', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw({ created_at: 'not-a-date' })}]`, 200, { 'x-total-count': '1' }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('rejects rel=prev on page 1', async () => {
      const mock = installFetch(async () =>
        json('[]', 200, { link: ordersLink('prev', 1, CANONICAL_Q) }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })

    it('rejects duplicate Link relations', async () => {
      const next = ordersLink('next', 2, CANONICAL_Q)
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, { 'x-total-count': '1', link: `${next}, ${next}` }),
      )
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })

  describe('T15 — transport taxonomy and abort', () => {
    it.each([
      [401, 'NuvemshopAuthenticationError', 1],
      [403, 'NuvemshopAuthorizationError', 1],
      [402, 'NuvemshopAccountSuspendedError', 1],
      [404, 'NuvemshopNotFoundError', 1],
    ] as const)('maps HTTP %s to %s with %i fetch(es)', async (status, kind, count) => {
      const mock = installFetch(async () => json(JSON.stringify({ raw: PII[2] }), status))
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors[kind])
      expect(mock).toHaveBeenCalledTimes(count)
      expectSafe(result.error)
    })

    it('maps fetch rejection to NetworkError', async () => {
      installFetch(async () => {
        throw new TypeError('synthetic network failure')
      })
      const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopNetworkError)
    })

    it('honors a pre-aborted signal without provider egress', async () => {
      const mock = installFetch()
      const controller = new AbortController()
      controller.abort()
      const result = await capture(() =>
        findOrderByNumber({ number: CANONICAL_Q, signal: controller.signal }),
      )
      expect(result.error).toBeInstanceOf(errors.NuvemshopNetworkError)
      expect(mock).not.toHaveBeenCalled()
    })
  })

  describe('T16 — redaction and egress boundaries', () => {
    it('does not leak discovery q, token, buyer email or hidden order token in errors or logs', async () => {
      const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'error')]
      const mock = installFetch(async () => json('{"error":"synthetic"}', 403))
      const result = await capture(() => findOrderByNumber({ number: PII_Q }))
      expect(result.error).toBeInstanceOf(errors.NuvemshopAuthorizationError)
      expectSafe(result.error)
      for (const log of logs) {
        const output = JSON.stringify(log.mock.calls)
        expect(output).not.toContain(PII_Q)
        expect(output).not.toContain(BUYER_EMAIL)
        expect(output).not.toContain(HIDDEN_TOKEN)
        expect(output).not.toContain(TOKEN)
      }
      expect(urlAt(mock)).toBe(listUrl(PII_Q))
    })

    it('never calls product, fulfillment or metafield routes while looking up by number', async () => {
      const mock = installFetch(async () =>
        json(`[${orderRaw()}]`, 200, {
          'x-total-count': '1',
          link: ordersLink('last', 1, CANONICAL_Q),
        }),
      )
      await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
      assertNoExtraEgress(mock)
      expectPage1OrdersQuery(mock, CANONICAL_Q, 1)
    })
  })
})
