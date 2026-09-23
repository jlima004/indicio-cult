import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sentry = vi.hoisted(() => ({ init: vi.fn() }))

vi.mock('@sentry/nextjs', () => sentry)

const validEnv = {
  NEXT_PUBLIC_SITE_URL: 'https://indiciocult.com.br',
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
}

async function loadNodeInstrumentation() {
  vi.resetModules()
  return import('@/instrumentation.node')
}

describe('instrumentation do runtime Node', () => {
  beforeEach(() => {
    sentry.init.mockClear()
    for (const [key, value] of Object.entries(validEnv)) {
      vi.stubEnv(key, value)
    }
    vi.stubEnv('SENTRY_DSN', undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('conclui o bootstrap quando as variáveis obrigatórias são válidas', async () => {
    const { registerNode } = await loadNodeInstrumentation()

    await expect(registerNode()).resolves.toBeUndefined()
    expect(sentry.init).not.toHaveBeenCalled()
  })

  it('nomeia a variável inválida e encerra o processo com código 1', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', undefined)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`)
    })
    const { registerNode } = await loadNodeInstrumentation()

    await expect(registerNode()).rejects.toThrow('process.exit:1')
    expect(consoleError).toHaveBeenCalledWith(expect.stringMatching(/SUPABASE_SERVICE_ROLE_KEY/))
    expect(exit).toHaveBeenCalledWith(1)
    expect(sentry.init).not.toHaveBeenCalled()
  })

  it('inicializa o Sentry com amostragem, privacidade, release e ambiente aprovados', async () => {
    vi.stubEnv('SENTRY_DSN', 'https://public@example.invalid/1')
    vi.stubEnv('APP_VERSION', 'test-release-123')
    vi.stubEnv('NODE_ENV', 'development')
    const { registerNode } = await loadNodeInstrumentation()

    await registerNode()

    expect(sentry.init.mock.calls.length).toBe(1)
    const options = sentry.init.mock.calls[0]?.[0] as Record<string, unknown>
    const dataCollection = options?.dataCollection as Record<string, unknown> | undefined
    expect(options?.dsn === 'https://public@example.invalid/1').toBe(true)
    expect(options?.tracesSampleRate).toBe(0.1)
    expect(options?.release).toBe('test-release-123')
    expect(options?.environment).toBe('development')
    expect(dataCollection?.userInfo).toBe(false)
    expect(dataCollection?.httpBodies).toEqual([])
  })
})
