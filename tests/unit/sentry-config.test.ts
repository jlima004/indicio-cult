import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sentryConfig = vi.hoisted(() => ({
  withSentryConfig: vi.fn((config: unknown, options: unknown) => {
    void options
    return config
  }),
}))

vi.mock('@sentry/nextjs/config', () => sentryConfig)

async function loadNextConfig() {
  vi.resetModules()
  return (await import('../../next.config')).default
}

describe('configuração de build do Sentry', () => {
  beforeEach(() => {
    sentryConfig.withSentryConfig.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('preserva o build standalone e Cache Components', async () => {
    const config = await loadNextConfig()

    expect(config).toMatchObject({ output: 'standalone', cacheComponents: true })
  })

  it('desativa upload, telemetria, release remoto e opções extras do instalador', async () => {
    await loadNextConfig()

    const options = sentryConfig.withSentryConfig.mock.calls[0]?.[1] as Record<string, unknown>
    expect(options?.sourcemaps).toMatchObject({ disable: true })
    expect(options?.telemetry).toBe(false)
    expect(options?.release).toMatchObject({ create: false })
    expect(options).not.toHaveProperty('tunnelRoute')
    expect(options).not.toHaveProperty('widenClientFileUpload')
    expect(options).not.toHaveProperty('org')
    expect(options).not.toHaveProperty('project')
  })

  it('deriva o release público e do plugin do APP_VERSION do build', async () => {
    vi.stubEnv('APP_VERSION', 'synthetic-sha-123')
    const config = await loadNextConfig()

    expect(config.env).toMatchObject({ NEXT_PUBLIC_APP_VERSION: 'synthetic-sha-123' })
    const options = sentryConfig.withSentryConfig.mock.calls[0]?.[1] as Record<string, unknown>
    expect(options?.release).toMatchObject({ name: 'synthetic-sha-123', create: false })
  })
})
