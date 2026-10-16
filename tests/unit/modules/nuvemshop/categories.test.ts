/**
 * NUV-09 RED: server-only Category reads (listCategories, getCategory).
 * Integration style — only fetch is mocked; transport, pagination and schemas are real.
 *
 * Fixtures are synthetic, derived from documented Nuvemshop field names (see fixtures/schemas.ts);
 * no live store was queried.
 * NUV-09-R1 zero sentinel: https://nuvemshop.dev/en-US/api/resources/2025-03/category
 * (consulted 2026-10-16; documented compatibility, not observed store behavior).
 *
 * Harness notes against the integrated NUV-04/05/06/07 contracts:
 * - each test reloads the server module so the process-local rate budget starts cold;
 * - a page-1 response cannot carry rel="prev" (NUV-06);
 * - GET 5xx and attempt timeouts use the existing two-attempt budget (NUV-05);
 * - abort before admission performs no fetch;
 * - numeric parent 0 is a documented root sentinel; string zero remains invalid;
 * - handle absence stays null and is never synthesized from name.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  NUVEMSHOP_API_ORIGIN,
  NUVEMSHOP_API_VERSION,
  NUVEMSHOP_ATTEMPT_TIMEOUT_MS,
  NUVEMSHOP_USER_AGENT,
} from '@/modules/nuvemshop/server/client'
import type { Category } from '@/modules/nuvemshop/server'

import { ABOVE_INT32_ID, ABOVE_INT64_ID, HUGE_ID, categoryRaw } from './fixtures/schemas'

const STORE_ID = '123456789012345678901234567890'
const TOKEN = 'synthetic-access-token'
const SENTINEL = '__nuvemshop_nuv09_sentinel'
const SECRET_MARKERS = [TOKEN, 'Bearer', 'Authorization']
const CATEGORY_NAME_MARKER = 'Série sintética'
const EDITORIAL_MARKERS = ['texto curatorial', 'Apparel', 'subcategories', 'seo_title']

const OFFICIAL_CATEGORIES = `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/${STORE_ID}/categories`
const MAX_BODY_BYTES = 1_048_576

let listCategories: (input: {
  page: number
  perPage: number
  signal?: AbortSignal
  correlationId?: string
}) => Promise<{
  items: Category[]
  page: number
  perPage: number
  totalCount?: number
  nextPage?: number
  previousPage?: number
}>
let getCategory: (input: {
  categoryId: string
  signal?: AbortSignal
  correlationId?: string
}) => Promise<Category>
let NuvemshopAuthenticationError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopAuthenticationError
let NuvemshopAuthorizationError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopAuthorizationError
let NuvemshopConfigurationError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopConfigurationError
let NuvemshopNetworkError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopNetworkError
let NuvemshopNotFoundError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopNotFoundError
let NuvemshopProtocolError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopProtocolError
let NuvemshopProviderError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopProviderError
let NuvemshopRateLimitError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopRateLimitError
let NuvemshopValidationError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopValidationError

function categoriesListUrl(page = 1, perPage = 30): string {
  return `${OFFICIAL_CATEGORIES}?page=${page}&per_page=${perPage}`
}

function categoryDetailUrl(categoryId: string): string {
  return `${OFFICIAL_CATEGORIES}/${categoryId}`
}

function stubConfig(overrides: Record<string, string | undefined> = {}) {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NUVEMSHOP_STORE_ID', STORE_ID)
  vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', TOKEN)
  vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', 'synthetic-client-secret')
  vi.stubEnv('NUVEMSHOP_APP_ID', 'synthetic-app-id')
  vi.stubEnv('NUVEMSHOP_API_VERSION', '1999-01')
  for (const [key, value] of Object.entries(overrides)) vi.stubEnv(key, value)
}

function installFetch(
  impl: typeof fetch = async () =>
    new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json; charset=UTF-8' },
    }),
) {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestUrl(fetchMock: ReturnType<typeof vi.fn>, index = 0): string {
  const [input] = fetchMock.mock.calls[index] ?? []
  return typeof input === 'string' ? input : input instanceof URL ? input.toString() : ''
}

function requestInit(fetchMock: ReturnType<typeof vi.fn>, index = 0): RequestInit {
  return (fetchMock.mock.calls[index]?.[1] ?? {}) as RequestInit
}

function headerRecord(init: RequestInit): Record<string, string> {
  const headers = init.headers
  if (headers instanceof Headers) return Object.fromEntries(headers.entries())
  if (Array.isArray(headers)) return Object.fromEntries(headers)
  return { ...(headers ?? {}) }
}

async function capture<T>(run: () => Promise<T>): Promise<{ value?: T; error?: unknown }> {
  const pending: Promise<{ value?: T; error?: unknown }> = Promise.resolve()
    .then(run)
    .then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    )
  await vi.advanceTimersByTimeAsync(9_000)
  return pending
}

function serialized(error: unknown): string {
  if (!(error instanceof Error)) return JSON.stringify(error)
  const projection = 'toJSON' in error && typeof error.toJSON === 'function' ? error.toJSON() : {}
  return JSON.stringify({
    name: error.name,
    message: error.message,
    stack: error.stack,
    projection,
  })
}

function expectRedacted(error: unknown) {
  const text = serialized(error)
  for (const marker of SECRET_MARKERS) expect(text).not.toContain(marker)
}

function withUnquotedId(raw: string, field: string, digits: string): string {
  const pattern = new RegExp(`"${field}":\\d+`)
  if (!pattern.test(raw)) throw new Error(`fixture has no numeric ${field}`)
  return raw.replace(pattern, `"${field}":${digits}`)
}

function categoryApiObject(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...(JSON.parse(categoryRaw()) as Record<string, unknown>),
    ...overrides,
    [SENTINEL]: true,
  }
}

function jsonResponse(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8', ...headers },
  })
}

function categoryListBody(count: number): string {
  return JSON.stringify(
    Array.from(
      { length: count },
      (_, index) => JSON.parse(categoryRaw({ id: index + 1 })) as unknown,
    ),
  )
}

function expectNormalizedCategory(category: Category | undefined) {
  expect(category).toBeDefined()
  const text = JSON.stringify(category)
  for (const marker of EDITORIAL_MARKERS) expect(text).not.toContain(marker)
  expect(category).not.toHaveProperty(SENTINEL)
  expect(category).not.toHaveProperty('description')
  expect(category).not.toHaveProperty('subcategories')
  expect(category).not.toHaveProperty('google_shopping_category')
  expect(category).not.toHaveProperty('seo')
  expect(category).not.toHaveProperty('seo_title')
  expect(category).not.toHaveProperty('created_at')
  expect(category).not.toHaveProperty('updated_at')
  expect(category).not.toHaveProperty('createdAt')
  expect(category).not.toHaveProperty('updatedAt')
}

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] })
  vi.spyOn(Math, 'random').mockReturnValue(0)
  stubConfig()
  const server = await import('@/modules/nuvemshop/server')
  const errors = await import('@/modules/nuvemshop/server/errors')
  listCategories = server.listCategories
  getCategory = server.getCategory
  NuvemshopAuthenticationError = errors.NuvemshopAuthenticationError
  NuvemshopAuthorizationError = errors.NuvemshopAuthorizationError
  NuvemshopConfigurationError = errors.NuvemshopConfigurationError
  NuvemshopNetworkError = errors.NuvemshopNetworkError
  NuvemshopNotFoundError = errors.NuvemshopNotFoundError
  NuvemshopProtocolError = errors.NuvemshopProtocolError
  NuvemshopProviderError = errors.NuvemshopProviderError
  NuvemshopRateLimitError = errors.NuvemshopRateLimitError
  NuvemshopValidationError = errors.NuvemshopValidationError
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

describe('NUV-09 listCategories', () => {
  it('accepts an empty list', async () => {
    const fetchMock = installFetch(async () => jsonResponse('[]'))
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeUndefined()
    expect(result.value).toEqual({ items: [], page: 1, perPage: 30 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestUrl(fetchMock)).toBe(categoriesListUrl(1, 30))
    expect(requestInit(fetchMock).method ?? 'GET').toBe('GET')
  })

  it('returns one parsed category', async () => {
    const fetchMock = installFetch(async () => jsonResponse(`[${categoryRaw()}]`))
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeUndefined()
    expect(result.value?.items).toHaveLength(1)
    expect(result.value?.items[0]).toEqual({
      id: '4567',
      name: { pt: 'Série sintética', es: 'Serie' },
      handle: { pt: 'serie-sintetica' },
      parentId: null,
      visibility: 'visible',
    })
    expectNormalizedCategory(result.value?.items[0])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns multiple parsed categories on one page', async () => {
    const items = [
      categoryApiObject({ id: 1 }),
      categoryApiObject({ id: 2, name: { pt: 'B' }, parent: 1 }),
    ]
    installFetch(async () => jsonResponse(JSON.stringify(items)))
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeUndefined()
    expect(result.value?.items).toHaveLength(2)
    expect(result.value?.items[0]?.id).toBe('1')
    expect(result.value?.items[1]?.name).toEqual({ pt: 'B' })
    expect(result.value?.items[1]?.parentId).toBe('1')
  })

  it('accepts null, numeric zero, and positive parents in one list page', async () => {
    const body = JSON.stringify([
      JSON.parse(categoryRaw({ id: 1, parent: null })),
      JSON.parse(categoryRaw({ id: 2, parent: 0 })),
      JSON.parse(categoryRaw({ id: 3, parent: 4567 })),
    ])
    const fetchMock = installFetch(async () => jsonResponse(body))

    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))

    expect(result.error).toBeUndefined()
    expect(result.value?.items.map(({ id, parentId }) => ({ id, parentId }))).toEqual([
      { id: '1', parentId: null },
      { id: '2', parentId: null },
      { id: '3', parentId: '4567' },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('requests page 1 with canonical pagination query params on the pinned origin and version', async () => {
    const fetchMock = installFetch(async () => jsonResponse(`[${categoryRaw()}]`))
    await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(requestUrl(fetchMock)).toBe(categoriesListUrl(1, 30))
    expect(requestUrl(fetchMock)).toContain(`/${NUVEMSHOP_API_VERSION}/`)
    expect(requestUrl(fetchMock)).toContain(NUVEMSHOP_API_ORIGIN)
    expect(requestUrl(fetchMock)).not.toContain('1999-01')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('requests a middle page exactly', async () => {
    const fetchMock = installFetch(async () => jsonResponse('[]'))
    await capture(() => listCategories({ page: 2, perPage: 30 }))
    expect(requestUrl(fetchMock)).toBe(categoriesListUrl(2, 30))
  })

  it('accepts a full page without truncation', async () => {
    installFetch(async () => jsonResponse(categoryListBody(20)))
    const result = await capture(() => listCategories({ page: 1, perPage: 20 }))
    expect(result.error).toBeUndefined()
    expect(result.value?.items).toHaveLength(20)
    expect(result.value?.perPage).toBe(20)
  })

  it('accepts a partial page', async () => {
    installFetch(async () => jsonResponse(categoryListBody(7)))
    const result = await capture(() => listCategories({ page: 1, perPage: 20 }))
    expect(result.error).toBeUndefined()
    expect(result.value?.items).toHaveLength(7)
  })

  it('projects next and previous pages from a valid Link header', async () => {
    const link = `<${categoriesListUrl(3)}>; rel="next", <${categoriesListUrl(1)}>; rel="prev"`
    installFetch(async () => jsonResponse('[]', 200, { link }))
    const result = await capture(() => listCategories({ page: 2, perPage: 30 }))
    expect(result.value).toMatchObject({ page: 2, perPage: 30, nextPage: 3, previousPage: 1 })
  })

  it('rejects rel=prev on page 1 as a protocol error', async () => {
    const fetchMock = installFetch(async () =>
      jsonResponse('[]', 200, { link: `<${categoriesListUrl(0)}>; rel="prev"` }),
    )
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('includes totalCount when x-total-count is present', async () => {
    installFetch(async () => jsonResponse('[]', 200, { 'x-total-count': '42' }))
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.value?.totalCount).toBe(42)
  })

  it('omits totalCount when the header is absent', async () => {
    installFetch(async () => jsonResponse('[]'))
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.value).not.toHaveProperty('totalCount')
  })

  it('keeps nextPage on an empty page when Link declares a next page', async () => {
    installFetch(async () =>
      jsonResponse('[]', 200, { link: `<${categoriesListUrl(3)}>; rel="next"` }),
    )
    const result = await capture(() => listCategories({ page: 2, perPage: 30 }))
    expect(result.value?.items).toEqual([])
    expect(result.value?.nextPage).toBe(3)
  })

  it.each([
    ['external host', `https://evil.example/${STORE_ID}/categories?page=2&per_page=30`],
    [
      'store id swapped',
      `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/999/categories?page=2&per_page=30`,
    ],
    [
      'api version swapped',
      `${NUVEMSHOP_API_ORIGIN}/2026-03/${STORE_ID}/categories?page=2&per_page=30`,
    ],
    [
      'resource swapped',
      `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/${STORE_ID}/orders?page=2&per_page=30`,
    ],
    ['extra query param', `${categoriesListUrl(2, 30)}&q=synthetic`],
  ])(
    'treats malicious Link (%s) as a protocol error without a second fetch',
    async (_label, malicious) => {
      const fetchMock = installFetch(async () =>
        jsonResponse('[]', 200, { link: `<${malicious}>; rel="next"` }),
      )
      const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expectRedacted(result.error)
    },
  )

  it('rejects invalid JSON as a protocol error', async () => {
    const fetchMock = installFetch(async () => jsonResponse('['))
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fails the whole page when one item is invalid', async () => {
    const valid = categoryApiObject()
    const invalid = categoryApiObject({ visibility: undefined })
    installFetch(async () => jsonResponse(JSON.stringify([valid, invalid])))
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
    expect(result.value).toBeUndefined()
  })

  it('does not copy unknown provider fields onto listed categories', async () => {
    installFetch(async () =>
      jsonResponse(JSON.stringify([categoryApiObject({ seo_title: 'não exportar', seo: {} })])),
    )
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeUndefined()
    expectNormalizedCategory(result.value?.items[0])
  })

  it('preserves large numeric ids across list items', async () => {
    const huge = withUnquotedId(categoryRaw(), 'id', HUGE_ID)
    const aboveInt32 = withUnquotedId(categoryRaw({ id: 1 }), 'id', ABOVE_INT32_ID)
    const aboveInt64 = withUnquotedId(categoryRaw({ id: 1 }), 'id', ABOVE_INT64_ID)
    installFetch(async () => jsonResponse(`[${huge},${aboveInt32},${aboveInt64}]`))
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeUndefined()
    expect(result.value?.items.map((item) => item.id)).toEqual([
      HUGE_ID,
      ABOVE_INT32_ID,
      ABOVE_INT64_ID,
    ])
  })

  it('sends Authorization and never echoes it in errors', async () => {
    const fetchMock = installFetch(async () => jsonResponse('[]', 401))
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(headerRecord(requestInit(fetchMock)).Authorization).toBe(`Bearer ${TOKEN}`)
    expect(result.error).toBeInstanceOf(NuvemshopAuthenticationError)
    expectRedacted(result.error)
  })

  it('does not perform extra fetch calls beyond the list request', async () => {
    const fetchMock = installFetch(async () => jsonResponse(`[${categoryRaw()}]`))
    await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestUrl(fetchMock)).toBe(categoriesListUrl(1, 30))
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).not.toContain('/products')
      expect(String(call[0])).not.toContain('http://')
    }
  })

  it.each([
    [400, 'NuvemshopProtocolError', 1],
    [422, 'NuvemshopProtocolError', 1],
    [401, 'NuvemshopAuthenticationError', 1],
    [403, 'NuvemshopAuthorizationError', 1],
    [404, 'NuvemshopNotFoundError', 1],
    [429, 'NuvemshopRateLimitError', 1],
    [503, 'NuvemshopProviderError', 2],
  ] as const)('maps HTTP %i to %s', async (status, errorName, calls) => {
    const fetchMock = installFetch(async () => jsonResponse('{}', status))
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    const errorTypes = {
      NuvemshopProtocolError,
      NuvemshopAuthenticationError,
      NuvemshopAuthorizationError,
      NuvemshopNotFoundError,
      NuvemshopRateLimitError,
      NuvemshopProviderError,
    }
    expect(result.error).toBeInstanceOf(errorTypes[errorName])
    expect(fetchMock).toHaveBeenCalledTimes(calls)
  })

  it('maps abort to NuvemshopNetworkError', async () => {
    const controller = new AbortController()
    const fetchMock = installFetch((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'))
        })
      })
    })
    const pending = listCategories({ page: 1, perPage: 30, signal: controller.signal })
    controller.abort()
    const result = await capture(() => pending)
    expect(result.error).toBeInstanceOf(NuvemshopNetworkError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps attempt timeout to NuvemshopNetworkError', async () => {
    const fetchMock = installFetch((_input, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('timeout', 'AbortError'))
        })
      })
    })
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(NuvemshopNetworkError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(NUVEMSHOP_ATTEMPT_TIMEOUT_MS).toBe(4_000)
  })

  it('rejects an invalid list body as a protocol error', async () => {
    const fetchMock = installFetch(async () => jsonResponse('{}'))
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects an oversized declared body via the transport cap', async () => {
    installFetch(
      async () =>
        new Response('[]', {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'content-length': String(MAX_BODY_BYTES + 1),
          },
        }),
    )
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('fails closed when NUVEMSHOP_STORE_ID is missing before fetch', async () => {
    stubConfig({ NUVEMSHOP_STORE_ID: undefined })
    const fetchMock = installFetch()
    const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(NuvemshopConfigurationError)
    expect((result.error as Error).message).toBe('Nuvemshop configuration is invalid.')
    expect(fetchMock).not.toHaveBeenCalled()
    expectRedacted(result.error)
  })

  it('uses GET with standard headers and a single list fetch', async () => {
    const fetchMock = installFetch(async () => jsonResponse('[]'))
    await capture(() => listCategories({ page: 1, perPage: 30 }))
    expect(requestInit(fetchMock).method ?? 'GET').toBe('GET')
    expect(headerRecord(requestInit(fetchMock))).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
      'User-Agent': NUVEMSHOP_USER_AGENT,
      Accept: 'application/json',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('NUV-09 getCategory', () => {
  it('preserves exact category id above MAX_SAFE_INTEGER', async () => {
    const raw = withUnquotedId(categoryRaw(), 'id', HUGE_ID)
    const fetchMock = installFetch(async () => jsonResponse(raw))
    const result = await capture(() => getCategory({ categoryId: HUGE_ID }))
    expect(result.error).toBeUndefined()
    expect(result.value?.id).toBe(HUGE_ID)
    expect(requestUrl(fetchMock)).toBe(categoryDetailUrl(HUGE_ID))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('preserves ABOVE_INT32_ID and ABOVE_INT64_ID as exact decimal strings', async () => {
    for (const id of [ABOVE_INT32_ID, ABOVE_INT64_ID]) {
      const raw = withUnquotedId(categoryRaw(), 'id', id)
      const fetchMock = installFetch(async () => jsonResponse(raw))
      const result = await capture(() => getCategory({ categoryId: id }))
      expect(result.error).toBeUndefined()
      expect(result.value?.id).toBe(id)
      expect(requestUrl(fetchMock)).toBe(categoryDetailUrl(id))
    }
  })

  it('rejects a category payload with a missing id', async () => {
    const raw = JSON.parse(categoryRaw()) as Record<string, unknown>
    delete raw.id
    installFetch(async () => jsonResponse(JSON.stringify(raw)))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('rejects a category whose id differs from the requested id without a list fallback', async () => {
    const fetchMock = installFetch(async () => jsonResponse(categoryRaw({ id: 9999 })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestUrl(fetchMock)).toBe(categoryDetailUrl('4567'))
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).not.toBe(categoriesListUrl(1, 30))
      expect(String(call[0])).not.toContain('?page=')
    }
  })

  it('rejects an invalid category id in the payload', async () => {
    installFetch(async () => jsonResponse(categoryRaw({ id: -1 })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('maps parent null to parentId null', async () => {
    installFetch(async () => jsonResponse(categoryRaw({ parent: null })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeUndefined()
    expect(result.value?.parentId).toBeNull()
  })

  it('normalizes numeric zero parent on detail without adding public fields or fetching again', async () => {
    const fetchMock = installFetch(async () =>
      jsonResponse(
        categoryRaw({
          name: { pt: 'Categoria sintética' },
          handle: { pt: 'categoria-sintetica' },
          parent: 0,
        }),
      ),
    )

    const result = await capture(() => getCategory({ categoryId: '4567' }))

    expect(result.error).toBeUndefined()
    expect(result.value).toEqual({
      id: '4567',
      name: { pt: 'Categoria sintética' },
      handle: { pt: 'categoria-sintetica' },
      parentId: null,
      visibility: 'visible',
    })
    expect(Object.keys(result.value ?? {})).toEqual([
      'id',
      'name',
      'handle',
      'parentId',
      'visibility',
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestUrl(fetchMock)).toBe(categoryDetailUrl('4567'))
  })

  it('maps a positive parent id to the exact decimal string', async () => {
    installFetch(async () => jsonResponse(categoryRaw({ parent: 99 })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeUndefined()
    expect(result.value?.parentId).toBe('99')
  })

  it('rejects a missing parent key as a protocol error', async () => {
    const raw = JSON.parse(categoryRaw()) as { parent?: unknown }
    delete raw.parent
    installFetch(async () => jsonResponse(JSON.stringify(raw)))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
    expect(result.value).toBeUndefined()
  })

  it('rejects string parent zero as a protocol error and does not coerce it to null', async () => {
    installFetch(async () => jsonResponse(categoryRaw({ parent: '0' })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
    expect(result.value).toBeUndefined()
    expect(result.value).not.toEqual(expect.objectContaining({ parentId: null }))
  })

  it.each([
    ['string', 'abc'],
    ['zero-padded string', '00'],
    ['negative', -1],
    ['boolean', true],
    ['false', false],
    ['empty string', ''],
    ['array', []],
    ['object', { id: 1 }],
    ['fractional', 1.5],
  ])('rejects malformed parent (%s) as a protocol error', async (_label, parent) => {
    installFetch(async () => jsonResponse(categoryRaw({ parent })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
    expect(result.value).toBeUndefined()
  })

  it('preserves a localized valid handle', async () => {
    installFetch(async () => jsonResponse(categoryRaw({ handle: { pt: 'serie-sintetica' } })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.value?.handle).toEqual({ pt: 'serie-sintetica' })
  })

  it('maps an absent handle key to null without synthesizing a slug from name', async () => {
    const raw = JSON.parse(categoryRaw()) as { handle?: unknown }
    delete raw.handle
    installFetch(async () => jsonResponse(JSON.stringify(raw)))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeUndefined()
    expect(result.value?.handle).toBeNull()
    expect(result.value?.name).toEqual({ pt: 'Série sintética', es: 'Serie' })
    expect(JSON.stringify(result.value)).not.toContain('serie-sintetica')
  })

  it('maps handle null to null', async () => {
    installFetch(async () => jsonResponse(categoryRaw({ handle: null })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeUndefined()
    expect(result.value?.handle).toBeNull()
  })

  it('rejects a handle of the wrong type as a protocol error', async () => {
    installFetch(async () => jsonResponse(categoryRaw({ handle: 1 })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it.each([
    ['visible', 'visible'],
    ['hidden', 'hidden'],
    ['soft-hidden', 'soft-hidden'],
  ] as const)('keeps visibility %s distinct', async (visibility, expected) => {
    installFetch(async () => jsonResponse(categoryRaw({ visibility })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeUndefined()
    expect(result.value?.visibility).toBe(expected)
    expect(typeof result.value?.visibility).toBe('string')
    expect(result.value?.visibility).not.toBe(true)
    expect(result.value?.visibility).not.toBe(false)
  })

  it('rejects missing visibility', async () => {
    installFetch(async () => jsonResponse(categoryRaw({ visibility: undefined })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it.each([
    ['null', null],
    ['boolean true', true],
    ['unlisted', 'unlisted'],
    ['arbitrary string', 'published'],
  ])('rejects visibility %s as a protocol error', async (_label, visibility) => {
    installFetch(async () => jsonResponse(categoryRaw({ visibility })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('rejects a missing name as a protocol error', async () => {
    const raw = JSON.parse(categoryRaw()) as { name?: unknown }
    delete raw.name
    installFetch(async () => jsonResponse(JSON.stringify(raw)))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it.each([
    ['null', null],
    ['string', 'Série'],
    ['empty object', {}],
    ['boolean', true],
  ])('rejects invalid name (%s) as a protocol error', async (_label, name) => {
    installFetch(async () => jsonResponse(categoryRaw({ name })))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('does not copy unknown provider fields onto the public category', async () => {
    installFetch(async () =>
      jsonResponse(JSON.stringify(categoryApiObject({ seo_title: 'não exportar', seo: {} }))),
    )
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeUndefined()
    expectNormalizedCategory(result.value)
    expect(JSON.stringify(result.value)).not.toContain(SENTINEL)
    expect(JSON.stringify(result.value)).not.toContain('texto curatorial')
    expect(JSON.stringify(result.value)).not.toContain('Apparel')
    expect(JSON.stringify(result.value)).not.toContain('subcategories')
    expect(JSON.stringify(result.value)).not.toContain('seo_title')
  })

  it('preserves an unquoted ABOVE_INT64 parent id exactly', async () => {
    const raw = withUnquotedId(categoryRaw({ parent: 1 }), 'parent', ABOVE_INT64_ID)
    installFetch(async () => jsonResponse(raw))
    const result = await capture(() => getCategory({ categoryId: '4567' }))
    expect(result.error).toBeUndefined()
    expect(result.value?.parentId).toBe(ABOVE_INT64_ID)
  })

  it.each([
    ['parent traversal', '../orders'],
    ['encoded slash', 'categories%2Fproducts'],
    ['whitespace', ' 4567'],
    ['negative', '-1'],
    ['unsafe number', Number.MAX_SAFE_INTEGER + 2],
    ['bigint', BigInt(1)],
    ['non-decimal', '1.5'],
  ])('rejects categoryId %s before fetch', async (_label, categoryId) => {
    const fetchMock = installFetch()
    const result = await capture(() => getCategory({ categoryId: categoryId as unknown as string }))
    expect(result.error).toBeInstanceOf(NuvemshopValidationError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses GET with exact path ids and standard headers', async () => {
    const fetchMock = installFetch(async () => jsonResponse(categoryRaw()))
    await capture(() => getCategory({ categoryId: '4567' }))
    expect(requestInit(fetchMock).method ?? 'GET').toBe('GET')
    expect(requestUrl(fetchMock)).toBe(categoryDetailUrl('4567'))
    expect(headerRecord(requestInit(fetchMock))).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
      'User-Agent': NUVEMSHOP_USER_AGENT,
      Accept: 'application/json',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not fetch extra list or image URLs as egress targets', async () => {
    const fetchMock = installFetch(async () => jsonResponse(categoryRaw()))
    await capture(() => getCategory({ categoryId: '4567' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(categoryDetailUrl('4567'))
  })
})

describe('NUV-09-R1 adversarial input and pagination', () => {
  function expectValidationNoFetch(
    result: { value?: unknown; error?: unknown },
    fetchMock: ReturnType<typeof vi.fn>,
    options: { message?: string; noLeak?: string } = {},
  ) {
    expect(result.error).toBeInstanceOf(NuvemshopValidationError)
    expect(fetchMock).not.toHaveBeenCalled()
    if (options.message !== undefined) {
      expect((result.error as Error).message).toBe(options.message)
    }
    if (options.noLeak !== undefined) {
      expect(serialized(result.error)).not.toContain(options.noLeak)
    }
  }

  describe('hostile input containment', () => {
    it('contains a nested proxy trap without leaking nested exception text', async () => {
      const fetchMock = installFetch()
      const nested = new Proxy(
        {},
        {
          getPrototypeOf() {
            throw new Error('secret-nested-proxy')
          },
        },
      )
      const hostile = new Proxy(
        { page: 1, perPage: 30 },
        {
          ownKeys() {
            throw nested
          },
        },
      )
      const result = await capture(() =>
        listCategories(hostile as Parameters<typeof listCategories>[0]),
      )
      expect(result.error).toBeInstanceOf(NuvemshopValidationError)
      expect(result.error).toBeInstanceOf(Error)
      expect(() => (result.error as Error).message).not.toThrow()
      expect(() => (result.error as Error).stack).not.toThrow()
      expect(serialized(result.error)).not.toContain('secret-nested-proxy')
      expect(fetchMock).not.toHaveBeenCalled()
      expect((result.error as Error).message).toBe('Nuvemshop input is invalid.')
    })

    it('rejects a forged NuvemshopValidationError thrown from a trap', async () => {
      const fetchMock = installFetch()
      let forgedThrown: unknown
      const hostile = new Proxy(
        { page: 1, perPage: 30 },
        {
          ownKeys() {
            const forged = Object.create(NuvemshopValidationError.prototype) as Error
            Object.defineProperty(forged, 'message', {
              value: 'caller-controlled-forged-message',
              enumerable: true,
            })
            forgedThrown = forged
            throw forged
          },
        },
      )
      const result = await capture(() =>
        listCategories(hostile as Parameters<typeof listCategories>[0]),
      )
      expect(result.error).toBeInstanceOf(NuvemshopValidationError)
      expect(result.error).not.toBe(forgedThrown)
      expect(serialized(result.error)).not.toContain('caller-controlled-forged-message')
      expect((result.error as Error).message).toBe('Nuvemshop input is invalid.')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('contains getPrototypeOf trap leakage (secret-get-prototype)', async () => {
      const fetchMock = installFetch()
      const hostile = new Proxy(
        { page: 1, perPage: 30 },
        {
          getPrototypeOf() {
            throw new Error('secret-get-prototype')
          },
        },
      )
      const result = await capture(() =>
        listCategories(hostile as Parameters<typeof listCategories>[0]),
      )
      expectValidationNoFetch(result, fetchMock, {
        noLeak: 'secret-get-prototype',
      })
    })

    it('contains ownKeys trap leakage (secret-own-keys-focused)', async () => {
      const fetchMock = installFetch()
      const hostile = new Proxy(
        { page: 1, perPage: 30 },
        {
          ownKeys() {
            throw new Error('secret-own-keys')
          },
        },
      )
      const result = await capture(() =>
        listCategories(hostile as Parameters<typeof listCategories>[0]),
      )
      expectValidationNoFetch(result, fetchMock, {
        noLeak: 'secret-own-keys',
      })
    })

    it('contains getOwnPropertyDescriptor trap leakage (secret-descriptor)', async () => {
      const fetchMock = installFetch()
      const hostile = new Proxy(
        { page: 1, perPage: 30 },
        {
          getOwnPropertyDescriptor() {
            throw new Error('secret-descriptor')
          },
        },
      )
      const result = await capture(() =>
        listCategories(hostile as Parameters<typeof listCategories>[0]),
      )
      expectValidationNoFetch(result, fetchMock, {
        noLeak: 'secret-descriptor',
      })
    })

    it('rejects ownKeys that advertises a forbidden url key', async () => {
      const fetchMock = installFetch()
      const hostile = new Proxy(
        { page: 1, perPage: 30 },
        {
          ownKeys() {
            return ['page', 'perPage', 'url']
          },
        },
      )
      const result = await capture(() =>
        listCategories(hostile as Parameters<typeof listCategories>[0]),
      )
      expectValidationNoFetch(result, fetchMock)
    })

    it('rejects ownKeys that advertises a symbol key', async () => {
      const fetchMock = installFetch()
      const sym = Symbol('hostile')
      const hostile = new Proxy(
        { page: 1, perPage: 30 },
        {
          ownKeys() {
            return ['page', 'perPage', sym]
          },
        },
      )
      const result = await capture(() =>
        listCategories(hostile as Parameters<typeof listCategories>[0]),
      )
      expectValidationNoFetch(result, fetchMock)
    })

    it('rejects a hostile accessor on page without requiring the getter to run', async () => {
      const fetchMock = installFetch()
      const hostile = new Proxy(
        { perPage: 30 },
        {
          getOwnPropertyDescriptor(_target, prop) {
            if (prop === 'page') {
              return {
                enumerable: true,
                configurable: true,
                get() {
                  throw new Error('secret-getter')
                },
              }
            }
            return undefined
          },
          ownKeys() {
            return ['page', 'perPage']
          },
        },
      )
      const result = await capture(() =>
        listCategories(hostile as Parameters<typeof listCategories>[0]),
      )
      expectValidationNoFetch(result, fetchMock)
      expect(serialized(result.error)).not.toContain('secret-getter')
    })

    it('rejects a revoked listCategories input proxy before fetch', async () => {
      const fetchMock = installFetch()
      const { proxy, revoke } = Proxy.revocable({ page: 1, perPage: 30 }, {})
      revoke()
      const result = await capture(() =>
        listCategories(proxy as Parameters<typeof listCategories>[0]),
      )
      expectValidationNoFetch(result, fetchMock)
    })

    it('does not leak message accessor errors from a thrown plain object', async () => {
      const fetchMock = installFetch()
      const hostile = new Proxy(
        { page: 1, perPage: 30 },
        {
          ownKeys() {
            throw {
              get message() {
                throw new Error('secret-error-accessor')
              },
            }
          },
        },
      )
      const result = await capture(() =>
        listCategories(hostile as Parameters<typeof listCategories>[0]),
      )
      expectValidationNoFetch(result, fetchMock, {
        noLeak: 'secret-error-accessor',
      })
    })

    it('contains getCategory hostile ownKeys trap (secret-get-category)', async () => {
      const fetchMock = installFetch()
      const hostile = new Proxy(
        { categoryId: '4567' },
        {
          ownKeys() {
            throw new Error('secret-get-category')
          },
        },
      )
      const result = await capture(() => getCategory(hostile as Parameters<typeof getCategory>[0]))
      expectValidationNoFetch(result, fetchMock, {
        noLeak: 'secret-get-category',
      })
    })

    it('rejects an arbitrary url field on listCategories input before fetch', async () => {
      const fetchMock = installFetch()
      const result = await capture(() =>
        listCategories({
          page: 1,
          perPage: 30,
          url: 'https://evil.example/categories',
        } as Parameters<typeof listCategories>[0] & { url: string }),
      )
      expect(result.error).toBeInstanceOf(NuvemshopValidationError)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('required pagination fields', () => {
    it.each([
      ['page undefined', { page: undefined, perPage: 30 }],
      ['perPage undefined', { page: 1, perPage: undefined }],
      ['both undefined', { page: undefined, perPage: undefined }],
      ['missing page', { perPage: 30 }],
      ['missing perPage', { page: 1 }],
      ['page null', { page: null, perPage: 30 }],
      ['perPage null', { page: 1, perPage: null }],
      ['page zero', { page: 0, perPage: 30 }],
      ['perPage zero', { page: 1, perPage: 0 }],
      ['page negative', { page: -1, perPage: 30 }],
      ['perPage negative', { page: 1, perPage: -1 }],
      ['page fractional', { page: 1.5, perPage: 30 }],
      ['perPage fractional', { page: 1, perPage: 1.5 }],
      ['perPage above 200', { page: 1, perPage: 201 }],
      ['unsafe integer page', { page: Number.MAX_SAFE_INTEGER + 1, perPage: 30 }],
      ['unsafe integer perPage', { page: 1, perPage: Number.MAX_SAFE_INTEGER + 1 }],
    ] as const)('rejects %s before fetch', async (_label, input) => {
      const fetchMock = installFetch()
      const result = await capture(() =>
        listCategories(input as Parameters<typeof listCategories>[0]),
      )
      expect(result.error).toBeInstanceOf(NuvemshopValidationError)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('accepts canonical page and perPage with a single list fetch', async () => {
      const fetchMock = installFetch(async () => jsonResponse('[]'))
      const result = await capture(() => listCategories({ page: 1, perPage: 30 }))
      expect(result.error).toBeUndefined()
      expect(result.value?.perPage).toBe(30)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(requestUrl(fetchMock)).toBe(categoriesListUrl(1, 30))
    })

    it('allows omitting optional signal and correlationId', async () => {
      const fetchMock = installFetch(async () => jsonResponse('[]'))
      const result = await capture(() => listCategories({ page: 1, perPage: 20 }))
      expect(result.error).toBeUndefined()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(requestUrl(fetchMock)).toBe(categoriesListUrl(1, 20))
    })

    it('allows explicit undefined optional fields without requiring callers to pass them', async () => {
      const fetchMock = installFetch(async () => jsonResponse('[]'))
      const result = await capture(() =>
        listCategories({
          page: 1,
          perPage: 20,
          signal: undefined,
          correlationId: undefined,
        } as Parameters<typeof listCategories>[0]),
      )
      expect(result.error).toBeUndefined()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(requestUrl(fetchMock)).toBe(categoriesListUrl(1, 20))
    })
  })

  describe('page size vs received count', () => {
    it.each([
      [1, 0, 'success'] as const,
      [1, 1, 'success'] as const,
      [1, 2, 'protocol'] as const,
      [20, 0, 'success'] as const,
      [20, 7, 'success'] as const,
      [20, 20, 'success'] as const,
      [20, 21, 'protocol'] as const,
      [30, 31, 'protocol'] as const,
      [200, 200, 'success'] as const,
      [200, 201, 'protocol'] as const,
    ])('perPage=%i with %i received items is %s', async (perPage, received, outcome) => {
      const fetchMock = installFetch(async () => jsonResponse(categoryListBody(received)))
      const result = await capture(() => listCategories({ page: 1, perPage }))
      expect(fetchMock).toHaveBeenCalledTimes(1)
      if (outcome === 'success') {
        expect(result.error).toBeUndefined()
        expect(result.value?.perPage).toBe(perPage)
        expect(result.value?.items).toHaveLength(received)
      } else {
        expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
        expect(result.value).toBeUndefined()
        expectRedacted(result.error)
        expect(serialized(result.error)).not.toContain(CATEGORY_NAME_MARKER)
      }
    })

    it('projects next and previous on an intermediate page with a full page body', async () => {
      const link = `<${categoriesListUrl(3, 20)}>; rel="next", <${categoriesListUrl(1, 20)}>; rel="prev"`
      const fetchMock = installFetch(async () => jsonResponse(categoryListBody(20), 200, { link }))
      const result = await capture(() => listCategories({ page: 2, perPage: 20 }))
      expect(result.error).toBeUndefined()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.value).toMatchObject({
        page: 2,
        perPage: 20,
        nextPage: 3,
        previousPage: 1,
      })
      expect(result.value?.items).toHaveLength(20)
    })

    it('keeps nextPage on an empty intermediate page when Link declares next', async () => {
      const fetchMock = installFetch(async () =>
        jsonResponse('[]', 200, { link: `<${categoriesListUrl(3, 20)}>; rel="next"` }),
      )
      const result = await capture(() => listCategories({ page: 2, perPage: 20 }))
      expect(result.error).toBeUndefined()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.value?.items).toHaveLength(0)
      expect(result.value?.nextPage).toBe(3)
    })

    it('uses x-total-count when present alongside a short page body', async () => {
      const fetchMock = installFetch(async () =>
        jsonResponse(categoryListBody(7), 200, { 'x-total-count': '40' }),
      )
      const result = await capture(() => listCategories({ page: 1, perPage: 20 }))
      expect(result.error).toBeUndefined()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.value?.totalCount).toBe(40)
      expect(result.value?.items).toHaveLength(7)
    })

    it('omits totalCount when x-total-count is absent', async () => {
      const fetchMock = installFetch(async () => jsonResponse(categoryListBody(7)))
      const result = await capture(() => listCategories({ page: 1, perPage: 20 }))
      expect(result.error).toBeUndefined()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.value).not.toHaveProperty('totalCount')
      expect(result.value?.items).toHaveLength(7)
    })

    it('treats oversized body vs requested perPage as protocol error even with x-total-count', async () => {
      const fetchMock = installFetch(async () =>
        jsonResponse(categoryListBody(21), 200, { 'x-total-count': '21' }),
      )
      const result = await capture(() => listCategories({ page: 1, perPage: 20 }))
      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(result.value).toBeUndefined()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expectRedacted(result.error)
    })
  })
})
