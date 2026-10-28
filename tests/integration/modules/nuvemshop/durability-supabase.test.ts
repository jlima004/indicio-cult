import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createIntakeLedger, type SqlPool } from '@/modules/nuvemshop/server/durability'
import type { VerifiedWebhookEvent } from '@/modules/nuvemshop/server/webhook-schema'

// Manual, separately authorized rehearsal only. The default unit/local-PG configs
// do not collect this file. The guard is not evidence of human authorization.
const schema = 'nuv16_20261026_test'
const role = 'nuv16_20261026_test_runtime'
const ids: string[] = []
let writer: Pool | undefined
let reader: Pool | undefined
let ledger: ReturnType<typeof createIntakeLedger>
const policy = { reference: 'synthetic-rehearsal-policy', version: 1, allows: () => true }
const exactId = '987654321098765432109876543210'

function database(pool: Pool | undefined): Pool {
  if (!pool) throw new Error('Authorized rehearsal was not initialized')
  return pool
}
function attempt() {
  const id = randomUUID()
  ids.push(id)
  return id
}
function webhook(event: VerifiedWebhookEvent['event']): VerifiedWebhookEvent {
  const base = { storeId: exactId, correlationId: randomUUID() }
  if (event === 'app/uninstalled') return { ...base, event, appId: exactId }
  if (event === 'app/suspended' || event === 'app/resumed') return { ...base, event }
  return { ...base, event, resourceId: exactId }
}

beforeAll(async () => {
  if (
    process.env.NUV16_SUPABASE_APPROVED_MANIFEST !== 'nuv16-isolated-20261026-reviewed' ||
    !process.env.NUV16_SUPABASE_TEST_PASSWORD
  ) {
    throw new Error('Separate explicit approval, verified manifest and test credential required')
  }
  const config = {
    // Owner-supplied Dashboard Connect Session Pooler metadata; no ref inference.
    host: 'aws-1-us-west-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: `${role}.yltdunvupsdyyznkvdxx`,
    password: process.env.NUV16_SUPABASE_TEST_PASSWORD,
    ssl: {
      rejectUnauthorized: true,
      ca: readFileSync('/home/jlima/.config/indicio-cult/certs/supabase-ca.crt', 'utf8'),
    },
    max: 1,
    connectionTimeoutMillis: 5000,
    query_timeout: 6000,
    statement_timeout: 5000,
    lock_timeout: 2000,
    idle_in_transaction_session_timeout: 10000,
    application_name: 'nuv16-isolated-rehearsal',
  }
  writer = new Pool(config)
  reader = new Pool(config)
  writer.on('error', () => undefined)
  reader.on('error', () => undefined)
  const identity = await writer.query('SELECT current_user, pg_backend_pid() AS pid')
  expect(identity.rows[0].current_user).toBe(role)
  const independent = await reader.query('SELECT pg_backend_pid() AS pid')
  expect(independent.rows[0].pid).not.toBe(identity.rows[0].pid)
  const sqlPool: SqlPool = {
    async connect() {
      const client = await database(writer).connect()
      return {
        // Fixed, test-only namespace mapping. The production adapter has no schema
        // override; statement structure/parameters/transaction client stay intact.
        query: (text, values) =>
          client.query(
            text.replaceAll('nuvemshop_intake.', `${schema}.`),
            values ? [...values] : undefined,
          ),
        release: (error) => client.release(error),
      }
    },
  }
  ledger = createIntakeLedger(sqlPool, { unknownEventPolicy: policy })
})

afterAll(async () => {
  await Promise.all([writer?.end(), reader?.end()])
  // Record only synthetic identifiers for the separately approved cleanup plan.
  if (ids.length) console.info('NUV16_SYNTHETIC_REHEARSAL_IDS', JSON.stringify(ids))
})

