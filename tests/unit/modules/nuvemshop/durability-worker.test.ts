// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  createRecoveryWorker,
  type RecoveryStore,
} from '@/modules/nuvemshop/server/durability/worker'

const claim = {
  receiptId: 'r',
  token: 't',
  generation: '1',
  projection: { event: 'app/suspended', storeId: '1', correlationId: 'c' },
}
function store(): RecoveryStore {
  return {
    claim: vi.fn(async () => claim),
    start: vi.fn(async () => true),
    heartbeat: vi.fn(async () => true),
    succeed: vi.fn(async () => true),
    fail: vi.fn(async () => true),
    close: vi.fn(async () => undefined),
  }
}
describe('recovery worker', () => {
  it('processes a lifecycle projection without fabricating a resource ID', async () => {
    const db = store()
    const process = vi.fn(async () => undefined)
    const worker = createRecoveryWorker(db, process)
    await worker.runOnce()
    expect(process).toHaveBeenCalledWith(claim.projection, expect.any(AbortSignal))
    expect(db.succeed).toHaveBeenCalledWith(claim)
  })
  it('never invokes effects if ownership is rejected', async () => {
    const db = store()
    vi.mocked(db.start).mockResolvedValue(false)
    const process = vi.fn(async () => undefined)
    await expect(createRecoveryWorker(db, process).runOnce()).rejects.toThrow()
    expect(process).not.toHaveBeenCalled()
  })
  it('quarantines an ordinary processor error, rather than assuming retry is safe', async () => {
    const db = store()
    await expect(
      createRecoveryWorker(db, async () => {
        throw new Error('private')
      }).runOnce(),
    ).rejects.toThrow()
    expect(db.fail).toHaveBeenCalledWith(claim, false, 'PROCESSOR_ERROR', expect.any(Number))
  })
  it('closes resources even when polling fails', async () => {
    const db = store()
    vi.mocked(db.claim).mockRejectedValue(new Error('db'))
    await expect(
      createRecoveryWorker(db, async () => undefined).run(new AbortController().signal),
    ).rejects.toThrow()
    expect(db.close).toHaveBeenCalledOnce()
  })
})

describe('initial lease renewal', () => {
  it('renews after a slow start and schedules periodic renewal from confirmation', async () => {
    vi.useFakeTimers()
    try {
      const db = store()
      let confirm!: (value: boolean) => void
      let finish!: () => void
      vi.mocked(db.start).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 1500)),
      )
      vi.mocked(db.heartbeat).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            confirm = resolve
          }),
      )
      const process = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve
          }),
      )
      const run = createRecoveryWorker(db, process, {
        leaseSeconds: 2,
        heartbeatSeconds: 1,
      }).runOnce()
      await vi.advanceTimersByTimeAsync(1499)
      expect(process).not.toHaveBeenCalled()
      expect(db.heartbeat).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      expect(db.start).toHaveBeenCalledExactlyOnceWith(claim)
      expect(db.heartbeat).toHaveBeenCalledExactlyOnceWith(claim, 2)
      expect(vi.mocked(db.heartbeat).mock.calls[0]?.[0]).toBe(claim)
      expect(process).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(500)
      confirm(true)
      await vi.advanceTimersByTimeAsync(0)
      expect(process).toHaveBeenCalledOnce()
      await vi.advanceTimersByTimeAsync(999)
      expect(db.heartbeat).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      expect(db.heartbeat).toHaveBeenCalledTimes(2)
      expect(db.heartbeat).toHaveBeenLastCalledWith(claim, 2)
      finish()
      await expect(run).resolves.toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
  it('rejects a denied initial renewal without processing or completion', async () => {
    const db = store()
    vi.mocked(db.heartbeat).mockResolvedValue(false)
    const process = vi.fn(async () => undefined)
    await expect(createRecoveryWorker(db, process).runOnce()).rejects.toThrow('OWNERSHIP_LOST')
    expect(process).not.toHaveBeenCalled()
    expect(db.succeed).not.toHaveBeenCalled()
    expect(db.fail).not.toHaveBeenCalled()
    expect(db.heartbeat).toHaveBeenCalledOnce()
  })
  it('preserves a database error from initial renewal without retrying', async () => {
    const db = store()
    const error = new Error('database')
    vi.mocked(db.heartbeat).mockRejectedValue(error)
    const process = vi.fn(async () => undefined)
    await expect(createRecoveryWorker(db, process).runOnce()).rejects.toBe(error)
    expect(process).not.toHaveBeenCalled()
    expect(db.succeed).not.toHaveBeenCalled()
    expect(db.fail).not.toHaveBeenCalled()
    expect(db.heartbeat).toHaveBeenCalledOnce()
  })
  it('preserves an indeterminate renewal and its reconciliation data', async () => {
    const { TransitionIndeterminateError } =
      await import('@/modules/nuvemshop/server/durability/recovery-store')
    const db = store()
    const error = new TransitionIndeterminateError(
      { receiptId: claim.receiptId, token: claim.token, generation: claim.generation },
      { state: 'processing' },
    )
    vi.mocked(db.heartbeat).mockRejectedValue(error)
    const process = vi.fn(async () => undefined)
    const result = await createRecoveryWorker(db, process)
      .runOnce()
      .catch((e: unknown) => e)
    expect(result).toBe(error)
    expect(result).toMatchObject({
      identity: { receiptId: 'r', token: 't', generation: '1' },
      snapshot: { state: 'processing' },
    })
    expect(process).not.toHaveBeenCalled()
    expect(db.succeed).not.toHaveBeenCalled()
    expect(db.fail).not.toHaveBeenCalled()
    expect(db.heartbeat).toHaveBeenCalledOnce()
  })
  it('does not process when shutdown arrives while the initial renewal is pending', async () => {
    const db = store()
    const controller = new AbortController()
    let confirm!: (value: boolean) => void
    let started!: () => void
    const heartbeatStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    vi.mocked(db.heartbeat).mockImplementation(() => {
      started()
      return new Promise((resolve) => {
        confirm = resolve
      })
    })
    const process = vi.fn(async () => undefined)
    const run = createRecoveryWorker(db, process).runOnce(controller.signal)
    await heartbeatStarted
    expect(process).not.toHaveBeenCalled()
    controller.abort()
    expect(process).not.toHaveBeenCalled()
    confirm(true)
    await expect(run).rejects.toThrow('OWNERSHIP_UNCERTAIN')
    expect(process).not.toHaveBeenCalled()
    expect(db.succeed).not.toHaveBeenCalled()
    expect(db.fail).not.toHaveBeenCalled()
  })
})

