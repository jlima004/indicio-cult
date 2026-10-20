// Synthetic fixtures only. Official Order/metafields docs consulted 2026-10-19.
// https://nuvemshop.dev/en-US/api/resources/2025-03/order
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NuvemshopRequestInput } from '@/modules/nuvemshop/server/request'

const ID = '900719925474099312345'
const STORE = '123456789'
const BASE = `https://api.nuvemshop.com.br/2025-03/${STORE}`
const FISCAL = `owner_id=${ID}&namespace=nfe&key=list&fields=value`

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NUVEMSHOP_STORE_ID', STORE)
  vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', 'synthetic-access-token')
  vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', 'synthetic-client-secret')
  vi.stubEnv('NUVEMSHOP_APP_ID', 'synthetic-app-id')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

async function read(segments: readonly string[], query: Record<string, unknown>) {
  const { nuvemshopRequest } = await import('@/modules/nuvemshop/server/client')
  return nuvemshopRequest({ method: 'GET', segments, query } as NuvemshopRequestInput)
}
function stub(link?: string) {
  const fetch = vi.fn().mockResolvedValue(
    new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json', ...(link ? { link } : {}) },
    }),
  )
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('NUV-11 closed order query transport', () => {
  it('encodes a discovery query without changing the trusted route', async () => {
    const fetch = stub()
    await read(['orders'], { page: 1, perPage: 2, q: 'synthetic+reader@example.invalid' })
    expect(String(fetch.mock.calls[0]![0])).toBe(
      `${BASE}/orders?page=1&per_page=2&q=synthetic%2Breader%40example.invalid`,
    )
  })
  it('constructs the fixed NF-e filter with an exact owner id', async () => {
    const fetch = stub()
    await read(['metafields', 'orders'], { page: 1, perPage: 1, orderId: ID })
    expect(String(fetch.mock.calls[0]![0])).toBe(
      `${BASE}/metafields/orders?page=1&per_page=1&${FISCAL}`,
    )
  })
  it('admits bounded fulfillment collection pagination', async () => {
    const fetch = stub()
    const result = await read(['orders', ID, 'fulfillment-orders'], { page: 1, perPage: 100 })
    const { createNuvemshopPage } = await import('@/modules/nuvemshop/server/pagination')
    expect(createNuvemshopPage([], result.metadata)).toEqual({ items: [], page: 1, perPage: 100 })
    expect(String(fetch.mock.calls[0]![0])).toBe(
      `${BASE}/orders/${ID}/fulfillment-orders?page=1&per_page=100`,
    )
  })
  it('carries the fiscal identity through validated navigation', async () => {
    stub(`<${BASE}/metafields/orders?page=2&per_page=1&${FISCAL}>; rel="next"`)
    const result = await read(['metafields', 'orders'], { page: 1, perPage: 1, orderId: ID })
    const { createNuvemshopPage } = await import('@/modules/nuvemshop/server/pagination')
    expect(createNuvemshopPage([], result.metadata).nextPage).toBe(2)
  })
  it('carries a query through validated navigation', async () => {
    stub(`<${BASE}/orders?page=2&per_page=2&q=reader%40example.invalid>; rel="next"`)
    const result = await read(['orders'], { page: 1, perPage: 2, q: 'reader@example.invalid' })
    const { createNuvemshopPage } = await import('@/modules/nuvemshop/server/pagination')
    expect(createNuvemshopPage([], result.metadata).nextPage).toBe(2)
    expect(JSON.stringify(result.metadata)).not.toContain('reader@example.invalid')
  })
  it('keeps different queries out of the same in-flight read', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response('[]', { headers: { 'content-type': 'application/json' } })),
      )
    vi.stubGlobal('fetch', fetch)
    await Promise.all([
      read(['orders'], { page: 1, perPage: 2, q: 'one@example.invalid' }),
      read(['orders'], { page: 1, perPage: 2, q: 'two@example.invalid' }),
    ])
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls.map((call) => String(call[0]))).toEqual([
      `${BASE}/orders?page=1&per_page=2&q=one%40example.invalid`,
      `${BASE}/orders?page=1&per_page=2&q=two%40example.invalid`,
    ])
  })
  it('coalesces an identical query only while its read is in flight', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response('[]', { headers: { 'content-type': 'application/json' } })),
      )
    vi.stubGlobal('fetch', fetch)
    await Promise.all([
      read(['orders'], { page: 1, perPage: 2, q: 'same@example.invalid' }),
      read(['orders'], { page: 1, perPage: 2, q: 'same@example.invalid' }),
    ])
    expect(fetch).toHaveBeenCalledTimes(1)
    await read(['orders'], { page: 1, perPage: 2, q: 'same@example.invalid' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('rejects a changed search in Link without fetching it', async () => {
    const fetch = stub(`<${BASE}/orders?page=2&per_page=2&q=other%40example.invalid>; rel="next"`)
    const result = await read(['orders'], { page: 1, perPage: 2, q: 'reader@example.invalid' })
    const { createNuvemshopPage } = await import('@/modules/nuvemshop/server/pagination')
    expect(() => createNuvemshopPage([], result.metadata)).toThrow('Nuvemshop')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('rejects a Link that drops the search filter', async () => {
    const fetch = stub(`<${BASE}/orders?page=2&per_page=2>; rel="next"`)
    const result = await read(['orders'], { page: 1, perPage: 2, q: 'reader@example.invalid' })
    const { createNuvemshopPage } = await import('@/modules/nuvemshop/server/pagination')
    expect(() => createNuvemshopPage([], result.metadata)).toThrow('Nuvemshop')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('rejects malformed opaque query identities', async () => {
    stub()
    const result = await read(['orders'], { page: 1, perPage: 2, q: 'reader@example.invalid' })
    const metadata = {
      ...result.metadata,
      request: {
        ...result.metadata.request,
        filter: { kind: 'orders-q' as const, queryId: 'reader@example.invalid' },
      },
    }
    const { createNuvemshopPage } = await import('@/modules/nuvemshop/server/pagination')
    expect(() => createNuvemshopPage([], metadata)).toThrow('Nuvemshop')
  })
  it.each([
    ['orders', { q: '' }],
    ['orders', { q: 'a\nb' }],
    ['orders', { q: 1 }],
    ['products', { q: 'reader@example.invalid' }],
    ['orders', { orderId: ID }],
    ['metafields', { orderId: 9007199254740992 }],
  ])('rejects invalid query %s locally', async (resource, query) => {
    const fetch = stub()
    const segments = resource === 'metafields' ? ['metafields', 'orders'] : [resource as string]
    await expect(read(segments, { page: 1, perPage: 1, ...query })).rejects.toMatchObject({
      name: 'NuvemshopValidationError',
    })
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each([
    `owner_id=2&namespace=nfe&key=list&fields=value`,
    `owner_id=${ID}&namespace=other&key=list&fields=value`,
    `owner_id=${ID}&namespace=nfe&key=link&fields=value`,
    `owner_id=${ID}&namespace=nfe&key=list&fields=id`,
  ])('rejects mutated fiscal link filters without egress', async (filter) => {
    const fetch = stub(`<${BASE}/metafields/orders?page=2&per_page=1&${filter}>; rel="next"`)
    const result = await read(['metafields', 'orders'], { page: 1, perPage: 1, orderId: ID })
    const { createNuvemshopPage } = await import('@/modules/nuvemshop/server/pagination')
    expect(() => createNuvemshopPage([], result.metadata)).toThrow('Nuvemshop')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
