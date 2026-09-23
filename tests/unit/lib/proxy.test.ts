import { createServerClient } from '@supabase/ssr'
import {
  getRedirectUrl,
  getRewrittenUrl,
  unstable_doesMiddlewareMatch,
} from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { config, proxy, RETRY_AFTER_SECONDS } from '@/proxy'
import { decideProxyAction, isHealthPath, isProtectedPath } from '@/lib/proxy/rules'

type CookieAdapter = {
  getAll: () => { name: string; value: string }[]
  setAll?: (
    cookies: { name: string; value: string; options: Record<string, unknown> }[],
    headers: Record<string, string>,
  ) => Promise<void> | void
}

type CreateServerClientOptions = Parameters<typeof createServerClient>[2]

const mocks = vi.hoisted(() => ({
  env: { MAINTENANCE_MODE: false },
  getClaims: vi.fn(),
  getSession: vi.fn(),
  loadMaintenanceHtml: vi.fn(
    async () =>
      '<!doctype html><html><body>O arquivo está em ajuste. Voltamos em breve.</body></html>',
  ),
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  },
}))

vi.mock('@/lib/env', () => ({ env: mocks.env, publicEnv: mocks.publicEnv }))
vi.mock('@/lib/proxy/maintenance', () => ({
  loadMaintenanceHtml: mocks.loadMaintenanceHtml,
}))
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }))

let cookieAdapter: CookieAdapter | undefined

