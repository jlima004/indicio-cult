// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { createIntakePool } from '@/lib/server/nuvemshop-intake-pool'
import {
  intakeRetentionPolicies,
  createIntakeLedger,
  type IntakeInput,
  type SqlClient,
  type SqlPool,
} from '@/modules/nuvemshop/server/durability'
import type { VerifiedWebhookEvent } from '@/modules/nuvemshop/server/webhook-schema'

const pgBoundary = vi.hoisted(() => ({
  options: [] as Record<string, unknown>[],
  end: vi.fn(async () => undefined),
}))
vi.mock('pg', () => ({
  Pool: class {
    constructor(options: Record<string, unknown>) {
      pgBoundary.options.push(options)
    }
    on() {}
    end() {
      return pgBoundary.end()
    }
  },
}))

const attemptId = 'a3d49909-076d-4db3-bb18-45dd1b49005f'
const correlationId = '304e35cc-de41-44ef-9383-95073109630d'
const storeId = '123456789012345678901234567890'
const resourceId = '987654321098765432109876543210'
const secret = 'synthetic-secret-never-export'
const business: IntakeInput = {
  attemptId,
  webhook: { event: 'order/paid', storeId, resourceId, correlationId },
}
const unknown: IntakeInput = {
  attemptId,
  webhook: {
    classification: 'unknown_ignore_eligible',
    event: 'catalog/reindexed',
    storeId,
    correlationId,
  },
}
const policy = { reference: 'synthetic-owner-policy', version: 1, allows: () => true }

describe('NUV-16 HR-07 D4 retention metadata contract', () => {
  it.each(['business-v1', 'lifecycle-v1', 'unknown-v1'] as const)(
    '%s retains both fourteen-day minimums and a seven-day manual replay window',
    (key) => {
      expect(intakeRetentionPolicies[key]).toEqual({
        minimumDaysFromIntake: 14,
        minimumDaysAfterTerminal: 14,
        manualReplayWindowDaysFromIntake: 7,
      })
      expect(Object.isFrozen(intakeRetentionPolicies[key])).toBe(true)
    },
  )

  it('has only explicit MVP policies, with no default or inherited privacy policy', () => {
    expect(Object.keys(intakeRetentionPolicies).sort()).toEqual([
      'business-v1',
      'lifecycle-v1',
      'unknown-v1',
    ])
    expect(Object.hasOwn(intakeRetentionPolicies, 'default')).toBe(false)
    expect(Object.hasOwn(intakeRetentionPolicies, 'privacy-v1')).toBe(false)
    expect(Object.isFrozen(intakeRetentionPolicies)).toBe(true)
  })
})

// Fault doubles exercise the application transaction/error boundary only.
// PostgreSQL constraints, atomic durability, recovery and grants require real-DB tests.
function connection(failure: 'begin' | 'write' | 'commit' | 'rollback' | 'read' = 'write') {
  const query = vi.fn(async (text: string, _values?: readonly unknown[]) => {
    const sql = text.trim().toUpperCase()
    if (
      (failure === 'begin' && sql === 'BEGIN') ||
      (failure === 'commit' && sql === 'COMMIT') ||
      (failure === 'rollback' && sql === 'ROLLBACK') ||
      (failure === 'read' && sql.startsWith('SELECT')) ||
      ((failure === 'write' || failure === 'rollback') && sql.startsWith('INSERT'))
    ) {
      throw new Error(`postgres://admin:${secret}@fixture.invalid/db query input ${secret}`)
    }
    if (sql.startsWith('INSERT') && sql.includes('RECEIPTS')) {
      const classification = _values?.[3] ?? 'received'
      const now = new Date('2026-10-26T12:00:00.000Z')
      return {
        rows: [
          {
            attempt_id: _values?.[0],
            classification,
            intake_at: now,
            terminal_at: classification === 'ignored_unknown_event' ? now : null,
            work_id: classification === 'received' ? _values?.[0] : null,
          },
        ],
        rowCount: 1,
      }
    }
    return { rows: [], rowCount: 0 }
  })
  const release = vi.fn()
  const client: SqlClient = { query, release }
  const connect = vi.fn(async () => client)
  const pool: SqlPool = { connect }
  return { pool, connect, query, release }
}

async function errorOf(operation: Promise<unknown>) {
  const error: unknown = await operation.then(
    () => undefined,
    (reason: unknown) => reason,
  )
  expect(error, 'failed intake must reject').toBeInstanceOf(Error)
  return error as Error & { code: string }
}

