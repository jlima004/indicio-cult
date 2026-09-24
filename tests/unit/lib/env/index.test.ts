import { readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const validEnv = {
  NEXT_PUBLIC_SITE_URL: 'https://indiciocult.com.br',
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
}

function stubEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    vi.stubEnv(key, value)
  }
}

async function loadEnv() {
  vi.resetModules()
  return import('@/lib/env')
}

beforeEach(() => {
  stubEnv({
    ...validEnv,
    APP_VERSION: undefined,
    MAINTENANCE_MODE: undefined,
    SENTRY_DSN: undefined,
    NEXT_PUBLIC_SENTRY_DSN: undefined,
  })
})

describe('env (servidor)', () => {
  it('expõe as variáveis de servidor e re-exporta publicEnv', async () => {
    const { env, publicEnv } = await loadEnv()

    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('service-role-key')
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('https://abc.supabase.co')
  })

  it('falha no import nomeando a variável de servidor ausente', async () => {
    stubEnv({ SUPABASE_SERVICE_ROLE_KEY: undefined })

    await expect(loadEnv()).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it('MAINTENANCE_MODE é false por padrão e vira boolean quando definido', async () => {
    expect((await loadEnv()).env.MAINTENANCE_MODE).toBe(false)

    stubEnv({ MAINTENANCE_MODE: 'true' })
    expect((await loadEnv()).env.MAINTENANCE_MODE).toBe(true)
  })

  it('rejeita MAINTENANCE_MODE fora de true/false', async () => {
    stubEnv({ MAINTENANCE_MODE: 'yes' })

    await expect(loadEnv()).rejects.toThrow(/MAINTENANCE_MODE/)
  })

  it('APP_VERSION é "dev" quando a imagem não injeta o sha', async () => {
    expect((await loadEnv()).env.APP_VERSION).toBe('dev')

    stubEnv({ APP_VERSION: 'a1b2c3d' })
    expect((await loadEnv()).env.APP_VERSION).toBe('a1b2c3d')
  })

  it('SENTRY_DSN opcional: vazio vira undefined, URL é aceita', async () => {
    stubEnv({ SENTRY_DSN: '' })
    expect((await loadEnv()).env.SENTRY_DSN).toBeUndefined()

    stubEnv({ SENTRY_DSN: 'https://key@o1.ingest.sentry.io/1' })
    expect((await loadEnv()).env.SENTRY_DSN).toBe('https://key@o1.ingest.sentry.io/1')
  })
})

describe('.env.example', () => {
  // Chaves que só ferramentas externas leem (Supabase CLI). Ficam no
  // .env.example para a operadora, mas a aplicação não as valida. Adicionar
  // uma chave aqui é decisão explícita, não acidente.
  const toolingOnlyKeys = ['SUPABASE_PROJECT_ID']

  // Chaves que o runtime define sozinho (o Next fixa NODE_ENV pelo comando e
  // ignora o valor de arquivos .env). Estão no schema, não no .env.example.
  const runtimeProvidedKeys = ['NODE_ENV']

  function exampleKeys() {
    const file = readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8')
    return file
      .split('\n')
      .map((line) => /^([A-Z][A-Z0-9_]*)=/.exec(line)?.[1])
      .filter((key): key is string => key !== undefined)
  }

  it('tem exatamente as chaves dos schemas mais as de tooling', async () => {
    const { serverSchema, publicSchema } = await loadEnv()

    const expectedKeys = [
      ...Object.keys(serverSchema.shape),
      ...Object.keys(publicSchema.shape),
      ...toolingOnlyKeys,
    ].filter((key) => !runtimeProvidedKeys.includes(key))

    expect([...exampleKeys()].sort()).toEqual([...expectedKeys].sort())
  })

  it('não inclui chaves que o runtime define sozinho', () => {
    for (const key of runtimeProvidedKeys) {
      expect(exampleKeys()).not.toContain(key)
    }
  })

  it('não repete chaves', () => {
    const keys = exampleKeys()

    expect(new Set(keys).size).toBe(keys.length)
  })
})
