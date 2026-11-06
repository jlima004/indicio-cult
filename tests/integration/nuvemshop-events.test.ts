import { createHmac } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createIntakePool } from '@/lib/server/nuvemshop-intake-pool'
import {
  createIntakeLedger,
  type SqlPool,
  type SqlResult,
} from '@/modules/nuvemshop/server/durability'
import { handleNuvemshopIntake } from '@/modules/nuvemshop/server/webhook-intake'

// Explicit fresh local fixture only: never consumes the application's DSN/config.
const socket = process.env.NUV19_TEST_SOCKET
const caPath = process.env.NUV19_TEST_CA
if (!socket?.startsWith('/tmp/nuv19-pg-') || !caPath?.startsWith('/tmp/nuv19-pg-')) {
  throw new Error('NUV19 requires an explicit disposable local PostgreSQL fixture')
}
const secret = 'nuv19-local-integration-secret'
const admin = new Pool({ host: socket, port: 5432, database: 'nuv19_test', user: 'jlima', max: 2 })
const pool = createIntakePool({
  host: 'localhost',
  port: 5432,
  user: 'nuvemshop_intake_runtime.local19',
  password: 'local-fixture-only',
  database: 'nuv19_test',
  mode: 'session',
  ca: readFileSync(caPath, 'utf8'),
})
const measurements: { scenario: string; elapsedMs: number; status: number }[] = []
const ledger = createIntakeLedger(pool)
const exactId = '987654321098765432109876543210'
function raw(event = 'order/paid') {
  return `{"event":"${event}","store_id":9,"id":${exactId}}`
}
function request(body = raw(), fragment = false) {
  const bytes = new TextEncoder().encode(body)
  const signature = createHmac('sha256', secret).update(bytes).digest('hex')
  let offset = 0
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (offset >= bytes.length) {
          controller.close()
          return
        }
        const end = Math.min(bytes.length, offset + 4096)
        controller.enqueue(bytes.subarray(offset, end))
        offset = end
      },
    },
    { highWaterMark: 0 },
  )
  return new Request('http://localhost/api/webhooks/nuvemshop/events', {
    method: 'POST',
    body: fragment ? stream : bytes,
    headers: { 'x-linkedstore-hmac-sha256': signature },
    duplex: 'half',
  } as RequestInit)
}
async function run(scenario: string, input: Request, using = ledger) {
  const start = performance.now()
  const response = await handleNuvemshopIntake(input, () => using)
  measurements.push({
    scenario,
    elapsedMs: +(performance.now() - start).toFixed(2),
    status: response.status,
  })
  return response
}
async function count() {
  return Number((await admin.query('SELECT count(*) FROM nuvemshop_intake.receipts')).rows[0].count)
}
function intercept(
  query: (sql: string, next: (override?: string) => Promise<SqlResult>) => Promise<SqlResult>,
): SqlPool {
  return {
    async connect() {
      const client = await pool.connect()
      return {
        query: (sql, values) =>
          query(sql, (override) => client.query(override ?? sql, override ? undefined : values)),
        release: (error) => client.release(error),
      }
    },
  }
}

beforeEach(() => {
  vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', secret)
  vi.stubEnv('NUVEMSHOP_STORE_ID', '9')
})
beforeAll(async () => {
  const safety = (
    await admin.query(
      "SELECT inet_server_addr() AS addr,current_setting('listen_addresses') AS listen,version() AS version",
    )
  ).rows[0]
  expect(safety.addr).toBe(null)
  expect(safety.listen).toBe('127.0.0.1')
  expect(safety.version).toContain('PostgreSQL 17.')
  const client = await pool.connect()
  try {
    const tls = await client.query('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()')
    expect(tls.rows[0]?.ssl).toBe(true)
  } finally {
    client.release()
  }
})
afterAll(async () => {
  const report = process.env.NUV19_TEST_REPORT
  if (report?.startsWith('/home/jlima/.codex/evidence/nuv-19-')) {
    writeFileSync(report, JSON.stringify(measurements, null, 2) + '\n')
  }
  vi.unstubAllEnvs()
  await Promise.all([pool.close(), admin.end()])
})

