import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  NuvemshopRequestInput,
  NuvemshopRequestSuccess,
} from '@/modules/nuvemshop/server/client'
import type {
  NuvemshopAttemptLease,
  PreparedNuvemshopAttempt,
} from '@/modules/nuvemshop/server/request'

// Additive frozen input contract, usable against the unchanged NUV-04 baseline.
type Input = NuvemshopRequestInput & {
  query?: { page?: number; perPage?: number }
  readGeneration?: number
}
type Field<T> = { kind: 'absent' | 'invalid' } | { kind: 'valid'; value: T }
type Metadata = {
  request: {
    storeId: string
    method: string
    segments: string[]
    pagination: { page: number; perPage: number } | null
  }
  rateLimit: { limit: Field<number>; remaining: Field<number>; resetMs: Field<number> }
  pagination: { totalCount: Field<number>; links: Field<unknown[]> }
}
type Outcome = { value?: NuvemshopRequestSuccess; error?: unknown }
const STORE = '123'
const TOKEN = 'synthetic-retry-token'
const UUID_A = '2a1de28d-4acf-4d42-8f39-a44b6fd25414'
const UUID_B = '2a1de28d-4acf-4d42-8f39-a44b6fd25415'
const TARGET = `https://api.nuvemshop.com.br/2025-03/${STORE}/products`
const rate = (remaining = '0', reset = '700') => ({
  'x-rate-limit-limit': '40',
  'x-rate-limit-remaining': remaining,
  'x-rate-limit-reset': reset,
})
const read = (extra: Partial<Input> = {}): Input => ({
  method: 'GET',
  segments: ['products'],
  ...extra,
})
let request: (input: Input) => Promise<NuvemshopRequestSuccess>
let controllers: AbortController[]
let pending: Promise<Outcome>[]

