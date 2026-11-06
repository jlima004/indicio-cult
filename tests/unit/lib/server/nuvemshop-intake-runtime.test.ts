// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const pool = vi.hoisted(() => vi.fn(() => ({ connect: vi.fn(), close: vi.fn() })))
vi.mock('@/lib/server/nuvemshop-intake-pool', () => ({ createIntakePool: pool }))

beforeEach(() => {
  vi.resetModules()
  pool.mockClear()
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NUVEMSHOP_INTAKE_HOST', 'pool.example.invalid')
  vi.stubEnv('NUVEMSHOP_INTAKE_USER', 'nuvemshop_intake_runtime')
  vi.stubEnv('NUVEMSHOP_INTAKE_PASSWORD', 'local-secret')
  vi.stubEnv('NUVEMSHOP_INTAKE_DATABASE', 'postgres')
  vi.stubEnv('NUVEMSHOP_INTAKE_PORT', '5432')
  vi.stubEnv('NUVEMSHOP_INTAKE_MODE', 'session')
  vi.stubEnv('NUVEMSHOP_INTAKE_CA', undefined)
  vi.stubEnv('NUVEMSHOP_INTAKE_MAX_CONNECTIONS', undefined)
})
afterEach(() => vi.unstubAllEnvs())

it('imports lazily and creates one bounded pool only on demand', async () => {
  const { getNuvemshopIntakeLedger } = await import('@/lib/server/nuvemshop-intake-runtime')
  expect(pool).not.toHaveBeenCalled()
  expect(getNuvemshopIntakeLedger()).toBe(getNuvemshopIntakeLedger())
  expect(pool).toHaveBeenCalledTimes(1)
  expect(pool).toHaveBeenCalledWith(
    expect.objectContaining({ port: 5432, mode: 'session', host: 'pool.example.invalid' }),
  )
})
it.each([
  ['NUVEMSHOP_INTAKE_PASSWORD', ''],
  ['NUVEMSHOP_INTAKE_PORT', '6543'],
  ['NUVEMSHOP_INTAKE_MODE', 'transaction'],
  ['NUVEMSHOP_INTAKE_MAX_CONNECTIONS', '6'],
])('rejects invalid %s before constructing a pool', async (key, value) => {
  vi.stubEnv(key, value)
  const { getNuvemshopIntakeLedger } = await import('@/lib/server/nuvemshop-intake-runtime')
  expect(() => getNuvemshopIntakeLedger()).toThrow()
  expect(pool).not.toHaveBeenCalled()
})