describe('HTTP intake with real PostgreSQL 17, verified TLS and runtime role', () => {
  it.each([
    'product/updated',
    'order/paid',
    'order/fulfilled',
    'order/cancelled',
    'app/uninstalled',
    'app/suspended',
    'app/resumed',
  ])('commits minimal recoverable %s projection', async (event) => {
    const before = await count()
    expect((await run(event, request(raw(event)))).status).toBe(204)
    expect(await count()).toBe(before + 1)
    const rows = (
      await admin.query(
        "SELECT r.projection,w.state FROM nuvemshop_intake.receipts r JOIN nuvemshop_intake.work w ON w.receipt_id=r.attempt_id WHERE r.projection->>'event'=$1",
        [event],
      )
    ).rows
    expect(rows.length).toBeGreaterThan(0)
    const row = rows.at(-1)
    expect(row.state).toBe('received')
    expect(row.projection).toMatchObject({ event, storeId: '9' })
    expect(Object.keys(row.projection).sort()).toEqual(
      [
        'correlationId',
        'event',
        'storeId',
        ...(event === 'app/uninstalled'
          ? ['appId']
          : event.startsWith('app/')
            ? []
            : ['resourceId']),
      ].sort(),
    )
    if (!event.startsWith('app/')) expect(row.projection.resourceId).toBe(exactId)
  })

  it.each([false, true])('measures a body at the byte cap, fragmented=%s', async (fragmented) => {
    const prefix = raw().slice(0, -1) + ',"padding":"'
    const body = prefix + 'x'.repeat(1_048_576 - prefix.length - 2) + '"}'
    expect(Buffer.byteLength(body)).toBe(1_048_576)
    expect((await run(`body-cap-fragmented-${fragmented}`, request(body, fragmented))).status).toBe(
      204,
    )
    expect(measurements.at(-1)!.elapsedMs).toBeLessThan(3000)
  })

  it('waits for a COMMIT barrier before ACK and independent visibility', async () => {
    let release!: () => void
    let reached!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    const atCommit = new Promise<void>((resolve) => {
      reached = resolve
    })
    const delayed = createIntakeLedger(
      intercept(async (sql, next) => {
        if (sql === 'COMMIT') {
          reached()
          await held
        }
        return next()
      }),
    )
    const before = await count()
    let responded = false
    const pending = run('commit-barrier', request(), delayed).then((response) => {
      responded = true
      return response
    })
    await atCommit
    expect(responded).toBe(false)
    expect(await count()).toBe(before)
    release()
    expect((await pending).status).toBe(204)
    expect(await count()).toBe(before + 1)
  })

  it('includes actual slow PostgreSQL work in the ACK measurement', async () => {
    const slow = createIntakeLedger(
      intercept(async (sql, next) => {
        if (sql === 'COMMIT') await next('SELECT pg_sleep(0.15)')
        return next()
      }),
    )
    expect((await run('postgres-slow-150ms', request(), slow)).status).toBe(204)
    expect(measurements.at(-1)!.elapsedMs).toBeGreaterThanOrEqual(150)
    expect(measurements.at(-1)!.elapsedMs).toBeLessThan(3000)
  })

  it('rolls back a real statement failure and sends no ACK', async () => {
    const failing = createIntakeLedger(
      intercept(async (sql, next) => {
        if (sql.includes('INSERT INTO nuvemshop_intake.work')) {
          await next('SELECT 1/0')
        }
        return next()
      }),
    )
    const before = await count()
    expect((await run('insert-failure', request(), failing)).status).toBe(500)
    expect(await count()).toBe(before)
  })

  it('does not retry or claim absence when COMMIT succeeds but confirmation is lost', async () => {
    let commits = 0
    const uncertain = createIntakeLedger(
      intercept(async (sql, next) => {
        const result = await next()
        if (sql === 'COMMIT') {
          commits++
          throw new Error('synthetic response loss')
        }
        return result
      }),
    )
    const before = await count()
    expect((await run('commit-response-lost', request(), uncertain)).status).toBe(500)
    expect(commits).toBe(1)
    expect(await count()).toBe(before + 1)
  })

  it('returns no success at the deadline even when a slow transaction commits later', async () => {
    let finished!: () => void
    const complete = new Promise<void>((resolve) => {
      finished = resolve
    })
    const delayed = createIntakeLedger(
      intercept(async (sql, next) => {
        if (sql === 'COMMIT') await next('SELECT pg_sleep(3.15)')
        const result = await next()
        if (sql === 'COMMIT') finished()
        return result
      }),
    )
    const before = await count()
    expect((await run('postgres-slow-deadline', request(), delayed)).status).toBe(503)
    await complete
    expect(await count()).toBe(before + 1)
  })

  it('fails closed on a real exhausted-pool connection timeout', async () => {
    const exhausted = new Pool({
      host: socket,
      port: 5432,
      database: 'nuv19_test',
      user: 'nuv19_test_runtime',
      max: 1,
      connectionTimeoutMillis: 100,
    })
    const held = await exhausted.connect()
    const before = await count()
    try {
      expect(
        (await run('connection-timeout', request(), createIntakeLedger(exhausted))).status,
      ).toBe(500)
      expect(await count()).toBe(before)
    } finally {
      held.release()
      await exhausted.end()
    }
  })
})
