// Only for a newly created disposable PostgreSQL cluster with migrations 16–18.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

const socket = process.env.NUV18_TEST_SOCKET
const database = process.env.NUV18_TEST_DATABASE
const port = Number(process.env.NUV18_TEST_PORT)
if (
  !socket?.startsWith('/') ||
  !/^nuv18_test(?:_[a-z0-9]+)?$/.test(database ?? '') ||
  !Number.isInteger(port)
) {
  throw new Error('Explicit disposable NUV-18 local socket, port and test database required')
}
const connect = () => new pg.Client({ host: socket, database, port, user: process.env.USER })
const call = async (c, name, args) =>
  (
    await c.query(
      `SELECT * FROM nuvemshop_intake.${name}(${args.map((_, i) => `$${i + 1}`).join(',')})`,
      args,
    )
  ).rows
const scalar = async (c, name, args) => (await call(c, name, args))[0][name]
const insert = async (c, event, store = '1', resource = '10') => {
  const id = randomUUID()
  const lifecycle = event.startsWith('app/')
  const projection = {
    event,
    storeId: store,
    correlationId: 'synthetic',
    ...(lifecycle ? (event === 'app/uninstalled' ? { appId: '1' } : {}) : { resourceId: resource }),
  }
  await c.query('BEGIN')
  await c.query(
    `INSERT INTO nuvemshop_intake.receipts(attempt_id,family,contract_version,classification,projection,retention_policy_key) VALUES($1,$2,1,'received',$3,$4)`,
    [
      id,
      lifecycle ? 'lifecycle' : 'business',
      projection,
      lifecycle ? 'lifecycle-v1' : 'business-v1',
    ],
  )
  await c.query('INSERT INTO nuvemshop_intake.work(receipt_id) VALUES($1)', [id])
  await c.query('COMMIT')
  return id
}
const claim = async (c, id, lease = 60) => {
  const [row] = await call(c, 'claim_work', [randomUUID(), lease, 3])
  assert.equal(row.receipt_id, id)
  assert.equal(await scalar(c, 'start_work', [id, row.claim_token, row.generation]), true)
  return [id, row.claim_token, row.generation]
}

const reconcile = async (admin, client, store, consumer, epoch) => {
  const work = await claim(client, await insert(admin, 'app/resumed', store))
  const status = await scalar(client, 'begin_dispatch_reconciliation', [...work, consumer, epoch])
  let done = status === 'completed'
  if (status === 'ready')
    done = await scalar(client, 'finish_dispatch_reconciliation', [
      ...work,
      consumer,
      epoch,
      'applied',
    ])
  assert.equal(await scalar(client, 'succeed_work', work), true)
  return done
}

