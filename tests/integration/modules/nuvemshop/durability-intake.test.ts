import { randomUUID } from 'node:crypto'

import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createIntakeLedger, type SqlPool } from '@/modules/nuvemshop/server/durability'
import type { VerifiedWebhookEvent } from '@/modules/nuvemshop/server/webhook-schema'

// Explicit local socket only. Never consumes the application DSN or Supabase secrets.
const socket = process.env.NUV16_TEST_PG_SOCKET
const port = Number(process.env.NUV16_TEST_PG_PORT)
if (!socket?.startsWith('/tmp/nuv16-pg') || !Number.isInteger(port) || port < 1024) {
  throw new Error('Set NUV16_TEST_PG_SOCKET and NUV16_TEST_PG_PORT for a disposable local cluster.')
}
const settings = { host: socket, port, database: 'nuv16_c_test', connectionTimeoutMillis: 3000 }
const admin = new Pool({ ...settings, user: 'jlima', max: 2 })
const role = 'nuvemshop_intake_runtime'
// A distinct LOGIN is a member of runtime only, never the object owner/admin.
// Unlike an admin session's SET ROLE, this also exercises real escalation denial.
const runtime = new Pool({
  ...settings,
  user: 'nuv16_c_runtime',
  options: `-c role=${role}`,
  max: 2,
})
const reader = new Pool({
  ...settings,
  user: 'nuv16_c_runtime',
  options: `-c role=${role}`,
  max: 1,
})
const ids: string[] = []
const storeId = '123456789012345678901234567890'
const exactId = '987654321098765432109876543210'
const policy = { reference: 'synthetic-owner-policy', version: 1, allows: () => true }
const ledger = createIntakeLedger(runtime, { unknownEventPolicy: policy })
function attempt() {
  const id = randomUUID()
  ids.push(id)
  return id
}
function signal(event: VerifiedWebhookEvent['event']): VerifiedWebhookEvent {
  const base = { storeId, correlationId: randomUUID() }
  if (event === 'app/uninstalled') return { ...base, event, appId: exactId }
  if (event === 'app/suspended' || event === 'app/resumed') return { ...base, event }
  return { ...base, event, resourceId: exactId }
}
async function stored(id: string) {
  const result = await reader.query(
    `SELECT r.*, w.receipt_id AS linked_work_id, w.state AS work_state
       FROM nuvemshop_intake.receipts r
       LEFT JOIN nuvemshop_intake.work w ON w.receipt_id = r.attempt_id
      WHERE r.attempt_id = $1`,
    [id],
  )
  return result.rows
}
async function rawReceipt(client: { query: Pool['query'] }, id: string, event = 'order/paid') {
  return client.query(
    `INSERT INTO nuvemshop_intake.receipts
     (attempt_id,family,contract_version,classification,projection,retention_policy_key)
     VALUES ($1,'business',1,'received',$2,'business-v1')`,
    [id, { event, storeId, resourceId: exactId, correlationId: randomUUID() }],
  )
}
// The injected failure is a real PostgreSQL error on the acquired transaction
// connection, not a simulated store or an assertion of database durability.
function failingWritePool(table: 'receipts' | 'work'): SqlPool {
  return {
    async connect() {
      const client = await runtime.connect()
      return {
        async query(text, values) {
          if (new RegExp(`INSERT\\s+INTO\\s+nuvemshop_intake\\.${table}\\b`, 'i').test(text)) {
            return client.query('SELECT 1/0')
          }
          return client.query(text, values ? [...values] : undefined)
        },
        release(error) {
          client.release(error)
        },
      }
    },
  }
}
beforeAll(async () => {
  const result = await runtime.query('SELECT current_user, inet_server_addr() AS address')
  expect(result.rows[0]).toMatchObject({ current_user: role, address: null })
})
afterAll(async () => {
  try {
    const client = await admin.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM nuvemshop_intake.work WHERE receipt_id = ANY($1::uuid[])', [
        ids,
      ])
      await client.query(
        'DELETE FROM nuvemshop_intake.receipts WHERE attempt_id = ANY($1::uuid[])',
        [ids],
      )
      await client.query('COMMIT')
    } finally {
      client.release()
    }
  } finally {
    await Promise.all([runtime.end(), reader.end(), admin.end()])
  }
})

