import 'server-only'

import { Pool } from 'pg'

import type { SqlPool } from '@/modules/nuvemshop/server/durability'
import { NuvemshopIntakeError } from '@/modules/nuvemshop/server/durability/errors'

export interface IntakePoolConfig {
  /** Supply the real primary endpoint and custom-role user from Dashboard Connect. */
  host: string
  user: string
  password: string
  database: string
  port: 5432
  mode: 'session'
  /** Omit only when the server chain is trusted by Node's default trust store. */
  ca?: string
  maxConnections?: number
}

/** Lazy bounded pool; it does not derive endpoints, provision roles or read env. */
export function createIntakePool(config: IntakePoolConfig): SqlPool & { close(): Promise<void> } {
  const max = config.maxConnections ?? 2
  if (
    config.mode !== 'session' ||
    config.port !== 5432 ||
    typeof config.host !== 'string' ||
    !/^[a-z0-9][a-z0-9.-]{0,252}$/i.test(config.host) ||
    typeof config.user !== 'string' ||
    !/^nuvemshop_intake_runtime(?:\.[a-z0-9]+)?$/.test(config.user) ||
    typeof config.password !== 'string' ||
    config.password.length === 0 ||
    typeof config.database !== 'string' ||
    config.database.length === 0 ||
    (config.ca !== undefined && (typeof config.ca !== 'string' || config.ca.length === 0)) ||
    !Number.isInteger(max) ||
    max < 1 ||
    max > 5
  ) {
    throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_CONFIG_ERROR')
  }
  // Explicit fields prevent connection-string SSL parameters replacing validation.
  const pool = new Pool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: config.port,
    ssl: { rejectUnauthorized: true, ...(config.ca === undefined ? {} : { ca: config.ca }) },
    max,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    maxLifetimeSeconds: 300,
    statement_timeout: 5000,
    query_timeout: 6000,
    lock_timeout: 2000,
    idle_in_transaction_session_timeout: 10000,
    application_name: 'nuvemshop-intake',
  })
  // pg removes a broken idle client. Never forward its credential-bearing error.
  pool.on('error', () => undefined)
  return {
    async connect() {
      try {
        const client = await pool.connect()
        let failed = false
        const onError = () => {
          failed = true
        }
        client.on('error', onError)
        return {
          query: (text, values) => {
            if (failed) {
              return Promise.reject(new NuvemshopIntakeError('NUVEMSHOP_INTAKE_STORAGE_ERROR'))
            }
            return client.query(text, values === undefined ? undefined : [...values])
          },
          release: (error) => {
            client.removeListener('error', onError)
            client.release(error || failed)
          },
        }
      } catch {
        throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_STORAGE_ERROR')
      }
    },
    close: () => pool.end(),
  }
}
