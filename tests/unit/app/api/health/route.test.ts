// @vitest-environment node

import { createServerClient } from '@supabase/ssr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  abortSignal: vi.fn(),
  connection: vi.fn(),
  createClient: vi.fn(),
  from: vi.fn(),
  limit: vi.fn(),
  select: vi.fn(),
}))

vi.mock('next/server', () => ({ connection: mocks.connection }))
vi.mock('@/lib/env', () => ({ env: { APP_VERSION: 'test-sha' } }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))

function request(ip: string) {
  return new Request('https://indiciocult.com.br/api/health', {
    headers: { 'x-forwarded-for': ip },
  })
}

async function loadRoute() {
  vi.resetModules()
  return import('@/app/api/health/route')
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.abortSignal.mockResolvedValue({
    data: null,
    error: { code: 'PGRST205', message: 'relation not found', details: null, hint: null },
    status: 404,
  })
  mocks.limit.mockReturnValue({ abortSignal: mocks.abortSignal })
  mocks.select.mockReturnValue({ limit: mocks.limit })
  mocks.from.mockReturnValue({ select: mocks.select })
  mocks.createClient.mockResolvedValue({ from: mocks.from })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/health', () => {
  it('considera PGRST205 da relação sentinela como Supabase acessível', async () => {
    const { GET } = await loadRoute()

    const response = await GET(request('203.0.113.1'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      version: 'test-sha',
      supabase: 'ok',
    })
  })

  it('retorna degraded quando o Data API falha', async () => {
    mocks.abortSignal.mockResolvedValue({
      data: null,
      error: { code: 'PGRST002', message: 'database unavailable' },
    })
    const { GET } = await loadRoute()

    const response = await GET(request('203.0.113.2'))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      status: 'degraded',
      supabase: 'error',
    })
  })

  it('encerra o probe em 2 segundos quando o Data API não responde', async () => {
    vi.useFakeTimers()
    mocks.abortSignal.mockReturnValue(new Promise(() => undefined))
    const { GET } = await loadRoute()

    const responsePromise = GET(request('203.0.113.3'))
    await vi.advanceTimersByTimeAsync(2_000)
    const response = await responsePromise
    vi.useRealTimers()

    expect(response.status).toBe(503)
  })

  it('bloqueia a 61ª chamada do mesmo IP com Problem Details', async () => {
    const { GET } = await loadRoute()
    const responses = []

    for (let call = 1; call <= 61; call += 1) {
      responses.push(await GET(request('203.0.113.4')))
    }

    expect(responses[59]?.status).toBe(200)
    expect(responses[60]?.status).toBe(429)
    expect(responses[60]?.headers.get('content-type')).toBe('application/problem+json')
    await expect(responses[60]?.json()).resolves.toMatchObject({
      type: 'about:blank',
      title: 'Too Many Requests',
      status: 429,
    })
  })
})

const SENTINEL_ERROR = {
  code: 'PGRST205',
  message: "Could not find the table 'public.__foundation_health_probe__' in the schema cache",
  details: null,
  hint: null,
}

function wireClient(fetch: typeof globalThis.fetch) {
  return createServerClient('https://health-probe.invalid', 'fake-anon-health-key', {
    global: { fetch },
    cookies: { getAll: () => [], setAll: () => undefined },
  })
}

function wireResponse(status: number, body: string | null) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (_input, init) => {
    if (init?.signal?.aborted) throw new DOMException('synthetic abort', 'AbortError')
    return new Response(body, { status, headers: { 'content-type': 'application/json' } })
  })
  mocks.createClient.mockResolvedValue(wireClient(fetch))
  return fetch
}

async function expectDegraded(response: Response) {
  expect(response.status).toBe(503)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.get('content-type')).toContain('application/json')
  await expect(response.json()).resolves.toEqual({ status: 'degraded', supabase: 'error' })
}

