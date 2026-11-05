// Run only against a newly created, disposable local PostgreSQL cluster after
// applying the NUV-16 and NUV-17 migrations. Never use a provider database.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

const socket = process.env.NUV17_TEST_SOCKET
const database = process.env.NUV17_TEST_DATABASE
const port = Number(process.env.NUV17_TEST_PORT)
if (
  !socket?.startsWith('/') ||
  !/^nuv17_test(?:_[a-z0-9]+)?$/.test(database ?? '') ||
  !Number.isInteger(port)
) {
  throw new Error('Explicit disposable NUV-17 local socket, port and test database required')
}
const connect = () => new pg.Client({ host: socket, database, port, user: process.env.USER })
const query = async (client, name, args) =>
  (
    await client.query(
      `SELECT * FROM nuvemshop_intake.${name}(${args.map((_, i) => `$${i + 1}`).join(',')})`,
      args,
    )
  ).rows
const boolean = async (client, name, args) => (await query(client, name, args))[0][name]
const claim = (client, token, lease = 10, attempts = 3) =>
  query(client, 'claim_work', [token, lease, attempts])
const insert = async (db, event = 'app/suspended', days = 0) => {
  const id = randomUUID()
  await db.query('BEGIN')
  await db.query(
    `INSERT INTO nuvemshop_intake.receipts (attempt_id,family,contract_version,classification,projection,retention_policy_key,intake_at)
    VALUES ($1,'lifecycle',1,'received',$2,'lifecycle-v1',clock_timestamp()-make_interval(days => $3))`,
    [id, { event, storeId: '1', correlationId: 'synthetic' }, days],
  )
  await db.query('INSERT INTO nuvemshop_intake.work (receipt_id) VALUES ($1)', [id])
  await db.query('COMMIT')
  return id
}

