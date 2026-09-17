import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function target(client: unknown) {
  return client as {
    supabaseUrl: string
    supabaseKey: string
    auth: { persistSession: boolean; autoRefreshToken: boolean }
  }
}

async function loadAdmin() {
  vi.resetModules()
  return import('@/lib/supabase/admin')
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://indiciocult.com.br')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
})

describe('supabase/admin (service role)', () => {
  it('cria um cliente com a service role key apontando para a URL pública', async () => {
    const { createAdminClient } = await loadAdmin()

    const client = createAdminClient()

    expect(target(client).supabaseUrl).toBe('https://abc.supabase.co')
    expect(target(client).supabaseKey).toBe('service-role-key')
  })

  it('não persiste nem renova sessão (não há usuário; é o servidor agindo)', async () => {
    const { createAdminClient } = await loadAdmin()

    const client = createAdminClient()

    expect(target(client).auth.persistSession).toBe(false)
    expect(target(client).auth.autoRefreshToken).toBe(false)
  })
})

describe('supabase/admin fora de React Server', () => {
  afterEach(() => {
    // Restaura o no-op global de tests/setup.ts para os demais arquivos.
    vi.doMock('server-only', () => ({}))
    vi.doUnmock('@/lib/env')
  })

  it('não é importável: o `server-only` real lança no import', async () => {
    // `@/lib/env` também importa `server-only`; substituído aqui para que só o
    // import feito por admin.ts possa lançar (garante que admin.ts o declara).
    vi.doMock('@/lib/env', () => ({
      env: { SUPABASE_SERVICE_ROLE_KEY: 'service-role-key' },
      publicEnv: { NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' },
    }))
    vi.doUnmock('server-only')

    await expect(loadAdmin()).rejects.toThrow(/cannot be imported from a Client Component/)
  })
})
