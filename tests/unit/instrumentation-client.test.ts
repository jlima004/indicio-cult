import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  replayIntegration: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => sentry)

const validPublicEnv = {
  NEXT_PUBLIC_SITE_URL: 'https://indiciocult.com.br',
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
}

async function loadClientInstrumentation() {
  vi.resetModules()
  return import('@/instrumentation-client')
}

describe('instrumentation do navegador', () => {
  beforeEach(() => {
    sentry.init.mockClear()
    sentry.replayIntegration.mockClear()
    sentry.captureRouterTransitionStart.mockClear()
    for (const [key, value] of Object.entries(validPublicEnv)) {
      vi.stubEnv(key, value)
    }
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', undefined)
    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', 'test-release-123')
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('não inicializa transporte nem Replay sem DSN público', async () => {
    await loadClientInstrumentation()

    expect(sentry.init.mock.calls.length).toBe(0)
    expect(sentry.replayIntegration).not.toHaveBeenCalled()
  })

  it('usa o DSN público, release do build e configuração de privacidade', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.invalid/2')

    await loadClientInstrumentation()

    expect(sentry.init.mock.calls.length).toBe(1)
    const options = sentry.init.mock.calls[0]?.[0] as Record<string, unknown>
    const dataCollection = options?.dataCollection as Record<string, unknown> | undefined
    expect(options?.dsn === 'https://public@example.invalid/2').toBe(true)
    expect(options?.tracesSampleRate).toBe(0.1)
    expect(options?.release).toBe('test-release-123')
    expect(options?.environment).toBe('development')
    expect(dataCollection?.userInfo).toBe(false)
    expect(dataCollection?.httpBodies).toEqual([])
    expect(sentry.replayIntegration).not.toHaveBeenCalled()
    expect(options).not.toHaveProperty('replaysSessionSampleRate')
    expect(options).not.toHaveProperty('replaysOnErrorSampleRate')
  })

  it.each([
    ['/conta/redefinir?token=synthetic-secret', '/conta/redefinir', 'push'],
    ['/produto/abc#reviews', '/produto/abc', 'replace'],
    ['/checkout?email=synthetic@example.invalid#payment', '/checkout', 'traverse'],
    ['/colecoes', '/colecoes', 'push'],
    [
      'https://indiciocult.com.br/busca?token=synthetic-secret#synthetic@example.invalid',
      'https://indiciocult.com.br/busca',
      'replace',
    ],
  ] as const)(
    'envia somente o caminho navegável de %s ao Sentry',
    async (url, expectedUrl, navigationType) => {
      vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.invalid/2')
      const { onRouterTransitionStart } = await loadClientInstrumentation()

      onRouterTransitionStart(url, navigationType)

      expect(sentry.captureRouterTransitionStart).toHaveBeenCalledExactlyOnceWith(
        expectedUrl,
        navigationType,
      )
      const forwardedUrl = sentry.captureRouterTransitionStart.mock.calls[0]?.[0] as string
      expect(forwardedUrl).not.toContain('?')
      expect(forwardedUrl).not.toContain('#')
      expect(forwardedUrl).not.toContain('synthetic-secret')
      expect(forwardedUrl).not.toContain('synthetic@example.invalid')
    },
  )

  it('não encaminha transição ao Sentry sem DSN público', async () => {
    const { onRouterTransitionStart } = await loadClientInstrumentation()

    onRouterTransitionStart('/busca?token=synthetic-secret#synthetic@example.invalid', 'push')

    expect(sentry.captureRouterTransitionStart).not.toHaveBeenCalled()
  })
})
