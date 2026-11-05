// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createDispatchStore } from '@/modules/nuvemshop/server/durability/dispatch-store'

const identity = { receiptId: 'receipt', token: 'claim', generation: '7' }
const operation = {
  store_id: '1',
  status: 'paused',
  epoch: '2',
  resume_requested: false,
  access_confirmed: false,
  reason: 'SUSPENDED',
}
function fixture(rows: Record<string, unknown>[] = [operation]) {
  const client = { query: vi.fn(async () => ({ rows })), release: vi.fn() }
  const pool = { connect: vi.fn(async () => client), close: vi.fn(async () => undefined) }
  return { client, pool, store: createDispatchStore(pool) }
}
describe('PostgreSQL dispatch adapter', () => {
  it('reads durable state and forwards only fenced identity to lifecycle SQL', async () => {
    const { store, client } = fixture()
    expect(await store.applyLifecycle(identity)).toEqual({
      storeId: '1',
      status: 'paused',
      epoch: '2',
      resumeRequested: false,
      accessConfirmed: false,
      reason: 'SUSPENDED',
    })
    expect(client.query).toHaveBeenCalledWith(
      'SELECT * FROM nuvemshop_intake.apply_dispatch_lifecycle($1, $2, $3)',
      ['receipt', 'claim', '7'],
    )
    expect(client.release).toHaveBeenCalledWith(false)
  })
  it('preserves large PostgreSQL generations without numeric rounding', async () => {
    const { store } = fixture([{ status: 'ready', generation: '9007199254740993', epoch: '1' }])
    expect(await store.beginSignal(identity, 'synthetic')).toEqual({
      status: 'ready',
      generation: '9007199254740993',
      epoch: '1',
    })
  })
  it('rejects invalid state rather than permitting operation', async () => {
    const { store } = fixture([{ ...operation, access_confirmed: 'yes' }])
    await expect(store.getOperation('1')).rejects.toThrow('INVALID_DISPATCH_DATABASE_RESULT')
  })
  it('does not retry a mutation whose commit result is unknown or expose its error', async () => {
    const { store, client } = fixture()
    client.query.mockRejectedValueOnce(new Error('secret SQL and raw payload'))
    const error = await store
      .finishSignal(identity, 'synthetic', '3', '2', 'applied')
      .catch((e) => e)
    expect(error.message).toBe('DISPATCH_TRANSITION_INDETERMINATE')
    expect(error.identity).toEqual(identity)
    expect(JSON.stringify(error)).not.toContain('secret')
    expect(client.query).toHaveBeenCalledOnce()
    expect(client.release).toHaveBeenCalledWith(true)
  })
  it('fails closed when a database connection cannot be acquired', async () => {
    const { store, pool } = fixture()
    pool.connect.mockRejectedValueOnce(new Error('private credential'))
    await expect(store.recordProbe('1', '2', 'ready')).rejects.toThrow('DISPATCH_DATABASE_ERROR')
  })
  it('requires an explicit boolean confirmation from finish and reconciliation', async () => {
    const { store } = fixture([{ finish_dispatch_signal: false }])
    expect(await store.finishSignal(identity, 'synthetic', '3', '2', 'applied')).toBe(false)
    await expect(store.finishReconciliation(identity, 'synthetic', '2', 'applied')).rejects.toThrow(
      'INVALID_DISPATCH_DATABASE_RESULT',
    )
  })
  it('requires the durable reconciliation claim before a callback can run', async () => {
    const { store, client } = fixture([{ begin_dispatch_reconciliation: 'busy' }])
    expect(await store.beginReconciliation(identity, 'synthetic', '2')).toBe('busy')
    expect(client.query).toHaveBeenCalledWith(
      'SELECT * FROM nuvemshop_intake.begin_dispatch_reconciliation($1, $2, $3, $4, $5)',
      ['receipt', 'claim', '7', 'synthetic', '2'],
    )
  })
})