test('dispatch transitions: local concurrency, fencing, lifecycle and ACL', async () => {
  const admin = connect(),
    a = connect(),
    b = connect()
  await Promise.all([admin.connect(), a.connect(), b.connect()])
  try {
    const safety = (
      await admin.query(
        "SELECT inet_server_addr() AS addr,current_setting('listen_addresses') AS listen,current_database() AS db",
      )
    ).rows[0]
    assert.deepEqual(safety, { addr: null, listen: '', db: database })
    await Promise.all([
      a.query('SET ROLE nuvemshop_intake_runtime'),
      b.query('SET ROLE nuvemshop_intake_runtime'),
    ])
    await call(a, 'register_dispatch_consumer', ['1', 'catalog'])
    await assert.rejects(
      call(a, 'complete_dispatch_reconciliation', ['1', 'catalog', '0']),
      /permission denied/,
    )
    let op = (await call(a, 'get_dispatch_operation', ['1']))[0]
    assert.equal(op.status, 'paused')
    assert.equal(
      (await call(a, 'record_dispatch_probe', ['1', op.epoch, 'ready']))[0].status,
      'paused',
    )
    const resumeId = await insert(admin, 'app/resumed')
    const resume = await claim(a, resumeId)
    op = (await call(a, 'apply_dispatch_lifecycle', resume))[0]
    const duplicate = (await call(b, 'apply_dispatch_lifecycle', resume))[0]
    assert.equal(duplicate.epoch, op.epoch)
    op = (await call(a, 'record_dispatch_probe', ['1', op.epoch, 'unauthorized']))[0]
    assert.equal(op.status, 'paused')
    op = (await call(a, 'record_dispatch_probe', ['1', op.epoch, 'suspended']))[0]
    assert.equal(op.status, 'paused')
    op = (await call(a, 'record_dispatch_probe', ['1', op.epoch, 'ready']))[0]
    assert.equal(op.status, 'reconciling')
    assert.equal(await reconcile(admin, a, '1', 'catalog', op.epoch), true)
    assert.equal((await call(b, 'get_dispatch_operation', ['1']))[0].status, 'active')
    assert.equal(await scalar(a, 'succeed_work', resume), true)

    const id1 = await insert(admin, 'product/updated')
    const first = await claim(a, id1)
    const id2 = await insert(admin, 'product/updated')
    const second = await claim(b, id2)
    const [start1, start2] = await Promise.all([
      call(a, 'begin_dispatch_signal', [...first, 'catalog']),
      call(b, 'begin_dispatch_signal', [...second, 'catalog']),
    ])
    const statuses = [start1[0].status, start2[0].status].sort()
    assert.deepEqual(statuses, ['busy', 'ready'])
    const ready =
      start1[0].status === 'ready'
        ? { work: first, row: start1[0], c: a }
        : { work: second, row: start2[0], c: b }
    const waiting =
      start1[0].status === 'busy'
        ? { work: first, row: start1[0], c: a }
        : { work: second, row: start2[0], c: b }
    assert.equal(
      await scalar(ready.c, 'finish_dispatch_signal', [
        ...ready.work,
        'catalog',
        ready.row.generation,
        ready.row.epoch,
        'applied',
      ]),
      true,
    )
    // The later arrival remains pending even when the first finishes.
    if (BigInt(waiting.row.generation) > BigInt(ready.row.generation)) {
      const next = (await call(waiting.c, 'begin_dispatch_signal', [...waiting.work, 'catalog']))[0]
      assert.equal(next.status, 'ready')
      assert.equal(
        await scalar(waiting.c, 'finish_dispatch_signal', [
          ...waiting.work,
          'catalog',
          next.generation,
          next.epoch,
          'applied',
        ]),
        true,
      )
    }
    assert.equal(
      await scalar(a, 'finish_dispatch_signal', [
        first[0],
        randomUUID(),
        first[2],
        'catalog',
        '1',
        op.epoch,
        'applied',
      ]),
      false,
    )
    const target = (
      await admin.query(
        'SELECT pending_generation,completed_generation FROM nuvemshop_intake.dispatch_target',
      )
    ).rows[0]
    assert.equal(target.pending_generation, '2')
    assert.equal(target.completed_generation, '2')
    await scalar(a, 'succeed_work', first)
    await scalar(b, 'succeed_work', second)

    // An uncertain effect remains blocked across connections until operator proof.
    const uncertainId = await insert(admin, 'product/updated', '1', '11')
    const uncertainWork = await claim(a, uncertainId)
    const uncertain = (await call(a, 'begin_dispatch_signal', [...uncertainWork, 'catalog']))[0]
    assert.equal(
      await scalar(a, 'finish_dispatch_signal', [
        ...uncertainWork,
        'catalog',
        uncertain.generation,
        uncertain.epoch,
        'indeterminate',
      ]),
      true,
    )
    const resolution = [
      '1',
      'catalog',
      'product',
      '11',
      uncertain.generation,
      'applied',
      ...uncertainWork,
    ]
    await assert.rejects(call(a, 'resolve_dispatch_signal', resolution), /permission denied/)
    const operator = connect()
    await operator.connect()
    try {
      await operator.query('SET ROLE nuvemshop_intake_operator')
      assert.equal(await scalar(operator, 'resolve_dispatch_signal', resolution), false)
      assert.equal(await scalar(a, 'fail_work', [...uncertainWork, false, 'UNCERTAIN', 0]), true)
      assert.equal(
        await scalar(operator, 'resolve_dispatch_signal', [
          '1',
          'catalog',
          'product',
          '11',
          '999',
          'applied',
          ...uncertainWork,
        ]),
        false,
      )
      assert.equal(await scalar(operator, 'resolve_dispatch_signal', resolution), true)
      assert.equal(await scalar(operator, 'resolve_dispatch_signal', resolution), false)
    } finally {
      await operator.end()
    }

    // A 402 observed during normal operation invalidates stale probe results.
    const otherResumeId = await insert(admin, 'app/resumed', '2')
    const otherResume = await claim(b, otherResumeId)
    let other = (await call(b, 'apply_dispatch_lifecycle', otherResume))[0]
    other = (await call(b, 'record_dispatch_probe', ['2', other.epoch, 'ready']))[0]
    assert.equal(other.status, 'active')
    const oldEpoch = other.epoch
    other = (await call(b, 'record_dispatch_probe', ['2', other.epoch, 'suspended']))[0]
    assert.equal(other.status, 'paused')
    assert.notEqual(other.epoch, oldEpoch)
    assert.equal(
      (await call(b, 'record_dispatch_probe', ['2', oldEpoch, 'ready']))[0].status,
      'paused',
    )
    await scalar(b, 'succeed_work', otherResume)

    const unresolvedId = await insert(admin, 'product/updated', '1', '12')
    const unresolvedWork = await claim(a, unresolvedId)
    const unresolved = (await call(a, 'begin_dispatch_signal', [...unresolvedWork, 'catalog']))[0]
    assert.equal(
      await scalar(a, 'finish_dispatch_signal', [
        ...unresolvedWork,
        'catalog',
        unresolved.generation,
        unresolved.epoch,
        'indeterminate',
      ]),
      true,
    )
    assert.equal(await scalar(a, 'fail_work', [...unresolvedWork, false, 'UNCERTAIN', 0]), true)

    const suspendId = await insert(admin, 'app/suspended')
    const suspend = await claim(a, suspendId)
    op = (await call(a, 'apply_dispatch_lifecycle', suspend))[0]
    assert.equal(op.status, 'paused')
    assert.equal(await scalar(a, 'succeed_work', suspend), true)
    const blockedId = await insert(admin, 'product/updated')
    const blocked = await claim(a, blockedId)
    assert.equal(
      (await call(a, 'begin_dispatch_signal', [...blocked, 'catalog']))[0].status,
      'paused',
    )
    assert.equal(await scalar(a, 'defer_work', [...blocked, 'OPERATION_PAUSED', 60]), true)
    const deferred = (
      await admin.query('SELECT state,attempts FROM nuvemshop_intake.work WHERE receipt_id=$1', [
        blockedId,
      ])
    ).rows[0]
    assert.deepEqual(deferred, { state: 'retryable', attempts: 0 })
    const uninstallId = await insert(admin, 'app/uninstalled')
    const uninstall = await claim(a, uninstallId)
    op = (await call(a, 'apply_dispatch_lifecycle', uninstall))[0]
    assert.equal(op.status, 'disconnected')
    await scalar(a, 'succeed_work', uninstall)
    const lateId = await insert(admin, 'app/resumed')
    const late = await claim(b, lateId)
    op = (await call(b, 'apply_dispatch_lifecycle', late))[0]
    assert.equal(op.status, 'disconnected')
    assert.equal(
      (await call(a, 'record_dispatch_probe', ['1', op.epoch, 'ready']))[0].status,
      'disconnected',
    )
    assert.equal(await reconcile(admin, a, '1', 'catalog', op.epoch), false)
    await assert.rejects(
      call(a, 'authorize_dispatch_reinstallation', ['1', op.epoch]),
      /permission denied/,
    )
    const installer = connect()
    await installer.connect()
    try {
      await installer.query('SET ROLE nuvemshop_intake_operator')
      assert.equal(
        await scalar(installer, 'authorize_dispatch_reinstallation', [
          '1',
          (BigInt(op.epoch) - 1n).toString(),
        ]),
        false,
      )
      assert.equal(
        await scalar(installer, 'authorize_dispatch_reinstallation', ['1', op.epoch]),
        true,
      )
      assert.equal(
        await scalar(installer, 'authorize_dispatch_reinstallation', ['1', op.epoch]),
        false,
      )
    } finally {
      await installer.end()
    }
    op = (await call(a, 'get_dispatch_operation', ['1']))[0]
    assert.equal(op.status, 'paused')
    assert.equal(op.reason, 'REINSTALLATION_AUTHORIZED')
    assert.equal(op.access_confirmed, false)
    assert.equal(op.resume_requested, true)
    assert.equal(await reconcile(admin, a, '1', 'catalog', op.epoch), false)
    const stillUncertain = (
      await admin.query(
        "SELECT uncertain FROM nuvemshop_intake.dispatch_target WHERE store_id='1' AND consumer_id='catalog' AND family='product' AND resource_id='12'",
      )
    ).rows[0]
    assert.equal(stillUncertain.uncertain, true)
    op = (await call(a, 'record_dispatch_probe', ['1', op.epoch, 'ready']))[0]
    assert.equal(op.status, 'reconciling')
    assert.equal(await reconcile(admin, a, '1', 'catalog', op.epoch), true)
    assert.equal((await call(a, 'get_dispatch_operation', ['1']))[0].status, 'active')
    assert.equal(
      (
        await admin.query(
          "SELECT uncertain FROM nuvemshop_intake.dispatch_target WHERE store_id='1' AND consumer_id='catalog' AND family='product' AND resource_id='12'",
        )
      ).rows[0].uncertain,
      true,
    )
    await assert.rejects(
      a.query("UPDATE nuvemshop_intake.dispatch_operation SET status='active'"),
      /permission denied/,
    )
    const acl = (
      await admin.query(`SELECT
      (SELECT bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class WHERE oid IN ('nuvemshop_intake.dispatch_operation'::regclass,'nuvemshop_intake.dispatch_consumer'::regclass,'nuvemshop_intake.dispatch_lifecycle'::regclass,'nuvemshop_intake.dispatch_target'::regclass,'nuvemshop_intake.dispatch_signal'::regclass)) AS rls,
      has_table_privilege('nuvemshop_intake_runtime','nuvemshop_intake.dispatch_operation','UPDATE') AS update,
      has_function_privilege('public','nuvemshop_intake.begin_dispatch_signal(uuid,uuid,bigint,text)','EXECUTE') AS public_execute,
      (SELECT rolcanlogin OR rolbypassrls OR rolsuper FROM pg_roles WHERE rolname='nuvemshop_intake_owner') AS owner_unsafe`)
    ).rows[0]
    assert.deepEqual(acl, { rls: true, update: false, public_execute: false, owner_unsafe: false })
  } finally {
    await Promise.allSettled([admin.end(), a.end(), b.end()])
  }
})