function response(status = 200, headers: Record<string, string> = {}, body: string | null = '{}') {
  return new Response(body, { status, headers: { 'content-type': 'application/json', ...headers } })
}
function installFetch(
  impl: typeof fetch = async (_url, init) =>
    response(200, {}, init?.method === 'HEAD' ? null : '{}'),
) {
  const fake = vi.fn(impl)
  vi.stubGlobal('fetch', fake)
  return fake
}
function start(input: Input = read()): Promise<Outcome> {
  const controller = new AbortController()
  controllers.push(controller)
  if (input.signal === undefined)
    Object.defineProperty(input, 'signal', { value: controller.signal, configurable: true })
  const promise = request(input).then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  )
  pending.push(promise)
  return promise
}
async function tick(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms)
}
async function done(promise: Promise<Outcome>, ms = 9_000) {
  await tick(ms)
  return promise
}
function name(outcome: Outcome) {
  return (outcome.error as Error | undefined)?.name
}
function metadata(outcome: Outcome): Metadata {
  expect(outcome.error).toBeUndefined()
  expect(outcome.value).toHaveProperty('metadata')
  return (outcome.value as NuvemshopRequestSuccess & { metadata: Metadata }).metadata
}
function errorMetadata(outcome: Outcome) {
  return (outcome.error as { toJSON(): { metadata: Record<string, unknown> } }).toJSON().metadata
}
function deferredFetch() {
  const slots: { resolve: (value: Response) => void; signal: AbortSignal }[] = []
  const fake = installFetch(
    (_url, init) =>
      new Promise<Response>((resolve, reject) => {
        const signal = init?.signal as AbortSignal
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('synthetic abort', 'AbortError')),
          { once: true },
        )
        slots.push({ resolve, signal })
      }),
  )
  return { fake, slots }
}
function frozenTree(value: unknown) {
  if (value === null || typeof value !== 'object') return
  expect(Object.isFrozen(value)).toBe(true)
  for (const child of Object.values(value)) frozenTree(child)
}

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] })
  vi.spyOn(Math, 'random').mockReturnValue(0)
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NUVEMSHOP_STORE_ID', STORE)
  vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', TOKEN)
  controllers = []
  pending = []
  request = (await import('@/modules/nuvemshop/server/client')).nuvemshopRequest
})
afterEach(async () => {
  for (const controller of controllers) controller.abort()
  await tick(9_000)
  await Promise.all(pending)
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('lease dispatch, epochs and original monotonic deadlines', () => {
  function synchronousDecodeClock(jumpMs: number) {
    const platformNow = performance.now.bind(performance)
    let elapsed = 0
    const now = vi.spyOn(performance, 'now').mockImplementation(() => platformNow() + elapsed)
    const decode = TextDecoder.prototype.decode
    const flushes = vi.fn()
    vi.spyOn(TextDecoder.prototype, 'decode').mockImplementation(function (
      this: TextDecoder,
      ...args: Parameters<TextDecoder['decode']>
    ) {
      const decoded = decode.apply(this, args)
      if (args[0] === undefined) {
        flushes()
        elapsed += jumpMs
      }
      return decoded
    })
    return {
      now,
      flushes,
      addPreparation: (ms: number) => {
        elapsed += ms
      },
    }
  }
  function closedSuccess(method: 'GET' | 'HEAD', body = '{}') {
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          if (method === 'GET') controller.enqueue(new TextEncoder().encode(body))
          controller.close()
        },
      }),
      { headers: { 'content-type': 'application/json' } },
    )
  }
  it.each(['GET', 'HEAD'] as const)(
    'review round1 primitive %s rejects synchronous final decode beyond4000ms',
    async (method) => {
      const clock = synchronousDecodeClock(4_001)
      const fake = installFetch(async () => closedSuccess(method))
      const transport = await import('@/modules/nuvemshop/server/request')
      const promise = transport
        .performNuvemshopAttempt(transport.prepareNuvemshopAttempt(read({ method })), {
          storeId: STORE,
          accessToken: TOKEN,
        })
        .then(
          (value): Outcome => ({ value }),
          (error: unknown): Outcome => ({ error }),
        )
      const result = await done(promise, 0)
      expect(clock.flushes).toHaveBeenCalledTimes(1)
      expect(performance.now()).toBe(4_001)
      expect(name(result)).toBe('NuvemshopNetworkError')
      expect(fake).toHaveBeenCalledTimes(1)
    },
  )
  it.each(['GET', 'HEAD'] as const)(
    'review round1 primitive %s permits final decode below4000ms',
    async (method) => {
      const clock = synchronousDecodeClock(3_999)
      const fake = installFetch(async () => closedSuccess(method))
      const transport = await import('@/modules/nuvemshop/server/request')
      const promise = transport
        .performNuvemshopAttempt(transport.prepareNuvemshopAttempt(read({ method })), {
          storeId: STORE,
          accessToken: TOKEN,
        })
        .then(
          (value): Outcome => ({ value }),
          (error: unknown): Outcome => ({ error }),
        )
      const result = await done(promise, 0)
      expect(clock.flushes).toHaveBeenCalledTimes(1)
      expect(result.error).toBeUndefined()
      expect(result.value?.rawBody).toBe(method === 'HEAD' ? '' : '{}')
      expect(fake).toHaveBeenCalledTimes(1)
    },
  )
  it.each(['GET', 'HEAD'] as const)(
    'review round1 managed %s rejects expired synchronous decode in final attempt without third send',
    async (method) => {
      const clock = synchronousDecodeClock(4_001)
      const fake = installFetch(async () =>
        fake.mock.calls.length === 1 ? response(503, {}, null) : closedSuccess(method),
      )
      const promise = start(read({ method }))
      const result = await done(promise, 500)
      expect(clock.flushes).toHaveBeenCalledTimes(1)
      expect(performance.now()).toBe(4_501)
      expect(name(result)).toBe('NuvemshopNetworkError')
      expect(fake).toHaveBeenCalledTimes(2)
      await tick(9_000)
      expect(fake).toHaveBeenCalledTimes(2)
    },
  )
  it.each(['GET', 'HEAD'] as const)(
    'review round1 public %s rejects synchronous decode beyond original9000ms including preparation',
    async (method) => {
      const clock = synchronousDecodeClock(4_001)
      const fake = installFetch(async () => closedSuccess(method))
      const input = read({ method })
      Object.defineProperty(input, 'method', {
        get() {
          clock.addPreparation(5_000)
          return method
        },
      })
      const result = await done(start(input), 0)
      expect(clock.flushes).toHaveBeenCalledTimes(1)
      expect(performance.now()).toBe(9_001)
      expect(name(result)).toBe('NuvemshopNetworkError')
      expect(fake).toHaveBeenCalledTimes(1)
    },
  )
  it.each(['GET', 'HEAD'] as const)(
    'review round1 public %s permits synchronous decode below original9000ms',
    async (method) => {
      const clock = synchronousDecodeClock(3_999)
      const fake = installFetch(async () => closedSuccess(method))
      const input = read({ method })
      Object.defineProperty(input, 'method', {
        get() {
          clock.addPreparation(5_000)
          return method
        },
      })
      const result = await done(start(input), 0)
      expect(clock.flushes).toHaveBeenCalledTimes(1)
      expect(performance.now()).toBe(8_999)
      expect(result.error).toBeUndefined()
      expect(fake).toHaveBeenCalledTimes(1)
    },
  )
  it('review round1 malformed JSON remains primary Protocol when final decode crosses deadline', async () => {
    const clock = synchronousDecodeClock(9_001)
    const fake = installFetch(async () => closedSuccess('GET', '{'))
    const result = await done(start(), 0)
    expect(clock.flushes).toHaveBeenCalledTimes(1)
    expect(name(result)).toBe('NuvemshopProtocolError')
    expect(fake).toHaveBeenCalledTimes(1)
  })
  it('review round1 explicit abort during coalesced404 stalled cleanup affects only its own waiter', async () => {
    const caller = new AbortController()
    const canceled = vi.fn(() => new Promise<void>(() => {}))
    let transportSignal: AbortSignal | undefined
    const fake = installFetch(async (_url, init) => {
      transportSignal = init?.signal as AbortSignal
      return new Response(new ReadableStream({ cancel: canceled }), { status: 404 })
    })
    const abortedWaiter = start(read({ signal: caller.signal, correlationId: UUID_A }))
    const survivingWaiter = start(read({ correlationId: UUID_B }))
    await tick()
    expect(fake).toHaveBeenCalledTimes(1)
    expect(canceled).toHaveBeenCalledTimes(1)
    caller.abort()
    await tick()
    const aborted = await abortedWaiter
    expect(errorMetadata(aborted).correlationId).toBe(UUID_A)
    expect(transportSignal?.aborted).toBe(false)
    const surviving = await done(survivingWaiter, 4_000)
    expect(name(surviving)).toBe('NuvemshopNotFoundError')
    expect(errorMetadata(surviving).correlationId).toBe(UUID_B)
    expect(fake).toHaveBeenCalledTimes(1)
    expect(transportSignal?.aborted).toBe(true)
    expect(name(aborted)).toBe('NuvemshopNetworkError')
  })
  it.each([400, 401, 402, 403, 404, 429, 503])(
    'HTTP %i classification survives cleanup at the absolute deadline',
    async (status) => {
      const fake = installFetch(
        async () =>
          new Response(new ReadableStream({ cancel: () => new Promise<void>(() => {}) }), {
            status,
            headers: { 'content-type': 'application/json', ...rate() },
          }),
      )
      const input = read()
      Object.defineProperty(input, 'method', {
        get() {
          vi.advanceTimersByTime(5000)
          return 'GET'
        },
      })
      const expected = {
        400: 'NuvemshopProtocolError',
        401: 'NuvemshopAuthenticationError',
        402: 'NuvemshopAccountSuspendedError',
        403: 'NuvemshopAuthorizationError',
        404: 'NuvemshopNotFoundError',
        429: 'NuvemshopRateLimitError',
        503: 'NuvemshopProviderError',
      }
      expect(name(await done(start(input), 4000))).toBe(expected[status as keyof typeof expected])
      expect(fake).toHaveBeenCalledTimes(1)
    },
  )
  it('a HEAD body ProtocolError survives stalled cancel at the total deadline', async () => {
    const fake = installFetch(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new Uint8Array([120]))
            },
            cancel: () => new Promise<void>(() => {}),
          }),
        ),
    )
    const input = read()
    Object.defineProperty(input, 'method', {
      get() {
        vi.advanceTimersByTime(5000)
        return 'HEAD'
      },
    })
    expect(name(await done(start(input), 4000))).toBe('NuvemshopProtocolError')
    expect(fake).toHaveBeenCalledTimes(1)
  })
  it('a genuinely issued unsent lease is fenced by a concurrent trusted 429', async () => {
    const budget = await import('@/modules/nuvemshop/server/rate-budget')
    const inspect = budget.inspectNuvemshopLease
    let firstLease: NuvemshopAttemptLease | undefined
    // Forward capability validation unchanged. Inject the real private observer
    // at the issued/dispatch seam; no admission/debit/retry function is mocked.
    vi.spyOn(budget, 'inspectNuvemshopLease').mockImplementation((lease, attempt, config) => {
      const execution = inspect(lease, attempt, config)
      if (firstLease === undefined) firstLease = lease
      else
        budget.recordNuvemshopHttpObservation(firstLease, {
          status: 429,
          rateLimit: {
            limit: { kind: 'absent' },
            remaining: { kind: 'absent' },
            resetMs: { kind: 'absent' },
          },
          attemptSequence: 1,
          sentAtMs: 0,
          receivedAtMs: performance.now(),
        })
      return execution
    })
    const { fake, slots } = deferredFetch()
    const first = start()
    await tick()
    const unsent = start(read({ segments: ['orders'] }))
    await tick(500)
    expect(name(await unsent)).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(1)
    slots[0]!.resolve(response(429, {}, null))
    expect(name(await done(first, 0))).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(1)
  })

  it('forged, mismatched, concurrently reused and settled leases cannot add sends', async () => {
    const transport = await import('@/modules/nuvemshop/server/request')
    const budget = await import('@/modules/nuvemshop/server/rate-budget')
    const inspect = budget.inspectNuvemshopLease
    let saved:
      | {
          lease: NuvemshopAttemptLease
          attempt: PreparedNuvemshopAttempt
          config: { storeId: string; accessToken: string }
        }
      | undefined
    vi.spyOn(budget, 'inspectNuvemshopLease').mockImplementation((lease, attempt, config) => {
      const execution = inspect(lease, attempt, config)
      expect(() => inspect(lease, { ...attempt }, config)).toThrow('Nuvemshop input is invalid.')
      expect(() => inspect(lease, attempt, { ...config })).toThrow('Nuvemshop input is invalid.')
      saved = { lease, attempt, config }
      return execution
    })
    const { fake, slots } = deferredFetch()
    await expect(
      transport.performNuvemshopAttempt(
        transport.prepareNuvemshopAttempt(read()),
        { storeId: STORE, accessToken: TOKEN },
        Object.freeze({}) as NuvemshopAttemptLease,
      ),
    ).rejects.toHaveProperty('code', 'NUVEMSHOP_VALIDATION_ERROR')
    expect(fake).not.toHaveBeenCalled()
    const original = start()
    await tick()
    expect(saved).toBeDefined()
    await expect(
      transport.performNuvemshopAttempt(saved!.attempt, saved!.config, saved!.lease),
    ).rejects.toHaveProperty('code', 'NUVEMSHOP_VALIDATION_ERROR')
    expect(fake).toHaveBeenCalledTimes(1)
    slots[0]!.resolve(response())
    expect((await done(original, 0)).error).toBeUndefined()
    await expect(
      transport.performNuvemshopAttempt(saved!.attempt, saved!.config, saved!.lease),
    ).rejects.toHaveProperty('code', 'NUVEMSHOP_VALIDATION_ERROR')
    expect(fake).toHaveBeenCalledTimes(1)
  })

  it('an old positive response crossing reset cannot replenish the new epoch', async () => {
    const { fake, slots } = deferredFetch()
    const old = start()
    const exhausted = start(read({ segments: ['orders'] }))
    await tick(500)
    slots[1]!.resolve(
      response(200, {
        'x-rate-limit-limit': '2',
        'x-rate-limit-remaining': '0',
        'x-rate-limit-reset': '500',
      }),
    )
    await tick(500)
    const fresh = start(read({ segments: ['categories'] }))
    await tick()
    expect(fake).toHaveBeenCalledTimes(3)
    slots[0]!.resolve(response(200, rate('40', '500')))
    slots[2]!.resolve(response())
    await tick()
    expect((await Promise.all([old, exhausted, fresh])).every((result) => result.value)).toBe(true)
    expect(name(await done(start(read({ segments: ['webhooks'] }))))).toBe(
      'NuvemshopRateLimitError',
    )
    expect(fake).toHaveBeenCalledTimes(3)
  })

  it('preparation consumes the original budget and the last attempt is shortened', async () => {
    const sends: number[] = []
    const aborts: number[] = []
    const fake = installFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          sends.push(performance.now())
          init!.signal!.addEventListener(
            'abort',
            () => {
              aborts.push(performance.now())
              reject(new DOMException('synthetic', 'AbortError'))
            },
            { once: true },
          )
        }),
    )
    const input = read()
    Object.defineProperty(input, 'method', {
      get() {
        vi.advanceTimersByTime(4500)
        return 'GET'
      },
    })
    const job = start(input)
    await tick(4500)
    expect(name(await job)).toBe('NuvemshopNetworkError')
    expect(sends).toEqual([4500, 8500])
    expect(aborts).toEqual([8500, 9000])
    expect(fake).toHaveBeenCalledTimes(2)
  })

  it('preparation exhausting the original deadline permits zero fetch', async () => {
    const fake = installFetch()
    const input = read()
    Object.defineProperty(input, 'method', {
      get() {
        vi.advanceTimersByTime(9000)
        return 'GET'
      },
    })
    expect(name(await done(start(input), 0))).toBe('NuvemshopNetworkError')
    expect(fake).not.toHaveBeenCalled()
  })

  it('wall-clock jumps cannot remove monotonic pacing', async () => {
    const sends: number[] = []
    const fake = installFetch(async () => {
      sends.push(performance.now())
      return response()
    })
    await done(start(), 0)
    vi.setSystemTime(new Date('2100-01-01T00:00:00Z'))
    const next = start(read({ segments: ['orders'] }))
    await tick(499)
    expect(fake).toHaveBeenCalledTimes(1)
    expect((await done(next, 1)).error).toBeUndefined()
    expect(sends).toEqual([0, 500])
  })

  it('pacing plus jitter plus reset use the latest due time without stacking waits', async () => {
    vi.mocked(Math.random).mockReturnValue(1)
    const sends: number[] = []
    const fake = installFetch(async () => {
      sends.push(performance.now())
      return sends.length === 1 ? response(429, rate('0', '700'), null) : response()
    })
    expect((await done(start(), 700)).error).toBeUndefined()
    expect(fake).toHaveBeenCalledTimes(2)
    expect(sends).toEqual([0, 700])
  })
})

