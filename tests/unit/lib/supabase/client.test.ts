import { beforeEach, describe, expect, it, vi } from 'vitest'

// `supabaseUrl`/`supabaseKey` são `protected` no SupabaseClient; em runtime
// existem e são a forma de verificar para onde o cliente aponta sem mockar.
function target(client: unknown) {
  return client as { supabaseUrl: string; supabaseKey: string }
}

async function loadClient() {
  vi.resetModules()
  return import('@/lib/supabase/client')
}

describe('supabase/client (navegador)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://indiciocult.com.br')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    // Nenhuma variável de servidor: o módulo só pode depender de publicEnv.
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', undefined)
  })

  it('cria um cliente apontando para a URL e a anon key públicas', async () => {
    const { createClient } = await loadClient()

    const client = createClient()

    expect(target(client).supabaseUrl).toBe('https://abc.supabase.co')
    expect(target(client).supabaseKey).toBe('anon-key')
  })

  it('funciona sem nenhuma variável de servidor definida', async () => {
    // Se importasse `@/lib/env` (servidor), o import falharia por falta de
    // SUPABASE_SERVICE_ROLE_KEY.
    await expect(loadClient()).resolves.toHaveProperty('createClient')
  })
})
