import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => sentry)

const validEnv = {
  NEXT_PUBLIC_SITE_URL: 'https://indiciocult.com.br',
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
}

async function loadInstrumentation() {
  vi.resetModules()
  return import('@/instrumentation')
}

describe('seleção de runtime da instrumentation', () => {
  beforeEach(() => {
    sentry.init.mockClear()
    sentry.captureRequestError.mockClear()
    for (const [key, value] of Object.entries(validEnv)) {
      vi.stubEnv(key, value)
    }
    vi.stubEnv('SENTRY_DSN', undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('não carrega o bootstrap Node-only no runtime Edge', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', undefined)
    vi.stubEnv('SENTRY_DSN', 'https://public@example.invalid/1')
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`)
    })
    const { register } = await loadInstrumentation()

    await expect(register()).resolves.toBeUndefined()
    expect(exit).not.toHaveBeenCalled()
    expect(sentry.init).not.toHaveBeenCalled()
  })

  it('carrega o bootstrap fail-fast no runtime Node', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`)
    })
    const { register } = await loadInstrumentation()

    await expect(register()).rejects.toThrow('process.exit:1')
    expect(exit).toHaveBeenCalledWith(1)
    expect(sentry.init).not.toHaveBeenCalled()
  })

  it('inicializa o Sentry uma única vez depois do bootstrap Node válido', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.stubEnv('SENTRY_DSN', 'https://public@example.invalid/1')
    const { register } = await loadInstrumentation()

    await register()

    expect(sentry.init).toHaveBeenCalledTimes(1)
  })

  it('não captura erros de request quando o DSN está ausente ou o runtime é Edge', async () => {
    const error = new Error('Erro sintético')
    const request = { path: '/', method: 'GET', headers: {} }
    const context = {
      routerKind: 'App Router' as const,
      routePath: '/app/page',
      routeType: 'render' as const,
      renderSource: 'server-rendering' as const,
      revalidateReason: undefined,
    }
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    const node = await loadInstrumentation()
    await node.onRequestError(error, request, context)
    expect(sentry.captureRequestError.mock.calls.length).toBe(0)

    vi.stubEnv('NEXT_RUNTIME', 'edge')
    vi.stubEnv('SENTRY_DSN', 'https://public@example.invalid/1')
    const edge = await loadInstrumentation()
    await edge.onRequestError(error, request, context)
    expect(sentry.captureRequestError.mock.calls.length).toBe(0)
  })

  it('captura uma vez o erro de request no Node com DSN', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.stubEnv('SENTRY_DSN', 'https://public@example.invalid/1')
    const { onRequestError } = await loadInstrumentation()

    await onRequestError(
      new Error('Erro sintético'),
      { path: '/', method: 'GET', headers: {} },
      {
        routerKind: 'App Router',
        routePath: '/app/page',
        routeType: 'render',
        renderSource: 'server-rendering',
        revalidateReason: undefined,
      },
    )

    expect(sentry.captureRequestError.mock.calls.length).toBe(1)
  })

  it('não encaminha parâmetros de URL ao contexto do Sentry', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.stubEnv('SENTRY_DSN', 'https://public@example.invalid/1')
    const { onRequestError } = await loadInstrumentation()

    await onRequestError(
      new Error('Erro sintético'),
      { path: '/?boom=1&token=synthetic', method: 'GET', headers: {} },
      {
        routerKind: 'App Router',
        routePath: '/app/page',
        routeType: 'render',
        renderSource: 'server-rendering',
        revalidateReason: undefined,
      },
    )

    expect(sentry.captureRequestError.mock.calls[0]?.[1].path).toBe('/')
  })
})