describe('NUV-16 intake fail-closed transaction boundary', () => {
  it('keeps the result pending until its acquired client confirms COMMIT', async () => {
    let confirmCommit!: () => void
    let enteredCommit!: () => void
    const committing = new Promise<void>((resolve) => {
      enteredCommit = resolve
    })
    const confirmation = new Promise<void>((resolve) => {
      confirmCommit = resolve
    })
    const release = vi.fn()
    const query = vi.fn(async (text: string) => {
      if (text === 'COMMIT') {
        enteredCommit()
        await confirmation
      }
      return text.trim().toUpperCase().startsWith('INSERT INTO NUVEMSHOP_INTAKE.RECEIPTS')
        ? {
            rows: [
              {
                attempt_id: attemptId,
                classification: 'received',
                work_id: attemptId,
                intake_at: new Date('2026-10-26T12:00:00.000Z'),
                terminal_at: null,
              },
            ],
            rowCount: 1,
          }
        : { rows: [], rowCount: 0 }
    })
    const connect = vi.fn(async () => ({ query, release }))
    let settled = false
    const pending = createIntakeLedger({ connect })
      .persist(business)
      .then((value) => {
        settled = true
        return value
      })
    await committing
    expect(settled).toBe(false)
    expect(release).not.toHaveBeenCalled()
    confirmCommit()
    expect(await pending).toMatchObject({ receiptId: attemptId, workId: attemptId })
    expect(connect).toHaveBeenCalledTimes(1)
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('returns a safe typed storage failure if connection acquisition fails', async () => {
    const pool: SqlPool = {
      connect: async () => {
        throw new Error(secret)
      },
    }
    const error = await errorOf(createIntakeLedger(pool).persist(business))
    expect(error.code).toBe('NUVEMSHOP_INTAKE_STORAGE_ERROR')
    expect(error.message).not.toContain(secret)
    expect(error).not.toHaveProperty('cause')
  })

  it.each(['begin', 'write', 'rollback'] as const)(
    'does not report success when %s fails and releases its acquired client',
    async (phase) => {
      const db = connection(phase)
      const error = await errorOf(createIntakeLedger(db.pool).persist(business))
      expect(error.code).toBe('NUVEMSHOP_INTAKE_STORAGE_ERROR')
      expect(error.message).not.toContain(secret)
      expect(error).not.toHaveProperty('cause')
      expect(db.connect).toHaveBeenCalledTimes(1)
      expect(db.release).toHaveBeenCalledTimes(1)
      expect(db.query.mock.calls.some(([sql]) => sql.trim().toUpperCase() === 'COMMIT')).toBe(false)
      if (phase !== 'begin') {
        expect(db.query.mock.calls.some(([sql]) => sql.trim().toUpperCase() === 'ROLLBACK')).toBe(
          true,
        )
      }
    },
  )

  it('keeps a failed unknown receipt write unsuccessful and rolls back', async () => {
    const db = connection('write')
    const error = await errorOf(
      createIntakeLedger(db.pool, { unknownEventPolicy: policy }).persist(unknown),
    )
    expect(error.code).toBe('NUVEMSHOP_INTAKE_STORAGE_ERROR')
    expect(db.query.mock.calls.some(([sql]) => sql.trim().toUpperCase() === 'ROLLBACK')).toBe(true)
    expect(db.release).toHaveBeenCalledTimes(1)
  })

  it.each([business, unknown])(
    'reports indeterminate COMMIT without retrying or creating another local attempt ($webhook.event)',
    async (input) => {
      const db = connection('commit')
      const error = await errorOf(
        createIntakeLedger(db.pool, { unknownEventPolicy: policy }).persist(input),
      )
      expect(error.code).toBe('NUVEMSHOP_INTAKE_COMMIT_INDETERMINATE')
      expect(error.message).not.toContain(secret)
      expect(error).not.toHaveProperty('cause')
      expect(db.connect).toHaveBeenCalledTimes(1)
      expect(
        db.query.mock.calls.filter(([sql]) => sql.trim().toUpperCase() === 'COMMIT'),
      ).toHaveLength(1)
      expect(db.release).toHaveBeenCalledTimes(1)
    },
  )

  it('does not mistake a failed reconciliation read for confirmed absence', async () => {
    const db = connection('read')
    const error = await errorOf(createIntakeLedger(db.pool).findByAttemptId(attemptId))
    expect(error.code).toBe('NUVEMSHOP_INTAKE_STORAGE_ERROR')
    expect(error.message).not.toContain(secret)
    expect(db.release).toHaveBeenCalledTimes(1)
  })
})

describe('NUV-16 explicit unknown policy', () => {
  it.each([
    undefined,
    { ...policy, allows: () => false },
    { ...policy, reference: '' },
    { ...policy, version: 0 },
    {
      ...policy,
      allows: () => {
        throw new Error(secret)
      },
    },
  ])(
    'rejects absent, invalid or denying owner policy before SQL (%j)',
    async (unknownEventPolicy) => {
      const db = connection()
      const error = await errorOf(
        createIntakeLedger(db.pool, { unknownEventPolicy }).persist(unknown),
      )
      expect(error.code).toBe('NUVEMSHOP_INTAKE_POLICY_ERROR')
      expect(error.message).not.toContain(secret)
      expect(db.connect).not.toHaveBeenCalled()
    },
  )
})

describe('NUV-16 exact normalized allowlist reaches SQL', () => {
  it.each([
    { event: 'order/paid', storeId, resourceId: 123, correlationId },
    { event: 'app/uninstalled', storeId, appId: 123, correlationId },
    { event: 'app/suspended', storeId: 123, correlationId },
    { event: 'store/redact', storeId, resourceId, correlationId },
  ])('rejects forged numeric IDs or privacy input before acquiring SQL (%j)', async (webhook) => {
    const db = connection()
    await expect(
      createIntakeLedger(db.pool).persist({
        attemptId,
        webhook: webhook as unknown as VerifiedWebhookEvent,
      }),
    ).rejects.toMatchObject({ code: 'NUVEMSHOP_INTAKE_INPUT_ERROR' })
    expect(db.connect).not.toHaveBeenCalled()
  })

  it.each(['product/updated', 'order/paid', 'order/fulfilled', 'order/cancelled'] as const)(
    'passes exact decimal IDs for %s while dropping unrelated fields',
    async (event) => {
      const db = connection('write')
      const webhook: VerifiedWebhookEvent & { rawBody: string; token: string } = {
        event,
        storeId,
        resourceId,
        correlationId,
        rawBody: secret,
        token: secret,
      }
      await errorOf(createIntakeLedger(db.pool).persist({ attemptId, webhook }))
      const bindings = JSON.stringify(db.query.mock.calls.map(([, values]) => values))
      expect(bindings).toContain(storeId)
      expect(bindings).toContain(resourceId)
      expect(bindings).toContain(event)
      expect(bindings).toContain(attemptId)
      expect(bindings).toContain(correlationId)
      expect(bindings).not.toContain(secret)
      expect(db.query.mock.calls.map(([sql]) => sql).join(' ')).not.toContain(storeId)
    },
  )

  it('preserves uninstall App ID without assigning a resource ID', async () => {
    const db = connection('write')
    await errorOf(
      createIntakeLedger(db.pool).persist({
        attemptId,
        webhook: { event: 'app/uninstalled', storeId, appId: resourceId, correlationId },
      }),
    )
    const bindings = JSON.stringify(db.query.mock.calls.map(([, values]) => values))
    expect(bindings).toContain(resourceId)
    expect(bindings).toContain('app/uninstalled')
    // Exact field placement and null resource are additionally verified in PostgreSQL.
  })

  it.each(['app/suspended', 'app/resumed'] as const)(
    'accepts %s with no resource or app identifier',
    async (event) => {
      const db = connection('write')
      const error = await errorOf(
        createIntakeLedger(db.pool).persist({
          attemptId,
          webhook: { event, storeId, correlationId },
        }),
      )
      expect(error.code).toBe('NUVEMSHOP_INTAKE_STORAGE_ERROR')
      expect(JSON.stringify(db.query.mock.calls.map(([, values]) => values))).toContain(event)
    },
  )
})

describe('NUV-16 pg transport configuration boundary (constructor inspection only)', () => {
  const configuration = {
    host: 'supplied-connect-endpoint.example.invalid',
    user: 'nuvemshop_intake_runtime.suppliedref',
    password: secret,
    database: 'postgres',
    mode: 'session' as const,
    port: 5432 as const,
    ca: 'synthetic-trusted-ca',
  }

  it('preserves supplied host/user and enforces TLS verification with bounded session connections', async () => {
    const pool = createIntakePool(configuration)
    expect(pgBoundary.options.at(-1)).toMatchObject({
      host: configuration.host,
      user: configuration.user,
      port: 5432,
      ssl: { rejectUnauthorized: true, ca: configuration.ca },
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      statement_timeout: 5000,
      query_timeout: 6000,
      lock_timeout: 2000,
      idle_in_transaction_session_timeout: 10000,
    })
    await pool.close()
    expect(pgBoundary.end).toHaveBeenCalled()
  })

  it('ignores arbitrary connection-string and SSL override fields instead of forwarding them', async () => {
    const extended = {
      ...configuration,
      connectionString: 'postgres://synthetic.invalid/db?sslmode=disable',
      ssl: { rejectUnauthorized: false },
    }
    const pool = createIntakePool(extended)
    const options = pgBoundary.options.at(-1)
    expect(options).not.toHaveProperty('connectionString')
    expect(options?.ssl).toEqual({ rejectUnauthorized: true, ca: configuration.ca })
    await pool.close()
  })

  it.each([
    { port: 6543 },
    { mode: 'transaction' },
    { user: 'postgres' },
    { host: 'postgres://synthetic.invalid/db?sslmode=disable' },
    { host: '' },
    { password: '' },
    { ca: '' },
    { maxConnections: 0 },
    { maxConnections: 6 },
  ])('rejects invalid or privileged configuration (%j)', (override) => {
    expect(() =>
      createIntakePool({
        ...configuration,
        ...override,
      } as unknown as Parameters<typeof createIntakePool>[0]),
    ).toThrow(expect.objectContaining({ code: 'NUVEMSHOP_INTAKE_CONFIG_ERROR' }))
  })
})