describe('NUV-05 managed retry policy through real client and transport', () => {
  it('persistent trusted 429 is limited to two total attempts', async () => {
    const fake = installFetch(async () => response(429, rate(), null))
    expect(name(await done(start()))).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(2)
  })
  it('maximum trusted jitter remains within 500ms and cannot renew deadline', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    const times: number[] = []
    const fake = installFetch(async () => {
      times.push(performance.now())
      return times.length === 1 ? response(503, {}, null) : response()
    })
    expect((await done(start())).error).toBeUndefined()
    expect(fake).toHaveBeenCalledTimes(2)
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(500)
    expect(times[1]! - times[0]!).toBeLessThanOrEqual(1_000)
  })
  it.each(['GET', 'HEAD'] as const)(
    '%s retries trusted 429 once after reset milliseconds',
    async (method) => {
      const sends: number[] = []
      const fake = installFetch(async () => {
        sends.push(performance.now())
        return sends.length === 1
          ? response(429, rate(), null)
          : response(200, {}, method === 'HEAD' ? null : '{}')
      })
      const promise = start(read({ method }))
      await tick(699)
      expect(fake).toHaveBeenCalledTimes(1)
      const result = await done(promise)
      expect(result.error).toBeUndefined()
      expect(fake).toHaveBeenCalledTimes(2)
      expect(sends[1]! - sends[0]!).toBeGreaterThanOrEqual(700)
      expect(sends[1]).toBeLessThan(9_000)
    },
  )
  it.each(['GET', 'HEAD'] as const)(
    '%s never makes a third attempt on persistent 5xx',
    async (method) => {
      const fake = installFetch(async () => response(503, {}, null))
      const result = await done(start(read({ method })))
      expect(name(result)).toBe('NuvemshopProviderError')
      expect(fake).toHaveBeenCalledTimes(2)
    },
  )
  it.each([500, 502, 503, 599])(
    'retries HTTP %i once and returns updated response',
    async (status) => {
      const fake = installFetch(async () =>
        fake.mock.calls.length === 1
          ? response(status, {}, null)
          : response(200, {}, '{"updated":true}'),
      )
      const result = await done(start())
      expect(result.value?.rawBody).toBe('{"updated":true}')
      expect(fake).toHaveBeenCalledTimes(2)
    },
  )
  it('retries network rejection once without upstream error leakage', async () => {
    const fake = installFetch(async () => {
      if (fake.mock.calls.length === 1) throw new Error('secret upstream')
      return response()
    })
    expect((await done(start())).error).toBeUndefined()
    expect(fake).toHaveBeenCalledTimes(2)
  })
  it('timeouts count as attempts and finish within the original 9000ms', async () => {
    const { fake } = deferredFetch()
    let settled = false
    const promise = start().then((value) => {
      settled = true
      return value
    })
    await tick(3_999)
    expect(settled).toBe(false)
    expect(name(await done(promise, 5_001))).toBe('NuvemshopNetworkError')
    expect(settled).toBe(true)
    expect(fake).toHaveBeenCalledTimes(2)
  })
  it.each([400, 422, 401, 402, 403, 404])('HTTP %i never retries', async (status) => {
    const fake = installFetch(async () => response(status, {}, null))
    expect((await done(start())).error).toBeDefined()
    expect(fake).toHaveBeenCalledTimes(1)
  })
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
    '%s never retries 429 or 5xx',
    async (method) => {
      const fake = installFetch(async () => response(method === 'POST' ? 429 : 503, rate(), null))
      expect((await done(start(read({ method })))).error).toBeDefined()
      expect(fake).toHaveBeenCalledTimes(1)
    },
  )
  it.each([
    ['absent', {}],
    ['reset only', { 'x-rate-limit-reset': '700' }],
    ['missing reset', { 'x-rate-limit-limit': '40', 'x-rate-limit-remaining': '0' }],
    ['invalid reset', rate('0', '1e3')],
    ['zero reset', rate('0', '0')],
    ['positive remaining', rate('1')],
    ['incoherent pair', rate('41')],
  ])('429 %s blocks unrelated reads, pages and writes without retry', async (_label, headers) => {
    const fake = installFetch(async () => response(429, headers as Record<string, string>, null))
    const initial = await done(start())
    expect(name(initial)).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(1)
    for (const input of [
      read({ segments: ['orders'] }),
      read({ query: { page: 2 } }),
      read({ method: 'POST', segments: ['webhooks'] }),
    ]) {
      expect(name(await done(start(input)))).toBe('NuvemshopRateLimitError')
      expect(fake).toHaveBeenCalledTimes(1)
    }
  })
  it('reset greater than remaining deadline preserves 429 and schedules no early retry', async () => {
    const fake = installFetch(async () => response(429, rate('0', '9007199254740991'), null))
    const result = await done(start())
    expect(name(result)).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(1)
    expect(errorMetadata(result).resetMs).toBe(9007199254740991)
  })
  it('hostile local inputs retain Validation before missing configuration and zero fetch', async () => {
    const fake = installFetch()
    vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', undefined)
    const input = read()
    Object.defineProperty(input, 'segments', {
      get() {
        throw new Error('private marker')
      },
    })
    const result = await done(start(input))
    expect(name(result)).toBe('NuvemshopValidationError')
    expect(fake).not.toHaveBeenCalled()
    expect(JSON.stringify(result.error)).not.toContain('private marker')
    expect(name(await done(start()))).toBe('NuvemshopConfigurationError')
  })
})

