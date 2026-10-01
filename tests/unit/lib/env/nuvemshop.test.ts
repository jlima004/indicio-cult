import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiValues = {
  NUVEMSHOP_STORE_ID: '123456789012345678901234567890',
  NUVEMSHOP_ACCESS_TOKEN: 'synthetic-access-token',
}

function stubEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value)
}

async function loadConfig() {
  return import('@/lib/env/nuvemshop')
}

beforeEach(() => {
  vi.resetModules()
  stubEnv({
    NODE_ENV: 'test',
    ...apiValues,
    NUVEMSHOP_CLIENT_SECRET: 'synthetic-client-secret',
    NUVEMSHOP_APP_ID: undefined,
    NUVEMSHOP_API_VERSION: undefined,
  })
})

afterEach(() => {
  vi.doMock('server-only', () => ({}))
})

describe('Nuvemshop runtime config', () => {
  it('imports without any Foundation or Nuvemshop credentials', async () => {
    stubEnv({
      NODE_ENV: 'production',
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      NEXT_PUBLIC_SITE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NUVEMSHOP_STORE_ID: undefined,
      NUVEMSHOP_ACCESS_TOKEN: undefined,
      NUVEMSHOP_CLIENT_SECRET: undefined,
    })
    await expect(loadConfig()).resolves.toBeDefined()
  })

  it('rejects import outside the server boundary', async () => {
    vi.doUnmock('server-only')
    await expect(loadConfig()).rejects.toThrow(/Server Component/)
  })

  it('preserves store ID precision and excludes unrelated config', async () => {
    const { getNuvemshopApiConfig } = await loadConfig()
    expect(getNuvemshopApiConfig()).toEqual({
      storeId: apiValues.NUVEMSHOP_STORE_ID,
      accessToken: apiValues.NUVEMSHOP_ACCESS_TOKEN,
      apiVersion: '2025-03',
    })
  })

  it('does not require APP_ID or client secret for API operations', async () => {
    stubEnv({ NUVEMSHOP_CLIENT_SECRET: undefined })
    const { getNuvemshopApiConfig } = await loadConfig()
    expect(getNuvemshopApiConfig().storeId).toBe(apiValues.NUVEMSHOP_STORE_ID)
  })

  it('does not require store ID or access token for HMAC material', async () => {
    stubEnv({ NUVEMSHOP_STORE_ID: undefined, NUVEMSHOP_ACCESS_TOKEN: undefined })
    const { getNuvemshopHmacConfig } = await loadConfig()
    expect(getNuvemshopHmacConfig()).toEqual({ clientSecret: 'synthetic-client-secret' })
  })

  it('keeps the API version internal despite an environment override', async () => {
    stubEnv({ NUVEMSHOP_API_VERSION: 'consumer-version' })
    const { getNuvemshopApiConfig } = await loadConfig()
    expect(getNuvemshopApiConfig().apiVersion).toBe('2025-03')
  })

  it.each([undefined, '', ' ', '0', '000', '-12', '1.2', '1e3', '12/3', '１２', '12\n'])(
    'rejects missing or malformed store ID (%s) when the API operation asks for config',
    async (value) => {
      stubEnv({ NUVEMSHOP_STORE_ID: value })
      const { getNuvemshopApiConfig } = await loadConfig()
      expect(() => getNuvemshopApiConfig()).toThrow(/NUVEMSHOP_STORE_ID/)
    },
  )

  it.each(['1', '000123', apiValues.NUVEMSHOP_STORE_ID])(
    'preserves valid digits (%s)',
    async (value) => {
      stubEnv({ NUVEMSHOP_STORE_ID: value })
      const { getNuvemshopApiConfig } = await loadConfig()
      expect(getNuvemshopApiConfig().storeId).toBe(value)
    },
  )

  it('validates on each operation instead of capturing credentials at import', async () => {
    const { getNuvemshopApiConfig } = await loadConfig()
    expect(getNuvemshopApiConfig().accessToken).toBe(apiValues.NUVEMSHOP_ACCESS_TOKEN)
    stubEnv({ NUVEMSHOP_ACCESS_TOKEN: undefined })
    expect(() => getNuvemshopApiConfig()).toThrow(/NUVEMSHOP_ACCESS_TOKEN/)
  })

  it.each([
    ['NUVEMSHOP_ACCESS_TOKEN', 'getNuvemshopApiConfig', 'fake-token'],
    ['NUVEMSHOP_CLIENT_SECRET', 'getNuvemshopHmacConfig', 'sample-secret'],
  ] as const)(
    'rejects the adjudicated production sentinel for %s via %s (%s)',
    async (key, getter, value) => {
      stubEnv({ NODE_ENV: 'production', NUVEMSHOP_STORE_ID: '1', [key]: value })
      const config = await loadConfig()
      expect(() => config[getter]()).toThrow(`${key}: placeholder proibido em produção`)
    },
  )

  for (const [key, getter] of [
    ['NUVEMSHOP_ACCESS_TOKEN', 'getNuvemshopApiConfig'],
    ['NUVEMSHOP_CLIENT_SECRET', 'getNuvemshopHmacConfig'],
  ] as const) {
    describe(key, () => {
      it.each([undefined, '', ' \t\n'])('rejects missing or blank values (%s)', async (value) => {
        stubEnv({ [key]: value })
        const config = await loadConfig()
        expect(() => config[getter]()).toThrow(key)
      })

      it.each([
        'changeme',
        'CHANGE_ME',
        'replace-me',
        'your-token',
        '<token>',
        'placeholder',
        'synthetic-secret',
        'ci-unused-foundation-e2e',
        'dummy',
        'example-secret',
        'test-secret',
        'fake',
        'fake-token',
        'fake-secret',
        'sample',
        'sample-token',
        'sample-secret',
        'dummy-token',
        'dummy-secret',
        'test-token',
        ' \tFaKe-ToKeN\n',
        ' \tSaMpLe-SeCrEt\n',
      ])('rejects obvious production placeholders (%s)', async (value) => {
        stubEnv({ NODE_ENV: 'production', [key]: value })
        const config = await loadConfig()
        expect(() => config[getter]()).toThrow(key)
      })

      it('accepts synthetic unit fixtures without inventing token or secret structure', async () => {
        stubEnv({ [key]: 'synthetic opaque value / + = .' })
        const config = await loadConfig()
        expect(Object.values(config[getter]())).toContain('synthetic opaque value / + = .')
      })

      it('accepts opaque production material without imposing a credential format', async () => {
        const value = 'unit fixture: opaque runtime material / + = .'
        stubEnv({ NODE_ENV: 'production', [key]: value })
        const config = await loadConfig()
        expect(Object.values(config[getter]())).toContain(value)
      })

      it.each([
        'unit fixture: opaque fake sample test dummy material / + = .',
        'fake-token-with-sufficient-opaque-content',
        'sample-secret-with-sufficient-opaque-content',
      ])(
        'accepts incidental placeholder words in opaque production material (%s)',
        async (value) => {
          stubEnv({ NODE_ENV: 'production', [key]: value })
          const config = await loadConfig()
          expect(Object.values(config[getter]())).toContain(value)
        },
      )

      it.each(['development', 'test'] as const)(
        'keeps obvious synthetic placeholders available in %s',
        async (nodeEnv) => {
          const value = key === 'NUVEMSHOP_ACCESS_TOKEN' ? 'fake-token' : 'sample-secret'
          stubEnv({ NODE_ENV: nodeEnv, [key]: value })
          const config = await loadConfig()
          expect(Object.values(config[getter]())).toContain(value)
        },
      )

      it('does not expose the rejected secret in errors', async () => {
        const value = 'replace-sensitive-synthetic-fixture'
        stubEnv({ NODE_ENV: 'production', [key]: value })
        const config = await loadConfig()
        let message = ''
        try {
          config[getter]()
        } catch (error) {
          message = (error as Error).message
        }
        expect(message).toContain(key)
        expect(message).not.toContain(value)
        expect(message).not.toContain('sensitive-synthetic-fixture')
      })
    })
  }

  it.each([
    'NEXT_PUBLIC_NUVEMSHOP_ACCESS_TOKEN',
    'NEXT_PUBLIC_NUVEMSHOP_STORE_ID',
    'NEXT_PUBLIC_NUVEMSHOP_UNKNOWN_SECRET',
  ])('rejects any public Nuvemshop key dynamically (%s), even empty', async (key) => {
    stubEnv({ [key]: '' })
    const { getNuvemshopApiConfig, getNuvemshopHmacConfig } = await loadConfig()
    expect(() => getNuvemshopApiConfig()).toThrow(key)
    expect(() => getNuvemshopHmacConfig()).toThrow(key)
  })
})