test('reconnect, independent consumer reconciliation, order generations and lease lock waits', async () => {
  const admin = connect(),
    a = connect(),
    b = connect(),
    restarted = connect()
  await Promise.all([admin.connect(), a.connect(), b.connect(), restarted.connect()])
  try {
    const safety = (
      await admin.query(
        "SELECT inet_server_addr() AS addr,current_setting('listen_addresses') AS listen,current_database() AS db",
      )
    ).rows[0]
    assert.deepEqual(safety, { addr: null, listen: '', db: database })
    await Promise.all([
      a.query('SET ROLE nuvemshop_intake_runtime'),
      b.query('SET ROLE nuvemshop_intake_runtime'),
      restarted.query('SET ROLE nuvemshop_intake_runtime'),
    ])
    await call(a, 'register_dispatch_consumer', ['3', 'orders'])
    await call(a, 'register_dispatch_consumer', ['3', 'catalog'])
    const resumed = await claim(a, await insert(admin, 'app/resumed', '3'))
    let op = (await call(a, 'apply_dispatch_lifecycle', resumed))[0]
    op = (await call(a, 'record_dispatch_probe', ['3', op.epoch, 'ready']))[0]
    assert.equal(op.status, 'reconciling')
    assert.equal(await reconcile(admin, a, '3', 'orders', op.epoch), true)
    // A new connection sees the durable unfinished reconciliation after restart.
    assert.equal((await call(restarted, 'get_dispatch_operation', ['3']))[0].status, 'reconciling')
    await scalar(a, 'succeed_work', resumed)
    const cancelled = await claim(a, await insert(admin, 'order/cancelled', '3', '99'))
    const first = (await call(a, 'begin_dispatch_signal', [...cancelled, 'orders']))[0]
    assert.equal(first.status, 'ready')
    const catalog = (await call(restarted, 'begin_dispatch_signal', [...cancelled, 'catalog']))[0]
    assert.equal(catalog.status, 'paused')
    await call(restarted, 'register_dispatch_consumer', ['3', 'future'])
    assert.equal(
      (await call(restarted, 'begin_dispatch_signal', [...cancelled, 'future']))[0].status,
      'paused',
    )
    // The delayed paid signal is a distinct generation, even though it arrives after cancelled.
    const paid = await claim(b, await insert(admin, 'order/paid', '3', '99'))
    const pending = (await call(b, 'begin_dispatch_signal', [...paid, 'orders']))[0]
    assert.equal(pending.status, 'busy')
    assert.equal(BigInt(pending.generation), BigInt(first.generation) + 1n)
    assert.equal(
      await scalar(a, 'finish_dispatch_signal', [
        ...cancelled,
        'orders',
        first.generation,
        first.epoch,
        'applied',
      ]),
      true,
    )
    const afterFirst = (
      await admin.query(
        "SELECT pending_generation,completed_generation FROM nuvemshop_intake.dispatch_target WHERE store_id='3' AND consumer_id='orders' AND family='order' AND resource_id='99'",
      )
    ).rows[0]
    assert.deepEqual(afterFirst, {
      pending_generation: pending.generation,
      completed_generation: first.generation,
    })
    const second = (await call(b, 'begin_dispatch_signal', [...paid, 'orders']))[0]
    assert.equal(second.status, 'ready')
    assert.equal(second.generation, pending.generation)
    assert.equal(
      await scalar(b, 'finish_dispatch_signal', [
        ...paid,
        'orders',
        second.generation,
        second.epoch,
        'applied',
      ]),
      true,
    )
    await scalar(a, 'succeed_work', cancelled)
    await scalar(b, 'succeed_work', paid)
    assert.equal(await reconcile(admin, restarted, '3', 'catalog', op.epoch), true)
    assert.equal((await call(restarted, 'get_dispatch_operation', ['3']))[0].status, 'reconciling')
    assert.equal(await reconcile(admin, restarted, '3', 'future', op.epoch), true)
    assert.equal((await call(restarted, 'get_dispatch_operation', ['3']))[0].status, 'active')
    assert.equal(await scalar(restarted, 'register_dispatch_consumer', ['3', 'late']), true)
    const lateConsumerWork = await claim(a, await insert(admin, 'order/paid', '3', '100'))
    assert.equal(
      (await call(a, 'begin_dispatch_signal', [...lateConsumerWork, 'late']))[0].status,
      'paused',
    )
    assert.equal(await reconcile(admin, restarted, '3', 'late', op.epoch), true)
    assert.equal(await scalar(restarted, 'register_dispatch_consumer', ['3', 'late']), false)
    const afterInitialSync = (
      await call(a, 'begin_dispatch_signal', [...lateConsumerWork, 'late'])
    )[0]
    assert.equal(afterInitialSync.status, 'ready')
    assert.equal(
      await scalar(a, 'finish_dispatch_signal', [
        ...lateConsumerWork,
        'late',
        afterInitialSync.generation,
        afterInitialSync.epoch,
        'applied',
      ]),
      true,
    )
    assert.equal(await scalar(a, 'succeed_work', lateConsumerWork), true)

    // A row lock wait must not extend the ownership of the first claim.
    const lateBegin = await claim(a, await insert(admin, 'order/fulfilled', '3', '101'), 1)
    await admin.query('BEGIN')
    await admin.query('SELECT 1 FROM nuvemshop_intake.work WHERE receipt_id=$1 FOR UPDATE', [
      lateBegin[0],
    ])
    const beginWait = call(a, 'begin_dispatch_signal', [...lateBegin, 'orders'])
    await admin.query('SELECT pg_sleep(1.2)')
    await admin.query('COMMIT')
    await assert.rejects(beginWait, /ownership lost/)
    // Sweep the expired processing claim before acquiring the next fixture.
    assert.equal((await call(b, 'claim_work', [randomUUID(), 60, 3])).length, 0)
    const lateFinish = await claim(a, await insert(admin, 'order/fulfilled', '3', '102'), 1)
    const started = (await call(a, 'begin_dispatch_signal', [...lateFinish, 'orders']))[0]
    assert.equal(started.status, 'ready')
    await admin.query('BEGIN')
    await admin.query('SELECT 1 FROM nuvemshop_intake.work WHERE receipt_id=$1 FOR UPDATE', [
      lateFinish[0],
    ])
    const finishWait = scalar(a, 'finish_dispatch_signal', [
      ...lateFinish,
      'orders',
      started.generation,
      started.epoch,
      'applied',
    ])
    await admin.query('SELECT pg_sleep(1.2)')
    await admin.query('COMMIT')
    assert.equal(await finishWait, false)
    const target = (
      await admin.query(
        "SELECT completed_generation FROM nuvemshop_intake.dispatch_target WHERE store_id='3' AND consumer_id='orders' AND family='order' AND resource_id='102'",
      )
    ).rows[0]
    assert.equal(target.completed_generation, '0')
  } finally {
    await Promise.allSettled([admin.end(), a.end(), b.end(), restarted.end()])
  }
})