describe('NUV-05 shared store budget and race barriers', () => {
  it('partial limit credit init retains coldlimit1 when later complete10tuple establishes credit', async () => {
    const sends: number[] = []
    const fake = installFetch(async () => {
      sends.push(performance.now())
      return response(
        200,
        sends.length === 1
          ? { 'x-rate-limit-limit': '1' }
          : sends.length === 2
            ? {
                'x-rate-limit-limit': '10',
                'x-rate-limit-remaining': '9',
                'x-rate-limit-reset': '20000',
              }
            : {},
      )
    })
    const first = await done(start(), 0)
    expect(first.error).toBeUndefined()
    expect(metadata(first).rateLimit).toEqual({
      limit: { kind: 'valid', value: 1 },
      remaining: { kind: 'absent' },
      resetMs: { kind: 'absent' },
    })
    const second = await done(start(read({ segments: ['orders'] })), 500)
    expect(second.error).toBeUndefined()
    expect(metadata(second).rateLimit).toEqual({
      limit: { kind: 'valid', value: 10 },
      remaining: { kind: 'valid', value: 9 },
      resetMs: { kind: 'valid', value: 20000 },
    })
    expect((await done(start(read({ segments: ['categories'] })), 500)).error).toBeUndefined()
    const denied = await done(start(read({ segments: ['webhooks'] })), 500)
    expect(sends.slice(1).every((time, index) => time - sends[index]! >= 500)).toBe(true)
    expect(name(denied)).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(3)
  })
  it.each(['absent', 'malformed'] as const)(
    'review round2 partial%s reset never mints cold credit or permanently exhausts paced reads',
    async (resetKind) => {
      const sends: number[] = []
      const partial: Record<string, string> = {
        'x-rate-limit-limit': '40',
        'x-rate-limit-remaining': '39',
      }
      if (resetKind === 'malformed') partial['x-rate-limit-reset'] = '1e3'
      const fake = installFetch(async () => {
        sends.push(performance.now())
        return response(200, sends.length === 1 ? partial : {})
      })
      const outcomes: Outcome[] = []
      for (let index = 1; index <= 45; index += 1) {
        outcomes.push(await done(start(read({ segments: ['products', String(index)] })), 500))
      }
      expect(sends.slice(1).every((time, index) => time - sends[index]! >= 500)).toBe(true)
      expect(outcomes[0]?.value?.status).toBe(200)
      expect(fake).toHaveBeenCalledTimes(45)
      expect(
        outcomes.every((outcome) => outcome.value?.status === 200 && outcome.error === undefined),
      ).toBe(true)
    },
  )
  it('review round2 complete coherent tuple establishes finite trusted credit', async () => {
    const fake = installFetch(async () =>
      response(
        200,
        fake.mock.calls.length === 1
          ? {
              'x-rate-limit-limit': '3',
              'x-rate-limit-remaining': '2',
              'x-rate-limit-reset': '20000',
            }
          : {},
      ),
    )
    for (let index = 1; index <= 3; index += 1) {
      expect(
        (await done(start(read({ segments: ['products', String(index)] })), 500)).error,
      ).toBeUndefined()
    }
    expect(name(await done(start(read({ segments: ['products', '4'] })), 0))).toBe(
      'NuvemshopRateLimitError',
    )
    expect(fake).toHaveBeenCalledTimes(3)
  })
  it('review round2 partial positive pair may tighten already trusted credit', async () => {
    const fake = installFetch(async () =>
      response(
        200,
        fake.mock.calls.length === 1
          ? {
              'x-rate-limit-limit': '10',
              'x-rate-limit-remaining': '5',
              'x-rate-limit-reset': '20000',
            }
          : fake.mock.calls.length === 2
            ? {
                'x-rate-limit-limit': '10',
                'x-rate-limit-remaining': '1',
              }
            : {},
      ),
    )
    for (let index = 1; index <= 3; index += 1) {
      expect(
        (await done(start(read({ segments: ['products', String(index)] })), 500)).error,
      ).toBeUndefined()
    }
    expect(name(await done(start(read({ segments: ['products', '4'] })), 0))).toBe(
      'NuvemshopRateLimitError',
    )
    expect(fake).toHaveBeenCalledTimes(3)
  })
  it('review round2 supplemental partiallimit-only10to1 tightens already trusted credit', async () => {
    const fake = installFetch(async () =>
      response(
        200,
        fake.mock.calls.length === 1
          ? {
              'x-rate-limit-limit': '10',
              'x-rate-limit-remaining': '9',
              'x-rate-limit-reset': '20000',
            }
          : fake.mock.calls.length === 2
            ? { 'x-rate-limit-limit': '1' }
            : {},
      ),
    )
    const first = await done(start(), 0)
    expect(first.error).toBeUndefined()
    const lowered = await done(start(read({ segments: ['orders'] })), 500)
    expect(lowered.error).toBeUndefined()
    expect(metadata(lowered).rateLimit).toEqual({
      limit: { kind: 'valid', value: 1 },
      remaining: { kind: 'absent' },
      resetMs: { kind: 'absent' },
    })
    expect((await done(start(read({ segments: ['categories'] })), 500)).error).toBeUndefined()
    const denied = await done(start(read({ segments: ['webhooks'] })), 500)
    expect(name(denied)).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(3)
  })
  it('review round2 supplemental partiallimit-only10to1 persists in trusted resetwindow reopening', async () => {
    const fake = installFetch(async () =>
      response(
        200,
        fake.mock.calls.length === 1
          ? {
              'x-rate-limit-limit': '10',
              'x-rate-limit-remaining': '9',
              'x-rate-limit-reset': '1500',
            }
          : fake.mock.calls.length === 2
            ? { 'x-rate-limit-limit': '1' }
            : {},
      ),
    )
    expect((await done(start(), 0)).error).toBeUndefined()
    const lowered = await done(start(read({ segments: ['orders'] })), 500)
    expect(lowered.error).toBeUndefined()
    expect(metadata(lowered).rateLimit.limit).toEqual({ kind: 'valid', value: 1 })
    // The sole post-snapshot debit consumes the reduced reset-window credit.
    // Waiting first ensures this is the existing trusted reset's reopening,
    // rather than another pre-reset send that happens to exhaust live credit.
    await tick(1_000)
    expect(performance.now()).toBe(1_500)
    const denied = await done(start(read({ segments: ['categories'] })), 0)
    expect(name(denied)).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(2)
  })
  it('review round2 partial remainingzero blocks future admission without granting positive cold credit', async () => {
    const fake = installFetch(async () =>
      response(200, { 'x-rate-limit-limit': '40', 'x-rate-limit-remaining': '0' }),
    )
    expect((await done(start(), 0)).error).toBeUndefined()
    expect(name(await done(start(read({ segments: ['orders'] })), 0))).toBe(
      'NuvemshopRateLimitError',
    )
    expect(fake).toHaveBeenCalledTimes(1)
  })
  it('network failure never refunds a possibly sent debit to retries or another key', async () => {
    const fake = installFetch(async () => {
      if (fake.mock.calls.length === 1)
        return response(200, {
          'x-rate-limit-limit': '1',
          'x-rate-limit-remaining': '1',
          'x-rate-limit-reset': '20000',
        })
      throw new Error('synthetic uncertain send')
    })
    expect((await done(start(), 0)).error).toBeUndefined()
    expect(name(await done(start(read({ segments: ['orders'] }))))).toBe('NuvemshopNetworkError')
    expect(fake).toHaveBeenCalledTimes(2)
    expect(name(await done(start(read({ segments: ['categories'] }))))).toBe(
      'NuvemshopRateLimitError',
    )
    expect(fake).toHaveBeenCalledTimes(2)
  })
  it('all read keys, pages and retries share no-burst spacing of at least 500ms', async () => {
    const sends: number[] = []
    const fake = installFetch(async () => {
      sends.push(performance.now())
      return response()
    })
    const results = [
      start(),
      start(read({ segments: ['orders'] })),
      start(read({ query: { page: 2 } })),
      start(read({ method: 'POST' })),
    ]
    await tick(2_000)
    expect((await Promise.all(results)).every((result) => result.value)).toBe(true)
    expect(fake).toHaveBeenCalledTimes(4)
    expect(sends.slice(1).every((time, index) => time - sends[index]! >= 500)).toBe(true)
  })
  it('at most two attempts remain live through body consumption', async () => {
    let live = 0
    let peak = 0
    const bodies: ReadableStreamDefaultController<Uint8Array>[] = []
    const fake = installFetch(async () => {
      live += 1
      peak = Math.max(peak, live)
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            bodies.push(controller)
          },
          cancel() {
            live -= 1
          },
        }),
        { headers: { 'content-type': 'application/json' } },
      )
    })
    const jobs = ['products', 'orders', 'categories'].map((path) =>
      start(read({ segments: [path] })),
    )
    await tick(1_000)
    expect(fake).toHaveBeenCalledTimes(2)
    expect(peak).toBeLessThanOrEqual(2)
    for (const body of bodies.splice(0)) {
      body.enqueue(new TextEncoder().encode('{}'))
      body.close()
      live -= 1
    }
    await tick(500)
    expect(fake).toHaveBeenCalledTimes(3)
    for (const body of bodies) {
      body.enqueue(new TextEncoder().encode('{}'))
      body.close()
      live -= 1
    }
    await tick()
    expect((await Promise.all(jobs)).every((result) => result.value)).toBe(true)
  })
  it('a queued unsent request cannot dispatch across an absent-header 429 fence', async () => {
    const { fake, slots } = deferredFetch()
    const first = start()
    await tick()
    const queued = start(read({ segments: ['orders'] }))
    await tick(100)
    slots[0]!.resolve(response(429, {}, null))
    await tick(900)
    expect(fake).toHaveBeenCalledTimes(1)
    expect(name(await first)).toBe('NuvemshopRateLimitError')
    expect(name(await queued)).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(1)
  })
  it('remaining zero honors reset milliseconds on successful HTTP observations', async () => {
    const times: number[] = []
    const fake = installFetch(async () => {
      times.push(performance.now())
      return times.length === 1 ? response(200, rate('0', '1200')) : response()
    })
    await done(start(), 0)
    const next = start(read({ segments: ['orders'] }))
    await tick(1_199)
    expect(fake).toHaveBeenCalledTimes(1)
    expect((await done(next, 1)).error).toBeUndefined()
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(1_200)
  })
  it('remaining zero/reset zero never grants credit', async () => {
    const fake = installFetch(async () => response(200, rate('0', '0')))
    await done(start(), 0)
    expect(name(await done(start(read({ segments: ['orders'] }))))).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(1)
  })
  it.each(['000123', '123'])(
    'store alias %s and token rotation never reset exhausted budget',
    async (storeId) => {
      const fake = installFetch(async () => response(429, {}, null))
      await done(start(), 0)
      vi.stubEnv('NUVEMSHOP_STORE_ID', storeId)
      vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', 'synthetic-rotated-token')
      expect(name(await done(start(read({ segments: ['orders'] }))))).toBe(
        'NuvemshopRateLimitError',
      )
      expect(fake).toHaveBeenCalledTimes(1)
    },
  )
  it('different stores isolate quota and spacing', async () => {
    const fake = installFetch(async (url) =>
      String(url).includes('/123/') ? response(429, {}, null) : response(),
    )
    await done(start(), 0)
    vi.stubEnv('NUVEMSHOP_STORE_ID', '456')
    expect((await done(start(), 0)).error).toBeUndefined()
    expect(fake).toHaveBeenCalledTimes(2)
  })
  it('late positive observation cannot reopen a newer zero quota fence', async () => {
    const { fake, slots } = deferredFetch()
    const first = start()
    const second = start(read({ segments: ['orders'] }))
    await tick(500)
    slots[1]!.resolve(response(429, {}, null))
    await tick()
    slots[0]!.resolve(response(200, rate('39', '700')))
    await tick()
    expect(name(await second)).toBe('NuvemshopRateLimitError')
    expect((await first).error).toBeUndefined()
    expect(name(await done(start(read({ segments: ['categories'] }))))).toBe(
      'NuvemshopRateLimitError',
    )
    expect(fake).toHaveBeenCalledTimes(2)
  })
  it('reset while an old response is in flight subtracts its debit and rejects stale replenishment', async () => {
    const { fake, slots } = deferredFetch()
    const old = start()
    const zero = start(read({ segments: ['orders'] }))
    await tick(500)
    slots[1]!.resolve(
      response(200, {
        'x-rate-limit-limit': '1',
        'x-rate-limit-remaining': '0',
        'x-rate-limit-reset': '500',
      }),
    )
    await tick(500)
    const afterReset = start(read({ segments: ['categories'] }))
    await tick()
    // The pre-reset debit remains outstanding, consuming the single reliable credit.
    expect(fake).toHaveBeenCalledTimes(2)
    slots[0]!.resolve(response(200, rate('40', '500')))
    await tick(8_000)
    expect((await old).error).toBeUndefined()
    expect((await zero).error).toBeUndefined()
    expect(name(await afterReset)).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(2)
  })
})

