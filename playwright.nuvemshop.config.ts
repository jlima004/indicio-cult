import { readFileSync } from 'node:fs'
import path from 'node:path'

import { defineConfig } from '@playwright/test'

import baseConfig from './playwright.config'

// Nonstandard filenames keep these exclusive fixtures out of existing selections.
const mode = process.env.NUV19_HTTP_FIXTURE
if (mode !== 'unconfigured' && mode !== 'durable') {
  throw new Error('Set NUV19_HTTP_FIXTURE to unconfigured or durable explicitly')
}
const fixtureEnv: Record<string, string> = {
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_nuv19local',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_nuv19local',
  NUVEMSHOP_CLIENT_SECRET: 'nuv19-local-http-secret',
  NUVEMSHOP_STORE_ID: '9',
  NUVEMSHOP_ACCESS_TOKEN: '',
  NUVEMSHOP_INTAKE_HOST: '',
  NUVEMSHOP_INTAKE_USER: '',
  NUVEMSHOP_INTAKE_PASSWORD: '',
  NUVEMSHOP_INTAKE_DATABASE: '',
  NUVEMSHOP_INTAKE_PORT: '',
  NUVEMSHOP_INTAKE_MODE: '',
  NUVEMSHOP_INTAKE_CA: '',
  NUVEMSHOP_INTAKE_MAX_CONNECTIONS: '',
}
if (mode === 'durable') {
  const socket = process.env.NUV19_TEST_SOCKET
  if (!socket || !/^\/tmp\/nuv19-pg-[A-Za-z0-9_-]+\/socket$/.test(socket)) {
    throw new Error('Durable NUV19 HTTP fixtures require the disposable local PostgreSQL socket')
  }
  Object.assign(fixtureEnv, {
    NUVEMSHOP_INTAKE_HOST: 'localhost',
    NUVEMSHOP_INTAKE_USER: 'nuvemshop_intake_runtime.local19',
    NUVEMSHOP_INTAKE_PASSWORD: 'local-fixture-only',
    NUVEMSHOP_INTAKE_DATABASE: 'nuv19_test',
    NUVEMSHOP_INTAKE_PORT: '5432',
    NUVEMSHOP_INTAKE_MODE: 'session',
    NUVEMSHOP_INTAKE_CA: readFileSync(path.join(socket, '..', 'server.crt'), 'utf8'),
  })
}
const servers = baseConfig.webServer
if (!Array.isArray(servers)) throw new Error('Expected the existing two-server Playwright harness')

export default defineConfig({
  ...baseConfig,
  testMatch:
    mode === 'durable' ? '**/nuvemshop-durable.nuv19.ts' : '**/nuvemshop-webhooks.nuv19.ts',
  testIgnore: [],
  webServer: servers.map((server) => ({ ...server, env: { ...server.env, ...fixtureEnv } })),
})