test('reconciliation latch fences concurrency, crash uncertainty and operator resolution', async () => {
  const admin = connect(),
    a = connect(),
    b = connect(),
    operator = connect()
  await Promise.all([admin.connect(), a.connect(), b.connect(), operator.connect()])
  try {
    const safety = (
      await admin.query(
        "SELECT inet_server_addr() AS addr,current_setting('listen_addresses') AS listen,current_database() AS db",
      )
    ).rows[0]
    assert.deepEqual(safety, { addr: null, listen: '', db: database })
    await Promise.all([
      a.query('SET ROLE nuvemshop_intake_runtime'),
      b.query('SET ROLE nuvemshop_intake_runtime'),
      operator.query('SET ROLE nuvemshop_intake_operator'),
    ])
    await call(a, 'register_dispatch_consumer', ['4', 'orders'])
    const lifecycle = await claim(a, await insert(admin, 'app/resumed', '4'))
    let op = (await call(a, 'apply_dispatch_lifecycle', lifecycle))[0]
    op = (await call(a, 'record_dispatch_probe', ['4', op.epoch, 'ready']))[0]
    assert.equal(op.status, 'reconciling')
    await scalar(a, 'succeed_work', lifecycle)
    const w1 = await claim(a, await insert(admin, 'order/paid', '4', '81'))
    const w2 = await claim(b, await insert(admin, 'order/paid', '4', '82'))
    const [r1, r2] = await Promise.all([
      scalar(a, 'begin_dispatch_reconciliation', [...w1, 'orders', op.epoch]),
      scalar(b, 'begin_dispatch_reconciliation', [...w2, 'orders', op.epoch]),
    ])
    assert.deepEqual([r1, r2].sort(), ['busy', 'ready'])
    const winner = r1 === 'ready' ? { c: a, work: w1 } : { c: b, work: w2 }
    const waiter = r1 === 'busy' ? { c: a, work: w1 } : { c: b, work: w2 }
    await assert.rejects(
      call(waiter.c, 'resolve_dispatch_reconciliation', [
        '4',
        'orders',
        op.epoch,
        'retry_safe',
        ...winner.work,
      ]),
      /permission denied/,
    )
    assert.equal(
      await scalar(operator, 'resolve_dispatch_reconciliation', [
        '4',
        'orders',
        op.epoch,
        'retry_safe',
        ...winner.work,
      ]),
      false,
    )
    // Simulate process death after the reconciliation may have produced effects.
    await admin.query(
      "UPDATE nuvemshop_intake.work SET lease_until=clock_timestamp()-interval '1 second' WHERE receipt_id=$1",
      [winner.work[0]],
    )
    assert.equal(
      await scalar(waiter.c, 'begin_dispatch_reconciliation', [...waiter.work, 'orders', op.epoch]),
      'uncertain',
    )
    assert.equal(
      await scalar(waiter.c, 'begin_dispatch_reconciliation', [...waiter.work, 'orders', op.epoch]),
      'uncertain',
    )
    assert.equal(
      await scalar(operator, 'resolve_dispatch_reconciliation', [
        '4',
        'orders',
        (BigInt(op.epoch) + 1n).toString(),
        'retry_safe',
        ...winner.work,
      ]),
      false,
    )
    assert.equal(
      await scalar(operator, 'resolve_dispatch_reconciliation', [
        '4',
        'orders',
        op.epoch,
        'retry_safe',
        ...winner.work,
      ]),
      true,
    )
    assert.equal(
      await scalar(waiter.c, 'begin_dispatch_reconciliation', [...waiter.work, 'orders', op.epoch]),
      'ready',
    )
    assert.equal(
      await scalar(waiter.c, 'finish_dispatch_reconciliation', [
        ...waiter.work,
        'orders',
        op.epoch,
        'applied',
      ]),
      true,
    )
    assert.equal((await call(a, 'get_dispatch_operation', ['4']))[0].status, 'active')
    assert.equal(
      await scalar(waiter.c, 'begin_dispatch_reconciliation', [...waiter.work, 'orders', op.epoch]),
      'completed',
    )
    await scalar(waiter.c, 'succeed_work', waiter.work)

    await call(a, 'register_dispatch_consumer', ['4', 'other'])
    const old = await claim(a, await insert(admin, 'order/paid', '4', '83'))
    assert.equal(
      await scalar(a, 'begin_dispatch_reconciliation', [...old, 'other', op.epoch]),
      'ready',
    )
    const suspension = await claim(b, await insert(admin, 'app/suspended', '4'))
    const suspended = (await call(b, 'apply_dispatch_lifecycle', suspension))[0]
    assert.notEqual(suspended.epoch, op.epoch)
    assert.equal(
      await scalar(a, 'finish_dispatch_reconciliation', [...old, 'other', op.epoch, 'applied']),
      false,
    )
    assert.equal(
      await scalar(a, 'finish_dispatch_reconciliation', [
        ...old,
        'other',
        op.epoch,
        'indeterminate',
      ]),
      true,
    )
    assert.equal(await scalar(a, 'fail_work', [...old, false, 'UNCERTAIN', 0]), true)
    assert.equal(
      await scalar(operator, 'resolve_dispatch_reconciliation', [
        '4',
        'other',
        op.epoch,
        'applied',
        ...old,
      ]),
      false,
    )
    assert.equal(
      await scalar(operator, 'resolve_dispatch_reconciliation', [
        '4',
        'other',
        op.epoch,
        'retry_safe',
        ...old,
      ]),
      true,
    )
  } finally {
    await Promise.allSettled([admin.end(), a.end(), b.end(), operator.end()])
  }
})

