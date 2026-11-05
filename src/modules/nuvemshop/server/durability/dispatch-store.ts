import 'server-only'

import type {
  DispatchIdentity,
  DispatchStore,
  OperationalSnapshot,
  SignalStart,
} from '../dispatcher'
import type { RecoverySqlPool } from './recovery-store'

/** A failed mutation response can represent a committed transition. Never replay it implicitly. */
export class DispatchPersistenceError extends Error {
  constructor(
    code:
      | 'DISPATCH_DATABASE_ERROR'
      | 'DISPATCH_TRANSITION_INDETERMINATE'
      | 'INVALID_DISPATCH_DATABASE_RESULT',
    readonly operation: string,
    readonly identity?: DispatchIdentity,
  ) {
    super(code)
    this.name = 'DispatchPersistenceError'
  }
}
function integer(value: unknown): string | null {
  if (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)) return value
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value)
  if (typeof value === 'bigint' && value >= BigInt(0)) return String(value)
  return null
}
function invalid(operation: string): never {
  throw new DispatchPersistenceError('INVALID_DISPATCH_DATABASE_RESULT', operation)
}
function snapshot(rows: Record<string, unknown>[], operation: string): OperationalSnapshot {
  const row = rows[0]
  if (
    rows.length !== 1 ||
    !row ||
    typeof row.store_id !== 'string' ||
    !['paused', 'disconnected', 'reconciling', 'active'].includes(String(row.status)) ||
    integer(row.epoch) === null ||
    typeof row.resume_requested !== 'boolean' ||
    typeof row.access_confirmed !== 'boolean' ||
    !(
      row.reason === null ||
      (typeof row.reason === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(row.reason))
    )
  )
    invalid(operation)
  return {
    storeId: row.store_id,
    status: row.status as OperationalSnapshot['status'],
    epoch: integer(row.epoch)!,
    resumeRequested: row.resume_requested,
    accessConfirmed: row.access_confirmed,
    reason: row.reason,
  }
}
const identityArgs = (identity: DispatchIdentity) => [
  identity.receiptId,
  identity.token,
  identity.generation,
]

export function createDispatchStore(pool: RecoverySqlPool): DispatchStore {
  async function query(
    operation: string,
    args: readonly unknown[],
    mutation: boolean,
    identity?: DispatchIdentity,
  ): Promise<Record<string, unknown>[]> {
    let client
    try {
      client = await pool.connect()
    } catch {
      throw new DispatchPersistenceError('DISPATCH_DATABASE_ERROR', operation, identity)
    }
    let failed = false
    try {
      const placeholders = args.map((_, i) => `$${i + 1}`).join(', ')
      return (
        await client.query(`SELECT * FROM nuvemshop_intake.${operation}(${placeholders})`, args)
      ).rows
    } catch {
      failed = true
      throw new DispatchPersistenceError(
        mutation ? 'DISPATCH_TRANSITION_INDETERMINATE' : 'DISPATCH_DATABASE_ERROR',
        operation,
        identity,
      )
    } finally {
      client.release(failed)
    }
  }
  async function confirmed(
    operation: string,
    args: readonly unknown[],
    identity?: DispatchIdentity,
  ) {
    const rows = await query(operation, args, true, identity)
    if (rows.length !== 1 || typeof rows[0]?.[operation] !== 'boolean') invalid(operation)
    return rows[0][operation] as boolean
  }
  return {
    registerConsumer: (storeId, consumerId) =>
      confirmed('register_dispatch_consumer', [storeId, consumerId]),
    async getOperation(storeId) {
      return snapshot(
        await query('get_dispatch_operation', [storeId], true),
        'get_dispatch_operation',
      )
    },
    async applyLifecycle(identity) {
      return snapshot(
        await query('apply_dispatch_lifecycle', identityArgs(identity), true, identity),
        'apply_dispatch_lifecycle',
      )
    },
    async recordProbe(storeId, epoch, result) {
      return snapshot(
        await query('record_dispatch_probe', [storeId, epoch, result], true),
        'record_dispatch_probe',
      )
    },
    async beginReconciliation(identity, consumerId, epoch) {
      const operation = 'begin_dispatch_reconciliation'
      const rows = await query(
        operation,
        [...identityArgs(identity), consumerId, epoch],
        true,
        identity,
      )
      const status = rows[0]?.[operation]
      if (
        rows.length !== 1 ||
        !['ready', 'completed', 'busy', 'uncertain', 'paused'].includes(String(status))
      )
        invalid(operation)
      return status as 'ready' | 'completed' | 'busy' | 'uncertain' | 'paused'
    },
    finishReconciliation: (identity, consumerId, epoch, outcome) =>
      confirmed(
        'finish_dispatch_reconciliation',
        [...identityArgs(identity), consumerId, epoch, outcome],
        identity,
      ),
    async beginSignal(identity, consumerId): Promise<SignalStart> {
      const rows = await query(
        'begin_dispatch_signal',
        [...identityArgs(identity), consumerId],
        true,
        identity,
      )
      const row = rows[0]
      if (rows.length !== 1 || !row) invalid('begin_dispatch_signal')
      if (row.status === 'ready') {
        const generation = integer(row.generation),
          epoch = integer(row.epoch)
        if (generation === null || epoch === null) invalid('begin_dispatch_signal')
        return { status: 'ready', generation, epoch }
      }
      if (
        row.status === 'completed' ||
        row.status === 'paused' ||
        row.status === 'busy' ||
        row.status === 'uncertain'
      )
        return { status: row.status }
      invalid('begin_dispatch_signal')
    },
    finishSignal: (identity, consumerId, generation, epoch, outcome) =>
      confirmed(
        'finish_dispatch_signal',
        [...identityArgs(identity), consumerId, generation, epoch, outcome],
        identity,
      ),
  }
}
