import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  abortSignal: vi.fn(),
  connection: vi.fn(),
  createClient: vi.fn(),
  from: vi.fn(),
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
    error: { code: 'PGRST205', message: 'relation not found' },
  })
  mocks.select.mockReturnValue({ abortSignal: mocks.abortSignal })
  mocks.from.mockReturnValue({ select: mocks.select })
  mocks.createClient.mockResolvedValue({ from: mocks.from })
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
