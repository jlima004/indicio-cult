import { afterEach, describe, expect, it, vi } from 'vitest'

import { track } from '@/lib/analytics/track'
import { isDevelopment } from '@/lib/env/runtime'

// Esta função é verificada por tsc e não executa no teste unitário.
function assertTrackTypes() {
  track('view_item', { itemId: 'product-1' })
  track('add_to_cart', { itemId: 'product-1', quantity: 2 })
  track('begin_checkout', { currency: 'BRL', value: 100 })
  track('purchase', { currency: 'BRL', value: 100 })
  track('sign_up', {})
  track('newsletter_subscribe', {})
  track('exchange_requested', { itemId: 'product-1' })

  // @ts-expect-error purchase exige valor numérico
  track('purchase', { currency: 'BRL', value: '100' })
  // @ts-expect-error payload de purchase não aceita PII
  track('purchase', { currency: 'BRL', value: 100, email: 'person@example.com' })
  // @ts-expect-error sign_up não aceita PII
  track('sign_up', { email: 'person@example.com' })
}
void assertTrackTypes

describe('track', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('não lança nem registra analytics em produção', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchRequest = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response()))

    expect(() => track('purchase', { currency: 'BRL', value: 100 })).not.toThrow()
    expect(log).not.toHaveBeenCalled()
    expect(fetchRequest).not.toHaveBeenCalled()
  })

  it('registra somente o nome do evento em desenvolvimento', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchRequest = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response()))

    track('view_item', { itemId: 'payload-private' })

    expect(log).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith('analytics: view_item')
    expect(JSON.stringify(log.mock.calls)).not.toContain('payload-private')
    expect(fetchRequest).not.toHaveBeenCalled()
  })
})

describe('isDevelopment', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('lê NODE_ENV sem exigir as demais variáveis de ambiente', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', undefined)

    vi.stubEnv('NODE_ENV', 'development')
    expect(isDevelopment()).toBe(true)

    vi.stubEnv('NODE_ENV', 'production')
    expect(isDevelopment()).toBe(false)

    vi.stubEnv('NODE_ENV', 'test')
    expect(isDevelopment()).toBe(false)
  })
})