function request(pathname: string, cookie?: string) {
  return new NextRequest(`https://indiciocult.com.br${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  })
}

describe('regras puras do Proxy', () => {
  it.each(['/conta', '/conta/', '/conta/perfil', '/admin', '/admin/pedidos'])(
    'protege o segmento real %s',
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(true)
    },
  )

  it.each(['/contabilidade', '/administracao', '/conta-falsa', '/administração'])(
    'não confunde o prefixo de %s com um segmento protegido',
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(false)
    },
  )

  it('reconhece somente o endpoint operacional de health', () => {
    expect(isHealthPath('/api/health')).toBe(true)
    expect(isHealthPath('/api/healthcheck')).toBe(false)
  })

  it.each(['/', '/conta', '/admin'])('maintenance ganha da sessão em %s', (pathname) => {
    expect(decideProxyAction({ pathname, maintenanceMode: true, hasVerifiedClaims: true })).toBe(
      'maintenance',
    )
  })

  it('maintenance desligada mantém rota pública no fluxo normal', () => {
    expect(
      decideProxyAction({ pathname: '/', maintenanceMode: false, hasVerifiedClaims: false }),
    ).toBe('continue')
  })

  it('health ignora maintenance', () => {
    expect(
      decideProxyAction({
        pathname: '/api/health',
        maintenanceMode: true,
        hasVerifiedClaims: false,
      }),
    ).toBe('continue')
  })

  it.each(['/conta', '/conta/perfil', '/admin', '/admin/pedidos'])(
    'redireciona %s sem claims verificadas',
    (pathname) => {
      expect(
        decideProxyAction({ pathname, maintenanceMode: false, hasVerifiedClaims: false }),
      ).toBe('redirect')
    },
  )

  it('permite rota protegida com claims verificadas', () => {
    expect(
      decideProxyAction({
        pathname: '/conta',
        maintenanceMode: false,
        hasVerifiedClaims: true,
      }),
    ).toBe('continue')
  })
})

describe('matcher do Proxy', () => {
  it.each([
    '/',
    '/qualquer-coisa',
    '/manutencao',
    '/conta',
    '/conta/perfil',
    '/admin',
    '/admin/pedidos',
    '/api/health',
    '/_next/staticity',
    '/_next/imagery',
    '/favicon.ico-extra',
  ])('inclui %s', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true)
  })

  it.each(['/_next/static/chunk.js', '/_next/image/image.png', '/favicon.ico'])(
    'exclui %s',
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false)
    },
  )
})

describe('fluxo request/response do Proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.env.MAINTENANCE_MODE = false
    cookieAdapter = undefined
    vi.mocked(createServerClient).mockImplementation(((
      _url: string,
      _key: string,
      options: CreateServerClientOptions,
    ) => {
      cookieAdapter = options.cookies as CookieAdapter
      return { auth: { getClaims: mocks.getClaims, getSession: mocks.getSession } }
    }) as unknown as typeof createServerClient)
    mocks.getClaims.mockResolvedValue({ data: { claims: null }, error: null })
  })

  it('responde terminalmente com manutenção 503 e Retry-After antes de consultar sessão', async () => {
    mocks.env.MAINTENANCE_MODE = true

    const response = await proxy(request('/conta'))

    expect(response.status).toBe(503)
    expect(getRewrittenUrl(response)).toBeNull()
    expect(response.headers.get('retry-after')).toBe(String(RETRY_AFTER_SECONDS))
    await expect(response.text()).resolves.toContain('O arquivo está em ajuste. Voltamos em breve.')
    expect(createServerClient).not.toHaveBeenCalled()
    expect(mocks.getClaims).not.toHaveBeenCalled()
  })

  it('serve /manutencao diretamente com corpo e 503, sem self-rewrite', async () => {
    mocks.env.MAINTENANCE_MODE = true

    const response = await proxy(request('/manutencao'))

    expect(response.status).toBe(503)
    expect(getRewrittenUrl(response)).toBeNull()
    expect(response.headers.get('retry-after')).toBe(String(RETRY_AFTER_SECONDS))
    await expect(response.text()).resolves.toContain('O arquivo está em ajuste. Voltamos em breve.')
  })

  it('não intercepta health nem o torna dependente de sessão durante maintenance', async () => {
    mocks.env.MAINTENANCE_MODE = true

    const response = await proxy(request('/api/health'))

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it('usa getClaims e deixa rota pública sem sessão continuar', async () => {
    const response = await proxy(request('/'))

    expect(createServerClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'anon-key',
      expect.any(Object),
    )
    expect(mocks.getClaims).toHaveBeenCalledOnce()
    expect(mocks.getSession).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('redireciona rota protegida sem claims para / com status 302', async () => {
    const response = await proxy(request('/admin'))

    expect(response.status).toBe(302)
    expect(getRedirectUrl(response)).toBe('https://indiciocult.com.br/')
  })

  it('continua em rota protegida quando getClaims devolve identidade verificada', async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-id' } }, error: null })

    const response = await proxy(request('/conta'))

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('propaga cookies renovados para o request downstream e para o navegador', async () => {
    mocks.getClaims.mockImplementation(async () => {
      await cookieAdapter?.setAll?.(
        [{ name: 'sb-refreshed', value: 'new-token', options: { httpOnly: true, path: '/' } }],
        {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
          Expires: '0',
          Pragma: 'no-cache',
        },
      )
      return { data: { claims: { sub: 'user-id' } }, error: null }
    })

    const response = await proxy(request('/conta', 'existing=1'))

    expect(response.headers.get('x-middleware-request-cookie')).toContain('sb-refreshed=new-token')
    expect(response.cookies.get('sb-refreshed')).toMatchObject({
      value: 'new-token',
      httpOnly: true,
      path: '/',
    })
    expect(response.headers.get('cache-control')).toBe(
      'private, no-cache, no-store, must-revalidate, max-age=0',
    )
    expect(response.headers.get('expires')).toBe('0')
    expect(response.headers.get('pragma')).toBe('no-cache')
  })

  it('preserva cookies e headers do refresh ao trocar a resposta por redirect', async () => {
    mocks.getClaims.mockImplementation(async () => {
      await cookieAdapter?.setAll?.(
        [{ name: 'sb-refreshed', value: 'new-token', options: { httpOnly: true, path: '/' } }],
        {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
          Expires: '0',
          Pragma: 'no-cache',
        },
      )
      return { data: { claims: null }, error: null }
    })

    const response = await proxy(request('/admin', 'existing=1'))

    expect(response.status).toBe(302)
    expect(response.cookies.get('sb-refreshed')).toMatchObject({
      value: 'new-token',
      httpOnly: true,
      path: '/',
    })
    expect(response.headers.get('cache-control')).toBe(
      'private, no-cache, no-store, must-revalidate, max-age=0',
    )
    expect(response.headers.get('expires')).toBe('0')
    expect(response.headers.get('pragma')).toBe('no-cache')
  })
})