describe('NUV-16 actual local PostgreSQL durability', () => {
  it.each([
    'product/updated',
    'order/paid',
    'order/fulfilled',
    'order/cancelled',
    'app/uninstalled',
    'app/suspended',
    'app/resumed',
  ] as const)(
    'commits %s with exact minimal intent visible on another connection',
    async (event) => {
      const id = attempt()
      const webhook = signal(event)
      const result = await ledger.persist({ attemptId: id, webhook })
      expect(result).toMatchObject({ receiptId: id, workId: id, classification: 'received' })
      const rows = await stored(id)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        attempt_id: id,
        classification: 'received',
        linked_work_id: id,
        work_state: 'received',
        terminal_at: null,
        projection: webhook,
        incident_hold: false,
      })
      expect(rows[0].intake_at).toBeInstanceOf(Date)
      expect(rows[0].retention_policy_key).toBe(
        event.startsWith('app/') ? 'lifecycle-v1' : 'business-v1',
      )
    },
  )

  it('creates distinct receipts for two legitimate identical deliveries', async () => {
    const webhook = signal('order/paid')
    const first = attempt()
    const second = attempt()
    await ledger.persist({ attemptId: first, webhook })
    await ledger.persist({ attemptId: second, webhook })
    expect((await stored(first))[0].linked_work_id).toBe(first)
    expect((await stored(second))[0].linked_work_id).toBe(second)
  })

  it('independent restricted reader recovers work and its normalized intent through a JOIN', async () => {
    const id = attempt()
    const webhook = signal('order/paid')
    await ledger.persist({ attemptId: id, webhook })
    const result = await reader.query(
      `SELECT w.receipt_id,w.state,r.projection
         FROM nuvemshop_intake.work w
         JOIN nuvemshop_intake.receipts r ON r.attempt_id=w.receipt_id
        WHERE w.receipt_id=$1`,
      [id],
    )
    expect(result.rows).toEqual([{ receipt_id: id, state: 'received', projection: webhook }])
  })

  it('reuses a stable internal attempt and rejects different content under that identity', async () => {
    const id = attempt()
    const webhook = signal('order/paid')
    const original = await ledger.persist({ attemptId: id, webhook })
    expect(await ledger.persist({ attemptId: id, webhook })).toEqual(original)
    await expect(
      ledger.persist({ attemptId: id, webhook: { ...webhook, correlationId: randomUUID() } }),
    ).rejects.toMatchObject({ code: 'NUVEMSHOP_INTAKE_IDENTITY_CONFLICT' })
    expect(await ledger.findByAttemptId(id)).toEqual(original)
    expect((await stored(id))[0].projection).toEqual(webhook)
  })

  it('commits explicitly allowed unknown as a terminal receipt without work or invented IDs', async () => {
    const id = attempt()
    const webhook = {
      classification: 'unknown_ignore_eligible' as const,
      event: 'catalog/reindexed',
      storeId,
      correlationId: randomUUID(),
    }
    const result = await ledger.persist({ attemptId: id, webhook })
    expect(result).toMatchObject({
      receiptId: id,
      classification: 'ignored_unknown_event',
      workId: null,
    })
    const [row] = await stored(id)
    expect(row.linked_work_id).toBeNull()
    expect(row.work_id).toBeNull()
    expect(row.terminal_at).toEqual(row.intake_at)
    expect(row.projection).toEqual({
      event: webhook.event,
      storeId,
      correlationId: webhook.correlationId,
    })
    expect(row).toMatchObject({
      retention_policy_key: 'unknown-v1',
      unknown_policy_key: policy.reference,
      unknown_policy_version: policy.version,
    })
  })

  it('drops arbitrary input fields before persisting business projections', async () => {
    const id = attempt()
    const base = signal('order/paid')
    const webhook = {
      ...base,
      rawBody: 'synthetic-forbidden-body',
      customerEmail: 'synthetic@example.invalid',
      hmac: 'synthetic-forbidden-hmac',
      headers: { authorization: 'synthetic-forbidden-token' },
      url: 'https://provider.invalid/forbidden',
    }
    await ledger.persist({ attemptId: id, webhook })
    expect((await stored(id))[0].projection).toEqual(base)
  })

  it('rolls back receipt when a later work write fails on real PostgreSQL', async () => {
    const id = attempt()
    const client = await runtime.connect()
    try {
      await client.query('BEGIN')
      await rawReceipt(client, id)
      await expect(
        client.query('INSERT INTO nuvemshop_intake.work(receipt_id) VALUES ($1)', ['not-a-uuid']),
      ).rejects.toMatchObject({ code: '22P02' })
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
    expect(await stored(id)).toEqual([])
  })

  it('adapter rolls back an inserted business receipt after real PostgreSQL work failure', async () => {
    const id = attempt()
    const faultyLedger = createIntakeLedger(failingWritePool('work'))
    await expect(
      faultyLedger.persist({ attemptId: id, webhook: signal('order/paid') }),
    ).rejects.toMatchObject({ code: 'NUVEMSHOP_INTAKE_STORAGE_ERROR' })
    expect(await stored(id)).toEqual([])
  })

  it('adapter rejects an unknown receipt when its actual PostgreSQL write fails', async () => {
    const id = attempt()
    const faultyLedger = createIntakeLedger(failingWritePool('receipts'), {
      unknownEventPolicy: policy,
    })
    await expect(
      faultyLedger.persist({
        attemptId: id,
        webhook: {
          classification: 'unknown_ignore_eligible',
          event: 'catalog/reindexed',
          storeId,
          correlationId: randomUUID(),
        },
      }),
    ).rejects.toMatchObject({ code: 'NUVEMSHOP_INTAKE_STORAGE_ERROR' })
    expect(await stored(id)).toEqual([])
  })

  it('rejects a processable receipt without work at actual COMMIT', async () => {
    const id = attempt()
    const client = await runtime.connect()
    try {
      await client.query('BEGIN')
      await rawReceipt(client, id)
      await expect(client.query('COMMIT')).rejects.toMatchObject({ code: '23503' })
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
    expect(await stored(id)).toEqual([])
  })

  it('rejects orphan work at actual COMMIT', async () => {
    const id = attempt()
    const client = await runtime.connect()
    try {
      await client.query('BEGIN')
      await client.query('INSERT INTO nuvemshop_intake.work(receipt_id) VALUES ($1)', [id])
      await expect(client.query('COMMIT')).rejects.toMatchObject({ code: '23503' })
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
    expect(
      await reader.query('SELECT * FROM nuvemshop_intake.work WHERE receipt_id=$1', [id]),
    ).toMatchObject({ rows: [] })
  })

  it('database refuses adding work to an existing terminal unknown receipt', async () => {
    const id = attempt()
    await ledger.persist({
      attemptId: id,
      webhook: {
        classification: 'unknown_ignore_eligible',
        event: 'catalog/reindexed',
        storeId,
        correlationId: randomUUID(),
      },
    })
    await expect(
      runtime.query('INSERT INTO nuvemshop_intake.work(receipt_id) VALUES ($1)', [id]),
    ).rejects.toMatchObject({ code: '23503' })
    expect((await stored(id))[0].linked_work_id).toBeNull()
  })

  it('rejects privacy projection or extra raw body through partial runtime DML', async () => {
    const id = attempt()
    await expect(rawReceipt(runtime, id, 'store/redact')).rejects.toMatchObject({ code: '23514' })
    await expect(
      runtime.query(
        `INSERT INTO nuvemshop_intake.receipts
         (attempt_id,family,contract_version,classification,projection,retention_policy_key)
         VALUES ($1,'business',1,'received',$2,'business-v1')`,
        [id, { ...signal('order/paid'), rawBody: 'synthetic-forbidden' }],
      ),
    ).rejects.toMatchObject({ code: '23514' })
    expect(await stored(id)).toEqual([])
  })

  it('runtime role has no administrative flags and cannot UPDATE, DELETE or create objects', async () => {
    const roles = await runtime.query(
      `SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication
         FROM pg_roles WHERE rolname=current_user`,
    )
    expect(roles.rows[0]).toEqual({
      rolsuper: false,
      rolbypassrls: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolreplication: false,
    })
    await expect(
      runtime.query('UPDATE nuvemshop_intake.receipts SET incident_hold=true'),
    ).rejects.toMatchObject({ code: '42501' })
    await expect(runtime.query('DELETE FROM nuvemshop_intake.work')).rejects.toMatchObject({
      code: '42501',
    })
    await expect(
      runtime.query('CREATE TABLE nuvemshop_intake.forbidden_nuv16_test(id int)'),
    ).rejects.toMatchObject({ code: '42501' })
    const flags = await runtime.query(
      `SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class
        WHERE oid IN ('nuvemshop_intake.receipts'::regclass,'nuvemshop_intake.work'::regclass)
        ORDER BY relname`,
    )
    expect(flags.rows).toEqual([
      { relname: 'receipts', relrowsecurity: true, relforcerowsecurity: true },
      { relname: 'work', relrowsecurity: true, relforcerowsecurity: true },
    ])
  })

  it('restricted runtime login cannot TRUNCATE, ALTER, grant REFERENCES or assume ledger owner', async () => {
    const client = await runtime.connect()
    try {
      expect((await client.query('SELECT session_user,current_user')).rows[0]).toEqual({
        session_user: 'nuv16_c_runtime',
        current_user: role,
      })
      await expect(
        client.query('TRUNCATE nuvemshop_intake.receipts,nuvemshop_intake.work'),
      ).rejects.toMatchObject({ code: '42501' })
      await expect(
        client.query('ALTER TABLE nuvemshop_intake.receipts ADD COLUMN forbidden_data text'),
      ).rejects.toMatchObject({ code: '42501' })
      // PostgreSQL may complete GRANT with a "no privileges granted" warning.
      // Assert the effective result rather than assuming an error response.
      await client.query('GRANT REFERENCES ON nuvemshop_intake.receipts TO anon')
      expect(
        (
          await client.query(
            "SELECT has_table_privilege('anon','nuvemshop_intake.receipts','REFERENCES') AS can_reference",
          )
        ).rows[0],
      ).toEqual({ can_reference: false })
      await expect(client.query('SET ROLE nuvemshop_intake_owner')).rejects.toMatchObject({
        code: '42501',
      })
      const privileges = await client.query(
        `SELECT has_schema_privilege(current_user,'nuvemshop_intake','CREATE') AS create_schema,
                has_table_privilege(current_user,'nuvemshop_intake.receipts','REFERENCES') AS references,
                pg_has_role(session_user,'nuvemshop_intake_owner','SET') AS owner_set`,
      )
      expect(privileges.rows[0]).toEqual({
        create_schema: false,
        references: false,
        owner_set: false,
      })
    } finally {
      client.release()
    }
  })

  it.each(['anon', 'authenticated', 'service_role', 'nuv16_c_public'] as const)(
    'denies actual schema/table reads and writes to %s (including PUBLIC-only login)',
    async (user) => {
      const outsider = new Pool({ ...settings, user, max: 1 })
      try {
        const grants = await outsider.query(
          `SELECT current_user,
                  has_schema_privilege(current_user,'nuvemshop_intake','USAGE') AS usage,
                  has_table_privilege(current_user,r.oid,'SELECT') AS receipt_read,
                  has_table_privilege(current_user,w.oid,'SELECT') AS work_read,
                  has_any_column_privilege(current_user,r.oid,'INSERT') AS receipt_insert,
                  has_any_column_privilege(current_user,w.oid,'INSERT') AS work_insert
             FROM pg_class r JOIN pg_namespace n ON n.oid=r.relnamespace
             JOIN pg_class w ON w.relnamespace=n.oid AND w.relname='work'
            WHERE n.nspname='nuvemshop_intake' AND r.relname='receipts'`,
        )
        expect(grants.rows[0]).toEqual({
          current_user: user,
          usage: false,
          receipt_read: false,
          work_read: false,
          receipt_insert: false,
          work_insert: false,
        })
        await expect(
          outsider.query('SELECT projection FROM nuvemshop_intake.receipts'),
        ).rejects.toMatchObject({ code: '42501' })
        await expect(outsider.query('SELECT * FROM nuvemshop_intake.work')).rejects.toMatchObject({
          code: '42501',
        })
        await expect(
          outsider.query('INSERT INTO nuvemshop_intake.work(receipt_id) VALUES ($1)', [attempt()]),
        ).rejects.toMatchObject({ code: '42501' })
      } finally {
        await outsider.end()
      }
    },
  )

  it('runtime has no read/write access to an unrelated module schema', async () => {
    // This synthetic fixture belongs exclusively to this disposable test database.
    await admin.query('CREATE SCHEMA IF NOT EXISTS nuv16_c_other_module')
    await admin.query('CREATE TABLE IF NOT EXISTS nuv16_c_other_module.private_data(value text)')
    await admin.query('REVOKE ALL ON SCHEMA nuv16_c_other_module FROM PUBLIC')
    await expect(
      runtime.query('SELECT * FROM nuv16_c_other_module.private_data'),
    ).rejects.toMatchObject({ code: '42501' })
    await expect(
      runtime.query("INSERT INTO nuv16_c_other_module.private_data VALUES ('synthetic')"),
    ).rejects.toMatchObject({ code: '42501' })
  })

  it('can extend a synthetic future envelope by CHECK evolution while preserving receipt/work FKs', async () => {
    const client = await admin.connect()
    const id = attempt()
    const projection = {
      event: 'inventory/recounted',
      storeId,
      correlationId: randomUUID(),
      jobKey: 'synthetic-job',
    }
    const checksQuery = `SELECT conname,pg_get_expr(conbin,conrelid) AS expression
      FROM pg_constraint WHERE conrelid='nuvemshop_intake.receipts'::regclass
      AND contype='c' ORDER BY conname`
    const before = (await client.query(checksQuery)).rows
    try {
      await client.query('BEGIN')
      // A hypothetical future migration extends only the three version/family/
      // projection checks. No columns, work schema, FK or production contract changes.
      const targets = before.filter(
        (row) =>
          row.conname === 'receipts_contract_version_check' || row.expression.includes('family ='),
      )
      expect(targets).toHaveLength(3)
      const futureBranch = `(family='synthetic_future' AND contract_version=2
        AND classification='received' AND retention_policy_key='synthetic-test-only-v2'
        AND jsonb_typeof(projection)='object'
        AND projection - ARRAY['event','storeId','correlationId','jobKey']='{}'::jsonb
        AND projection->>'event'='inventory/recounted'
        AND jsonb_typeof(projection->'storeId')='string'
        AND projection->>'storeId' ~ '^[1-9][0-9]{0,39}$'
        AND jsonb_typeof(projection->'correlationId')='string'
        AND jsonb_typeof(projection->'jobKey')='string') IS TRUE`
      for (const constraint of targets) {
        const name = '"' + String(constraint.conname).replaceAll('"', '""') + '"'
        await client.query(`ALTER TABLE nuvemshop_intake.receipts DROP CONSTRAINT ${name}`)
        await client.query(`ALTER TABLE nuvemshop_intake.receipts ADD CONSTRAINT ${name}
          CHECK ((${constraint.expression}) OR (${futureBranch}))`)
      }
      await client.query('SET LOCAL ROLE nuvemshop_intake_runtime')
      await client.query(
        `INSERT INTO nuvemshop_intake.receipts
        (attempt_id,family,contract_version,classification,projection,retention_policy_key)
        VALUES ($1,'synthetic_future',2,'received',$2,'synthetic-test-only-v2')`,
        [id, projection],
      )
      await client.query('SAVEPOINT before_inverse_check')
      await expect(client.query('SET CONSTRAINTS ALL IMMEDIATE')).rejects.toMatchObject({
        code: '23503',
      })
      await client.query('ROLLBACK TO SAVEPOINT before_inverse_check')
      await client.query('INSERT INTO nuvemshop_intake.work(receipt_id) VALUES ($1)', [id])
      await client.query('SET CONSTRAINTS ALL IMMEDIATE')
      const recovered = await client.query(
        `SELECT r.contract_version,r.projection,w.receipt_id
        FROM nuvemshop_intake.work w JOIN nuvemshop_intake.receipts r
        ON r.attempt_id=w.receipt_id WHERE w.receipt_id=$1`,
        [id],
      )
      expect(recovered.rows).toEqual([{ contract_version: 2, projection, receipt_id: id }])
      expect(projection).not.toHaveProperty('resourceId')
      expect(projection).not.toHaveProperty('appId')
    } finally {
      await client.query('ROLLBACK')
      expect((await client.query(checksQuery)).rows).toEqual(before)
      expect(
        (
          await client.query(
            'SELECT attempt_id FROM nuvemshop_intake.receipts WHERE attempt_id=$1',
            [id],
          )
        ).rows,
      ).toEqual([])
      client.release()
    }
  })
})
