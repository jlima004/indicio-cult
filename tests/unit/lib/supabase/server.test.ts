import { createServerClient } from '@supabase/ssr'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Espia o `createServerClient` real para inspecionar o adaptador de cookies que
// `server.ts` monta; o cliente devolvido continua sendo o verdadeiro.
vi.mock('@supabase/ssr', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@supabase/ssr')>()
  return { ...actual, createServerClient: vi.fn(actual.createServerClient) }
})

const cookieStore = {
  getAll: vi.fn(),
  set: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}))

function target(client: unknown) {
  return client as { supabaseUrl: string; supabaseKey: string }
}

type CookieAdapter = {
  getAll: () => unknown
  setAll?: (cookies: { name: string; value: string; options: Record<string, unknown> }[]) => void
}

function cookieAdapter(): CookieAdapter {
  const options = vi.mocked(createServerClient).mock.calls.at(-1)?.[2]
  if (!options) throw new Error('createServerClient não foi chamado')
  return options.cookies as CookieAdapter
}

async function loadServer() {
  vi.resetModules()
  return import('@/lib/supabase/server')
}

describe('supabase/server (RSC, Route Handlers, Server Actions)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cookieStore.getAll.mockReturnValue([{ name: 'sb-token', value: 'abc' }])
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://indiciocult.com.br')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
  })

  it('cria um cliente apontando para a URL pública com a anon key (nunca service role)', async () => {
    const { createClient } = await loadServer()

    const client = await createClient()

    expect(target(client).supabaseUrl).toBe('https://abc.supabase.co')
    expect(target(client).supabaseKey).toBe('anon-key')
  })

  it('lê os cookies da requisição via cookies() do Next (getAll)', async () => {
    const { createClient } = await loadServer()
    await createClient()

    expect(cookieAdapter().getAll()).toEqual([{ name: 'sb-token', value: 'abc' }])
  })

  it('escreve cada cookie devolvido pelo Supabase no cookie store (setAll)', async () => {
    const { createClient } = await loadServer()
    await createClient()

    cookieAdapter().setAll?.([
      { name: 'sb-a', value: '1', options: { path: '/' } },
      { name: 'sb-b', value: '2', options: { httpOnly: true } },
    ])

    expect(cookieStore.set).toHaveBeenCalledTimes(2)
    expect(cookieStore.set).toHaveBeenCalledWith('sb-a', '1', { path: '/' })
    expect(cookieStore.set).toHaveBeenCalledWith('sb-b', '2', { httpOnly: true })
  })

  it('ignora a falha de escrita em Server Component (só proxy/handlers podem gravar cookies)', async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error('Cookies can only be modified in a Server Action or Route Handler')
    })
    const { createClient } = await loadServer()
    await createClient()

    expect(() =>
      cookieAdapter().setAll?.([{ name: 'sb-a', value: '1', options: {} }]),
    ).not.toThrow()
  })
})
