import { describe, expect, it } from 'vitest'

import { clientIp, MemoryRateLimiter } from '@/lib/rate-limit'

describe('MemoryRateLimiter', () => {
  it('consome o limite dentro da mesma janela e bloqueia o excedente', () => {
    const limiter = new MemoryRateLimiter(() => 10_000)
    const options = { max: 2, windowMs: 1_000 }

    expect(limiter.limit('ip:1', options)).toEqual({
      ok: true,
      remaining: 1,
      resetAt: 11_000,
    })
    expect(limiter.limit('ip:1', options)).toEqual({
      ok: true,
      remaining: 0,
      resetAt: 11_000,
    })
    expect(limiter.limit('ip:1', options)).toEqual({
      ok: false,
      remaining: 0,
      resetAt: 11_000,
    })
  })

  it('abre uma janela nova no instante do reset', () => {
    let now = 10_000
    const limiter = new MemoryRateLimiter(() => now)
    const options = { max: 1, windowMs: 1_000 }

    expect(limiter.limit('ip:1', options).ok).toBe(true)
    expect(limiter.limit('ip:1', options).ok).toBe(false)

    now = 11_000
    expect(limiter.limit('ip:1', options)).toEqual({
      ok: true,
      remaining: 0,
      resetAt: 12_000,
    })
  })

  it('mantém contadores independentes por chave', () => {
    const limiter = new MemoryRateLimiter(() => 10_000)
    const options = { max: 1, windowMs: 1_000 }

    expect(limiter.limit('ip:1', options).ok).toBe(true)
    expect(limiter.limit('ip:2', options).ok).toBe(true)
  })
})

describe('clientIp', () => {
  it('usa o primeiro endereço encaminhado pelo proxy', () => {
    const request = new Request('https://indiciocult.com.br/api/health', {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.2' },
    })

    expect(clientIp(request)).toBe('203.0.113.10')
  })

  it('usa x-real-ip como fallback e "unknown" quando nenhum IP existe', () => {
    const withRealIp = new Request('https://indiciocult.com.br/api/health', {
      headers: { 'x-real-ip': '203.0.113.20' },
    })
    const withoutIp = new Request('https://indiciocult.com.br/api/health')

    expect(clientIp(withRealIp)).toBe('203.0.113.20')
    expect(clientIp(withoutIp)).toBe('unknown')
  })
})
