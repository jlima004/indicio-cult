// Build first, then run with --conditions=react-server against a fresh local cluster.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import pg from 'pg'

const require = createRequire(import.meta.url)
const {
  createDispatcher,
  createConsumerRegistry,
} = require('../../.worker-build/modules/nuvemshop/server/dispatcher.js')
const {
  createDispatchStore,
} = require('../../.worker-build/modules/nuvemshop/server/durability/dispatch-store.js')
const {
  createRecoveryStore,
} = require('../../.worker-build/modules/nuvemshop/server/durability/recovery-store.js')
const {
  createRecoveryWorker,
} = require('../../.worker-build/modules/nuvemshop/server/durability/worker.js')
const host = process.env.NUV18_TEST_SOCKET
const database = process.env.NUV18_TEST_DATABASE
const port = Number(process.env.NUV18_TEST_PORT)
if (
  !host?.startsWith('/') ||
  !/^nuv18_test_runtime(?:_[a-z0-9]+)?$/.test(database ?? '') ||
  !Number.isInteger(port)
) {
  throw new Error('Explicit disposable NUV-18 runtime socket, port and database required')
}
const connection = { host, database, port, user: process.env.USER }

test('compiled dispatcher, SQL adapter and NUV-17 worker preserve effects and pending generations', async () => {
  const admin = new pg.Client(connection)
  const sqlPool = new pg.Pool({ ...connection, max: 4 })
  const pool = {
    async connect() {
      const client = await sqlPool.connect()
      await client.query('SET ROLE nuvemshop_intake_runtime')
      return client
    },
    close: () => sqlPool.end(),
  }
  await admin.connect()
  const safety = (
    await admin.query(
      "SELECT inet_server_addr() AS addr,current_setting('listen_addresses') AS listen",
    )
  ).rows[0]
  assert.deepEqual(safety, { addr: null, listen: '' })
  const insert = async (event, resourceId = '10') => {
    const id = randomUUID()
    const family = event.startsWith('app/') ? 'lifecycle' : 'business'
    const projection = {
      event,
      storeId: '9',
      correlationId: 'synthetic-runtime',
      ...(family === 'business'
        ? { resourceId }
        : event === 'app/uninstalled'
          ? { appId: '1' }
          : {}),
    }
    await admin.query('BEGIN')
    await admin.query(
      `INSERT INTO nuvemshop_intake.receipts(attempt_id,family,contract_version,classification,projection,retention_policy_key) VALUES($1,$2,1,'received',$3,$4)`,
      [id, family, projection, `${family}-v1`],
    )
    await admin.query('INSERT INTO nuvemshop_intake.work(receipt_id) VALUES($1)', [id])
    await admin.query('COMMIT')
    return id
  }
  const work = async (id) =>
    (
      await admin.query(
        'SELECT state,attempts,generation FROM nuvemshop_intake.work WHERE receipt_id=$1',
        [id],
      )
    ).rows[0]
  const operator = async (name, args) => {
    await admin.query('SET ROLE nuvemshop_intake_operator')
    try {
      return (
        await admin.query(
          `SELECT nuvemshop_intake.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) AS ok`,
          args,
        )
      ).rows[0].ok
    } finally {
      await admin.query('RESET ROLE')
    }
  }
  const registry = createConsumerRegistry()
  let releaseFirst, announceFirst
  const entered = new Promise((resolve) => {
    announceFirst = resolve
  })
  const held = new Promise((resolve) => {
    releaseFirst = resolve
  })
  const received = []
  let reconciliationFails = false
  let retryPaid = true
  registry.register({
    id: 'synthetic-runtime',
    topics: ['product/updated', 'order/paid', 'order/cancelled'],
    async reconcile(_store, signal) {
      assert.equal(signal.aborted, false)
      return reconciliationFails ? 'indeterminate' : 'applied'
    },
    async handle(event, signal) {
      assert.equal(signal.aborted, false)
      assert.deepEqual(Object.keys(event).sort(), [
        'correlationId',
        'event',
        'resourceId',
        'storeId',
      ])
      received.push(event)
      if (received.length === 1) {
        announceFirst()
        await held
      }
      if (event.event === 'order/paid' && retryPaid) {
        retryPaid = false
        return 'retry-safe'
      }
      return event.resourceId === '99' ? 'indeterminate' : 'applied'
    },
  })
  const store = createDispatchStore(pool)
  const makeWorker = () =>
    createRecoveryWorker(
      createRecoveryStore(pool),
      createDispatcher({ store: createDispatchStore(pool), registry, probe: async () => 'ready' }),
    )
  try {
    const resume = await insert('app/resumed')
    await makeWorker().runOnce()
    assert.equal((await work(resume)).state, 'succeeded')
    assert.equal((await store.getOperation('9')).status, 'active')

    const first = await insert('product/updated')
    const firstExecution = makeWorker().runOnce()
    await entered
    const second = await insert('product/updated')
    await makeWorker().runOnce()
    assert.equal((await work(second)).state, 'retryable')
    assert.equal((await work(second)).attempts, 0)
    releaseFirst()
    await firstExecution
    assert.equal((await work(first)).state, 'succeeded')
    await admin.query(
      "UPDATE nuvemshop_intake.work SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE receipt_id=$1",
      [second],
    )
    await makeWorker().runOnce()
    assert.equal((await work(second)).state, 'succeeded')
    const third = await insert('product/updated')
    await makeWorker().runOnce()
    assert.equal((await work(third)).state, 'succeeded')
    assert.equal(received.length, 3)
    assert.deepEqual(received[0], received[2]) // Identical payload, distinct legitimate deliveries.
    const target = (
      await admin.query(
        "SELECT pending_generation,completed_generation FROM nuvemshop_intake.dispatch_target WHERE resource_id='10'",
      )
    ).rows[0]
    assert.deepEqual(target, { pending_generation: '3', completed_generation: '3' })

    const uncertain = await insert('product/updated', '99')
    await assert.rejects(makeWorker().runOnce(), /PROCESSOR_FAILED/)
    assert.equal((await work(uncertain)).state, 'quarantined')
    const signalProof = (
      await admin.query(
        "SELECT active_receipt,active_token,active_work_generation FROM nuvemshop_intake.dispatch_target WHERE store_id='9' AND resource_id='99'",
      )
    ).rows[0]
    // Synthetic proof says the effect applied; the operator resolves without repeating it.
    assert.equal(
      await operator('resolve_dispatch_signal', [
        '9',
        'synthetic-runtime',
        'product',
        '99',
        '1',
        'applied',
        signalProof.active_receipt,
        signalProof.active_token,
        signalProof.active_work_generation,
      ]),
      true,
    )
    assert.equal(await operator('replay_work', [uncertain]), true)
    await makeWorker().runOnce()
    assert.equal(received.length, 4)
    assert.equal((await work(uncertain)).state, 'succeeded')

    reconciliationFails = true
    const nextResume = await insert('app/resumed')
    await assert.rejects(makeWorker().runOnce(), /PROCESSOR_FAILED/)
    assert.equal((await work(nextResume)).state, 'quarantined')
    const pendingReconciliation = await createDispatchStore(pool).getOperation('9')
    assert.equal(pendingReconciliation.status, 'reconciling')
    const reconciliationProof = (
      await admin.query(
        "SELECT reconcile_receipt,reconcile_token,reconcile_work_generation FROM nuvemshop_intake.dispatch_consumer WHERE store_id='9' AND consumer_id='synthetic-runtime'",
      )
    ).rows[0]
    reconciliationFails = false // Explicit operator-approved replay, not automatic uncertain retry.
    assert.equal(
      await operator('resolve_dispatch_reconciliation', [
        '9',
        'synthetic-runtime',
        pendingReconciliation.epoch,
        'retry_safe',
        reconciliationProof.reconcile_receipt,
        reconciliationProof.reconcile_token,
        reconciliationProof.reconcile_work_generation,
      ]),
      true,
    )
    assert.equal(await operator('replay_work', [nextResume]), true)
    await makeWorker().runOnce()
    assert.equal((await store.getOperation('9')).status, 'active')

    await insert('app/suspended')
    await makeWorker().runOnce()
    const pending = await insert('product/updated')
    await makeWorker().runOnce()
    assert.equal((await work(pending)).state, 'retryable')
    assert.equal((await createDispatchStore(pool).getOperation('9')).status, 'paused')
    await insert('app/uninstalled')
    await makeWorker().runOnce()
    await insert('app/resumed')
    await makeWorker().runOnce()
    assert.equal((await createDispatchStore(pool).getOperation('9')).status, 'disconnected')
    assert.equal((await work(pending)).state, 'retryable')
    assert.equal(received.length, 4)
    const disconnected = await store.getOperation('9')
    assert.equal(
      await operator('authorize_dispatch_reinstallation', ['9', disconnected.epoch]),
      true,
    )
    assert.equal((await store.getOperation('9')).status, 'paused')
    await admin.query(
      "UPDATE nuvemshop_intake.work SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE receipt_id=$1",
      [pending],
    )
    await makeWorker().runOnce() // No resumed event: explicit authorization still requires probe + sync.
    assert.equal((await store.getOperation('9')).status, 'active')
    assert.equal((await work(pending)).state, 'succeeded')
    assert.equal(received.length, 5)
    const paid = await insert('order/paid', '70')
    await assert.rejects(makeWorker().runOnce(), /PROCESSOR_FAILED/)
    assert.equal((await work(paid)).state, 'retryable')
    const cancelled = await insert('order/cancelled', '70')
    await makeWorker().runOnce()
    assert.equal((await work(cancelled)).state, 'succeeded')
    await admin.query(
      "UPDATE nuvemshop_intake.work SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE receipt_id=$1",
      [paid],
    )
    await makeWorker().runOnce()
    assert.equal((await work(paid)).state, 'succeeded')
    assert.deepEqual(
      received.slice(-3).map((event) => event.event),
      ['order/paid', 'order/cancelled', 'order/paid'],
    )
  } finally {
    releaseFirst()
    await admin.end()
    await sqlPool.end()
  }
})
