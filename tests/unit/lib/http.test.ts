import { describe, expect, it } from 'vitest'

import { json, problem } from '@/lib/http'

describe('json', () => {
  it('serializa o corpo e preserva status e headers informados', async () => {
    const response = json(
      { status: 'ok' },
      { status: 201, headers: { 'x-request-id': 'request-1' } },
    )

    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(response.headers.get('x-request-id')).toBe('request-1')
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })
})

describe('problem', () => {
  it('produz um Problem Details RFC 9457 com detail opcional', async () => {
    const response = problem(503, 'Service Unavailable', 'Supabase indisponível')

    expect(response.status).toBe(503)
    expect(response.headers.get('content-type')).toBe('application/problem+json')
    await expect(response.json()).resolves.toEqual({
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
      detail: 'Supabase indisponível',
    })
  })

  it('omite detail quando não foi informado', async () => {
    const response = problem(429, 'Too Many Requests')

    await expect(response.json()).resolves.toEqual({
      type: 'about:blank',
      title: 'Too Many Requests',
      status: 429,
    })
  })
})
