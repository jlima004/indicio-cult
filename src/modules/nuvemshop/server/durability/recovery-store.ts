import 'server-only'

import { randomUUID } from 'node:crypto'
import type { RecoveryClaim, RecoveryStore } from './worker'
import { RecoveryError } from './worker'

export interface RecoverySqlClient {
  query(text: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>
  release(error?: boolean): void
}
export interface RecoverySqlPool {
  connect(): Promise<RecoverySqlClient>
  close(): Promise<void>
}
export class ClaimIndeterminateError extends RecoveryError {
  constructor(readonly token: string) {
    super('CLAIM_INDETERMINATE')
  }
}
export class TransitionIndeterminateError extends RecoveryError {
  constructor(
    readonly identity: { receiptId: string; token: string; generation: string },
    readonly snapshot: Record<string, string | null> | null,
  ) {
    super('TRANSITION_INDETERMINATE')
  }
}
function generation(value: unknown): string | null {
  if (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)) return value
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value)
  if (typeof value === 'bigint' && value >= BigInt(0)) return String(value)
  return null
}
function parseClaim(row: Record<string, unknown> | undefined, token: string): RecoveryClaim | null {
  if (!row) return null
  const p = row.projection
  if (
    typeof row.receipt_id !== 'string' ||
    row.claim_token !== token ||
    generation(row.generation) === null ||
    !p ||
    typeof p !== 'object' ||
    Array.isArray(p)
  )
    throw new RecoveryError('INVALID_DATABASE_RESULT')
  const projection = p as Record<string, unknown>
  if (
    typeof projection.event !== 'string' ||
    typeof projection.storeId !== 'string' ||
    typeof projection.correlationId !== 'string' ||
    (projection.resourceId !== undefined && typeof projection.resourceId !== 'string') ||
    (projection.appId !== undefined && typeof projection.appId !== 'string')
  )
    throw new RecoveryError('INVALID_DATABASE_RESULT')
  return {
    receiptId: row.receipt_id,
    token,
    generation: generation(row.generation)!,
    projection: projection as unknown as RecoveryClaim['projection'],
  }
}
export function createRecoveryStore(pool: RecoverySqlPool): RecoveryStore {
  async function query(
    sql: string,
    values: readonly unknown[],
  ): Promise<Record<string, unknown>[]> {
    let client: RecoverySqlClient
    try {
      client = await pool.connect()
    } catch {
      throw new RecoveryError('DATABASE_ERROR')
    }
    let failed = false
    try {
      return (await client.query(sql, values)).rows
    } catch {
      failed = true
      throw new RecoveryError('DATABASE_ERROR')
    } finally {
      client.release(failed)
    }
  }
  async function transition(
    name: string,
    claim: RecoveryClaim,
    rest: readonly unknown[] = [],
  ): Promise<boolean> {
    const args = [claim.receiptId, claim.token, claim.generation, ...rest]
    const placeholders = args.map((_, i) => `$${i + 1}`).join(', ')
    let rows: Record<string, unknown>[]
    try {
      rows = await query(`SELECT nuvemshop_intake.${name}(${placeholders}) AS ok`, args)
    } catch {
      let snapshot: Record<string, string | null> | null = null
      try {
        const found = await query(
          'SELECT state, generation, claim_token, lease_until, terminal_at, next_attempt_at, failure_code FROM nuvemshop_intake.work WHERE receipt_id = $1',
          [claim.receiptId],
        )
        const row = found[0]
        if (
          found.length === 1 &&
          row &&
          typeof row.state === 'string' &&
          generation(row.generation) !== null
        ) {
          snapshot = {}
          for (const key of [
            'state',
            'generation',
            'claim_token',
            'lease_until',
            'terminal_at',
            'next_attempt_at',
            'failure_code',
          ]) {
            const value = row[key]
            snapshot[key] =
              value instanceof Date ? value.toISOString() : value == null ? null : String(value)
          }
        }
      } catch {
        /* Remains unknown if the primary cannot be read. */
      }
      throw new TransitionIndeterminateError(
        { receiptId: claim.receiptId, token: claim.token, generation: claim.generation },
        snapshot,
      )
    }
    if (rows.length !== 1 || typeof rows[0]?.ok !== 'boolean')
      throw new RecoveryError('INVALID_DATABASE_RESULT')
    return rows[0].ok
  }
  return {
    async claim(leaseSeconds, maxAttempts) {
      const token = randomUUID()
      let rows: Record<string, unknown>[]
      try {
        rows = await query('SELECT * FROM nuvemshop_intake.claim_work($1, $2, $3)', [
          token,
          leaseSeconds,
          maxAttempts,
        ])
      } catch {
        // A lost autocommit response can have committed. Never issue a new claim
        // or run effects until this exact identity is confirmed by the primary.
        try {
          rows = await query('SELECT * FROM nuvemshop_intake.reconcile_claim($1)', [token])
          if (rows.length > 1) throw new RecoveryError('INVALID_DATABASE_RESULT')
          const reconciled = parseClaim(rows[0], token)
          if (reconciled) return reconciled
        } catch {
          /* Outcome remains unknown. */
        }
        throw new ClaimIndeterminateError(token)
      }
      if (rows.length > 1) throw new RecoveryError('INVALID_DATABASE_RESULT')
      return parseClaim(rows[0], token)
    },
    start: (claim) => transition('start_work', claim),
    heartbeat: (claim, lease) => transition('heartbeat_work', claim, [lease]),
    succeed: (claim) => transition('succeed_work', claim),
    fail: (claim, recoverable, code, backoff) =>
      transition('fail_work', claim, [recoverable, code, backoff]),
    close: () => pool.close(),
  }
}