describe('NUV-05 concurrent reads, waiter lifetimes and cancellation', () => {
  function forwardingSettlementInfo(onSecondSettlement: () => void) {
    const nativeInfo = console.info
    return vi.spyOn(console, 'info').mockImplementation((...args: unknown[]) => {
      nativeInfo.apply(console, args)
      const record = args[0] as Record<string, unknown> | undefined
      if (
        record?.event_name === 'nuvemshop_attempt' &&
        record.retry_attempt === 1 &&
        record.provider_status === 200
      )
        onSecondSettlement()
    })
  }
  function expectSettlementPrivacy(
    log: ReturnType<typeof forwardingSettlementInfo>,
    correlationId: string,
  ) {
    const records = log.mock.calls.map((call) => call[0] as Record<string, unknown>)
    expect(records.map((record) => record.retry_attempt)).toEqual([0, 1])
    expect(records.map((record) => record.provider_status)).toEqual([503, 200])
    for (const record of records) expect(record.request_or_delivery_correlation).toBe(correlationId)
    const exposed = JSON.stringify(records)
    for (const marker of [
      TOKEN,
      'Authorization',
      'Bearer',
      TARGET,
      'page=',
      'private@example.test',
    ])
      expect(exposed).not.toContain(marker)
  }
  it('review round2 successful finalretry crossing9000 during synchronous settlement yields own Network', async () => {
    const platformNow = performance.now.bind(performance)
    let settlementShift = 0
    vi.spyOn(performance, 'now').mockImplementation(() => platformNow() + settlementShift)
    const log = forwardingSettlementInfo(() => {
      settlementShift = 9_001 - platformNow()
    })
    const fake = installFetch(async () =>
      fake.mock.calls.length === 1 ? response(503, {}, null) : response(),
    )
    const result = await done(start(read({ correlationId: UUID_A })), 500)
    expect(fake).toHaveBeenCalledTimes(2)
    expect(performance.now()).toBe(9_001)
    expect(errorMetadata(result).correlationId).toBe(UUID_A)
    expectSettlementPrivacy(log, UUID_A)
    expect(name(result)).toBe('NuvemshopNetworkError')
  })
  it('review round2 normal successful retry settlement returns200 beforedeadline', async () => {
    const log = forwardingSettlementInfo(() => {})
    const fake = installFetch(async () =>
      fake.mock.calls.length === 1 ? response(503, {}, null) : response(),
    )
    const result = await done(start(read({ correlationId: UUID_A })), 500)
    expect(result.error).toBeUndefined()
    expect(result.value?.status).toBe(200)
    expect(fake).toHaveBeenCalledTimes(2)
    expectSettlementPrivacy(log, UUID_A)
  })
  it('review round2 reentrant callerabort during successful retry settlement detaches only own waiter asNetwork', async () => {
    const caller = new AbortController()
    const log = forwardingSettlementInfo(() => caller.abort())
    const fake = installFetch(async () =>
      fake.mock.calls.length === 1 ? response(503, {}, null) : response(),
    )
    const abortedPromise = start(read({ signal: caller.signal, correlationId: UUID_A }))
    const survivorPromise = start(read({ correlationId: UUID_B }))
    await tick(500)
    const aborted = await abortedPromise
    const survivor = await survivorPromise
    expect(survivor.error).toBeUndefined()
    expect(survivor.value?.status).toBe(200)
    expect(fake).toHaveBeenCalledTimes(2)
    expect(errorMetadata(aborted).correlationId).toBe(UUID_A)
    expectSettlementPrivacy(log, UUID_A)
    expect(name(aborted)).toBe('NuvemshopNetworkError')
  })
  it('retained waiters remain bounded after200 equivalent joins abort across ticks', async () => {
    const originalThen = Promise.prototype.then
    const registrations = new WeakMap<object, number>()
    let maximumOnOnePromise = 0
    // Forward every native reaction unchanged; retain only numeric WeakMap
    // observations, never a flight, callback, promise or policy replacement.
    const observedThen = function <T, TResult1 = T, TResult2 = never>(
      this: Promise<T>,
      fulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
      rejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
      const count = (registrations.get(this) ?? 0) + 1
      registrations.set(this, count)
      maximumOnOnePromise = Math.max(maximumOnOnePromise, count)
      // Function.call erases the native method's generic return relationship.
      return originalThen.call(this, fulfilled, rejected) as Promise<TResult1 | TResult2>
    }
    const descriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'then')!
    Object.defineProperty(Promise.prototype, 'then', { ...descriptor, value: observedThen })
    try {
      const { fake, slots } = deferredFetch()
      const survivor = start(read({ correlationId: UUID_A }))
      await tick()
      expect(fake).toHaveBeenCalledTimes(1)
      for (let index = 0; index < 200; index += 1) {
        const controller = new AbortController()
        const correlationId = `2a1de28d-4acf-4d42-8f39-${(1000 + index).toString(16).padStart(12, '0')}`
        const joined = request(read({ signal: controller.signal, correlationId })).then(
          (value): Outcome => ({ value }),
          (error: unknown): Outcome => ({ error }),
        )
        controller.abort()
        await tick(1)
        const canceled = await joined
        expect(name(canceled)).toBe('NuvemshopNetworkError')
        expect(errorMetadata(canceled).correlationId).toBe(correlationId)
        expect(slots[0]!.signal.aborted).toBe(false)
        expect(fake).toHaveBeenCalledTimes(1)
      }
      const retainedRegistrationsWhileUnsettled = maximumOnOnePromise
      slots[0]!.resolve(response(200, {}, '{"survived":true}'))
      expect((await done(survivor, 0)).value?.rawBody).toBe('{"survived":true}')
      expect(fake).toHaveBeenCalledTimes(1)
      // 128 is the current coalescing admission ceiling. Sequential aborts must
      // not bypass its retained-memory bound on a single still-live promise.
      expect(retainedRegistrationsWhileUnsettled).toBeLessThanOrEqual(128)
    } finally {
      Object.defineProperty(Promise.prototype, 'then', descriptor)
    }
  })
  it('retained waiters control preserves128 simultaneous admissions and rejects129th', async () => {
    const { fake, slots } = deferredFetch()
    const survivor = start(read({ correlationId: UUID_A }))
    const waiting: { controller: AbortController; result: Promise<Outcome> }[] = []
    for (let index = 0; index < 127; index += 1) {
      const controller = new AbortController()
      const result = request(read({ signal: controller.signal, correlationId: UUID_B })).then(
        (value): Outcome => ({ value }),
        (error: unknown): Outcome => ({ error }),
      )
      waiting.push({ controller, result })
    }
    const rejected = request(read()).then(
      (value): Outcome => ({ value }),
      (error: unknown): Outcome => ({ error }),
    )
    await tick()
    expect(name(await rejected)).toBe('NuvemshopRateLimitError')
    expect(fake).toHaveBeenCalledTimes(1)
    for (const waiter of waiting) waiter.controller.abort()
    for (const waiter of waiting) expect(name(await waiter.result)).toBe('NuvemshopNetworkError')
    expect(slots[0]!.signal.aborted).toBe(false)
    slots[0]!.resolve(response())
    expect((await done(survivor, 0)).error).toBeUndefined()
    expect(fake).toHaveBeenCalledTimes(1)
  })
  it('identical in-flight reads coalesce and fulfilled responses are never cached', async () => {
    const { fake, slots } = deferredFetch()
    const first = start(read({ correlationId: UUID_A }))
    const second = start(read({ correlationId: UUID_B }))
    await tick()
    expect(fake).toHaveBeenCalledTimes(1)
    slots[0]!.resolve(response(200, {}, '{"revision":1}'))
    await tick()
    expect((await first).value?.rawBody).toBe('{"revision":1}')
    expect((await second).value?.rawBody).toBe('{"revision":1}')
    const later = start()
    await tick(500)
    expect(fake).toHaveBeenCalledTimes(2)
    slots[1]!.resolve(response(200, {}, '{"revision":2}'))
    expect((await done(later, 0)).value?.rawBody).toBe('{"revision":2}')
  })
  it.each([
    ['method', { method: 'HEAD' }],
    ['path', { segments: ['orders'] }],
    ['query', { query: { page: 2 } }],
    ['operation', { operation: 'lookup' }],
    ['resource', { resourceKind: 'product' }],
    ['generation', { readGeneration: 1 }],
  ] as const)('%s differs in coalescing identity', async (_label, extra) => {
    const { fake, slots } = deferredFetch()
    const jobs = [start(), start(read(extra))]
    await tick(500)
    expect(fake).toHaveBeenCalledTimes(2)
    slots[0]!.resolve(response())
    slots[1]!.resolve(response(200, {}, 'method' in extra && extra.method === 'HEAD' ? null : '{}'))
    await tick()
    expect((await Promise.all(jobs)).every((result) => result.value)).toBe(true)
  })
  it('new credential epoch cannot join an old in-flight response', async () => {
    const { fake, slots } = deferredFetch()
    const old = start()
    await tick()
    vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', 'synthetic-rotated-token')
    const fresh = start()
    await tick(500)
    expect(fake).toHaveBeenCalledTimes(2)
    slots[1]!.resolve(response(200, {}, '{"fresh":true}'))
    slots[0]!.resolve(response(200, {}, '{"fresh":false}'))
    await tick()
    expect((await fresh).value?.rawBody).toBe('{"fresh":true}')
    expect((await old).value?.rawBody).toBe('{"fresh":false}')
  })
  it('aborting one waiter preserves the shared fetch and independently reconstructs context', async () => {
    const { fake, slots } = deferredFetch()
    const caller = new AbortController()
    const first = start(read({ signal: caller.signal, correlationId: UUID_A }))
    const second = start(read({ correlationId: UUID_B }))
    await tick()
    caller.abort()
    await tick()
    expect(name(await first)).toBe('NuvemshopNetworkError')
    expect(errorMetadata(await first).correlationId).toBe(UUID_A)
    expect(fake).toHaveBeenCalledTimes(1)
    expect(slots[0]!.signal.aborted).toBe(false)
    slots[0]!.resolve(response(404, {}, null))
    await tick()
    expect(name(await second)).toBe('NuvemshopNotFoundError')
    expect(errorMetadata(await second).correlationId).toBe(UUID_B)
  })
  it('late joining waiter cannot renew shared 9000ms deadline', async () => {
    const { fake } = deferredFetch()
    const first = start()
    await tick(3_900)
    const late = start(read({ correlationId: UUID_B }))
    let settled = false
    const observed = late.then((outcome) => {
      settled = true
      return outcome
    })
    await tick(5_100)
    expect(settled).toBe(true)
    expect(name(await first)).toBe('NuvemshopNetworkError')
    expect(name(await observed)).toBe('NuvemshopNetworkError')
    expect(errorMetadata(await observed).correlationId).toBe(UUID_B)
    expect(fake).toHaveBeenCalledTimes(2)
  })
  it.each(['admission', 'backoff', 'fetch', 'body'] as const)(
    'abort during %s stops fetch/retry without refunding a sent debit',
    async (phase) => {
      const caller = new AbortController()
      let fake: ReturnType<typeof installFetch>
      let canceled = false
      if (phase === 'fetch') fake = deferredFetch().fake
      else if (phase === 'body')
        fake = installFetch(
          async () =>
            new Response(
              new ReadableStream({
                cancel() {
                  canceled = true
                },
              }),
              { headers: { 'content-type': 'application/json' } },
            ),
        )
      else
        fake = installFetch(async () =>
          phase === 'backoff' ? response(503, {}, null) : response(),
        )
      if (phase === 'admission') await done(start(), 0)
      const job = start(read({ segments: ['orders'], signal: caller.signal }))
      await tick(100)
      caller.abort()
      const calls = fake.mock.calls.length
      expect(name(await done(job))).toBe(
        phase === 'backoff' ? 'NuvemshopProviderError' : 'NuvemshopNetworkError',
      )
      expect(fake).toHaveBeenCalledTimes(calls)
      if (phase === 'admission') expect(calls).toBe(1)
      if (phase === 'body') expect(canceled).toBe(true)
    },
  )
  it('stable caller correlation survives two failed attempts; errors and logs stay redacted', async () => {
    const logs = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
      vi.spyOn(console, 'info').mockImplementation(() => {}),
    ]
    const fake = installFetch(async () =>
      response(503, { 'x-private-secret': TOKEN }, 'private@example.test'),
    )
    const result = await done(start(read({ correlationId: UUID_A, query: {} })))
    expect(fake).toHaveBeenCalledTimes(2)
    expect(errorMetadata(result).correlationId).toBe(UUID_A)
    const records = logs
      .flatMap((log) => log.mock.calls.flat())
      .map((value: unknown) => {
        if (typeof value === 'string') {
          try {
            return JSON.parse(value) as Record<string, unknown>
          } catch {
            return {}
          }
        }
        return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
      })
      .filter((record) => typeof record.retry_attempt === 'number')
    expect(records.map((record) => record.retry_attempt)).toEqual([0, 1])
    for (const record of records) expect(record.request_or_delivery_correlation).toBe(UUID_A)
    const exposed = JSON.stringify({ error: result.error, logs: logs.map((log) => log.mock.calls) })
    for (const forbidden of [
      TOKEN,
      'private@example.test',
      'Authorization',
      'Bearer',
      'page=',
      TARGET,
    ])
      expect(exposed).not.toContain(forbidden)
  })
})