// Only HTTP transport is synthetic; SSR, Supabase and PostgREST parsing are real.
// Every client uses an inert .invalid URL, fake anon key and empty cookie store.
describe('D-F1 installed SDK transport regression', () => {
  it('DF1-02/DF1-16 reproduces SDK normalization of an empty HEAD 404', async () => {
    const fetch = wireResponse(404, null)
    const result = await wireClient(fetch)
      .from('__foundation_health_probe__')
      .select('*', { head: true, count: 'exact' })

    expect(fetch.mock.calls[0]?.[1]?.method).toBe('HEAD')
    expect(result).toMatchObject({ error: null, data: null, status: 204, statusText: 'No Content' })
  })

  it('DF1-01/DF1-02/DF1-14/DF1-16 accepts structured sentinel evidence using GET with zero rows', async () => {
    const fetch = wireResponse(404, JSON.stringify(SENTINEL_ERROR))
    const { GET } = await loadRoute()

    const response = await GET(request('203.0.113.20'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-type')).toContain('application/json')
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      version: 'test-sha',
      supabase: 'ok',
    })
    expect(mocks.connection).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
    const [input, init] = fetch.mock.calls[0]!
    const url = new URL(String(input))
    expect(init?.method).toBe('GET')
    expect(init?.body).toBeUndefined()
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    expect(url.origin).toBe('https://health-probe.invalid')
    expect(url.pathname).toBe('/rest/v1/__foundation_health_probe__')
    expect(url.searchParams.get('select')).toBe('*')
    expect(url.searchParams.get('limit')).toBe('0')
    expect(new Headers(init?.headers).get('prefer')).toBeNull()
  })

  it('DF1-03/DF1-16 rejects empty HTTP 404 through the real SDK and route', async () => {
    const fetch = wireResponse(404, null)
    const { GET } = await loadRoute()

    const response = await GET(request('203.0.113.21'))

    await expectDegraded(response)
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('GET')
  })

  it.each([
    ['DF1-04', 404, { ...SENTINEL_ERROR, code: 'PGRST002' }],
    ['DF1-05', 401, { code: 'PGRST301', message: 'Unauthorized' }],
    ['DF1-06', 403, { code: '42501', message: 'Forbidden' }],
    ['DF1-07', 429, { message: 'Too Many Requests' }],
    ['DF1-08', 500, { message: 'Internal Server Error' }],
    ['DF1-08', 502, { message: 'Bad Gateway' }],
  ])('%s rejects upstream HTTP %i', async (_control, status, body) => {
    wireResponse(status, JSON.stringify(body))
    const { GET } = await loadRoute()

    await expectDegraded(await GET(request('203.0.113.22')))
  })

  it.each([401, 403, 429, 500, 502, 503])(
    'DF1-05/06/07/08/16 rejects PGRST205 paired with inconsistent HTTP %i',
    async (status) => {
      vi.useFakeTimers()
      wireResponse(status, JSON.stringify(SENTINEL_ERROR))
      const { GET } = await loadRoute()
      const response = GET(request('203.0.113.23'))

      await vi.advanceTimersByTimeAsync(2_000)

      await expectDegraded(await response)
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('DF1-08/DF1-12 rejects unavailable HTTP 503 and aborts the SDK retry at two seconds', async () => {
    vi.useFakeTimers()
    const fetch = wireResponse(503, JSON.stringify({ message: 'Service Unavailable' }))
    const { GET } = await loadRoute()
    const response = GET(request('203.0.113.24'))

    await vi.advanceTimersByTimeAsync(1_999)
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    await expectDegraded(await response)
    // The SDK wakes its retry sleep on abort; native fetch then rejects the next attempt.
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([
    ['plain text', 'gateway response'],
    ['JSON null', 'null'],
    ['JSON array', '[]'],
    ['code only', JSON.stringify({ code: 'PGRST205' })],
    ['missing message', JSON.stringify({ ...SENTINEL_ERROR, message: undefined })],
    ['empty message', JSON.stringify({ ...SENTINEL_ERROR, message: '' })],
    ['blank message', JSON.stringify({ ...SENTINEL_ERROR, message: '  ' })],
    ['numeric message', JSON.stringify({ ...SENTINEL_ERROR, message: 205 })],
    ['object details', JSON.stringify({ ...SENTINEL_ERROR, details: {} })],
    ['numeric hint', JSON.stringify({ ...SENTINEL_ERROR, hint: 205 })],
  ])('DF1-09/DF1-16 rejects malformed 404: %s', async (_name, body) => {
    wireResponse(404, body)
    const { GET } = await loadRoute()

    await expectDegraded(await GET(request('203.0.113.25')))
  })

  it.each([
    [200, '[]'],
    [200, 'null'],
    [200, ''],
    [200, JSON.stringify(SENTINEL_ERROR)],
    [204, null],
  ])('DF1-09/DF1-16 rejects errorless or ambiguous HTTP %i body %s', async (status, body) => {
    wireResponse(status, body)
    const { GET } = await loadRoute()

    await expectDegraded(await GET(request('203.0.113.26')))
  })

  it('DF1-10/DF1-12/P2D1-16 rejects network failure and cleans aborted SDK retry', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (_input, init) => {
      if (init?.signal?.aborted) throw new DOMException('synthetic abort', 'AbortError')
      throw new TypeError('synthetic connection failure')
    })
    mocks.createClient.mockResolvedValue(wireClient(fetch))
    const { GET } = await loadRoute()
    const response = GET(request('203.0.113.27'))

    await vi.advanceTimersByTimeAsync(2_000)

    await expectDegraded(await response)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('DF1-11/DF1-12/P2D1-16 aborts a pending fetch exactly at 2000 ms and clears its timer', async () => {
    vi.useFakeTimers()
    const aborted = vi.fn()
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => {
              aborted()
              reject(new DOMException('synthetic abort', 'AbortError'))
            },
            { once: true },
          )
        }),
    )
    mocks.createClient.mockResolvedValue(wireClient(fetch))
    const { GET } = await loadRoute()
    const response = GET(request('203.0.113.28'))
    const completed = vi.fn()
    void response.then(completed)

    await vi.advanceTimersByTimeAsync(1_999)
    expect(completed).not.toHaveBeenCalled()
    expect(aborted).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    await expectDegraded(await response)
    expect(aborted).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
    expect(initSignal(fetch)?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([404, 401])(
    'DF1-12 clears the deadline after an early HTTP %i result',
    async (status) => {
      vi.useFakeTimers()
      const fetch = wireResponse(status, JSON.stringify(SENTINEL_ERROR))
      const { GET } = await loadRoute()

      const response = await GET(request('203.0.113.29'))

      expect(response.status).toBe(status === 404 ? 200 : 503)
      expect(vi.getTimerCount()).toBe(0)
      await vi.advanceTimersByTimeAsync(2_000)
      expect(initSignal(fetch)?.aborted).toBe(false)
    },
  )

  it('DF1-13 preserves per-IP rate limiting and stops before transport on call 61', async () => {
    const fetch = wireResponse(404, JSON.stringify(SENTINEL_ERROR))
    const { GET } = await loadRoute()
    for (let call = 1; call <= 60; call += 1) {
      expect((await GET(request('203.0.113.30'))).status).toBe(200)
    }

    const response = await GET(request('203.0.113.30'))

    expect(response.status).toBe(429)
    expect(response.headers.get('content-type')).toBe('application/problem+json')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThanOrEqual(1)
    expect(Number(response.headers.get('retry-after'))).toBeLessThanOrEqual(60)
    await expect(response.json()).resolves.toMatchObject({
      type: 'about:blank',
      title: 'Too Many Requests',
      status: 429,
    })
    expect(fetch).toHaveBeenCalledTimes(60)
    expect((await GET(request('203.0.113.31'))).status).toBe(200)
  })

  it('DF1-15 retains operational health with MAINTENANCE_MODE=true', async () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true')
    wireResponse(404, JSON.stringify(SENTINEL_ERROR))
    const { GET } = await loadRoute()

    const response = await GET(request('203.0.113.32'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      version: 'test-sha',
      supabase: 'ok',
    })
  })
})

function initSignal(fetch: ReturnType<typeof wireResponse>) {
  return fetch.mock.calls[0]?.[1]?.signal
}

describe('P2-D1 installed SDK optional error fields', () => {
  it.each([
    [
      'P2D1-01/P2D1-RED-01 minimal error',
      { code: 'PGRST205', message: 'Relation not found in schema cache' },
    ],
    [
      'P2D1-03/P2D1-RED-02 absent details',
      { code: 'PGRST205', message: SENTINEL_ERROR.message, hint: 'synthetic hint' },
    ],
    [
      'P2D1-04/P2D1-RED-03 absent hint',
      { code: 'PGRST205', message: SENTINEL_ERROR.message, details: 'synthetic details' },
    ],
    [
      'P2D1-01/P2D1-RED-04 both optional fields absent',
      { code: 'PGRST205', message: SENTINEL_ERROR.message },
    ],
    ['P2D1-02/P2D1-05 complete error with null fields', SENTINEL_ERROR],
    [
      'P2D1-06 both optional fields string',
      { ...SENTINEL_ERROR, details: 'synthetic details', hint: 'synthetic hint' },
    ],
    ['DF1-09 absent details with null hint', { ...SENTINEL_ERROR, details: undefined }],
    ['DF1-09 absent hint with null details', { ...SENTINEL_ERROR, hint: undefined }],
    ['P2D1-extra optional empty strings', { ...SENTINEL_ERROR, details: '', hint: '' }],
  ])('%s is healthy through the real SDK and route', async (_control, body) => {
    const serialized = JSON.stringify(body)
    const expectedError = JSON.parse(serialized)
    const fetch = wireResponse(404, serialized)
    const parsed = await wireClient(fetch).from('__foundation_health_probe__').select('*').limit(0)

    expect(parsed.status).toBe(404)
    expect(parsed.data).toBeNull()
    expect(parsed.error).toEqual(expectedError)
    expect(Object.hasOwn(parsed.error!, 'details')).toBe(Object.hasOwn(expectedError, 'details'))
    expect(Object.hasOwn(parsed.error!, 'hint')).toBe(Object.hasOwn(expectedError, 'hint'))
    const { GET } = await loadRoute()

    const response = await GET(request('203.0.113.40'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      version: 'test-sha',
      supabase: 'ok',
    })
  })

  it.each([
    ['P2D1-07 details number', { ...SENTINEL_ERROR, details: 205 }],
    ['P2D1-extra details boolean', { ...SENTINEL_ERROR, details: true }],
    ['P2D1-extra details array', { ...SENTINEL_ERROR, details: [] }],
    ['P2D1-09 details object', { ...SENTINEL_ERROR, details: {} }],
    ['P2D1-extra hint number', { ...SENTINEL_ERROR, hint: 205 }],
    ['P2D1-08 hint boolean', { ...SENTINEL_ERROR, hint: true }],
    ['P2D1-10 hint array', { ...SENTINEL_ERROR, hint: [] }],
    ['P2D1-extra hint object', { ...SENTINEL_ERROR, hint: {} }],
    ['P2D1-11 unexpected code', { ...SENTINEL_ERROR, code: 'PGRST002' }],
    ['P2D1-12 empty message', { ...SENTINEL_ERROR, message: '' }],
    ['P2D1-12 blank message', { ...SENTINEL_ERROR, message: '  ' }],
    ['P2D1-12 null message', { ...SENTINEL_ERROR, message: null }],
    ['P2D1-12 numeric message', { ...SENTINEL_ERROR, message: 205 }],
    ['P2D1-12 boolean message', { ...SENTINEL_ERROR, message: true }],
    ['P2D1-12 array message', { ...SENTINEL_ERROR, message: [] }],
    ['P2D1-12 object message', { ...SENTINEL_ERROR, message: {} }],
  ])('%s remains degraded through the real SDK and route', async (_control, body) => {
    const fetch = wireResponse(404, JSON.stringify(body))
    const parsed = await wireClient(fetch).from('__foundation_health_probe__').select('*').limit(0)

    expect(parsed).toMatchObject({ status: 404, data: null, error: body })
    const { GET } = await loadRoute()

    await expectDegraded(await GET(request('203.0.113.41')))
  })

  it.each([
    ['P2D1-13 error-shaped success body', 200, JSON.stringify(SENTINEL_ERROR), SENTINEL_ERROR],
    ['P2D1-14 empty 404 normalized by SDK', 404, null, null],
    [
      'P2D1-15 success containing rows',
      200,
      JSON.stringify([{ id: 'synthetic' }]),
      [{ id: 'synthetic' }],
    ],
    ['P2D1-15 404 array normalized by SDK', 404, JSON.stringify([SENTINEL_ERROR]), []],
  ])('%s remains degraded', async (_control, status, body, data) => {
    const fetch = wireResponse(status, body)
    const parsed = await wireClient(fetch).from('__foundation_health_probe__').select('*').limit(0)

    expect(parsed.error).toBeNull()
    expect(parsed.data).toEqual(data)
    expect(parsed.status).toBe(status === 404 ? (body === null ? 204 : 200) : status)
    const { GET } = await loadRoute()

    await expectDegraded(await GET(request('203.0.113.42')))
  })

  // JSON cannot encode an explicitly present undefined value. These are invalid
  // wire bodies, not fabricated SDK response objects or absent JSON fields.
  it.each(['details', 'hint'])(
    'P2D1-extra rejects invalid JSON with explicit undefined %s',
    async (field) => {
      const body = `{"code":"PGRST205","message":"relation not found","${field}":undefined}`
      const fetch = wireResponse(404, body)
      const parsed = await wireClient(fetch)
        .from('__foundation_health_probe__')
        .select('*')
        .limit(0)

      expect(parsed).toMatchObject({ status: 404, data: null, error: { message: body } })
      const { GET } = await loadRoute()

      await expectDegraded(await GET(request('203.0.113.43')))
    },
  )
})