test('order receipt completion and operator proofs are scoped to the exact execution', async () => {
  const admin = connect(),
    a = connect(),
    b = connect(),
    operator = connect()
  await Promise.all([admin.connect(), a.connect(), b.connect(), operator.connect()])
  try {
    const safety = (
      await admin.query(
        "SELECT inet_server_addr() AS addr,current_setting('listen_addresses') AS listen,current_database() AS db",
      )
    ).rows[0]
    assert.deepEqual(safety, { addr: null, listen: '', db: database })
    await Promise.all([
      a.query('SET ROLE nuvemshop_intake_runtime'),
      b.query('SET ROLE nuvemshop_intake_runtime'),
      operator.query('SET ROLE nuvemshop_intake_operator'),
    ])
    const overloads = (
      await admin.query(`SELECT
      to_regprocedure('nuvemshop_intake.resolve_dispatch_signal(text,text,text,text,bigint,text)') AS old_signal,
      to_regprocedure('nuvemshop_intake.resolve_dispatch_reconciliation(text,text,bigint,text)') AS old_reconciliation,
      to_regprocedure('nuvemshop_intake.resolve_dispatch_signal(text,text,text,text,bigint,text,uuid,uuid,bigint)') IS NOT NULL AS new_signal,
      to_regprocedure('nuvemshop_intake.resolve_dispatch_reconciliation(text,text,bigint,text,uuid,uuid,bigint)') IS NOT NULL AS new_reconciliation`)
    ).rows[0]
    assert.deepEqual(overloads, {
      old_signal: null,
      old_reconciliation: null,
      new_signal: true,
      new_reconciliation: true,
    })
    await call(a, 'register_dispatch_consumer', ['5', 'orders'])
    const lifecycle = await claim(a, await insert(admin, 'app/resumed', '5'))
    let op = (await call(a, 'apply_dispatch_lifecycle', lifecycle))[0]
    op = (await call(a, 'record_dispatch_probe', ['5', op.epoch, 'ready']))[0]
    assert.equal(
      await scalar(a, 'begin_dispatch_reconciliation', [...lifecycle, 'orders', op.epoch]),
      'ready',
    )
    assert.equal(
      await scalar(a, 'finish_dispatch_reconciliation', [
        ...lifecycle,
        'orders',
        op.epoch,
        'applied',
      ]),
      true,
    )
    await scalar(a, 'succeed_work', lifecycle)

    const paid = await claim(a, await insert(admin, 'order/paid', '5', '501'))
    const paidStart = (await call(a, 'begin_dispatch_signal', [...paid, 'orders']))[0]
    assert.equal(paidStart.status, 'ready')
    assert.equal(
      await scalar(a, 'finish_dispatch_signal', [
        ...paid,
        'orders',
        paidStart.generation,
        paidStart.epoch,
        'retry_safe',
      ]),
      true,
    )
    const cancelled = await claim(b, await insert(admin, 'order/cancelled', '5', '501'))
    const cancelStart = (await call(b, 'begin_dispatch_signal', [...cancelled, 'orders']))[0]
    assert.equal(cancelStart.status, 'ready')
    assert.equal(BigInt(cancelStart.generation), BigInt(paidStart.generation) + 1n)
    assert.equal(
      await scalar(b, 'finish_dispatch_signal', [
        ...cancelled,
        'orders',
        cancelStart.generation,
        cancelStart.epoch,
        'applied',
      ]),
      true,
    )
    assert.equal((await call(a, 'begin_dispatch_signal', [...paid, 'orders']))[0].status, 'ready')
    assert.equal(
      await scalar(a, 'finish_dispatch_signal', [
        ...paid,
        'orders',
        paidStart.generation,
        paidStart.epoch,
        'applied',
      ]),
      true,
    )
    assert.equal(
      (await call(a, 'begin_dispatch_signal', [...paid, 'orders']))[0].status,
      'completed',
    )
    await scalar(a, 'succeed_work', paid)
    await scalar(b, 'succeed_work', cancelled)

    const signalId = await insert(admin, 'order/paid', '5', '502')
    const signalA = await claim(a, signalId)
    const signalStartA = (await call(a, 'begin_dispatch_signal', [...signalA, 'orders']))[0]
    assert.equal(
      await scalar(a, 'finish_dispatch_signal', [
        ...signalA,
        'orders',
        signalStartA.generation,
        signalStartA.epoch,
        'indeterminate',
      ]),
      true,
    )
    await scalar(a, 'fail_work', [...signalA, false, 'UNCERTAIN', 0])
    const oldSignalProof = [
      '5',
      'orders',
      'order',
      '502',
      signalStartA.generation,
      'retry_safe',
      ...signalA,
    ]
    for (const index of [6, 7, 8]) {
      const missing = [...oldSignalProof]
      missing[index] = null
      assert.equal(await scalar(operator, 'resolve_dispatch_signal', missing), false)
    }
    assert.equal(await scalar(operator, 'resolve_dispatch_signal', oldSignalProof), true)
    assert.equal(await scalar(operator, 'replay_work', [signalId]), true)
    const signalB = await claim(b, signalId)
    assert.notEqual(signalB[1], signalA[1])
    assert.notEqual(signalB[2], signalA[2])
    const signalStartB = (await call(b, 'begin_dispatch_signal', [...signalB, 'orders']))[0]
    assert.equal(signalStartB.generation, signalStartA.generation)
    assert.equal(
      await scalar(b, 'finish_dispatch_signal', [
        ...signalB,
        'orders',
        signalStartB.generation,
        signalStartB.epoch,
        'indeterminate',
      ]),
      true,
    )
    await scalar(b, 'fail_work', [...signalB, false, 'UNCERTAIN', 0])
    assert.equal(await scalar(operator, 'resolve_dispatch_signal', oldSignalProof), false)
    assert.equal(
      await scalar(operator, 'resolve_dispatch_signal', [
        '5',
        'orders',
        'order',
        '502',
        signalStartB.generation,
        'applied',
        ...signalB,
      ]),
      true,
    )
    assert.equal(
      (
        await admin.query(
          'SELECT completed FROM nuvemshop_intake.dispatch_signal WHERE receipt_id=$1 AND consumer_id=$2',
          [signalId, 'orders'],
        )
      ).rows[0].completed,
      true,
    )

    await call(a, 'register_dispatch_consumer', ['5', 'new-consumer'])
    const reconId = await insert(admin, 'order/paid', '5', '503')
    const reconA = await claim(a, reconId)
    assert.equal(
      await scalar(a, 'begin_dispatch_reconciliation', [...reconA, 'new-consumer', op.epoch]),
      'ready',
    )
    assert.equal(
      await scalar(a, 'finish_dispatch_reconciliation', [
        ...reconA,
        'new-consumer',
        op.epoch,
        'indeterminate',
      ]),
      true,
    )
    await scalar(a, 'fail_work', [...reconA, false, 'UNCERTAIN', 0])
    const oldReconProof = ['5', 'new-consumer', op.epoch, 'retry_safe', ...reconA]
    for (const index of [4, 5, 6]) {
      const missing = [...oldReconProof]
      missing[index] = null
      assert.equal(await scalar(operator, 'resolve_dispatch_reconciliation', missing), false)
    }
    assert.equal(await scalar(operator, 'resolve_dispatch_reconciliation', oldReconProof), true)
    assert.equal(await scalar(operator, 'replay_work', [reconId]), true)
    const reconB = await claim(b, reconId)
    assert.notEqual(reconB[1], reconA[1])
    assert.notEqual(reconB[2], reconA[2])
    assert.equal(
      await scalar(b, 'begin_dispatch_reconciliation', [...reconB, 'new-consumer', op.epoch]),
      'ready',
    )
    assert.equal(
      await scalar(b, 'finish_dispatch_reconciliation', [
        ...reconB,
        'new-consumer',
        op.epoch,
        'indeterminate',
      ]),
      true,
    )
    await scalar(b, 'fail_work', [...reconB, false, 'UNCERTAIN', 0])
    assert.equal(await scalar(operator, 'resolve_dispatch_reconciliation', oldReconProof), false)
    assert.equal(
      await scalar(operator, 'resolve_dispatch_reconciliation', [
        '5',
        'new-consumer',
        op.epoch,
        'applied',
        ...reconB,
      ]),
      true,
    )
    assert.equal(await scalar(a, 'register_dispatch_consumer', ['5', 'new-consumer']), false)
  } finally {
    await Promise.allSettled([admin.end(), a.end(), b.end(), operator.end()])
  }
})