describe('SQL claim uncertainty', () => {
  it('reconciles the same identity after an unknown claim response', async () => {
    const { createRecoveryStore } =
      await import('@/modules/nuvemshop/server/durability/recovery-store')
    const queries: { text: string; values: readonly unknown[] }[] = []
    const client = {
      query: vi.fn(async (text: string, values: readonly unknown[] = []) => {
        queries.push({ text, values })
        if (text.includes('claim_work')) throw new Error('lost response')
        return {
          rows: [
            {
              receipt_id: 'r',
              claim_token: values[0],
              generation: '1',
              projection: claim.projection,
            },
          ],
        }
      }),
      release: vi.fn(),
    }
    const db = createRecoveryStore({ connect: async () => client, close: async () => undefined })
    expect(await db.claim(60, 5)).toMatchObject({ receiptId: 'r', projection: claim.projection })
    expect(queries[1]?.values[0]).toBe(queries[0]?.values[0])
    expect(client.release).toHaveBeenCalledWith(true)
  })
  it('stops if an ambiguous claim cannot be confirmed', async () => {
    const { createRecoveryStore } =
      await import('@/modules/nuvemshop/server/durability/recovery-store')
    const client = {
      query: vi.fn(async (text: string) => {
        if (text.includes('claim_work')) throw new Error('connection lost')
        return { rows: [] }
      }),
      release: vi.fn(),
    }
    const db = createRecoveryStore({ connect: async () => client, close: async () => undefined })
    await expect(db.claim(60, 5)).rejects.toThrow('CLAIM_INDETERMINATE')
  })
})

