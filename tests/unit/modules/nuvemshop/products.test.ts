/**
 * NUV-08 RED: server-only Product/Variant reads (listProducts, getProduct, getVariant).
 * Integration style — only fetch is mocked; transport, pagination and schemas are real.
 *
 * Fixtures are synthetic, derived from documented Nuvemshop field names (see fixtures/schemas.ts);
 * no live store was queried.
 *
 * Harness notes against the integrated NUV-04/05/06 contracts:
 * - each test reloads the server module so the process-local rate budget starts cold;
 * - a page-1 response cannot carry rel="prev" (NUV-06);
 * - GET 5xx and attempt timeouts use the existing two-attempt budget (NUV-05);
 * - abort before admission performs no fetch;
 * - a standalone variant rejects malformed values and does not invent attribute cardinality.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  NUVEMSHOP_API_ORIGIN,
  NUVEMSHOP_API_VERSION,
  NUVEMSHOP_ATTEMPT_TIMEOUT_MS,
  NUVEMSHOP_USER_AGENT,
} from '@/modules/nuvemshop/server/client'
import type { Product, Variant } from '@/modules/nuvemshop/server'

import {
  ABOVE_INT32_ID,
  ABOVE_INT64_ID,
  CREATED_AT,
  HUGE_ID,
  OFFSET_CREATED_AT,
  UPDATED_AT,
  productRaw,
} from './fixtures/schemas'

const STORE_ID = '123456789012345678901234567890'
const TOKEN = 'synthetic-access-token'
const SENTINEL = '__nuvemshop_nuv08_sentinel'
const IMAGE_SRC = 'https://cdn.example.test/synthetic/peca.jpg'
const SECRET_MARKERS = [TOKEN, 'Bearer', 'Authorization']

const OFFICIAL_PRODUCTS = `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/${STORE_ID}/products`
const MAX_BODY_BYTES = 1_048_576

let listProducts: (input: { page: number; perPage: number; signal?: AbortSignal }) => Promise<{
  items: Product[]
  page: number
  perPage: number
  totalCount?: number
  nextPage?: number
  previousPage?: number
}>
let getProduct: (input: { productId: string }) => Promise<Product>
let getVariant: (input: { productId: string; variantId: string }) => Promise<Variant>
let NuvemshopAuthenticationError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopAuthenticationError
let NuvemshopAuthorizationError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopAuthorizationError
let NuvemshopNetworkError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopNetworkError
let NuvemshopNotFoundError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopNotFoundError
let NuvemshopProtocolError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopProtocolError
let NuvemshopProviderError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopProviderError
let NuvemshopRateLimitError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopRateLimitError
let NuvemshopValidationError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopValidationError

function productsListUrl(page = 1, perPage = 30): string {
  return `${OFFICIAL_PRODUCTS}?page=${page}&per_page=${perPage}`
}

function productDetailUrl(productId: string): string {
  return `${OFFICIAL_PRODUCTS}/${productId}`
}

function variantDetailUrl(productId: string, variantId: string): string {
  return `${OFFICIAL_PRODUCTS}/${productId}/variants/${variantId}`
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

function productApiObject(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...(JSON.parse(productRaw()) as Record<string, unknown>),
    ...overrides,
    [SENTINEL]: true,
  }
}

function variantApiObject(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const product = JSON.parse(productRaw()) as { variants: Record<string, unknown>[] }
  const base = product.variants[0] ?? {}
  return { ...base, ...overrides }
}

function jsonResponse(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8', ...headers },
  })
}

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] })
  vi.spyOn(Math, 'random').mockReturnValue(0)
  stubConfig()
  const server = await import('@/modules/nuvemshop/server')
  const errors = await import('@/modules/nuvemshop/server/errors')
  listProducts = server.listProducts
  getProduct = server.getProduct
  getVariant = server.getVariant
  NuvemshopAuthenticationError = errors.NuvemshopAuthenticationError
  NuvemshopAuthorizationError = errors.NuvemshopAuthorizationError
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

describe('NUV-08 listProducts', () => {
  it('accepts an empty list', async () => {
    const fetchMock = installFetch(async () => jsonResponse('[]'))
    const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(result.error).toBeUndefined()
    expect(result.value).toEqual({ items: [], page: 1, perPage: 30 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestUrl(fetchMock)).toBe(productsListUrl(1, 30))
    expect(requestInit(fetchMock).method ?? 'GET').toBe('GET')
  })

  it('returns multiple parsed products on one page', async () => {
    const items = [productApiObject({ id: 1 }), productApiObject({ id: 2, name: { pt: 'B' } })]
    installFetch(async () => jsonResponse(JSON.stringify(items)))
    const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(result.error).toBeUndefined()
    expect(result.value?.items).toHaveLength(2)
    expect(result.value?.items[0]?.id).toBe('1')
    expect(result.value?.items[1]?.name).toEqual({ pt: 'B' })
  })

  it('requests page 1 with canonical pagination query params', async () => {
    const fetchMock = installFetch(async () => jsonResponse(`[${productRaw()}]`))
    await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(requestUrl(fetchMock)).toBe(productsListUrl(1, 30))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('requests a middle page exactly', async () => {
    const fetchMock = installFetch(async () => jsonResponse('[]'))
    await capture(() => listProducts({ page: 2, perPage: 30 }))
    expect(requestUrl(fetchMock)).toBe(productsListUrl(2, 30))
  })

  it('projects next and previous pages from a valid Link header', async () => {
    const link = `<${productsListUrl(3)}>; rel="next", <${productsListUrl(1)}>; rel="prev"`
    installFetch(async () => jsonResponse('[]', 200, { link }))
    const result = await capture(() => listProducts({ page: 2, perPage: 30 }))
    expect(result.value).toMatchObject({ page: 2, perPage: 30, nextPage: 3, previousPage: 1 })
  })

  it('includes totalCount when x-total-count is present', async () => {
    installFetch(async () => jsonResponse('[]', 200, { 'x-total-count': '42' }))
    const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(result.value?.totalCount).toBe(42)
  })

  it('omits totalCount when the header is absent', async () => {
    installFetch(async () => jsonResponse('[]'))
    const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(result.value).not.toHaveProperty('totalCount')
  })

  it('keeps nextPage on an empty page when Link declares a next page', async () => {
    installFetch(async () =>
      jsonResponse('[]', 200, { link: `<${productsListUrl(3)}>; rel="next"` }),
    )
    const result = await capture(() => listProducts({ page: 2, perPage: 30 }))
    expect(result.value?.items).toEqual([])
    expect(result.value?.nextPage).toBe(3)
  })

  it.each([
    ['external host', `https://evil.example/${STORE_ID}/products?page=2&per_page=30`],
    [
      'store id swapped',
      `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/999/products?page=2&per_page=30`,
    ],
    [
      'api version swapped',
      `${NUVEMSHOP_API_ORIGIN}/2026-03/${STORE_ID}/products?page=2&per_page=30`,
    ],
    [
      'resource swapped',
      `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/${STORE_ID}/orders?page=2&per_page=30`,
    ],
    ['extra query param', `${productsListUrl(2, 30)}&q=synthetic`],
  ])(
    'treats malicious Link (%s) as a protocol error without a second fetch',
    async (_label, malicious) => {
      const fetchMock = installFetch(async () =>
        jsonResponse('[]', 200, { link: `<${malicious}>; rel="next"` }),
      )
      const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expectRedacted(result.error)
    },
  )

  it.each([
    [0, 30],
    [-1, 30],
    [1.5, 30],
    [Number.MAX_SAFE_INTEGER + 1, 30],
  ])('rejects page=%s perPage=%s before fetch', async (page, perPage) => {
    const fetchMock = installFetch()
    const result = await capture(() => listProducts({ page, perPage }))
    expect(result.error).toBeInstanceOf(NuvemshopValidationError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects perPage above 200 before fetch', async () => {
    const fetchMock = installFetch()
    const result = await capture(() => listProducts({ page: 1, perPage: 201 }))
    expect(result.error).toBeInstanceOf(NuvemshopValidationError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON as a protocol error', async () => {
    const fetchMock = installFetch(async () => jsonResponse('['))
    const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fails the whole page when one item is invalid', async () => {
    const valid = productApiObject()
    const invalid = productApiObject({ visibility: undefined })
    installFetch(async () => jsonResponse(JSON.stringify([valid, invalid])))
    const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('preserves large numeric ids across list items and nested variants', async () => {
    const raw = withUnquotedId(productRaw(), 'id', HUGE_ID)
      .replace('"variants":[{"id":101', `"variants":[{"id":${ABOVE_INT64_ID}`)
      .replace('"product_id":1234', `"product_id":${ABOVE_INT32_ID}`)
      .replace('"images":[{"id":101', `"images":[{"id":${HUGE_ID}`)
      .replace('"categories":[{"id":4567', `"categories":[{"id":${ABOVE_INT64_ID}`)
    installFetch(async () => jsonResponse(`[${raw}]`))
    const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(result.error).toBeUndefined()
    const item = result.value?.items[0]
    expect(item?.id).toBe(HUGE_ID)
    expect(item?.variants[0]?.id).toBe(ABOVE_INT64_ID)
    expect(item?.variants[0]?.productId).toBe(ABOVE_INT32_ID)
    expect(item?.images[0]?.id).toBe(HUGE_ID)
    expect(item?.categoryIds).toEqual([ABOVE_INT64_ID])
  })

  it('sends Authorization and never echoes it in errors', async () => {
    const fetchMock = installFetch(async () => jsonResponse('[]', 401))
    const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(headerRecord(requestInit(fetchMock)).Authorization).toBe(`Bearer ${TOKEN}`)
    expect(result.error).toBeInstanceOf(NuvemshopAuthenticationError)
    expectRedacted(result.error)
  })

  it('does not perform extra fetch calls beyond the list request', async () => {
    const fetchMock = installFetch(async () => jsonResponse(`[${productRaw()}]`))
    await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).not.toBe(IMAGE_SRC)
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
    const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
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
    const pending = listProducts({ page: 1, perPage: 30, signal: controller.signal })
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
    const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(NuvemshopNetworkError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(NUVEMSHOP_ATTEMPT_TIMEOUT_MS).toBe(4_000)
  })

  it.each([
    ['parent traversal', '../orders'],
    ['encoded slash', 'products%2Fvariants'],
    ['whitespace', ' 1234'],
    ['negative', '-1'],
    ['unsafe number', Number.MAX_SAFE_INTEGER + 2],
    ['non-decimal', '1.5'],
  ])('rejects productId %s before fetch on getProduct', async (_label, productId) => {
    const fetchMock = installFetch()
    const result = await capture(() => getProduct({ productId: productId as unknown as string }))
    expect(result.error).toBeInstanceOf(NuvemshopValidationError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an arbitrary url field on listProducts input before fetch', async () => {
    const fetchMock = installFetch()
    const result = await capture(() =>
      listProducts({
        page: 1,
        perPage: 30,
        url: 'https://evil.example/products',
      } as Parameters<typeof listProducts>[0] & { url: string }),
    )
    expect(result.error).toBeInstanceOf(NuvemshopValidationError)
    expect(fetchMock).not.toHaveBeenCalled()
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
    const result = await capture(() => listProducts({ page: 1, perPage: 30 }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })
})

describe('NUV-08 getProduct', () => {
  it('preserves exact product id above MAX_SAFE_INTEGER', async () => {
    const raw = withUnquotedId(productRaw(), 'id', HUGE_ID)
    const fetchMock = installFetch(async () => jsonResponse(raw))
    const result = await capture(() => getProduct({ productId: HUGE_ID }))
    expect(result.error).toBeUndefined()
    expect(result.value?.id).toBe(HUGE_ID)
    expect(requestUrl(fetchMock)).toBe(productDetailUrl(HUGE_ID))
  })

  it('rejects a product payload with a missing id', async () => {
    const raw = JSON.parse(productRaw()) as Record<string, unknown>
    delete raw.id
    installFetch(async () => jsonResponse(JSON.stringify(raw)))
    const result = await capture(() => getProduct({ productId: '1234' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('rejects a product whose id differs from the requested id', async () => {
    installFetch(async () => jsonResponse(productRaw({ id: 9999 })))
    const result = await capture(() => getProduct({ productId: '1234' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('rejects an invalid product id in the payload', async () => {
    installFetch(async () => jsonResponse(productRaw({ id: -1 })))
    const result = await capture(() => getProduct({ productId: '1234' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('keeps localized name and nullable handle', async () => {
    installFetch(async () => jsonResponse(productRaw({ handle: null })))
    const result = await capture(() => getProduct({ productId: '1234' }))
    expect(result.value?.name).toEqual({ pt: 'Peça sintética' })
    expect(result.value?.handle).toBeNull()
  })

  it('preserves description when present and null when legitimately absent', async () => {
    installFetch(async () => jsonResponse(productRaw()))
    const withDescription = await capture(() => getProduct({ productId: '1234' }))
    expect(withDescription.value?.description).toEqual({ pt: '<p>Descrição sintética</p>' })

    const raw = JSON.parse(productRaw()) as { description?: unknown }
    delete raw.description
    installFetch(async () => jsonResponse(JSON.stringify(raw)))
    const absent = await capture(() => getProduct({ productId: '1234' }))
    expect(absent.value?.description).toBeNull()
  })

  it('preserves images, categories, attributes, tags and timestamps', async () => {
    installFetch(async () => jsonResponse(productRaw()))
    const result = await capture(() => getProduct({ productId: '1234' }))
    const product = result.value as Product
    expect(product.images).toEqual([{ id: '101', src: IMAGE_SRC }])
    expect(product.categoryIds).toEqual(['4567'])
    expect(product.attributes).toEqual([{ pt: 'Cor' }, { pt: 'Tamanho' }])
    expect(product.tags).toEqual(['tema', 'cor', 'tamanho'])
    expect(product.createdAt.raw).toBe(CREATED_AT)
    expect(product.updatedAt.offset).toBe('+0000')
    expect(product.variants).toHaveLength(1)
  })

  it('does not copy unknown provider fields onto the public product', async () => {
    installFetch(async () => jsonResponse(JSON.stringify(productApiObject())))
    const result = await capture(() => getProduct({ productId: '1234' }))
    expect(result.value).not.toHaveProperty(SENTINEL)
    expect(result.value).not.toHaveProperty('seo_title')
    expect(JSON.stringify(result.value)).not.toContain(SENTINEL)
  })

  it.each([
    ['visible', 'visible'],
    ['unlisted', 'unlisted'],
    ['hidden', 'hidden'],
  ] as const)('keeps visibility %s distinct', async (visibility, expected) => {
    installFetch(async () =>
      jsonResponse(productRaw({ visibility, published: visibility === 'visible' })),
    )
    const result = await capture(() => getProduct({ productId: '1234' }))
    expect(result.value?.visibility).toBe(expected)
  })

  it('rejects missing visibility', async () => {
    installFetch(async () => jsonResponse(productRaw({ visibility: undefined })))
    const result = await capture(() => getProduct({ productId: '1234' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('rejects unknown and malformed visibility values', async () => {
    for (const visibility of [true, 'published', 'soft-hidden']) {
      installFetch(async () => jsonResponse(productRaw({ visibility })))
      const result = await capture(() => getProduct({ productId: '1234' }))
      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
    }
  })

  it('follows parseProduct published/visibility conflict policy', async () => {
    installFetch(async () => jsonResponse(productRaw({ visibility: 'hidden', published: true })))
    const result = await capture(() => getProduct({ productId: '1234' }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
    installFetch(async () => jsonResponse(productRaw({ visibility: 'unlisted', published: false })))
    const ok = await capture(() => getProduct({ productId: '1234' }))
    expect(ok.value?.visibility).toBe('unlisted')
  })

  it('does not fetch product image URLs as egress targets', async () => {
    const fetchMock = installFetch(async () => jsonResponse(productRaw()))
    await capture(() => getProduct({ productId: '1234' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(productDetailUrl('1234'))
    expect(fetchMock.mock.calls.some((call) => String(call[0]) === IMAGE_SRC)).toBe(false)
  })

  it('uses GET with exact path ids and standard headers', async () => {
    const fetchMock = installFetch(async () => jsonResponse(productRaw()))
    await capture(() => getProduct({ productId: '1234' }))
    expect(requestInit(fetchMock).method ?? 'GET').toBe('GET')
    expect(headerRecord(requestInit(fetchMock))).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
      'User-Agent': NUVEMSHOP_USER_AGENT,
      Accept: 'application/json',
    })
  })
})

describe('NUV-08 getVariant', () => {
  const PRODUCT_ID = '1234'
  const VARIANT_ID = '101'

  it('returns a parsed variant with exact ids and aligned localized values', async () => {
    installFetch(async () => jsonResponse(JSON.stringify(variantApiObject())))
    const result = await capture(() => getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }))
    expect(result.error).toBeUndefined()
    const variant = result.value as Variant
    expect(variant.id).toBe(VARIANT_ID)
    expect(variant.productId).toBe(PRODUCT_ID)
    expect(variant.values).toEqual([{ pt: 'Azul' }, { pt: 'M' }])
    expect(variant.createdAt.raw).toBe(CREATED_AT)
    expect(variant.updatedAt.raw).toBe(UPDATED_AT)
  })

  it('requests the nested variant route with exact ids', async () => {
    const fetchMock = installFetch(async () => jsonResponse(JSON.stringify(variantApiObject())))
    await capture(() => getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }))
    expect(requestUrl(fetchMock)).toBe(variantDetailUrl(PRODUCT_ID, VARIANT_ID))
  })

  it('rejects an invalid variant payload', async () => {
    installFetch(async () => jsonResponse(JSON.stringify(variantApiObject({ values: 'Azul' }))))
    const result = await capture(() => getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('accepts legitimately absent optional provider-only fields', async () => {
    const body = variantApiObject()
    delete (body as Record<string, unknown>).stock
    delete (body as Record<string, unknown>).stock_management
    delete (body as Record<string, unknown>).inventory_levels
    installFetch(async () => jsonResponse(JSON.stringify(body)))
    const result = await capture(() => getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }))
    expect(result.error).toBeUndefined()
    expect(result.value).not.toHaveProperty('stock')
  })

  it('rejects a response whose variant id differs from the request', async () => {
    installFetch(async () => jsonResponse(JSON.stringify(variantApiObject({ id: 999 }))))
    const result = await capture(() => getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  it('rejects a response whose product_id differs from the request', async () => {
    installFetch(async () => jsonResponse(JSON.stringify(variantApiObject({ product_id: 9999 }))))
    const result = await capture(() => getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }))
    expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
  })

  describe('price semantics (readMoney / effective)', () => {
    it('uses regular when promotional is null', async () => {
      installFetch(async () =>
        jsonResponse(JSON.stringify(variantApiObject({ price: '25.00', promotional_price: null }))),
      )
      const result = await capture(() =>
        getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }),
      )
      expect(result.value?.regular).toBe('25.00')
      expect(result.value?.promotional).toBeNull()
      expect(result.value?.effective).toBe('25.00')
    })

    it('uses promotional when both regular and promotional are valid', async () => {
      installFetch(async () =>
        jsonResponse(
          JSON.stringify(variantApiObject({ price: '25.00', promotional_price: '19.00' })),
        ),
      )
      const result = await capture(() =>
        getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }),
      )
      expect(result.value?.effective).toBe('19.00')
    })

    it('uses regular when promotional_price is absent', async () => {
      const body = variantApiObject({ price: '25.00' })
      delete (body as Record<string, unknown>).promotional_price
      installFetch(async () => jsonResponse(JSON.stringify(body)))
      const result = await capture(() =>
        getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }),
      )
      expect(result.value?.promotional).toBeNull()
      expect(result.value?.effective).toBe('25.00')
    })

    it('keeps the variant valid with both prices null and effective absent', async () => {
      installFetch(async () =>
        jsonResponse(JSON.stringify(variantApiObject({ price: null, promotional_price: null }))),
      )
      const result = await capture(() =>
        getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }),
      )
      expect(result.error).toBeUndefined()
      expect(result.value?.regular).toBeNull()
      expect(result.value?.promotional).toBeNull()
      expect(result.value?.effective).toBeNull()
    })

    it('does not invent a sellable effective price when regular is null', async () => {
      installFetch(async () =>
        jsonResponse(JSON.stringify(variantApiObject({ price: null, promotional_price: '19.00' }))),
      )
      const result = await capture(() =>
        getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }),
      )
      expect(result.value?.effective).toBeNull()
    })

    it('rejects malformed regular and malformed promotional prices', async () => {
      for (const price of ['10,00', 19.9]) {
        installFetch(async () =>
          jsonResponse(JSON.stringify(variantApiObject({ price, promotional_price: null }))),
        )
        const badRegular = await capture(() =>
          getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }),
        )
        expect(badRegular.error).toBeInstanceOf(NuvemshopProtocolError)
      }
      installFetch(async () =>
        jsonResponse(
          JSON.stringify(variantApiObject({ price: '25.00', promotional_price: 'bad' })),
        ),
      )
      const badPromo = await capture(() =>
        getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }),
      )
      expect(badPromo.error).toBeInstanceOf(NuvemshopProtocolError)
    })

    it('keeps money as decimal strings, never numbers', async () => {
      installFetch(async () =>
        jsonResponse(
          JSON.stringify(variantApiObject({ price: '25.00', promotional_price: '19.00' })),
        ),
      )
      const result = await capture(() =>
        getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }),
      )
      expect(typeof result.value?.regular).toBe('string')
      expect(typeof result.value?.promotional).toBe('string')
      expect(typeof result.value?.effective).toBe('string')
      expect(JSON.stringify(result.value)).not.toMatch(/"effective":\d/)
    })
  })

  it('preserves created_at with a non-zero offset when provided', async () => {
    installFetch(async () =>
      jsonResponse(
        JSON.stringify(
          variantApiObject({
            created_at: OFFSET_CREATED_AT,
            updated_at: OFFSET_CREATED_AT,
          }),
        ),
      ),
    )
    const result = await capture(() => getVariant({ productId: PRODUCT_ID, variantId: VARIANT_ID }))
    expect(result.value?.createdAt.offset).toBe('-03:00')
    expect(result.value?.createdAt.instant).toBe('2013-01-03T12:11:51.000Z')
  })

  it('rejects path injection in variantId before fetch', async () => {
    const fetchMock = installFetch()
    const result = await capture(() =>
      getVariant({ productId: PRODUCT_ID, variantId: '../secrets' }),
    )
    expect(result.error).toBeInstanceOf(NuvemshopValidationError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
