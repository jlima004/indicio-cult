/**
 * NUV-13 order email discovery — adversarial RED matrix.
 * Synthetic data only; fetch is stubbed. Schemas, HTTP, budget and pager are real.
 */
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { findOrderByNumber, getOrder, listOrders } from '@/modules/nuvemshop/server'
import { NUVEMSHOP_API_ORIGIN, NUVEMSHOP_API_VERSION } from '@/modules/nuvemshop/server/client'
import type { Order } from '@/modules/nuvemshop/server/types'

import { HUGE_ID, orderRaw } from './fixtures/schemas'

type DiscoverInput = {
  email: string
  page: number
  perPage: number
  signal?: AbortSignal
  correlationId?: string
}

type DiscoverResult = {
  candidates: readonly Order[]
  page: number
  perPage: number
  totalCount?: number
  nextPage?: number
  previousPage?: number
  coverage: 'unproven'
}

const STORE_ID = '123456789012345678901234567890'
const TOKEN = 'synthetic-nuv11-access-token'
const ORDER_ID = '871254203'
const ROOT = `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/${STORE_ID}`
const SEARCH_EMAIL = 'buyer@example.test'
const OTHER_EMAIL = 'shopper-other@example.test'
const DOT_ALIAS_A = 'first.last@example.test'
const DOT_ALIAS_B = 'firstlast@example.test'
const PII_STREET = 'SYNTHETIC-PRIVATE-STREET'
const PII = [
  'synthetic-pii-email@example.test',
  PII_STREET,
  'SYNTHETIC-RAW-SECRET',
  SEARCH_EMAIL,
  TOKEN,
]

const WORKTREE_ROOT = path.resolve(import.meta.dirname, '../../../..')
const ORDERS_SOURCE = path.join(WORKTREE_ROOT, 'src/modules/nuvemshop/server/orders.ts')
const APP_ROOT = path.join(WORKTREE_ROOT, 'src/app')

const CORE = { orderId: ORDER_ID, includeFulfillments: false, includeInvoices: false }
const CANONICAL_Q = '306'

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

function expectSafe(error: unknown, extra: string[] = []) {
  const result = serialized(error)
  for (const marker of [...PII, TOKEN, 'Bearer ', 'Authorization:', ...extra]) {
    expect(result).not.toContain(marker)
  }
}

function ordersLink(rel: 'next' | 'last' | 'prev', page: number, q: string, perPage = 30) {
  const target = `${ROOT}/orders?page=${page}&per_page=${perPage}&q=${encodeURIComponent(q)}`
  return `<${target}>; rel="${rel}"`
}

function listUrl(page: number, perPage: number, q: string) {
  return `${ROOT}/orders?page=${page}&per_page=${perPage}&q=${encodeURIComponent(q)}`
}

async function requireOrdersExport<T>(exportName: string, clause: string): Promise<T> {
  const mod = (await import('@/modules/nuvemshop/server/orders')) as Record<string, unknown>
  const value = mod[exportName]
  if (value === undefined) {
    throw new Error(`CONTRACT_GAP: ${clause} — missing export ${exportName}`)
  }
  return value as T
}

async function discoverOrdersByEmail(input: DiscoverInput): Promise<DiscoverResult> {
  const fn = await requireOrdersExport<(input: DiscoverInput) => Promise<DiscoverResult>>(
    'discoverOrdersByEmail',
    'discoverOrdersByEmail({ email, page, perPage })',
  )
  return fn(input)
}

async function orderContactEmailMatches(order: Order, email: string): Promise<boolean> {
  const fn = await requireOrdersExport<(order: Order, email: string) => boolean>(
    'orderContactEmailMatches',
    'orderContactEmailMatches(order, email) exact contactEmail compare',
  )
  return fn(order, email)
}

async function readHandoff(): Promise<unknown> {
  return requireOrdersExport(
    'ORDER_EMAIL_DISCOVERY_HANDOFF',
    'ORDER_EMAIL_DISCOVERY_HANDOFF documentation',
  )
}

const FORBIDDEN_TRUST_KEYS = ['verified', 'trusted', 'owned', 'authorized', 'identity'] as const

const FORBIDDEN_COMPLETENESS_KEYS = ['complete', 'exhausted', 'absent', 'final'] as const

