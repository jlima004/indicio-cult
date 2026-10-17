import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NuvemshopProtocolError } from '@/modules/nuvemshop/server/errors'
import {
  createNuvemshopPage,
  parseNuvemshopPageNavigation,
} from '@/modules/nuvemshop/server/pagination'
import type {
  NuvemshopLinkTarget,
  NuvemshopRequestInput,
  NuvemshopResponseMetadata,
  NuvemshopRoute,
} from '@/modules/nuvemshop/server/request'

const STORE = '00123'
const ORIGIN = 'https://api.nuvemshop.com.br'
const VERSION = '2025-03'
const HOSTILE = 'synthetic-private-value@example.invalid'
const absent = { kind: 'absent' } as const
function fixture(
  page = 1,
  perPage = 30,
  segments: NuvemshopRoute = ['products'],
  links?: readonly NuvemshopLinkTarget[],
): { -readonly [K in keyof NuvemshopResponseMetadata]: NuvemshopResponseMetadata[K] } {
  return {
    request: {
      origin: ORIGIN,
      apiVersion: VERSION,
      storeId: STORE,
      method: 'GET',
      segments,
      pagination: { page, perPage },
      ...(segments.length === 1 && segments[0] === 'categories'
        ? { projection: 'category-minimum-v1' as const }
        : {}),
    },
    rateLimit: { limit: absent, remaining: absent, resetMs: absent },
    pagination: {
      totalCount: absent,
      links: links === undefined ? absent : { kind: 'valid', value: links },
    },
  }
}
function target(
  relation: NuvemshopLinkTarget['relation'],
  page: number,
  perPage = 30,
  segments: NuvemshopRoute = ['products'],
): NuvemshopLinkTarget {
  return {
    relation,
    origin: ORIGIN,
    apiVersion: VERSION,
    storeId: STORE,
    segments,
    pagination: { page, perPage },
    ...(segments.length === 1 && segments[0] === 'categories'
      ? { projection: 'category-minimum-v1' as const }
      : {}),
  }
}
function rejectMetadata(value: unknown) {
  let failure: unknown
  try {
    parseNuvemshopPageNavigation(value as NuvemshopResponseMetadata)
  } catch (error) {
    failure = error
  }
  expect(failure).toBeInstanceOf(NuvemshopProtocolError)
  const error = failure as NuvemshopProtocolError
  expect(error.message).toBe('Nuvemshop response is incompatible.')
  expect(error.code).toBe('NUVEMSHOP_PROTOCOL_ERROR')
  expect(error.retryEligible).toBe(false)
  expect(JSON.stringify(error)).not.toContain(HOSTILE)
  expect(error).not.toHaveProperty('cause')
}
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