describe('ownership and shutdown', () => {
  it('rejects a stale completion rather than reporting success', async () => {
    const db = store()
    vi.mocked(db.succeed).mockResolvedValue(false)
    await expect(createRecoveryWorker(db, async () => undefined).runOnce()).rejects.toThrow(
      'OWNERSHIP_LOST',
    )
  })
  it('permits explicitly safe retry only with bounded configured backoff', async () => {
    const { SafeRetryError } = await import('@/modules/nuvemshop/server/durability/worker')
    const db = store()
    await expect(
      createRecoveryWorker(
        db,
        async () => {
          throw new SafeRetryError()
        },
        { backoffSeconds: 90 },
      ).runOnce(),
    ).rejects.toThrow('PROCESSOR_FAILED')
    expect(db.fail).toHaveBeenCalledWith(claim, true, 'PROCESSOR_ERROR', 90)
    expect(() =>
      createRecoveryWorker(db, async () => undefined, { backoffSeconds: 86401 }),
    ).toThrow('INVALID_CONFIG')
  })
  it('does not treat throw undefined as a successful processor', async () => {
    const db = store()
    await expect(
      createRecoveryWorker(db, async () => {
        throw undefined
      }).runOnce(),
    ).rejects.toThrow('PROCESSOR_FAILED')
    expect(db.fail).toHaveBeenCalled()
    expect(db.succeed).not.toHaveBeenCalled()
  })
  it('does not start effects if shutdown arrived during start', async () => {
    const db = store()
    const controller = new AbortController()
    const process = vi.fn(async () => undefined)
    vi.mocked(db.start).mockImplementation(async () => {
      controller.abort()
      return true
    })
    await expect(createRecoveryWorker(db, process).runOnce(controller.signal)).rejects.toThrow(
      'OWNERSHIP_UNCERTAIN',
    )
    expect(process).not.toHaveBeenCalled()
    expect(db.heartbeat).not.toHaveBeenCalled()
    expect(db.succeed).not.toHaveBeenCalled()
  })
  it('aborts processing and never completes after stale heartbeat', async () => {
    vi.useFakeTimers()
    try {
      const db = store()
      vi.mocked(db.heartbeat).mockResolvedValueOnce(true).mockResolvedValue(false)
      const process = vi.fn(
        (_projection: unknown, signal: AbortSignal) =>
          new Promise<void>((resolve) =>
            signal.addEventListener('abort', () => resolve(), { once: true }),
          ),
      )
      const run = createRecoveryWorker(db, process, { heartbeatSeconds: 1 }).runOnce()
      const assertion = expect(run).rejects.toThrow('OWNERSHIP_UNCERTAIN')
      await vi.advanceTimersByTimeAsync(1000)
      await assertion
      expect(process).toHaveBeenCalledOnce()
      expect(process.mock.calls[0]?.[1].aborted).toBe(true)
      expect(db.heartbeat).toHaveBeenCalledTimes(2)
      expect(db.heartbeat).toHaveBeenLastCalledWith(claim, 60)
      expect(db.succeed).not.toHaveBeenCalled()
      expect(db.fail).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
  it('renews a valid heartbeat while processing', async () => {
    vi.useFakeTimers()
    try {
      const db = store()
      let finish!: () => void
      const run = createRecoveryWorker(
        db,
        () =>
          new Promise<void>((resolve) => {
            finish = resolve
          }),
        { heartbeatSeconds: 1 },
      ).runOnce()
      await vi.advanceTimersByTimeAsync(1000)
      expect(db.heartbeat).toHaveBeenCalledWith(claim, 60)
      finish()
      await expect(run).resolves.toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
  it('surfaces a close failure on graceful stop', async () => {
    const db = store()
    vi.mocked(db.close).mockRejectedValue(new Error('close failed'))
    const controller = new AbortController()
    controller.abort()
    await expect(
      createRecoveryWorker(db, async () => undefined).run(controller.signal),
    ).rejects.toThrow('CLOSE_FAILED')
  })
  it('does not invoke the processor on database failure', async () => {
    const db = store()
    const process = vi.fn(async () => undefined)
    vi.mocked(db.claim).mockRejectedValue(new Error('database'))
    await expect(createRecoveryWorker(db, process).runOnce()).rejects.toThrow()
    expect(process).not.toHaveBeenCalled()
  })
})

describe('SQL transition boundary', () => {
  it('passes fencing identity to every transition and rejects stale results', async () => {
    const { createRecoveryStore } =
      await import('@/modules/nuvemshop/server/durability/recovery-store')
    const client = { query: vi.fn(async () => ({ rows: [{ ok: false }] })), release: vi.fn() }
    const db = createRecoveryStore({ connect: async () => client, close: async () => undefined })
    expect(await db.start(claim)).toBe(false)
    expect(await db.heartbeat(claim, 60)).toBe(false)
    expect(await db.succeed(claim)).toBe(false)
    expect(await db.fail(claim, true, 'PROCESSOR_ERROR', 30)).toBe(false)
    for (const [, values] of client.query.mock.calls as unknown as [string, unknown[]][]) {
      expect(values.slice(0, 3)).toEqual(['r', 't', '1'])
    }
  })
  it('rejects invalid query results instead of claiming success', async () => {
    const { createRecoveryStore } =
      await import('@/modules/nuvemshop/server/durability/recovery-store')
    const client = { query: vi.fn(async () => ({ rows: [{ ok: null }] })), release: vi.fn() }
    const db = createRecoveryStore({ connect: async () => client, close: async () => undefined })
    await expect(db.succeed(claim)).rejects.toThrow('INVALID_DATABASE_RESULT')
  })
  it('surfaces errors during completion without repeating processing', async () => {
    const db = store()
    const process = vi.fn(async () => undefined)
    vi.mocked(db.succeed).mockRejectedValue(new Error('database'))
    await expect(createRecoveryWorker(db, process).runOnce()).rejects.toThrow('database')
    expect(process).toHaveBeenCalledOnce()
    expect(db.fail).not.toHaveBeenCalled()
  })
})

describe('bounded operation and reconciliation', () => {
  it('rejects attempt limits outside the SQL contract', () => {
    expect(() => createRecoveryWorker(store(), async () => undefined, { maxAttempts: 21 })).toThrow(
      'INVALID_CONFIG',
    )
  })
  it('continues polling after a recorded processor failure', async () => {
    vi.useFakeTimers()
    try {
      const db = store()
      const controller = new AbortController()
      let calls = 0
      const process = vi.fn(async () => {
        if (++calls === 1) throw new Error('failure')
        controller.abort()
      })
      const run = createRecoveryWorker(db, process, { pollSeconds: 1 }).run(controller.signal)
      const assertion = expect(run).rejects.toThrow('OWNERSHIP_UNCERTAIN')
      await vi.advanceTimersByTimeAsync(1000)
      await assertion
      expect(process).toHaveBeenCalledTimes(2)
      expect(db.fail).toHaveBeenCalledOnce()
      expect(db.close).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })
  it('stops after bounded grace when a processor ignores ownership loss', async () => {
    vi.useFakeTimers()
    try {
      const db = store()
      vi.mocked(db.heartbeat).mockResolvedValueOnce(true).mockResolvedValue(false)
      const run = createRecoveryWorker(db, () => new Promise<void>(() => {}), {
        heartbeatSeconds: 1,
        abortGraceSeconds: 2,
      }).runOnce()
      const assertion = expect(run).rejects.toThrow('OWNERSHIP_UNCERTAIN')
      await vi.advanceTimersByTimeAsync(3000)
      await assertion
      expect(db.succeed).not.toHaveBeenCalled()
      expect(db.fail).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
  it.each(['succeeded', 'processing'])(
    'preserves identity and observed %s after an ambiguous completion',
    async (state) => {
      const { createRecoveryStore, TransitionIndeterminateError } =
        await import('@/modules/nuvemshop/server/durability/recovery-store')
      const client = {
        query: vi.fn(async (sql: string) => {
          if (sql.includes('succeed_work')) throw new Error('lost response')
          return {
            rows: [
              {
                state,
                generation: '1',
                claim_token: null,
                lease_until: null,
                terminal_at: null,
                next_attempt_at: null,
                failure_code: null,
              },
            ],
          }
        }),
        release: vi.fn(),
      }
      const db = createRecoveryStore({ connect: async () => client, close: async () => undefined })
      const error = await db.succeed(claim).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(TransitionIndeterminateError)
      expect(error).toMatchObject({
        identity: { receiptId: 'r', token: 't', generation: '1' },
        snapshot: { state },
      })
      expect(client.query).toHaveBeenCalledTimes(2)
    },
  )
})

it('importing the CLI has no execution or signal-listener side effects', () => {
  const target = pathToFileURL(resolve('scripts/nuvemshop-worker.mjs')).href
  const script = `const before = [process.listenerCount('SIGINT'), process.listenerCount('SIGTERM')]; await import(${JSON.stringify(target)}); if (process.exitCode || before[0] !== process.listenerCount('SIGINT') || before[1] !== process.listenerCount('SIGTERM')) process.exit(2);`
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  expect(output).toBe('')
})

it.each([
  { event: 'product/updated', storeId: '1', correlationId: 'c', resourceId: '42' },
  { event: 'app/uninstalled', storeId: '1', correlationId: 'c', appId: '17' },
])('passes through the persisted $event projection unchanged', async (projection) => {
  const db = store()
  vi.mocked(db.claim).mockResolvedValue({ ...claim, projection })
  const process = vi.fn(async () => undefined)
  await createRecoveryWorker(db, process).runOnce()
  expect(process).toHaveBeenCalledWith(projection, expect.any(AbortSignal))
})

it('preserves transition identity and snapshot when resource close also fails', async () => {
  const { TransitionIndeterminateError } =
    await import('@/modules/nuvemshop/server/durability/recovery-store')
  const primary = new TransitionIndeterminateError(
    { receiptId: 'r', token: 't', generation: '1' },
    { state: 'succeeded' },
  )
  const db = store()
  vi.mocked(db.succeed).mockRejectedValue(primary)
  vi.mocked(db.close).mockRejectedValue(new Error('sensitive driver detail'))
  const error = await createRecoveryWorker(db, async () => undefined)
    .run(new AbortController().signal)
    .catch((e: unknown) => e)
  expect(error).toBeInstanceOf(AggregateError)
  expect((error as AggregateError).errors[0]).toBe(primary)
  expect((error as AggregateError).errors[0]).toMatchObject({
    identity: { receiptId: 'r', token: 't', generation: '1' },
    snapshot: { state: 'succeeded' },
  })
  expect((error as AggregateError).errors[1]).toMatchObject({ message: 'CLOSE_FAILED' })
  expect(String((error as AggregateError).errors[1])).not.toContain('sensitive driver detail')
})
