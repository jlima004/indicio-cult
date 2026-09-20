import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    for (const [key, value] of Object.entries(validEnv)) {
      vi.stubEnv(key, value)
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('conclui o bootstrap quando as variáveis obrigatórias são válidas', async () => {
    const { registerNode } = await loadNodeInstrumentation()

    await expect(registerNode()).resolves.toBeUndefined()
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
  })
})
