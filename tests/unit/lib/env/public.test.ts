import { beforeEach, describe, expect, it, vi } from 'vitest'

const validPublicEnv = {
  NEXT_PUBLIC_SITE_URL: 'https://indiciocult.com.br',
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
}

function stubEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    vi.stubEnv(key, value)
  }
}

async function loadPublicEnv() {
  // O módulo valida no import; reset garante uma avaliação por teste.
  vi.resetModules()
  return import('@/lib/env/public')
}

describe('publicEnv', () => {
  beforeEach(() => {
    stubEnv({ ...validPublicEnv, NEXT_PUBLIC_SENTRY_DSN: undefined })
  })

  it('expõe as variáveis públicas quando todas são válidas', async () => {
    const { publicEnv } = await loadPublicEnv()

    expect(publicEnv.NEXT_PUBLIC_SITE_URL).toBe('https://indiciocult.com.br')
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('https://abc.supabase.co')
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('anon-key')
  })

  it('falha no import nomeando a variável ausente', async () => {
    stubEnv({ NEXT_PUBLIC_SUPABASE_URL: undefined })

    await expect(loadPublicEnv()).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('falha quando a URL do site não é uma URL', async () => {
    stubEnv({ NEXT_PUBLIC_SITE_URL: 'indiciocult' })

    await expect(loadPublicEnv()).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/)
  })

  it('trata string vazia como ausente em variável opcional', async () => {
    stubEnv({ NEXT_PUBLIC_SENTRY_DSN: '' })

    const { publicEnv } = await loadPublicEnv()

    expect(publicEnv.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined()
  })

  it('aceita DSN público do Sentry quando informado', async () => {
    stubEnv({ NEXT_PUBLIC_SENTRY_DSN: 'https://key@o1.ingest.sentry.io/1' })

    const { publicEnv } = await loadPublicEnv()

    expect(publicEnv.NEXT_PUBLIC_SENTRY_DSN).toBe('https://key@o1.ingest.sentry.io/1')
  })
})