describe('NUV-16 separately authorized Supabase adapter compatibility', () => {
  it.each([
    'product/updated',
    'order/paid',
    'order/fulfilled',
    'order/cancelled',
    'app/uninstalled',
    'app/suspended',
    'app/resumed',
  ] as const)('commits %s recoverable through an independent connection', async (event) => {
    const id = attempt()
    const eventInput = webhook(event)
    const result = await ledger.persist({ attemptId: id, webhook: eventInput })
    expect(result).toMatchObject({ receiptId: id, classification: 'received', workId: id })
    const persisted = await database(reader).query(
      `SELECT r.projection, w.receipt_id FROM ${schema}.receipts r
       JOIN ${schema}.work w ON w.receipt_id=r.attempt_id WHERE r.attempt_id=$1`,
      [id],
    )
    expect(persisted.rows).toEqual([{ projection: eventInput, receipt_id: id }])
  })

  it('reconciles the same attempt and tracks distinct legitimate deliveries', async () => {
    const eventInput = webhook('order/paid')
    const id = attempt()
    const first = await ledger.persist({ attemptId: id, webhook: eventInput })
    expect(await ledger.persist({ attemptId: id, webhook: eventInput })).toEqual(first)
    expect(await ledger.findByAttemptId(id)).toEqual(first)
    await expect(
      ledger.persist({
        attemptId: id,
        webhook: { ...eventInput, correlationId: randomUUID() },
      }),
    ).rejects.toMatchObject({ code: 'NUVEMSHOP_INTAKE_IDENTITY_CONFLICT' })
    const second = await ledger.persist({ attemptId: attempt(), webhook: eventInput })
    expect(second.receiptId).not.toBe(id)
  })

  it('commits eligible unknown as terminal without work or invented IDs', async () => {
    const id = attempt()
    const result = await ledger.persist({
      attemptId: id,
      webhook: {
        classification: 'unknown_ignore_eligible',
        event: 'catalog/reindexed',
        storeId: exactId,
        correlationId: randomUUID(),
      },
    })
    expect(result).toMatchObject({ classification: 'ignored_unknown_event', workId: null })
    expect(result.terminalAt).not.toBeNull()
    const work = await database(reader).query(`SELECT 1 FROM ${schema}.work WHERE receipt_id=$1`, [
      id,
    ])
    expect(work.rowCount).toBe(0)
  })

  it('rejects receipt-only partial runtime DML at COMMIT and rolls it back', async () => {
    const id = attempt()
    const client = await database(writer).connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO ${schema}.receipts
        (attempt_id,family,contract_version,classification,projection,retention_policy_key)
        VALUES($1,'business',1,'received',$2,'business-v1')`,
        [id, webhook('order/paid')],
      )
      await expect(client.query('COMMIT')).rejects.toMatchObject({ code: '23503' })
      await client.query('ROLLBACK')
    } finally {
      client.release(true)
    }
    expect(await ledger.findByAttemptId(id)).toBeNull()
  })

  it('rejects orphan work at COMMIT', async () => {
    const client = await database(writer).connect()
    try {
      await client.query('BEGIN')
      await client.query(`INSERT INTO ${schema}.work(receipt_id) VALUES($1)`, [attempt()])
      await expect(client.query('COMMIT')).rejects.toMatchObject({ code: '23503' })
      await client.query('ROLLBACK')
    } finally {
      client.release(true)
    }
  })

  it('cannot assume the owner or mutate ledger state through unrestricted DML', async () => {
    for (const text of [
      `UPDATE ${schema}.receipts SET incident_hold=true`,
      `DELETE FROM ${schema}.work`,
      `TRUNCATE ${schema}.work`,
      `SET ROLE nuv16_20261026_test_owner`,
    ])
      await expect(database(writer).query(text)).rejects.toMatchObject({ code: '42501' })
    const grants = await database(writer).query(
      `SELECT rolname,has_schema_privilege(rolname,$1,'USAGE') AS allowed
       FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated','service_role')`,
      [schema],
    )
    expect(grants.rows).toHaveLength(3)
    expect(grants.rows.every((row: { allowed: boolean }) => row.allowed === false)).toBe(true)
  })
})
