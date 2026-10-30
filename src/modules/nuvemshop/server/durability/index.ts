import 'server-only'

import type { UnknownWebhookIgnoreEligibility, VerifiedWebhookEvent } from '../webhook-schema'

import { NuvemshopIntakeError } from './errors'
import { projectWebhook, reference, validateAttemptId } from './projection'

export { NuvemshopIntakeError } from './errors'
export { intakeRetentionPolicies } from './retention'

export interface SqlResult {
  rows: Record<string, unknown>[]
  rowCount: number | null
}
export interface SqlClient {
  query(text: string, values?: readonly unknown[]): Promise<SqlResult>
  release(error?: Error | boolean): void
}
export interface SqlPool {
  connect(): Promise<SqlClient>
}
export interface IntakeInput {
  attemptId: string
  webhook: VerifiedWebhookEvent | UnknownWebhookIgnoreEligibility
}
export interface IntakeOptions {
  unknownEventPolicy?: {
    reference: string
    version: number
    allows(event: string): boolean
  }
}
export type CommittedIntake = {
  receiptId: string
  intakeAt: string
  terminalAt: string | null
} & (
  | { classification: 'received'; workId: string }
  | { classification: 'ignored_unknown_event'; workId: null }
)

const columns = 'attempt_id, classification, intake_at, terminal_at, work_id'

function committed(row: Record<string, unknown> | undefined): CommittedIntake {
  if (!row || typeof row.attempt_id !== 'string') {
    throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_STORAGE_ERROR')
  }
  const timestamp = (value: unknown): string => {
    if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString()
    if (typeof value === 'string' && Number.isFinite(Date.parse(value))) {
      return new Date(value).toISOString()
    }
    throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_STORAGE_ERROR')
  }
  const base = { receiptId: row.attempt_id, intakeAt: timestamp(row.intake_at) }
  if (
    row.classification === 'received' &&
    row.work_id === row.attempt_id &&
    row.terminal_at === null
  ) {
    return { ...base, classification: 'received', terminalAt: null, workId: row.work_id }
  }
  if (row.classification === 'ignored_unknown_event' && row.work_id === null) {
    return {
      ...base,
      classification: 'ignored_unknown_event',
      terminalAt: timestamp(row.terminal_at),
      workId: null,
    }
  }
  throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_STORAGE_ERROR')
}

async function acquire(pool: SqlPool): Promise<SqlClient> {
  try {
    return await pool.connect()
  } catch {
    throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_STORAGE_ERROR')
  }
}

/** PostgreSQL is the authority; no receipt is reported before a confirmed COMMIT. */
export function createIntakeLedger(pool: SqlPool, options?: IntakeOptions) {
  return {
    async persist(input: IntakeInput): Promise<CommittedIntake> {
      validateAttemptId(input.attemptId)
      const envelope = projectWebhook(input.webhook)
      let policyKey: string | null = null
      let policyVersion: number | null = null
      if (envelope.family === 'unknown') {
        try {
          const policy = options?.unknownEventPolicy
          if (
            !policy ||
            typeof policy.reference !== 'string' ||
            !reference.test(policy.reference) ||
            !Number.isSafeInteger(policy.version) ||
            policy.version < 1 ||
            policy.version > 2147483647 ||
            policy.allows(envelope.projection.event) !== true
          ) {
            throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_POLICY_ERROR')
          }
          policyKey = policy.reference
          policyVersion = policy.version
        } catch {
          throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_POLICY_ERROR')
        }
      }
      const values = [
        input.attemptId,
        envelope.family,
        envelope.contractVersion,
        envelope.classification,
        JSON.stringify(envelope.projection),
        envelope.retentionPolicyKey,
        policyKey,
        policyVersion,
      ]
      const client = await acquire(pool)
      let begun = false
      let committing = false
      let destroy = false
      try {
        await client.query('BEGIN')
        begun = true
        const inserted = await client.query(
          `INSERT INTO nuvemshop_intake.receipts
            (attempt_id, family, contract_version, classification, projection,
             retention_policy_key, unknown_policy_key, unknown_policy_version)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
           ON CONFLICT (attempt_id) DO NOTHING RETURNING ${columns}`,
          values,
        )
        let row = inserted.rows[0]
        if (inserted.rowCount === 0) {
          const existing = await client.query(
            `SELECT ${columns} FROM nuvemshop_intake.receipts
             WHERE attempt_id = $1 AND family = $2 AND contract_version = $3
               AND classification = $4 AND projection = $5::jsonb
               AND retention_policy_key = $6
               AND unknown_policy_key IS NOT DISTINCT FROM $7
               AND unknown_policy_version IS NOT DISTINCT FROM $8`,
            values,
          )
          row = existing.rows[0]
          if (!row) throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_IDENTITY_CONFLICT')
        } else if (envelope.classification === 'received') {
          await client.query('INSERT INTO nuvemshop_intake.work (receipt_id) VALUES ($1)', [
            input.attemptId,
          ])
        }
        const result = committed(row)
        committing = true
        await client.query('COMMIT')
        begun = false
        return result
      } catch (error) {
        if (committing) {
          destroy = true
          throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_COMMIT_INDETERMINATE')
        }
        if (begun) {
          try {
            await client.query('ROLLBACK')
          } catch {
            destroy = true
          }
        } else {
          destroy = true
        }
        if (error instanceof NuvemshopIntakeError) throw error
        throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_STORAGE_ERROR')
      } finally {
        client.release(destroy)
      }
    },
    /** Read from the configured primary, preserving the caller's original attempt ID. */
    async findByAttemptId(attemptId: string): Promise<CommittedIntake | null> {
      validateAttemptId(attemptId)
      const client = await acquire(pool)
      let destroy = false
      try {
        const result = await client.query(
          `SELECT ${columns} FROM nuvemshop_intake.receipts WHERE attempt_id = $1`,
          [attemptId],
        )
        return result.rows.length === 0 ? null : committed(result.rows[0])
      } catch {
        destroy = true
        throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_STORAGE_ERROR')
      } finally {
        client.release(destroy)
      }
    },
  }
}