function assertNoTrustSurface(value: unknown) {
  if (value === null || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  for (const key of FORBIDDEN_TRUST_KEYS) {
    expect(record).not.toHaveProperty(key)
  }
  for (const key of Object.keys(record)) {
    const entry = record[key]
    if (
      typeof entry === 'boolean' &&
      FORBIDDEN_TRUST_KEYS.includes(key as (typeof FORBIDDEN_TRUST_KEYS)[number])
    ) {
      expect(entry).not.toBe(true)
    }
  }
}

function assertNoCompletenessClaims(value: unknown) {
  if (value === null || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  for (const key of FORBIDDEN_COMPLETENESS_KEYS) {
    expect(record).not.toHaveProperty(key)
    if (key in record) expect(record[key]).not.toBe(true)
  }
}

function assertDiscoverResultShape(result: DiscoverResult) {
  expect(result.coverage).toBe('unproven')
  assertNoTrustSurface(result)
  assertNoCompletenessClaims(result)
  for (const candidate of result.candidates) assertNoTrustSurface(candidate)
}

function assertOrdersOnlyEgress(mock: ReturnType<typeof vi.fn>) {
  for (const call of mock.mock.calls) {
    const url = new URL(String(call[0]))
    expect(url.pathname.endsWith('/orders')).toBe(true)
    expect(url.href).not.toContain('/customers')
    expect(url.href).not.toMatch(/\/orders\/\d/)
  }
}

function walkAppSources(dir: string): string[] {
  if (!readdirSync(dir, { withFileTypes: true }).length) return []
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkAppSources(full))
    else if (/\.(tsx?|jsx?|mdx)$/.test(entry.name)) files.push(readFileSync(full, 'utf8'))
  }
  return files
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

describe('NUV-13 regression — existing order APIs still work', () => {
  it('listOrders returns a typed page on a minimal synthetic success path', async () => {
    const mock = installFetch(async () =>
      json(`[${orderRaw()}]`, 200, {
        'x-total-count': '1',
        link: ordersLink('last', 1, SEARCH_EMAIL),
      }),
    )
    const result = await capture(() => listOrders({ page: 1, perPage: 30, q: SEARCH_EMAIL }))
    expect(result.error).toBeUndefined()
    expect(result.value).toMatchObject({
      page: 1,
      perPage: 30,
      items: [{ id: ORDER_ID, number: '306', contactEmail: SEARCH_EMAIL }],
    })
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('getOrder returns a parsed order on a minimal synthetic success path', async () => {
    const mock = installFetch(async () => json(orderRaw()))
    const result = await capture(() => getOrder(CORE))
    expect(result.error).toBeUndefined()
    expect(result.value).toMatchObject({ id: ORDER_ID, number: '306', contactEmail: SEARCH_EMAIL })
    expect(urlAt(mock)).toBe(`${ROOT}/orders/${ORDER_ID}`)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('findOrderByNumber returns an exact match on a minimal synthetic success path', async () => {
    const mock = installFetch(async () =>
      json(`[${orderRaw()}]`, 200, {
        'x-total-count': '1',
        link: ordersLink('last', 1, CANONICAL_Q, 200),
      }),
    )
    const result = await capture(() => findOrderByNumber({ number: CANONICAL_Q }))
    expect(result.error).toBeUndefined()
    expect(result.value).toMatchObject({ id: ORDER_ID, number: CANONICAL_Q })
    expect(new URL(urlAt(mock)).searchParams.get('q')).toBe(CANONICAL_Q)
    expect(mock).toHaveBeenCalledTimes(1)
  })
})

describe('NUV-13 static guards', () => {
  it('orders.ts source does not reference read_customers or /customers routes', () => {
    const source = readFileSync(ORDERS_SOURCE, 'utf8')
    expect(source).not.toContain('read_customers')
    expect(source).not.toMatch(/\/customers\b/)
  })

  it('orders.ts keeps the server-only import boundary', () => {
    const source = readFileSync(ORDERS_SOURCE, 'utf8')
    expect(source.startsWith("import 'server-only'")).toBe(true)
  })

  it('discoverOrdersByEmail is not referenced under src/app', () => {
    let combined = ''
    try {
      combined = walkAppSources(APP_ROOT).join('\n')
    } catch {
      combined = ''
    }
    expect(combined).not.toContain('discoverOrdersByEmail')
  })
})

describe('NUV-13 orderContactEmailMatches — exact contactEmail only', () => {
  it('returns true for exact equal contactEmail strings', async () => {
    const mock = installFetch(async () => json(`[${orderRaw({ contact_email: SEARCH_EMAIL })}]`))
    const listed = await capture(() => listOrders({ page: 1, perPage: 30, q: SEARCH_EMAIL }))
    expect(listed.error).toBeUndefined()
    const order = listed.value!.items[0]!
    expect(await orderContactEmailMatches(order, SEARCH_EMAIL)).toBe(true)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('returns false when contactEmail differs only by letter case', async () => {
    installFetch(async () => json(`[${orderRaw({ contact_email: 'Buyer@Example.test' })}]`))
    const listed = await capture(() =>
      listOrders({ page: 1, perPage: 30, q: 'Buyer@Example.test' }),
    )
    const order = listed.value!.items[0]!
    expect(await orderContactEmailMatches(order, 'buyer@example.test')).toBe(false)
  })

  it('returns false when contactEmail is null on an otherwise valid Order', async () => {
    installFetch(async () => json(`[${orderRaw({ contact_email: null })}]`))
    const listed = await capture(() => listOrders({ page: 1, perPage: 30 }))
    expect(listed.error).toBeUndefined()
    expect(listed.value?.items[0]?.contactEmail).toBeNull()
    expect(await orderContactEmailMatches(listed.value!.items[0]!, SEARCH_EMAIL)).toBe(false)
  })

  it('does not treat dotted and undotted local parts as equal', async () => {
    installFetch(async () => json(`[${orderRaw({ contact_email: DOT_ALIAS_A })}]`))
    const listed = await capture(() => listOrders({ page: 1, perPage: 30, q: DOT_ALIAS_A }))
    const order = listed.value!.items[0]!
    expect(await orderContactEmailMatches(order, DOT_ALIAS_B)).toBe(false)
  })
})

describe('NUV-13 discoverOrdersByEmail — candidate discovery contract', () => {
  it('returns an exact contactEmail match as a candidate with coverage unproven and no trust fields', async () => {
    const mock = installFetch(async () =>
      json(`[${orderRaw({ contact_email: SEARCH_EMAIL })}]`, 200, {
        'x-total-count': '1',
        link: ordersLink('last', 1, SEARCH_EMAIL),
      }),
    )
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeUndefined()
    assertDiscoverResultShape(result.value!)
    expect(result.value?.candidates).toHaveLength(1)
    expect(result.value?.candidates[0]).toMatchObject({
      id: ORDER_ID,
      contactEmail: SEARCH_EMAIL,
    })
    expect(new URL(urlAt(mock)).searchParams.get('q')).toBe(SEARCH_EMAIL)
    assertOrdersOnlyEgress(mock)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('excludes an order when q returns it but contactEmail differs from the searched email', async () => {
    installFetch(async () =>
      json(`[${orderRaw({ contact_email: OTHER_EMAIL })}]`, 200, {
        'x-total-count': '1',
        link: ordersLink('last', 1, SEARCH_EMAIL),
      }),
    )
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeUndefined()
    assertDiscoverResultShape(result.value!)
    expect(result.value?.candidates).toEqual([])
  })

  it('does not associate an order when the email appears only in name while contactEmail differs', async () => {
    installFetch(async () =>
      json(
        `[${orderRaw({
          contact_email: OTHER_EMAIL,
          customer: { id: 2, name: SEARCH_EMAIL, email: OTHER_EMAIL },
        })}]`,
        200,
        { 'x-total-count': '1', link: ordersLink('last', 1, SEARCH_EMAIL) },
      ),
    )
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeUndefined()
    assertDiscoverResultShape(result.value!)
    expect(result.value?.candidates).toEqual([])
  })

  it('never matches null contactEmail while listOrders still accepts the parsed Order', async () => {
    const mock = installFetch(async () => json(`[${orderRaw({ contact_email: null })}]`))
    const listed = await capture(() => listOrders({ page: 1, perPage: 30, q: SEARCH_EMAIL }))
    expect(listed.error).toBeUndefined()
    expect(listed.value?.items[0]?.contactEmail).toBeNull()

    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeUndefined()
    assertDiscoverResultShape(result.value!)
    expect(result.value?.candidates).toEqual([])
    expect(mock).toHaveBeenCalled()
  })

  it('keeps coverage unproven on an intermediate page with zero exact matches but nextPage present', async () => {
    const mock = installFetch(async (input) => {
      const url = new URL(String(input))
      expect(url.searchParams.get('page')).toBe('2')
      return json(`[${orderRaw({ contact_email: OTHER_EMAIL })}]`, 200, {
        'x-total-count': '99',
        link: ordersLink('next', 3, SEARCH_EMAIL),
      })
    })
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 2, perPage: 30 }),
    )
    expect(result.error).toBeUndefined()
    assertDiscoverResultShape(result.value!)
    expect(result.value?.candidates).toEqual([])
    expect(result.value?.nextPage).toBe(3)
    assertNoCompletenessClaims(result.value)
    expect(urlAt(mock)).toBe(listUrl(2, 30, SEARCH_EMAIL))
  })

  it('treats an empty page as unproven coverage rather than a final empty result', async () => {
    const mock = installFetch(async () =>
      json('[]', 200, { 'x-total-count': '0', link: ordersLink('last', 1, SEARCH_EMAIL) }),
    )
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeUndefined()
    assertDiscoverResultShape(result.value!)
    expect(result.value?.candidates).toEqual([])
    assertNoCompletenessClaims(result.value)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('treats a short page as unproven coverage rather than an exhausted search', async () => {
    installFetch(async () =>
      json(`[${orderRaw({ contact_email: SEARCH_EMAIL })}]`, 200, {
        'x-total-count': '1',
      }),
    )
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeUndefined()
    assertDiscoverResultShape(result.value!)
    expect(result.value?.candidates).toHaveLength(1)
    assertNoCompletenessClaims(result.value)
  })

  it('keeps coverage unproven when rel=last points beyond page 1 without rel=next (NUV-12 adversarial shape)', async () => {
    const mock = installFetch(async () =>
      json(`[${orderRaw({ contact_email: SEARCH_EMAIL })}]`, 200, {
        'x-total-count': '1',
        link: ordersLink('last', 2, SEARCH_EMAIL),
      }),
    )
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeUndefined()
    assertDiscoverResultShape(result.value!)
    expect(result.value?.nextPage).toBeUndefined()
    expect(result.value?.coverage).toBe('unproven')
    assertNoCompletenessClaims(result.value)
    expect(urlAt(mock)).toBe(listUrl(1, 30, SEARCH_EMAIL))
  })

  it('rejects invalid page and perPage locally before fetch', async () => {
    const mock = installFetch()
    for (const input of [
      { email: SEARCH_EMAIL, page: 0, perPage: 30 },
      { email: SEARCH_EMAIL, page: 1, perPage: 0 },
      { email: SEARCH_EMAIL, page: 1, perPage: 201 },
    ]) {
      const result = await capture(() => discoverOrdersByEmail(input))
      expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
    }
    expect(mock).not.toHaveBeenCalled()
  })

  it('propagates rate-limit transport errors instead of returning an empty candidate page', async () => {
    const mock = installFetch(async () => json('{"error":"synthetic"}', 429))
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeInstanceOf(errors.NuvemshopRateLimitError)
    expect(result.value).toBeUndefined()
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('surfaces network failure as a typed error instead of an empty success page', async () => {
    installFetch(async () => {
      throw new TypeError('synthetic network failure')
    })
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeInstanceOf(errors.NuvemshopNetworkError)
    expect(result.value).toBeUndefined()
  })

  it('surfaces malformed protocol bodies as typed errors instead of empty success', async () => {
    const mock = installFetch(async () => json(JSON.stringify({ orders: [] }), 200))
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
    expect(result.value).toBeUndefined()
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it.each([
    { label: 'missing email', input: { page: 1, perPage: 30 } },
    { label: 'empty email', input: { email: '', page: 1, perPage: 30 } },
    { label: 'non-string email', input: { email: 1, page: 1, perPage: 30 } },
    { label: 'whitespace email', input: { email: '   ', page: 1, perPage: 30 } },
    {
      label: 'email longer than 320',
      input: { email: `${'a'.repeat(310)}@example.test`, page: 1, perPage: 30 },
    },
    {
      label: 'unknown key',
      input: { email: SEARCH_EMAIL, page: 1, perPage: 30, extra: true },
    },
    { label: 'array input', input: [SEARCH_EMAIL] },
    {
      label: 'prototype key',
      input: Object.assign(Object.create(null), {
        email: SEARCH_EMAIL,
        page: 1,
        perPage: 30,
      }),
    },
  ])('rejects invalid discovery input ($label) before fetch', async ({ input }) => {
    const mock = installFetch()
    const result = await capture(() => discoverOrdersByEmail(input as DiscoverInput))
    expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
    expect(mock).not.toHaveBeenCalled()
  })

  it('rejects browser-supplied verified or trusted flags before I/O', async () => {
    const mock = installFetch()
    for (const poison of [{ verified: true }, { trusted: true }]) {
      const result = await capture(() =>
        discoverOrdersByEmail({
          email: SEARCH_EMAIL,
          page: 1,
          perPage: 30,
          ...poison,
        } as DiscoverInput),
      )
      expect(result.error).toBeInstanceOf(errors.NuvemshopValidationError)
    }
    expect(mock).not.toHaveBeenCalled()
  })

  it('documents external identity in ORDER_EMAIL_DISCOVERY_HANDOFF and omits ownership booleans on success', async () => {
    const handoff = await readHandoff()
    const text = typeof handoff === 'string' ? handoff : JSON.stringify(handoff)
    expect(text.toLowerCase()).toContain('identity')
    expect(text.toLowerCase()).toMatch(/external|session|verified/)
    expect(text.toLowerCase()).toContain('unproven')
    expect(text.toLowerCase()).toMatch(/ownership|disclosure/)

    installFetch(async () =>
      json(`[${orderRaw({ contact_email: SEARCH_EMAIL })}]`, 200, {
        'x-total-count': '1',
        link: ordersLink('last', 1, SEARCH_EMAIL),
      }),
    )
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeUndefined()
    assertNoTrustSurface(result.value)
    for (const [key, value] of Object.entries(result.value as object)) {
      if (typeof value === 'boolean') {
        expect(FORBIDDEN_TRUST_KEYS as readonly string[]).not.toContain(key)
      }
    }
  })

  it('preserves lossless string ids above MAX_SAFE_INTEGER on candidates', async () => {
    installFetch(async () =>
      json(`[${orderRaw({ id: HUGE_ID, contact_email: SEARCH_EMAIL })}]`, 200, {
        'x-total-count': '1',
        link: ordersLink('last', 1, SEARCH_EMAIL),
      }),
    )
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeUndefined()
    expect(result.value?.candidates[0]?.id).toBe(HUGE_ID)
  })

  it('redacts email, q, token, and street PII from thrown error serialization', async () => {
    const hostileBody = JSON.stringify({
      leak: SEARCH_EMAIL,
      street: PII_STREET,
      token: TOKEN,
      note: `q=${SEARCH_EMAIL}`,
    })
    installFetch(async () => json(hostileBody, 200))
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
    expectSafe(result.error, [PII_STREET])
  })

  it.each([
    [
      'external host',
      `<https://evil.example.test/orders?page=2&per_page=30&q=${encodeURIComponent(SEARCH_EMAIL)}>; rel="next"`,
    ],
    ['q filter drift', ordersLink('next', 2, OTHER_EMAIL)],
    ['wrong route', `<${ROOT}/products?page=2&per_page=30>; rel="next"`],
  ])('fail-closed on hostile Link (%s) with a protocol error', async (_label, link) => {
    const mock = installFetch(async () =>
      json(`[${orderRaw({ contact_email: SEARCH_EMAIL })}]`, 200, {
        'x-total-count': '1',
        link,
      }),
    )
    const result = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    expect(result.error).toBeInstanceOf(errors.NuvemshopProtocolError)
    expect(result.value).toBeUndefined()
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('does not merge sequential responses or mark either page complete', async () => {
    let call = 0
    const mock = installFetch(async () => {
      call += 1
      if (call === 1) {
        return json(`[${orderRaw({ id: 111, contact_email: SEARCH_EMAIL })}]`, 200, {
          'x-total-count': '2',
          link: ordersLink('next', 2, SEARCH_EMAIL),
        })
      }
      return json(`[${orderRaw({ id: 222, contact_email: SEARCH_EMAIL })}]`, 200, {
        'x-total-count': '2',
        link: ordersLink('last', 2, SEARCH_EMAIL),
      })
    })
    const first = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 1, perPage: 30 }),
    )
    const second = await capture(() =>
      discoverOrdersByEmail({ email: SEARCH_EMAIL, page: 2, perPage: 30 }),
    )
    expect(first.error).toBeUndefined()
    expect(second.error).toBeUndefined()
    assertDiscoverResultShape(first.value!)
    assertDiscoverResultShape(second.value!)
    expect(first.value?.candidates.map((order) => order.id)).toEqual(['111'])
    expect(second.value?.candidates.map((order) => order.id)).toEqual(['222'])
    expect(first.value?.coverage).toBe('unproven')
    expect(second.value?.coverage).toBe('unproven')
    assertNoCompletenessClaims(first.value)
    assertNoCompletenessClaims(second.value)
    expect(mock).toHaveBeenCalledTimes(2)
  })
})