describe('frozen query and generation preparation contract', () => {
  it('own query rejects inherited page hidden behind a lying getPrototypeOf proxy before configuration', async () => {
    const fake = installFetch()
    vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', undefined)
    const query = new Proxy(Object.create({ page: 2 }) as { page?: number }, {
      getPrototypeOf: () => Object.prototype,
    })
    const result = await request(read({ query })).then(
      (value): Outcome => ({ value }),
      (error: unknown): Outcome => ({ error }),
    )
    expect(name(result)).toBe('NuvemshopValidationError')
    expect(fake).not.toHaveBeenCalled()
    expect(JSON.stringify(result.error)).not.toContain(TOKEN)
  })
  it('own query rejects phantom ownKeys page without an own descriptor before configuration', async () => {
    const fake = installFetch()
    vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', undefined)
    const query = new Proxy({} as { page?: number }, {
      ownKeys: () => ['page'],
      get: (_target, key) => (key === 'page' ? 2 : undefined),
    })
    const result = await request(read({ query })).then(
      (value): Outcome => ({ value }),
      (error: unknown): Outcome => ({ error }),
    )
    expect(name(result)).toBe('NuvemshopValidationError')
    expect(fake).not.toHaveBeenCalled()
    expect(JSON.stringify(result.error)).not.toContain(TOKEN)
  })
  it('own query accepts a forwarding proxy with real own accessors read exactly once', async () => {
    const page = vi.fn(() => 2)
    const perPage = vi.fn(() => 200)
    const target = Object.defineProperties(
      {},
      {
        page: { get: page, enumerable: true },
        perPage: { get: perPage, enumerable: true },
      },
    )
    const query = new Proxy(target, {})
    const fake = installFetch()
    const promise = request(read({ query })).then(
      (value): Outcome => ({ value }),
      (error: unknown): Outcome => ({ error }),
    )
    const result = await done(promise, 0)
    expect(result.error).toBeUndefined()
    expect(fake).toHaveBeenCalledTimes(1)
    expect(fake.mock.calls[0]?.[0]).toBe(`${TARGET}?page=2&per_page=200`)
    expect(page).toHaveBeenCalledTimes(1)
    expect(perPage).toHaveBeenCalledTimes(1)
    expect(metadata(result).request.pagination).toEqual({ page: 2, perPage: 200 })
  })
  it.each([
    ['products'],
    ['products', '123', 'variants'],
    ['categories'],
    ['orders'],
    ['webhooks'],
  ])('collection %j receives canonical explicit page=1&per_page=30', async (...segments) => {
    const fake = installFetch()
    const result = await done(start(read({ segments, query: {} })), 0)
    expect(fake.mock.calls[0]?.[0]).toBe(
      `https://api.nuvemshop.com.br/2025-03/${STORE}/${segments.join('/')}?page=1&per_page=30`,
    )
    expect(metadata(result).request.pagination).toEqual({ page: 1, perPage: 30 })
  })
  it('absent query preserves legacy URL and null identity; generation stays internal', async () => {
    const fake = installFetch()
    const result = await done(start(read({ readGeneration: 7 })), 0)
    expect(fake.mock.calls[0]?.[0]).toBe(TARGET)
    expect(metadata(result).request.pagination).toBeNull()
    expect(JSON.stringify(metadata(result))).not.toContain('readGeneration')
  })
  it('valid getters and forwarding proxy are snapshotted once before scheduling', async () => {
    let page = 2
    let perPage = 200
    const query = new Proxy(
      {
        get page() {
          return page
        },
        get perPage() {
          return perPage
        },
      },
      {},
    )
    const fake = installFetch()
    await done(start(), 0)
    const next = start(read({ query }))
    page = 9
    perPage = 1
    await tick(500)
    expect(metadata(await next).request.pagination).toEqual({ page: 2, perPage: 200 })
    expect(fake.mock.calls[1]?.[0]).toBe(`${TARGET}?page=2&per_page=200`)
  })
  const invalidQueries: [string, () => unknown][] = [
    ['zero page', () => ({ page: 0 })],
    ['negative page', () => ({ page: -1 })],
    ['fraction', () => ({ page: 1.5 })],
    ['string', () => ({ page: '2' })],
    ['unsafe page', () => ({ page: Number.MAX_SAFE_INTEGER + 1 })],
    ['NaN', () => ({ page: NaN })],
    ['infinite', () => ({ page: Infinity })],
    ['zero size', () => ({ perPage: 0 })],
    ['oversize', () => ({ perPage: 201 })],
    ['alias', () => ({ per_page: 30 })],
    ['unknown', () => ({ email: 'private@example.test' })],
    ['symbol', () => ({ [Symbol('private')]: 1 })],
    ['inherited', () => Object.create({ page: 2 })],
    ['array', () => []],
    ['URLSearchParams', () => new URLSearchParams('page=2')],
    ['null', () => null],
    ['absolute URL', () => 'https://evil.example/'],
    [
      'throwing getter',
      () => ({
        get page() {
          throw new Error(TOKEN)
        },
      }),
    ],
    [
      'ownKeys proxy',
      () =>
        new Proxy(
          {},
          {
            ownKeys() {
              throw new Error(TOKEN)
            },
          },
        ),
    ],
    [
      'revoked proxy',
      () => {
        const pair = Proxy.revocable({}, {})
        pair.revoke()
        return pair.proxy
      },
    ],
  ]
  it.each(invalidQueries)(
    'invalid query %s is redacted Validation before config and zero fetch',
    async (_label, make) => {
      const fake = installFetch()
      vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', undefined)
      const result = await done(start(read({ query: make() as Input['query'] })), 0)
      expect(name(result)).toBe('NuvemshopValidationError')
      expect(fake).not.toHaveBeenCalled()
      expect(JSON.stringify(result.error)).not.toContain(TOKEN)
      expect(JSON.stringify(result.error)).not.toContain('private@example.test')
    },
  )
  it('a throwing outer query getter is inside preparation catch before configuration', async () => {
    const fake = installFetch()
    vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', undefined)
    const input = read()
    Object.defineProperty(input, 'query', {
      get() {
        throw new Error(TOKEN)
      },
    })
    expect(name(await done(start(input), 0))).toBe('NuvemshopValidationError')
    expect(fake).not.toHaveBeenCalled()
  })
  it.each([
    ['products', '123'],
    ['products', '123', 'variants', '456'],
    ['store'],
    ['orders', '123', 'fulfillment-orders'],
    ['metafields', 'orders'],
  ])('excluded route %j rejects query before fetch', async (...segments) => {
    const fake = installFetch()
    expect(name(await done(start(read({ segments, query: {} })), 0))).toBe(
      'NuvemshopValidationError',
    )
    expect(fake).not.toHaveBeenCalled()
  })
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
    '%s rejects query and readGeneration',
    async (method) => {
      const fake = installFetch()
      for (const extra of [{ query: {} }, { readGeneration: 0 }]) {
        expect(name(await done(start(read({ method, ...extra })), 0))).toBe(
          'NuvemshopValidationError',
        )
      }
      expect(fake).not.toHaveBeenCalled()
    },
  )
  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1'])(
    'invalid generation %s never fetches',
    async (generation) => {
      const fake = installFetch()
      expect(name(await done(start(read({ readGeneration: generation as number })), 0))).toBe(
        'NuvemshopValidationError',
      )
      expect(fake).not.toHaveBeenCalled()
    },
  )
  it('throwing generation getter becomes Validation before configuration', async () => {
    const fake = installFetch()
    vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', undefined)
    const input = read()
    Object.defineProperty(input, 'readGeneration', {
      get() {
        throw new Error(TOKEN)
      },
    })
    expect(name(await done(start(input), 0))).toBe('NuvemshopValidationError')
    expect(fake).not.toHaveBeenCalled()
  })
})

