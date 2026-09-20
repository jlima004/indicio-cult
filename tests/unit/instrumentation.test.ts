import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    for (const [key, value] of Object.entries(validEnv)) {
      vi.stubEnv(key, value)
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('não carrega o bootstrap Node-only no runtime Edge', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', undefined)
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`)
    })
    const { register } = await loadInstrumentation()

    await expect(register()).resolves.toBeUndefined()
    expect(exit).not.toHaveBeenCalled()
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
  })
})
