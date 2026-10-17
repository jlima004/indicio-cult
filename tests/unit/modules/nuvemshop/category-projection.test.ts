/**
 * NUV-09 Category minimum projection regression tests.
 *
 * These tests exercise the real transport, metadata parser, and listCategories
 * path. Only fetch and synthetic process environment are substituted.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NuvemshopRequestInput } from '@/modules/nuvemshop/server/client'

import { HUGE_ID, categoryRaw } from './fixtures/schemas'

const STORE_ID = '123456789012345678901234567890'
const TOKEN = 'synthetic-category-projection-token'
const ORIGIN = 'https://api.nuvemshop.com.br'
const VERSION = '2025-03'
const FIELDS = 'id,name,handle,parent,visibility'
const PROJECTION = 'category-minimum-v1'
const MAX_BODY_BYTES = 1_048_576
const CATEGORIES = `${ORIGIN}/${VERSION}/${STORE_ID}/categories`
const EXPECTED_FILTER = `fields=${FIELDS}`

let listCategories: typeof import('@/modules/nuvemshop/server/categories').listCategories
let nuvemshopRequest: typeof import('@/modules/nuvemshop/server/client').nuvemshopRequest
let prepareNuvemshopAttempt: typeof import('@/modules/nuvemshop/server/request').prepareNuvemshopAttempt
let performNuvemshopAttempt: typeof import('@/modules/nuvemshop/server/request').performNuvemshopAttempt
let parseNuvemshopPageNavigation: typeof import('@/modules/nuvemshop/server/pagination').parseNuvemshopPageNavigation
let NuvemshopProtocolError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopProtocolError
let NuvemshopValidationError: typeof import('@/modules/nuvemshop/server/errors').NuvemshopValidationError

function categoryUrl(page = 1, perPage = 30, fields = EXPECTED_FILTER): string {
  return `${CATEGORIES}?page=${page}&per_page=${perPage}&${fields}`
}

function categoryUrlWithoutPagination(fields = EXPECTED_FILTER): string {
  return `${CATEGORIES}?${fields}`
}

function linkUrl(
  page: number,
  perPage = 30,
  fields = EXPECTED_FILTER,
  order: 'page-first' | 'fields-first' = 'page-first',
): string {
  return order === 'page-first'
    ? `${CATEGORIES}?page=${page}&per_page=${perPage}&${fields}`
    : `${CATEGORIES}?${fields}&per_page=${perPage}&page=${page}`
}

function jsonResponse(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8', ...headers },
  })
}

function installFetch(impl: typeof fetch = async () => jsonResponse('[]')) {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestUrl(fetchMock: ReturnType<typeof vi.fn>, index = 0): string {
  const [input] = fetchMock.mock.calls[index] ?? []
  return typeof input === 'string' ? input : input instanceof URL ? input.toString() : ''
}

function stubConfig() {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NUVEMSHOP_STORE_ID', STORE_ID)
  vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', TOKEN)
  vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', 'synthetic-client-secret')
  vi.stubEnv('NUVEMSHOP_APP_ID', 'synthetic-app-id')
  vi.stubEnv('NUVEMSHOP_API_VERSION', '1999-01')
}

async function settle<T>(run: () => Promise<T>): Promise<{ value?: T; error?: unknown }> {
  const pending: Promise<{ value?: T; error?: unknown }> = Promise.resolve()
    .then(run)
    .then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    )
  await vi.advanceTimersByTimeAsync(9_000)
  return pending
}

function expectProtocolFailure(error: unknown) {
  expect(error).toBeInstanceOf(NuvemshopProtocolError)
  expect((error as Error).message).toBe('Nuvemshop response is incompatible.')
}

function plainObject(value: unknown): Record<string, unknown> {
  expect(value).not.toBeNull()
  expect(typeof value).toBe('object')
  return value as Record<string, unknown>
}

beforeEach(async () => {
  vi.resetModules()
  vi.doMock('server-only', () => ({}))
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] })
  vi.spyOn(Math, 'random').mockReturnValue(0)
  stubConfig()

  const server = await import('@/modules/nuvemshop/server')
  const categories = await import('@/modules/nuvemshop/server/categories')
  const client = await import('@/modules/nuvemshop/server/client')
  const request = await import('@/modules/nuvemshop/server/request')
  const pagination = await import('@/modules/nuvemshop/server/pagination')
  const errors = await import('@/modules/nuvemshop/server/errors')
  listCategories = categories.listCategories
  nuvemshopRequest = client.nuvemshopRequest
  prepareNuvemshopAttempt = request.prepareNuvemshopAttempt
  performNuvemshopAttempt = request.performNuvemshopAttempt
  parseNuvemshopPageNavigation = pagination.parseNuvemshopPageNavigation
  NuvemshopProtocolError = errors.NuvemshopProtocolError
  NuvemshopValidationError = errors.NuvemshopValidationError
  expect(server.listCategories).toBe(listCategories)
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

describe('closed Category collection projection', () => {
  it('dispatches a paginated GET with the fixed literal-comma projection', async () => {
    const fetchMock = installFetch(async () => jsonResponse('{}'))
    const prepared = prepareNuvemshopAttempt({
      method: 'GET',
      segments: ['categories'],
      query: { page: 7, perPage: 25 },
    })

    const result = await performNuvemshopAttempt(prepared, {
      storeId: STORE_ID,
      accessToken: TOKEN,
    })

    expect(requestUrl(fetchMock)).toBe(categoryUrl(7, 25))
    expect(result.metadata.request.projection).toBe(PROJECTION)
    expect(result.metadata.request.pagination).toEqual({ page: 7, perPage: 25 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('projects a Category collection GET with no caller pagination query', async () => {
    const fetchMock = installFetch(async () => jsonResponse('{}'))
    const prepared = prepareNuvemshopAttempt({ method: 'GET', segments: ['categories'] })
    const result = await performNuvemshopAttempt(prepared, {
      storeId: STORE_ID,
      accessToken: TOKEN,
    })

    expect(requestUrl(fetchMock)).toBe(categoryUrlWithoutPagination())
    expect(result.metadata.request.projection).toBe(PROJECTION)
    expect(result.metadata.request.pagination).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['Category detail GET', 'GET', ['categories', '4567']],
    ['other collection GET', 'GET', ['products']],
    ['Category collection HEAD', 'HEAD', ['categories']],
  ] as const)('does not project %s', async (_label, method, segments) => {
    const fetchMock = installFetch(async () =>
      method === 'HEAD'
        ? new Response(null, {
            status: 200,
            headers: { 'content-type': 'application/json; charset=UTF-8' },
          })
        : jsonResponse('{}'),
    )
    const result = await performNuvemshopAttempt(prepareNuvemshopAttempt({ method, segments }), {
      storeId: STORE_ID,
      accessToken: TOKEN,
    })

    expect(requestUrl(fetchMock)).toBe(`${ORIGIN}/${VERSION}/${STORE_ID}/${segments.join('/')}`)
    expect(Object.hasOwn(result.metadata.request, 'projection')).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a caller-supplied fields mode before any fetch', async () => {
    const fetchMock = installFetch()
    let failure: unknown
    try {
      prepareNuvemshopAttempt({
        method: 'GET',
        segments: ['categories'],
        query: {
          page: 1,
          perPage: 30,
          fields: 'id,name',
        } as unknown as NuvemshopRequestInput['query'],
      })
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(NuvemshopValidationError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects fields before configuration even when configuration is missing', async () => {
    const fetchMock = installFetch()
    vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', undefined)
    const result = await settle(() =>
      nuvemshopRequest({
        method: 'GET',
        segments: ['categories'],
        query: { page: 1, perPage: 30, fields: FIELDS } as NuvemshopRequestInput['query'],
      }),
    )
    expect(result.error).toBeInstanceOf(NuvemshopValidationError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['categories', 'product', true],
    ['products', 'category', false],
  ] as const)(
    'derives projection from route %s despite resourceKind %s',
    async (route, resourceKind, projected) => {
      const fetchMock = installFetch(async () => jsonResponse('{}'))
      const result = await performNuvemshopAttempt(
        prepareNuvemshopAttempt({ method: 'GET', segments: [route], resourceKind, query: {} }),
        { storeId: STORE_ID, accessToken: TOKEN },
      )
      expect(new URL(requestUrl(fetchMock)).searchParams.get('fields')).toBe(
        projected ? FIELDS : null,
      )
      expect(Object.hasOwn(result.metadata.request, 'projection')).toBe(projected)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    },
  )

  it('coalesces identical projected reads without an unfiltered mode', async () => {
    const fetchMock = installFetch()
    const input = {
      method: 'GET',
      segments: ['categories'],
      query: { page: 1, perPage: 30 },
    } as const
    const result = await settle(() =>
      Promise.all([nuvemshopRequest(input), nuvemshopRequest(input)]),
    )
    expect(result.error).toBeUndefined()
    expect(result.value?.map((response) => response.metadata.request.projection)).toEqual([
      PROJECTION,
      PROJECTION,
    ])
    expect(requestUrl(fetchMock)).toBe(categoryUrl())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reconstructs a projected next page from numeric navigation on an explicit list request', async () => {
    const next = linkUrl(2)
    const fetchMock = installFetch(async (input) =>
      String(input) === categoryUrl(1, 30)
        ? jsonResponse('[]', 200, { link: `<${next}>; rel="next"` })
        : jsonResponse(`[${categoryRaw({ id: 2 })}]`),
    )

    const first = await settle(() =>
      nuvemshopRequest({
        method: 'GET',
        segments: ['categories'],
        operation: 'read',
        resourceKind: 'category',
        query: { page: 1, perPage: 30 },
      }),
    )
    expect(first.error).toBeUndefined()
    expect(first.value?.metadata.request.projection).toBe(PROJECTION)
    expect(parseNuvemshopPageNavigation(first.value!.metadata)).toMatchObject({
      page: 1,
      perPage: 30,
      nextPage: 2,
    })

    const second = await settle(() => listCategories({ page: 2, perPage: 30 }))

    expect(second.error).toBeUndefined()
    expect(second.value?.items[0]?.id).toBe('2')
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      categoryUrl(1, 30),
      categoryUrl(2, 30),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('projected Category Link identity', () => {
  it.each([
    ['literal commas and multiple relations', FIELDS, 'page-first'],
    [
      'uppercase encoded commas and reordered query keys',
      FIELDS.replaceAll(',', '%2C'),
      'fields-first',
    ],
  ] as const)(
    'accepts %s without splitting field commas into Link entries',
    async (_label, fields, order) => {
      const next = linkUrl(3, 30, `fields=${fields}`, order)
      const previous = linkUrl(1, 30, `fields=${fields}`, order)
      const fetchMock = installFetch(async () =>
        jsonResponse('[]', 200, {
          link: `<${next}>; rel="next", <${previous}>; rel="prev"`,
        }),
      )

      const result = await settle(() => listCategories({ page: 2, perPage: 30 }))

      expect(result.error).toBeUndefined()
      expect(result.value).toMatchObject({ page: 2, perPage: 30, nextPage: 3, previousPage: 1 })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    },
  )

  it.each([
    ['missing fields projection', `page=2&per_page=30`],
    ['missing handle', `page=2&per_page=30&fields=id,name,parent,visibility`],
    ['changed field', `page=2&per_page=30&fields=id,name,description,parent,visibility`],
    ['reordered fields', `page=2&per_page=30&fields=name,id,handle,parent,visibility`],
    ['extra field', `page=2&per_page=30&fields=id,name,handle,parent,visibility,description`],
    ['duplicate field', `page=2&per_page=30&fields=id,name,handle,handle,parent,visibility`],
    ['duplicate fields query key', `page=2&per_page=30&fields=${FIELDS}&fields=${FIELDS}`],
    ['duplicate page key', `page=2&per_page=30&fields=${FIELDS}&page=2`],
    ['unknown query key', `page=2&per_page=30&fields=${FIELDS}&q=synthetic`],
    ['lowercase encoded comma', `page=2&per_page=30&fields=${FIELDS.replaceAll(',', '%2c')}`],
    [
      'mixed raw and encoded commas',
      `page=2&per_page=30&fields=id%2Cname,handle,parent,visibility`,
    ],
    ['double encoded comma', `page=2&per_page=30&fields=${FIELDS.replaceAll(',', '%252C')}`],
    ['encoded required field', `page=2&per_page=30&fields=%69d,name,handle,parent,visibility`],
    ['encoded field name', `page=2&per_page=30&%66ields=${FIELDS}`],
    ['encoded page name', `%70age=2&per_page=30&fields=${FIELDS}`],
    ['encoded page value', `page=%32&per_page=30&fields=${FIELDS}`],
    ['encoded size value', `page=2&per_page=%33%30&fields=${FIELDS}`],
    [
      'encoded route',
      `${ORIGIN}/${VERSION}/${STORE_ID}/%63ategories?page=2&per_page=30&${EXPECTED_FILTER}`,
    ],
    ['fragment', `page=2&per_page=30&fields=${FIELDS}#fragment`],
    [
      'foreign host',
      `https://evil.example/${VERSION}/${STORE_ID}/categories?page=2&per_page=30&${EXPECTED_FILTER}`,
    ],
    ['foreign store', `${ORIGIN}/${VERSION}/999/categories?page=2&per_page=30&${EXPECTED_FILTER}`],
    [
      'foreign API version',
      `${ORIGIN}/2026-03/${STORE_ID}/categories?page=2&per_page=30&${EXPECTED_FILTER}`,
    ],
    [
      'foreign route',
      `${ORIGIN}/${VERSION}/${STORE_ID}/orders?page=2&per_page=30&${EXPECTED_FILTER}`,
    ],
    ['changed page size', `page=2&per_page=31&${EXPECTED_FILTER}`],
    ['noncanonical page integer', `page=02&per_page=30&${EXPECTED_FILTER}`],
    ['nonconsecutive next', `page=3&per_page=30&${EXPECTED_FILTER}`],
  ])(
    'rejects a projected Category Link with %s and does not fetch again',
    async (_label, queryOrUrl) => {
      const target = queryOrUrl.startsWith('https://') ? queryOrUrl : `${CATEGORIES}?${queryOrUrl}`
      const fetchMock = installFetch(async () =>
        jsonResponse('[]', 200, { link: `<${target}>; rel="next"` }),
      )

      const result = await settle(() => listCategories({ page: 1, perPage: 30 }))

      expectProtocolFailure(result.error)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(requestUrl(fetchMock)).toBe(categoryUrl(1, 30))
    },
  )

  it('accepts all four relations with literal field commas inside each URI', async () => {
    const header = (
      [
        ['first', 1],
        ['prev', 1],
        ['next', 3],
        ['last', 5],
      ] as const
    )
      .map(([relation, page]) => `<${linkUrl(page)}>; rel="${relation}"`)
      .join(', ')
    const fetchMock = installFetch(async () => jsonResponse('[]', 200, { link: header }))
    const result = await settle(() => listCategories({ page: 2, perPage: 30 }))
    expect(result.error).toBeUndefined()
    expect(result.value).toEqual({ items: [], page: 2, perPage: 30, nextPage: 3, previousPage: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['unclosed target', `<${linkUrl(2)}; rel="next"`],
    ['nested target', `<<${linkUrl(2)}>; rel="next"`],
    ['unmatched close', `<${linkUrl(2)}>>; rel="next"`],
    ['empty trailing entry', `<${linkUrl(2)}>; rel="next",`],
    ['duplicate relation', `<${linkUrl(2)}>; rel="next", <${linkUrl(2)}>; rel="next"`],
    ['five entries', Array.from({ length: 5 }, () => `<${linkUrl(2)}>; rel="next"`).join(', ')],
    ['overlong header', `<${linkUrl(2)}>${' '.repeat(8192)}; rel="next"`],
    ['unknown relation', `<${linkUrl(2)}>; rel="alternate"`],
  ])('rejects %s in projected Link tokenization', async (_label, header) => {
    const fetchMock = installFetch(async () => jsonResponse('[]', 200, { link: header }))
    const result = await settle(() => listCategories({ page: 1, perPage: 30 }))
    expectProtocolFailure(result.error)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps Link request and target projection markers aligned and exposes numeric navigation only', async () => {
    const next = linkUrl(2)
    const fetchMock = installFetch(async () =>
      jsonResponse('{}', 200, { link: `<${next}>; rel="next"` }),
    )
    const result = await settle(() =>
      nuvemshopRequest({
        method: 'GET',
        segments: ['categories'],
        query: { page: 1, perPage: 30 },
      }),
    )

    expect(result.error).toBeUndefined()
    const metadata = result.value!.metadata
    expect(metadata.request.projection).toBe(PROJECTION)
    expect(metadata.pagination.links.kind).toBe('valid')
    if (metadata.pagination.links.kind !== 'valid') throw new Error('expected valid projected Link')
    expect(metadata.pagination.links.value).toHaveLength(1)
    expect(metadata.pagination.links.value[0]?.projection).toBe(PROJECTION)
    expect(parseNuvemshopPageNavigation(metadata)).toEqual({
      page: 1,
      perPage: 30,
      nextPage: 2,
    })
    expect(JSON.stringify(parseNuvemshopPageNavigation(metadata))).not.toContain(PROJECTION)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('metadata marker placement', () => {
  async function actualMetadata(
    input: NuvemshopRequestInput,
    headers: Record<string, string> = {},
  ): Promise<Record<string, unknown>> {
    installFetch(async () => jsonResponse('{}', 200, headers))
    const result = await settle(() => nuvemshopRequest(input))
    expect(result.error).toBeUndefined()
    return result.value!.metadata as unknown as Record<string, unknown>
  }

  function metadataWithMarkers(
    base: Record<string, unknown>,
    requestProjection: unknown,
    targetProjection: unknown,
    includeRequestProjection = true,
    includeTargetProjection = true,
  ) {
    const requestWithoutProjection = Object.fromEntries(
      Object.entries(plainObject(base.request)).filter(([key]) => key !== 'projection'),
    )
    const request = {
      ...requestWithoutProjection,
      ...(includeRequestProjection ? { projection: requestProjection } : {}),
    }
    const pagination = plainObject(base.pagination)
    const target = {
      relation: 'next',
      origin: ORIGIN,
      apiVersion: VERSION,
      storeId: STORE_ID,
      segments: ['categories'],
      pagination: { page: 2, perPage: 30 },
      ...(includeTargetProjection ? { projection: targetProjection } : {}),
    }
    return {
      ...base,
      request,
      pagination: { ...pagination, links: { kind: 'valid', value: [target] } },
    }
  }

  it('accepts the fixed marker only on a projected Category collection request and its Link target', async () => {
    const metadata = await actualMetadata(
      { method: 'GET', segments: ['categories'], query: { page: 1, perPage: 30 } },
      { link: `<${linkUrl(2)}>; rel="next"` },
    )

    expect(plainObject(metadata.request).projection).toBe(PROJECTION)
    const pagination = plainObject(metadata.pagination)
    const links = plainObject(pagination.links)
    expect(links.kind).toBe('valid')
    expect(plainObject((links.value as unknown[])[0]).projection).toBe(PROJECTION)
    expect(parseNuvemshopPageNavigation(metadata as never)).toMatchObject({ nextPage: 2 })
  })

  it.each([
    ['projected request marker missing', undefined, PROJECTION, false, true],
    ['projected request marker own undefined', undefined, PROJECTION, true, true],
    ['projected request marker forged', 'other-projection', PROJECTION, true, true],
    ['projected target marker missing', PROJECTION, undefined, true, false],
    ['projected target marker own undefined', PROJECTION, undefined, true, true],
    ['projected target marker forged', PROJECTION, 'other-projection', true, true],
  ])(
    'rejects %s',
    async (
      _label,
      requestProjection,
      targetProjection,
      includeRequestProjection,
      includeTargetProjection,
    ) => {
      const base = await actualMetadata({
        method: 'GET',
        segments: ['categories'],
        query: { page: 1, perPage: 30 },
      })
      const forged = metadataWithMarkers(
        base,
        requestProjection,
        targetProjection,
        includeRequestProjection,
        includeTargetProjection,
      )

      expect(() => parseNuvemshopPageNavigation(forged as never)).toThrow(NuvemshopProtocolError)
    },
  )

  it('omits the projection marker from other collection requests and targets', async () => {
    const productLink = `${ORIGIN}/${VERSION}/${STORE_ID}/products?page=2&per_page=30`
    const metadata = await actualMetadata(
      { method: 'GET', segments: ['products'], query: { page: 1, perPage: 30 } },
      { link: `<${productLink}>; rel="next"` },
    )
    const request = plainObject(metadata.request)
    const links = plainObject(plainObject(metadata.pagination).links)
    expect(Object.hasOwn(request, 'projection')).toBe(false)
    expect(plainObject((links.value as unknown[])[0]).projection).toBeUndefined()
    expect(Object.hasOwn((links.value as unknown[])[0] as object, 'projection')).toBe(false)
    expect(parseNuvemshopPageNavigation(metadata as never)).toMatchObject({ nextPage: 2 })
  })

  it.each([
    ['request marker own undefined', 'request'],
    ['request marker misplaced', 'request-value'],
    ['target marker own undefined', 'target'],
    ['target marker misplaced', 'target-value'],
    ['matching misplaced markers', 'both'],
  ])('rejects a Category projection marker on an ordinary product %s', async (_label, location) => {
    const productLink = `${ORIGIN}/${VERSION}/${STORE_ID}/products?page=2&per_page=30`
    const base = await actualMetadata(
      { method: 'GET', segments: ['products'], query: { page: 1, perPage: 30 } },
      { link: `<${productLink}>; rel="next"` },
    )
    const request = plainObject(base.request)
    const pagination = plainObject(base.pagination)
    const links = plainObject(pagination.links)
    const values = links.value as unknown[]
    const target = plainObject(values[0])
    const changed = {
      ...base,
      ...(location.startsWith('request') || location === 'both'
        ? { request: { ...request, projection: location === 'request' ? undefined : PROJECTION } }
        : {}),
      ...(location.startsWith('target') || location === 'both'
        ? {
            pagination: {
              ...pagination,
              links: {
                ...links,
                value: [
                  {
                    ...target,
                    projection: location === 'target' ? undefined : PROJECTION,
                  },
                ],
              },
            },
          }
        : {}),
    }

    expect(() => parseNuvemshopPageNavigation(changed as never)).toThrow(NuvemshopProtocolError)
  })
})

describe('payload cap and Category normalization controls', () => {
  function oversizedCategoryList(): string {
    return JSON.stringify(
      Array.from(
        { length: 17 },
        (_, index) =>
          JSON.parse(
            categoryRaw({ id: index + 1, description: { pt: 'x'.repeat(65_535) } }),
          ) as unknown,
      ),
    )
  }

  function projectedCategoryList(): string {
    return JSON.stringify(
      Array.from({ length: 17 }, (_, index) => ({
        id: index + 1,
        name: { pt: `Série sintética ${index + 1}` },
        handle: { pt: `serie-sintetica-${index + 1}` },
        parent: null,
        visibility: 'visible',
      })),
    )
  }

  it('accepts a small projected fixture only when the fetch stub observes the exact filter', async () => {
    const unprojected = oversizedCategoryList()
    const projected = projectedCategoryList()
    expect(new TextEncoder().encode(unprojected).byteLength).toBeGreaterThan(MAX_BODY_BYTES)
    const expectedUrl = categoryUrl(1, 30)
    const fetchMock = installFetch(async (input) =>
      String(input) === expectedUrl ? jsonResponse(projected) : jsonResponse(unprojected),
    )

    const result = await settle(() => listCategories({ page: 1, perPage: 30 }))

    expect(result.error).toBeUndefined()
    expect(requestUrl(fetchMock)).toBe(expectedUrl)
    expect(result.value?.items).toHaveLength(17)
    expect(result.value?.items.map(({ id }) => id)).toEqual(
      Array.from({ length: 17 }, (_, index) => String(index + 1)),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('still rejects an oversized response when the provider ignores the exact projection', async () => {
    const ignoredProjection = oversizedCategoryList()
    expect(new TextEncoder().encode(ignoredProjection).byteLength).toBeGreaterThan(MAX_BODY_BYTES)
    const fetchMock = installFetch(async () => jsonResponse(ignoredProjection))

    const result = await settle(() => listCategories({ page: 1, perPage: 30 }))

    expectProtocolFailure(result.error)
    expect(requestUrl(fetchMock)).toBe(categoryUrl(1, 30))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('preserves numeric zero as root and exact large Category IDs through projected listing', async () => {
    const raw = categoryRaw({ id: HUGE_ID, parent: 0 })
    const exact = raw.replace(`"id":"${HUGE_ID}"`, `"id":${HUGE_ID}`)
    const fetchMock = installFetch(async () => jsonResponse(`[${exact}]`))

    const result = await settle(() => listCategories({ page: 1, perPage: 30 }))

    expect(result.error).toBeUndefined()
    expect(result.value?.items).toMatchObject([{ id: HUGE_ID, parentId: null }])
    expect(requestUrl(fetchMock)).toBe(categoryUrl(1, 30))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