describe('bounded scalar and raw-free deeply frozen response projection', () => {
  it('exact safe metadata snapshots only approved fields and deeply freezes all nested data', async () => {
    installFetch(async () =>
      response(200, { ...rate('39', '500'), 'x-total-count': '0', 'x-private-secret': TOKEN }),
    )
    const projected = metadata(await done(start(read({ query: {}, correlationId: UUID_A })), 0))
    expect(projected).toEqual({
      request: {
        origin: 'https://api.nuvemshop.com.br',
        apiVersion: '2025-03',
        storeId: STORE,
        method: 'GET',
        segments: ['products'],
        pagination: { page: 1, perPage: 30 },
      },
      rateLimit: {
        limit: { kind: 'valid', value: 40 },
        remaining: { kind: 'valid', value: 39 },
        resetMs: { kind: 'valid', value: 500 },
      },
      pagination: { totalCount: { kind: 'valid', value: 0 }, links: { kind: 'absent' } },
    })
    frozenTree(projected)
    expect(JSON.stringify(projected)).not.toContain(TOKEN)
    expect(JSON.stringify(projected)).not.toContain(UUID_A)
  })
  it('absent scalar headers retain absence sentinels', async () => {
    installFetch()
    const projected = metadata(await done(start(), 0))
    expect(projected.rateLimit).toEqual({
      limit: { kind: 'absent' },
      remaining: { kind: 'absent' },
      resetMs: { kind: 'absent' },
    })
    expect(projected.pagination).toEqual({
      totalCount: { kind: 'absent' },
      links: { kind: 'absent' },
    })
  })
  it.each(['', '00', '+1', '-1', '1e3', '1.0', '1, 2', '9007199254740992', '12345678901234567'])(
    'malformed scalar %j becomes invalid without raw retention',
    async (raw) => {
      installFetch(async () => response(200, { 'x-rate-limit-reset': raw, 'x-total-count': raw }))
      const projected = metadata(await done(start(), 0))
      expect(projected.rateLimit.resetMs).toEqual({ kind: 'invalid' })
      expect(projected.pagination.totalCount).toEqual({ kind: 'invalid' })
    },
  )
  it.each([
    [{ 'x-rate-limit-limit': '0', 'x-rate-limit-remaining': '0' }],
    [{ 'x-rate-limit-limit': '40', 'x-rate-limit-remaining': '41' }],
    [{ 'x-rate-limit-limit': 'bad', 'x-rate-limit-remaining': '2' }],
  ])(
    'incoherent pair %j invalidates both fields but preserves independent reset',
    async (headers) => {
      installFetch(async () => response(200, { ...headers, 'x-rate-limit-reset': '500' }))
      expect(metadata(await done(start(), 0)).rateLimit).toEqual({
        limit: { kind: 'invalid' },
        remaining: { kind: 'invalid' },
        resetMs: { kind: 'valid', value: 500 },
      })
    },
  )
  it('remaining without reliable limit cannot establish credit', async () => {
    installFetch(async () => response(200, { 'x-rate-limit-remaining': '39' }))
    expect(metadata(await done(start(), 0)).rateLimit.remaining).toEqual({ kind: 'invalid' })
  })
  it('raw-free Link target contains only validated IDs, literals and pagination', async () => {
    const fake = installFetch(async () =>
      response(200, {
        Link: `<${TARGET}?page=2&per_page=30>; rel="next", <${TARGET}?page=1&per_page=30>; rel="first"`,
      }),
    )
    const projected = metadata(await done(start(read({ query: {} })), 0))
    expect(projected.pagination.links).toEqual({
      kind: 'valid',
      value: [
        {
          relation: 'next',
          origin: 'https://api.nuvemshop.com.br',
          apiVersion: '2025-03',
          storeId: STORE,
          segments: ['products'],
          pagination: { page: 2, perPage: 30 },
        },
        {
          relation: 'first',
          origin: 'https://api.nuvemshop.com.br',
          apiVersion: '2025-03',
          storeId: STORE,
          segments: ['products'],
          pagination: { page: 1, perPage: 30 },
        },
      ],
    })
    frozenTree(projected)
    expect(fake).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(projected)).not.toContain('https://api.nuvemshop.com.br/2025-03/')
  })
  const validLink = `<${TARGET}?page=2&per_page=30>; rel="next"`
  it.each([
    ['foreign host', validLink.replace('api.nuvemshop.com.br', 'evil.example')],
    ['foreign version', validLink.replace('2025-03', '2024-01')],
    ['port', validLink.replace('.br/', '.br:443/')],
    ['userinfo', validLink.replace('https://', 'https://private@example.test@')],
    ['fragment', validLink.replace('>; rel', '#private>; rel')],
    ['dot segment', validLink.replace('/products?', '/orders/../products?')],
    ['encoded path', validLink.replace('/products?', '/%70roducts?')],
    ['backslash', validLink.replace('/products?', '/products\\?')],
    ['unsupported route', validLink.replace('/products?', '/products/123/unknown?')],
    ['duplicate page', validLink.replace('page=2', 'page=2&page=3')],
    ['encoded query key', validLink.replace('page=2', '%70age=2')],
    ['encoded value', validLink.replace('page=2', 'page=%32')],
    ['missing page size', validLink.replace('&per_page=30', '')],
    ['extra query PII', validLink.replace('per_page=30', 'per_page=30&email=private@example.test')],
    ['oversize page', validLink.replace('page=2', 'page=9007199254740992')],
    ['oversize page size', validLink.replace('per_page=30', 'per_page=201')],
    ['noncanonical page', validLink.replace('page=2', 'page=02')],
    ['extra attribute', `${validLink}; title="private"`],
    ['unknown relation', validLink.replace('"next"', '"private"')],
    ['multi relation', validLink.replace('"next"', '"next last"')],
    ['duplicate relation', `${validLink}, ${validLink}`],
    ['empty entry', `${validLink},`],
    ['too many entries', Array.from({ length: 5 }, () => validLink).join(', ')],
    ['URI too long', validLink.replace('page=2', `page=${'1'.repeat(1600)}`)],
    ['header too long', 'x'.repeat(8193)],
    ['non ASCII', validLink.replace('products', 'produtosé')],
  ])(
    'hostile Link %s invalidates entire header without raw exposure or egress',
    async (_label, link) => {
      const fake = installFetch(async () => response(200, { Link: link }))
      const projected = metadata(await done(start(read({ query: {} })), 0))
      expect(projected.pagination.links).toEqual({ kind: 'invalid' })
      expect(fake).toHaveBeenCalledTimes(1)
      expect(JSON.stringify(projected)).not.toContain(link)
      expect(JSON.stringify(projected)).not.toContain('private@example.test')
      expect(JSON.stringify(projected)).not.toContain('evil.example')
    },
  )
})