test('local PostgreSQL: concurrency, fencing, retry, replay and privileges', async () => {
  const admin = connect(),
    a = connect(),
    b = connect(),
    operator = connect()
  await Promise.all([admin.connect(), a.connect(), b.connect(), operator.connect()])
  try {
    const safety = await admin.query(
      "SELECT inet_server_addr() AS addr, current_setting('listen_addresses') AS listen, current_database() AS db",
    )
    assert.equal(safety.rows[0].addr, null)
    assert.equal(safety.rows[0].listen, '')
    assert.equal(safety.rows[0].db, database)
    await Promise.all([
      a.query('SET ROLE nuvemshop_intake_runtime'),
      b.query('SET ROLE nuvemshop_intake_runtime'),
      operator.query('SET ROLE nuvemshop_intake_operator'),
    ])
    const id = await insert(admin)
    const ta = randomUUID(),
      tb = randomUUID()
    const race = await Promise.all([claim(a, ta), claim(b, tb)])
    assert.deepEqual(race.map((x) => x.length).sort(), [0, 1])
    const first = race.flat()[0]
    assert.equal(first.receipt_id, id)
    assert.equal(first.projection.event, 'app/suspended')
    assert.equal(first.projection.resourceId, undefined)
    assert.equal((await query(a, 'reconcile_claim', [first.claim_token]))[0].receipt_id, id)
    assert.equal(
      await boolean(a, 'heartbeat_work', [id, first.claim_token, first.generation, 10]),
      true,
    )
    assert.equal(await boolean(a, 'start_work', [id, first.claim_token, first.generation]), true)
    assert.equal(await boolean(a, 'succeed_work', [id, randomUUID(), first.generation]), false)
    assert.equal(
      await boolean(a, 'fail_work', [
        id,
        first.claim_token,
        first.generation,
        true,
        'TEMPORARY',
        1,
      ]),
      true,
    )
    assert.equal((await claim(b, randomUUID(), 10, 20)).length, 0)
    await admin.query('SELECT pg_sleep(1.1)')
    const retry = (await claim(b, randomUUID(), 10, 20))[0]
    assert.equal(retry.receipt_id, id)
    assert.equal(
      (
        await admin.query('SELECT max_attempts FROM nuvemshop_intake.work WHERE receipt_id=$1', [
          id,
        ])
      ).rows[0].max_attempts,
      3,
    )
    assert.equal(
      await boolean(a, 'heartbeat_work', [id, first.claim_token, first.generation, 10]),
      false,
    )
    assert.equal(await boolean(b, 'start_work', [id, retry.claim_token, retry.generation]), true)
    assert.equal(await boolean(b, 'succeed_work', [id, retry.claim_token, retry.generation]), true)
    const terminal = await admin.query(
      'SELECT state,terminal_at FROM nuvemshop_intake.work WHERE receipt_id=$1',
      [id],
    )
    assert.equal(terminal.rows[0].state, 'succeeded')
    assert.ok(terminal.rows[0].terminal_at)
    await assert.rejects(
      a.query("UPDATE nuvemshop_intake.work SET state='received' WHERE receipt_id=$1", [id]),
      /permission denied/,
    )
    await assert.rejects(
      a.query('SELECT nuvemshop_intake.replay_work($1)', [id]),
      /permission denied/,
    )
    await assert.rejects(
      a.query('UPDATE nuvemshop_intake.receipts SET incident_hold=true WHERE attempt_id=$1', [id]),
      /permission denied/,
    )
    await assert.rejects(
      a.query('CREATE TABLE nuvemshop_intake.forbidden (id int)'),
      /permission denied/,
    )
    await assert.rejects(
      a.query(
        "INSERT INTO nuvemshop_intake.work (receipt_id,state,generation,claim_token) VALUES ($1,'succeeded',9,$2)",
        [randomUUID(), randomUUID()],
      ),
      /permission denied/,
    )
    const grants = await admin.query(`SELECT
      has_function_privilege('public','nuvemshop_intake.claim_work(uuid,integer,integer)','EXECUTE') AS public_execute,
      has_function_privilege('nuvemshop_intake_runtime','nuvemshop_intake.replay_work(uuid)','EXECUTE') AS runtime_replay,
      has_table_privilege('nuvemshop_intake_runtime','nuvemshop_intake.work','UPDATE') AS runtime_update,
      (SELECT rolbypassrls OR rolcanlogin OR rolsuper FROM pg_roles WHERE rolname='nuvemshop_intake_owner') AS owner_unsafe,
      (SELECT bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class WHERE oid IN ('nuvemshop_intake.work'::regclass,'nuvemshop_intake.receipts'::regclass)) AS forced_rls`)
    assert.deepEqual(grants.rows[0], {
      public_execute: false,
      runtime_replay: false,
      runtime_update: false,
      owner_unsafe: false,
      forced_rls: true,
    })

    // An expired pre-processing claim is recovered with a new fence.
    const recoveredId = await insert(admin)
    const stale = (await claim(a, randomUUID(), 1))[0]
    await admin.query('SELECT pg_sleep(1.1)')
    const recovered = (await claim(b, randomUUID()))[0]
    assert.equal(recovered.receipt_id, recoveredId)
    assert.notEqual(recovered.generation, stale.generation)
    assert.equal(
      await boolean(a, 'start_work', [recoveredId, stale.claim_token, stale.generation]),
      false,
    )
    assert.equal(
      await boolean(b, 'fail_work', [
        recoveredId,
        recovered.claim_token,
        recovered.generation,
        false,
        'MANUAL',
        0,
      ]),
      true,
    )
    await admin.query(
      'UPDATE nuvemshop_intake.receipts SET incident_hold=true WHERE attempt_id=$1',
      [recoveredId],
    )
    assert.equal(await boolean(operator, 'replay_work', [recoveredId]), true)
    assert.equal(
      (
        await admin.query(
          'SELECT incident_hold FROM nuvemshop_intake.receipts WHERE attempt_id=$1',
          [recoveredId],
        )
      ).rows[0].incident_hold,
      true,
    )
    const replayed = (await claim(a, randomUUID(), 10, 1))[0]
    assert.equal(replayed.receipt_id, recoveredId)
    assert.equal(
      await boolean(a, 'fail_work', [
        recoveredId,
        replayed.claim_token,
        replayed.generation,
        true,
        'EXHAUSTED',
        0,
      ]),
      true,
    )
    assert.equal(
      (
        await admin.query('SELECT state FROM nuvemshop_intake.work WHERE receipt_id=$1', [
          recoveredId,
        ])
      ).rows[0].state,
      'quarantined',
    )

    const oldId = await insert(admin, 'app/resumed', 8)
    const old = (await claim(a, randomUUID()))[0]
    assert.equal(old.receipt_id, oldId)
    await boolean(a, 'fail_work', [oldId, old.claim_token, old.generation, false, 'MANUAL', 0])
    assert.equal(await boolean(operator, 'replay_work', [oldId]), false)

    // The deadline is checked after waiting for a locked work row.
    await admin.query(
      "UPDATE nuvemshop_intake.receipts SET intake_at=clock_timestamp()-interval '7 days'+interval '0.5 seconds' WHERE attempt_id=$1",
      [oldId],
    )
    await admin.query('BEGIN')
    await admin.query('SELECT 1 FROM nuvemshop_intake.work WHERE receipt_id=$1 FOR UPDATE', [oldId])
    const waitingReplay = boolean(operator, 'replay_work', [oldId])
    await admin.query('SELECT pg_sleep(1.1)')
    await admin.query('COMMIT')
    assert.equal(await waitingReplay, false)

    // Lock wait must not let an expired owner heartbeat or complete.
    for (const operation of ['heartbeat_work', 'succeed_work']) {
      const lockId = await insert(admin)
      const held = (await claim(a, randomUUID(), 1))[0]
      if (operation === 'succeed_work')
        assert.equal(
          await boolean(a, 'start_work', [lockId, held.claim_token, held.generation]),
          true,
        )
      await admin.query('BEGIN')
      await admin.query('SELECT 1 FROM nuvemshop_intake.work WHERE receipt_id=$1 FOR UPDATE', [
        lockId,
      ])
      const args = [
        lockId,
        held.claim_token,
        held.generation,
        ...(operation === 'heartbeat_work' ? [10] : []),
      ]
      const pending = boolean(a, operation, args)
      await admin.query('SELECT pg_sleep(1.1)')
      await admin.query('COMMIT')
      assert.equal(await pending, false)
      await claim(b, randomUUID()) // sweeps expired processing/final claims
      const state = (
        await admin.query('SELECT state FROM nuvemshop_intake.work WHERE receipt_id=$1', [lockId])
      ).rows[0].state
      if (state === 'claimed') {
        // Expired claimed work can be safely reclaimed; terminate fixture.
        const w = (
          await admin.query(
            'SELECT claim_token,generation FROM nuvemshop_intake.work WHERE receipt_id=$1',
            [lockId],
          )
        ).rows[0]
        await boolean(b, 'fail_work', [lockId, w.claim_token, w.generation, false, 'MANUAL', 0])
      } else assert.equal(state, 'quarantined')
    }
    // A final expired claim is quarantined by a poll even with no other work.
    const finalId = await insert(admin)
    await claim(a, randomUUID(), 1, 1)
    await admin.query('SELECT pg_sleep(1.1)')
    assert.equal((await claim(b, randomUUID())).length, 0)
    assert.equal(
      (await admin.query('SELECT state FROM nuvemshop_intake.work WHERE receipt_id=$1', [finalId]))
        .rows[0].state,
      'quarantined',
    )
  } finally {
    await Promise.allSettled([admin.end(), a.end(), b.end(), operator.end()])
  }
})