// Fixtures use the production transport-owned declarations, never a duplicate interface.
describe('projected metadata semantic pagination', () => {
  it('accepts a first page and returns only numeric navigation', () => {
    expect(parseNuvemshopPageNavigation(fixture(1, 30, ['products'], [target('next', 2)]))).toEqual(
      { page: 1, perPage: 30, nextPage: 2 },
    )
  })
  it('accepts an intermediate page with all four relations', () => {
    expect(
      parseNuvemshopPageNavigation(
        fixture(
          2,
          30,
          ['products'],
          [target('first', 1), target('prev', 1), target('next', 3), target('last', 5)],
        ),
      ),
    ).toEqual({ page: 2, perPage: 30, nextPage: 3, previousPage: 1 })
  })
  it('accepts a final page without deriving next from totalCount', () => {
    const metadata = fixture(3, 30, ['products'], [target('prev', 2), target('last', 3)])
    metadata.pagination = { ...metadata.pagination, totalCount: { kind: 'valid', value: 9_999 } }
    expect(parseNuvemshopPageNavigation(metadata)).toEqual({
      page: 3,
      perPage: 30,
      totalCount: 9_999,
      previousPage: 2,
    })
  })
  it('accepts totalCount zero independently of navigation', () => {
    const metadata = fixture(2, 30, ['products'], [target('next', 3)])
    metadata.pagination = { ...metadata.pagination, totalCount: { kind: 'valid', value: 0 } }
    expect(parseNuvemshopPageNavigation(metadata)).toEqual({
      page: 2,
      perPage: 30,
      totalCount: 0,
      nextPage: 3,
    })
  })
  it('keeps absent count and links absent without a completeness claim', () => {
    expect(parseNuvemshopPageNavigation(fixture())).toEqual({ page: 1, perPage: 30 })
    expect(createNuvemshopPage([], fixture())).toEqual({ items: [], page: 1, perPage: 30 })
  })
  it.each([1, 30, 200])('preserves valid perPage %s', (perPage) => {
    expect(
      parseNuvemshopPageNavigation(fixture(1, perPage, ['products'], [target('next', 2, perPage)])),
    ).toEqual({ page: 1, perPage, nextPage: 2 })
  })
  const collectionRoutes: NuvemshopRoute[] = [
    ['products'],
    ['categories'],
    ['orders'],
    ['webhooks'],
    ['products', '900719925474099312345678901234567890', 'variants'],
  ]
  it.each(collectionRoutes.map((segments) => ({ segments })))(
    'accepts collection route $segments',
    ({ segments }) => {
      const metadata = fixture(1, 30, segments, [target('next', 2, 30, segments)])
      expect(parseNuvemshopPageNavigation(metadata).nextPage).toBe(2)
      expect(metadata.request.segments).toEqual(segments)
    },
  )
  it('accepts HEAD and the exact textual store ID', () => {
    const metadata = fixture(1, 30, ['products'], [target('next', 2)])
    metadata.request = { ...metadata.request, method: 'HEAD' }
    expect(parseNuvemshopPageNavigation(metadata).nextPage).toBe(2)
    expect(metadata.request.storeId).toBe(STORE)
  })
  it('accepts deeply frozen production-shaped metadata and copies items', () => {
    const metadata = deepFreeze(fixture(2, 30, ['products'], [target('next', 3)]))
    const item: Readonly<{ id: string }> = Object.freeze({ id: '9007199254740993' })
    const items = Object.freeze([item])
    const result = createNuvemshopPage(items, metadata)
    expect(result).toEqual({ items: [item], page: 2, perPage: 30, nextPage: 3 })
    expect(result.items).not.toBe(items)
    expect(result.items[0]).toBe(item)
    result.items.push({ id: '2' })
    expect(items).toEqual([item])
  })
  it('retains next on an empty intermediate page', () => {
    expect(createNuvemshopPage([], fixture(2, 30, ['products'], [target('next', 3)]))).toEqual({
      items: [],
      page: 2,
      perPage: 30,
      nextPage: 3,
    })
  })
  it('accepts a terminal safe-integer page without next', () => {
    expect(parseNuvemshopPageNavigation(fixture(Number.MAX_SAFE_INTEGER))).toEqual({
      page: Number.MAX_SAFE_INTEGER,
      perPage: 30,
    })
  })
  it('performs no fetch or configuration access in either helper', () => {
    const fetch = vi.fn(() => {
      throw new Error(HOSTILE)
    })
    vi.stubGlobal('fetch', fetch)
    vi.stubEnv('NUVEMSHOP_STORE_ID', '')
    vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', '')
    try {
      expect(parseNuvemshopPageNavigation(fixture()).page).toBe(1)
      expect(createNuvemshopPage([], fixture()).page).toBe(1)
      rejectMetadata({})
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })
})

// Deliberately counterfeit values cross the runtime boundary via unknown, not type suppression.
describe('counterfeit metadata fails closed with fixed redacted ProtocolError', () => {
  it.each([
    ['missing pagination', { pagination: null }],
    ['write method', { method: 'POST' }],
    ['unknown method', { method: HOSTILE }],
    ['foreign origin', { origin: 'https://external.invalid' }],
    ['wrong version', { apiVersion: '2026-03' }],
    ['zero store', { storeId: '0' }],
    ['nonnumeric store', { storeId: HOSTILE }],
    ['unsafe page', { pagination: { page: Number.MAX_SAFE_INTEGER + 1, perPage: 30 } }],
    ['zero page', { pagination: { page: 0, perPage: 30 } }],
    ['fractional page', { pagination: { page: 1.5, perPage: 30 } }],
    ['string page', { pagination: { page: '1', perPage: 30 } }],
    ['oversized page size', { pagination: { page: 1, perPage: 201 } }],
    ['zero page size', { pagination: { page: 1, perPage: 0 } }],
    ['fractional page size', { pagination: { page: 1, perPage: 1.5 } }],
    ['detail route', { segments: ['products', '123'] }],
    ['fulfillment orders', { segments: ['orders', '123', 'fulfillment-orders'] }],
    ['metafields filter route', { segments: ['metafields', 'orders'] }],
    ['store singleton', { segments: ['store'] }],
    ['unknown suffix', { segments: ['products', '123', 'variants', 'extra'] }],
    ['numeric resource ID', { segments: ['products', 123, 'variants'] }],
  ])('rejects request %s', (_label, changes) => {
    const metadata = fixture()
    rejectMetadata({ ...metadata, request: { ...metadata.request, ...changes } })
  })
  it.each([
    ['foreign origin', { origin: 'https://external.invalid' }],
    ['different version', { apiVersion: '2025-04' }],
    ['different store', { storeId: '124' }],
    ['store decimal alias', { storeId: '123' }],
    ['different route', { segments: ['orders'] }],
    ['different perPage', { pagination: { page: 2, perPage: 200 } }],
    ['nonconsecutive next', { pagination: { page: 3, perPage: 30 } }],
    ['zero page', { pagination: { page: 0, perPage: 30 } }],
    ['unsafe page', { pagination: { page: Number.MAX_SAFE_INTEGER + 1, perPage: 30 } }],
    ['unknown relation', { relation: 'alternate' }],
    ['external URL field', { url: `https://external.invalid/${HOSTILE}` }],
    ['filter field', { q: HOSTILE }],
  ])('rejects target %s', (_label, changes) => {
    rejectMetadata(
      fixture(1, 30, ['products'], [{ ...target('next', 2), ...changes } as NuvemshopLinkTarget]),
    )
  })
  it('rejects a scoped parent resource ID change without numeric coercion', () => {
    rejectMetadata(
      fixture(
        1,
        30,
        ['products', '9007199254740993123', 'variants'],
        [target('next', 2, 30, ['products', '9007199254740993124', 'variants'])],
      ),
    )
  })
  it.each([
    ['invalid count', { totalCount: { kind: 'invalid' } }],
    ['negative count', { totalCount: { kind: 'valid', value: -1 } }],
    ['unsafe count', { totalCount: { kind: 'valid', value: Number.MAX_SAFE_INTEGER + 1 } }],
    ['fractional count', { totalCount: { kind: 'valid', value: 1.5 } }],
    ['string count', { totalCount: { kind: 'valid', value: '1' } }],
    ['invalid links', { links: { kind: 'invalid' } }],
    ['nonarray links', { links: { kind: 'valid', value: {} } }],
    ['unknown sentinel', { links: { kind: 'external', value: HOSTILE } }],
    ['absent with raw URL', { links: { kind: 'absent', value: HOSTILE } }],
  ])('rejects envelope %s', (_label, changes) => {
    const metadata = fixture()
    rejectMetadata({ ...metadata, pagination: { ...metadata.pagination, ...changes } })
  })
  it.each([
    ['previous on first page', 1, [target('prev', 1)]],
    ['inconsistent previous', 3, [target('prev', 1)]],
    ['first not one', 2, [target('first', 2)]],
    ['last before current', 3, [target('last', 2)]],
    ['next beyond last', 2, [target('next', 3), target('last', 2)]],
    ['duplicate relation', 1, [target('next', 2), target('next', 2)]],
    [
      'too many entries',
      2,
      [
        target('first', 1),
        target('prev', 1),
        target('next', 3),
        target('last', 3),
        target('next', 3),
      ],
    ],
    ['next overflow', Number.MAX_SAFE_INTEGER, [target('next', Number.MAX_SAFE_INTEGER)]],
  ] as const)('rejects relation %s', (_label, page, links) =>
    rejectMetadata(fixture(page, 30, ['products'], links)),
  )
  it.each([null, undefined, [], 1, HOSTILE, true])('rejects top-level shape %j', rejectMetadata)
  it('rejects unknown own and symbol metadata fields', () => {
    rejectMetadata({ ...fixture(), url: HOSTILE })
    rejectMetadata({ ...fixture(), [Symbol('url')]: HOSTILE })
  })
  it('rejects inherited identities and fields', () => {
    rejectMetadata(Object.create(fixture()))
    const metadata = fixture()
    rejectMetadata({ ...metadata, request: Object.create(metadata.request) })
    rejectMetadata({ ...metadata, pagination: Object.create(metadata.pagination) })
  })
  it('rejects arrays masquerading as records and sparse target lists', () => {
    rejectMetadata(Object.assign([], fixture()))
    const metadata = fixture()
    rejectMetadata({ ...metadata, request: Object.assign([], metadata.request) })
    rejectMetadata({
      ...metadata,
      pagination: { ...metadata.pagination, links: { kind: 'valid', value: new Array(1) } },
    })
  })
  it.each([
    { location: 'request route', key: 'url' },
    { location: 'request route', key: Symbol('url') },
    { location: 'target route', key: 'url' },
    { location: 'target route', key: Symbol('url') },
    { location: 'target list', key: 'url' },
    { location: 'target list', key: Symbol('url') },
    { location: 'items', key: 'url' },
    { location: 'items', key: Symbol('url') },
  ])('rejects inconsistent indexed keys in $location with $key', ({ location, key }) => {
    const handler = { ownKeys: () => ['length', key] }
    if (location === 'items') {
      expect(() => createNuvemshopPage(new Proxy([{ id: '1' }], handler), fixture())).toThrow(
        NuvemshopProtocolError,
      )
      return
    }
    const metadata = fixture(1, 30, ['products'], [target('next', 2)])
    if (location === 'request route') {
      metadata.request = { ...metadata.request, segments: new Proxy(['products'], handler) }
    } else if (location === 'target route') {
      metadata.pagination = {
        ...metadata.pagination,
        links: {
          kind: 'valid',
          value: [{ ...target('next', 2), segments: new Proxy(['products'], handler) }],
        },
      }
    } else {
      metadata.pagination = {
        ...metadata.pagination,
        links: { kind: 'valid', value: new Proxy([target('next', 2)], handler) },
      }
    }
    rejectMetadata(metadata)
  })
  it.each(['request', 'rateLimit', 'pagination'])('contains a throwing %s getter', (key) => {
    const metadata = fixture()
    Object.defineProperty(metadata, key, {
      enumerable: true,
      get() {
        throw new Error(HOSTILE)
      },
    })
    rejectMetadata(metadata)
  })
  it('contains nested getters without propagating their custom exceptions', () => {
    const metadata = fixture(1, 30, ['products'], [target('next', 2)])
    Object.defineProperty(metadata.request, 'storeId', {
      enumerable: true,
      get() {
        throw new TypeError(HOSTILE)
      },
    })
    rejectMetadata(metadata)
    const other = fixture(1, 30, ['products'], [target('next', 2)])
    Object.defineProperty(other.pagination.links, 'value', {
      enumerable: true,
      get() {
        throw { private: HOSTILE }
      },
    })
    rejectMetadata(other)
  })
  it.each(['ownKeys', 'getOwnPropertyDescriptor', 'getPrototypeOf'] as const)(
    'contains hostile proxy %s trap',
    (trap) => {
      rejectMetadata(
        new Proxy(fixture(), {
          [trap]: () => {
            throw new Error(HOSTILE)
          },
        }),
      )
    },
  )
  it('contains revoked proxies', () => {
    const proxy = Proxy.revocable(fixture(), {})
    proxy.revoke()
    rejectMetadata(proxy.proxy)
  })
  it('snapshots valid own descriptors without executing a hostile get trap', () => {
    const get = vi.fn(() => {
      throw new Error(HOSTILE)
    })
    expect(parseNuvemshopPageNavigation(new Proxy(fixture(), { get }))).toEqual({
      page: 1,
      perPage: 30,
    })
    expect(get).not.toHaveBeenCalled()
  })
  it('accepts invalid and absent rate sentinels without imposing quota semantics', () => {
    const metadata = fixture()
    metadata.rateLimit = {
      limit: { kind: 'invalid' },
      remaining: absent,
      resetMs: { kind: 'valid', value: 0 },
    }
    expect(parseNuvemshopPageNavigation(metadata)).toEqual({ page: 1, perPage: 30 })
  })
  it.each([
    null,
    [],
    {},
    { limit: absent, remaining: absent },
    { limit: absent, remaining: absent, resetMs: absent, external: HOSTILE },
    { limit: { kind: 'valid', value: HOSTILE }, remaining: absent, resetMs: absent },
    { limit: absent, remaining: absent, resetMs: { kind: 'valid', value: -1 } },
  ])('rejects malformed rate envelope %j', (rateLimit) => {
    rejectMetadata({ ...fixture(), rateLimit })
  })
  it('does not ignore symbol and additional pagination query fields', () => {
    const metadata = fixture()
    rejectMetadata({
      ...metadata,
      request: {
        ...metadata.request,
        pagination: { page: 1, perPage: 30, [Symbol('external')]: HOSTILE },
      },
    })
    rejectMetadata({
      ...metadata,
      request: { ...metadata.request, pagination: { page: 1, perPage: 30, owner_id: HOSTILE } },
    })
  })
})

// Integration uses the real NUV-05 client, admission registry, headers and response parser.
// Only external fetch and process configuration are synthetic; no transport is mocked.
describe('real NUV-05 transport composition and admission', () => {
  let request: typeof import('@/modules/nuvemshop/server/client').nuvemshopRequest
  let parse: typeof parseNuvemshopPageNavigation
  let create: typeof createNuvemshopPage
  let ProtocolError: typeof NuvemshopProtocolError
  let RateLimitError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopRateLimitError
  let NetworkError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopNetworkError
  let ProviderError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopProviderError
  let controllers: AbortController[]
  let pending: Promise<unknown>[]
  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NUVEMSHOP_STORE_ID', STORE)
    vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', 'synthetic-pagination-token')
    controllers = []
    pending = []
    request = (await import('@/modules/nuvemshop/server/client')).nuvemshopRequest
    const pagination = await import('@/modules/nuvemshop/server/pagination')
    parse = pagination.parseNuvemshopPageNavigation
    create = pagination.createNuvemshopPage
    const errors = await import('@/modules/nuvemshop/server/errors')
    ProtocolError = errors.NuvemshopProtocolError
    RateLimitError = errors.NuvemshopRateLimitError
    NetworkError = errors.NuvemshopNetworkError
    ProviderError = errors.NuvemshopProviderError
  })
  afterEach(async () => {
    for (const controller of controllers) controller.abort()
    await vi.advanceTimersByTimeAsync(9_000)
    await Promise.all(pending)
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })
  function start(page: number) {
    const controller = new AbortController()
    controllers.push(controller)
    const input: NuvemshopRequestInput = {
      method: 'GET',
      segments: ['products'],
      query: { page, perPage: 30 },
      signal: controller.signal,
    }
    const result = request(input).then(
      (value) => ({ value, error: undefined }),
      (error: unknown) => ({ value: undefined, error }),
    )
    pending.push(result)
    return result
  }
  function response(headers: Record<string, string> = {}, status = 200) {
    return new Response(status === 200 ? '[{"id":"9007199254740993"}]' : '{}', {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    })
  }
  const url = (page: number) => `${ORIGIN}/${VERSION}/${STORE}/products?page=${page}&per_page=30`
  it('uses actual projected metadata, number-only navigation and paced trusted route dispatch', async () => {
    const times: number[] = []
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      times.push(performance.now())
      return response({
        link:
          times.length === 1
            ? `<${url(2)}>; rel="next"`
            : `<${url(1)}>; rel="prev", <${url(2)}>; rel="last"`,
        'x-total-count': '3',
      })
    })
    vi.stubGlobal('fetch', fetch)
    const first = start(1)
    await vi.advanceTimersByTimeAsync(0)
    const firstResult = await first
    expect(firstResult.error).toBeUndefined()
    const metadata = firstResult.value!.metadata
    expect(metadata.request.pagination).toEqual({ page: 1, perPage: 30 })
    expect(Object.isFrozen(metadata)).toBe(true)
    const navigation = parse(metadata)
    expect(navigation).toEqual({ page: 1, perPage: 30, nextPage: 2, totalCount: 3 })
    const page = create([{ id: '9007199254740993' }], metadata)
    expect(page.nextPage).toBe(2)
    expect(Object.values(navigation).every((value) => typeof value === 'number')).toBe(true)
    const second = start(page.nextPage!)
    await vi.advanceTimersByTimeAsync(499)
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    const secondResult = await second
    expect(secondResult.error).toBeUndefined()
    expect(parse(secondResult.value!.metadata)).toEqual({
      page: 2,
      perPage: 30,
      totalCount: 3,
      previousPage: 1,
    })
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([url(1), url(2)])
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(500)
  })
  it.each([
    'https://external.invalid/products?page=2&per_page=30',
    `${ORIGIN}/${VERSION}/${STORE}/products?page=2&per_page=30&q=synthetic-private`,
  ])('invalidates malicious raw Link before consumer navigation: %s', async (malicious) => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      response({ link: `<${malicious}>; rel="next"` }),
    )
    vi.stubGlobal('fetch', fetch)
    const first = start(1)
    await vi.advanceTimersByTimeAsync(0)
    const result = await first
    expect(result.error).toBeUndefined()
    expect(result.value!.metadata.pagination.links).toEqual({ kind: 'invalid' })
    expect(JSON.stringify(result.value!.metadata)).not.toContain(malicious)
    expect(() => parse(result.value!.metadata)).toThrow(ProtocolError)
    expect(() => create([], result.value!.metadata)).toThrow(ProtocolError)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]![0]).toBe(url(1))
  })
  it.each([
    `${ORIGIN}/${VERSION}/123/products?page=2&per_page=30`,
    `${ORIGIN}/${VERSION}/${STORE}/orders?page=2&per_page=30`,
    `${ORIGIN}/${VERSION}/${STORE}/products?page=2&per_page=200`,
  ])('rejects lexically valid but semantically incompatible real metadata: %s', async (link) => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      response({ link: `<${link}>; rel="next"` }),
    )
    vi.stubGlobal('fetch', fetch)
    const first = start(1)
    await vi.advanceTimersByTimeAsync(0)
    const metadata = (await first).value!.metadata
    expect(metadata.pagination.links.kind).toBe('valid')
    expect(() => parse(metadata)).toThrow(ProtocolError)
    expect(() => create([], metadata)).toThrow(ProtocolError)
    await vi.advanceTimersByTimeAsync(9_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]![0]).toBe(url(1))
  })
  it('a second page shares the exhausted store quota instead of bypassing admission', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      response({
        link: `<${url(2)}>; rel="next"`,
        'x-rate-limit-limit': '40',
        'x-rate-limit-remaining': '0',
        'x-rate-limit-reset': '1200',
      }),
    )
    vi.stubGlobal('fetch', fetch)
    const first = start(1)
    await vi.advanceTimersByTimeAsync(0)
    const firstResult = await first
    const second = start(parse(firstResult.value!.metadata).nextPage!)
    await vi.advanceTimersByTimeAsync(1_199)
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect((await second).error).toBeUndefined()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('a 429 on the next page blocks later page dispatch within original deadlines', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (): Promise<Response> =>
      fetch.mock.calls.length === 1
        ? response({ link: `<${url(2)}>; rel="next"` })
        : response({ 'x-rate-limit-reset': '20000' }, 429),
    )
    vi.stubGlobal('fetch', fetch)
    const first = start(1)
    await vi.advanceTimersByTimeAsync(0)
    const next = parse((await first).value!.metadata).nextPage!
    const second = start(next)
    await vi.advanceTimersByTimeAsync(500)
    const secondResult = await second
    expect(secondResult.error).toBeInstanceOf(RateLimitError)
    const third = start(3)
    await vi.advanceTimersByTimeAsync(9_000)
    expect((await third).error).toBeInstanceOf(RateLimitError)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([url(1), url(2)])
  })
  it('settled page reads are new work, without a fulfilled-result cache', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => response())
    vi.stubGlobal('fetch', fetch)
    const first = start(1)
    await vi.advanceTimersByTimeAsync(0)
    const firstValue = (await first).value!
    create([], firstValue.metadata)
    const again = start(1)
    await vi.advanceTimersByTimeAsync(500)
    const secondValue = (await again).value!
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(secondValue).not.toBe(firstValue)
  })
  it('retry of a navigated page cannot renew its operation deadline', async () => {
    const dispatched: number[] = []
    const fetch = vi.fn<typeof globalThis.fetch>(async (): Promise<Response> => {
      dispatched.push(performance.now())
      return fetch.mock.calls.length === 1
        ? response({ link: `<${url(2)}>; rel="next"` })
        : response(
            {
              'x-rate-limit-limit': '40',
              'x-rate-limit-remaining': '0',
              'x-rate-limit-reset': '9500',
            },
            503,
          )
    })
    vi.stubGlobal('fetch', fetch)
    const first = start(1)
    await vi.advanceTimersByTimeAsync(0)
    const next = parse((await first).value!.metadata).nextPage!
    const began = performance.now()
    let settledAt: number | undefined
    const second = start(next).then((result) => {
      settledAt = performance.now()
      return result
    })
    await vi.advanceTimersByTimeAsync(9_000)
    expect((await second).error).toBeInstanceOf(ProviderError)
    expect(settledAt! - began).toBeLessThanOrEqual(9_000)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(dispatched[1]! - dispatched[0]!).toBeGreaterThanOrEqual(500)
  })
  it('clips a next-page retry to the deadline after quota waiting and a timed-out attempt', async () => {
    const dispatched: number[] = []
    const aborted: number[] = []
    const fetch = vi.fn<typeof globalThis.fetch>((_url, init) => {
      dispatched.push(performance.now())
      if (dispatched.length === 1) {
        return Promise.resolve(
          response({
            link: `<${url(2)}>; rel="next"`,
            'x-rate-limit-limit': '40',
            'x-rate-limit-remaining': '0',
            'x-rate-limit-reset': '2400',
          }),
        )
      }
      return new Promise<Response>((_resolve, reject) => {
        init!.signal!.addEventListener(
          'abort',
          () => {
            aborted.push(performance.now())
            reject(new DOMException('synthetic timeout', 'AbortError'))
          },
          { once: true },
        )
      })
    })
    vi.stubGlobal('fetch', fetch)
    const first = start(1)
    await vi.advanceTimersByTimeAsync(0)
    const next = parse((await first).value!.metadata).nextPage!
    const began = performance.now()
    let settledAt: number | undefined
    const second = start(next).then((result) => {
      settledAt = performance.now()
      return result
    })
    await vi.advanceTimersByTimeAsync(9_000)
    expect((await second).error).toBeInstanceOf(NetworkError)
    expect(settledAt! - began).toBe(9_000)
    expect(dispatched).toEqual([0, 2_400, 6_400])
    expect(aborted).toEqual([6_400, 9_000])
    await vi.advanceTimersByTimeAsync(9_000)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([url(1), url(2), url(2)])
  })
})
