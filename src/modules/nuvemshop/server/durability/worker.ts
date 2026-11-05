import 'server-only'

/** A minimal recovery engine. Importing this module never starts a worker. */
export interface RecoveryClaim {
  receiptId: string
  token: string
  generation: string
  projection: {
    event: string
    storeId: string
    correlationId: string
    resourceId?: string
    appId?: string
  }
}
export interface RecoveryStore {
  claim(leaseSeconds: number, maxAttempts: number): Promise<RecoveryClaim | null>
  start(claim: RecoveryClaim): Promise<boolean>
  heartbeat(claim: RecoveryClaim, leaseSeconds: number): Promise<boolean>
  succeed(claim: RecoveryClaim): Promise<boolean>
  fail(
    claim: RecoveryClaim,
    recoverable: boolean,
    code: string,
    backoffSeconds: number,
  ): Promise<boolean>
  close(): Promise<void>
}
/** Processors must honor abort promptly; uncooperative effects may continue after ownership is lost. */
export type RecoveryProcessor = (
  projection: RecoveryClaim['projection'],
  signal: AbortSignal,
) => Promise<void>

/** Use only when the processor knows another execution cannot duplicate effects. */
export class SafeRetryError extends Error {
  constructor() {
    super('SAFE_RETRY')
  }
}
export class RecoveryError extends Error {
  constructor(code: string) {
    super(code)
    this.name = 'RecoveryError'
  }
}
export interface RecoveryOptions {
  leaseSeconds?: number
  heartbeatSeconds?: number
  pollSeconds?: number
  maxAttempts?: number
  backoffSeconds?: number
  abortGraceSeconds?: number
}
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })
}
export function createRecoveryWorker(
  store: RecoveryStore,
  processor: RecoveryProcessor,
  options: RecoveryOptions = {},
) {
  const {
    leaseSeconds = 60,
    heartbeatSeconds = 20,
    pollSeconds = 5,
    maxAttempts = 5,
    backoffSeconds = 30,
    abortGraceSeconds = 5,
  } = options
  if (
    ![
      leaseSeconds,
      heartbeatSeconds,
      pollSeconds,
      maxAttempts,
      backoffSeconds,
      abortGraceSeconds,
    ].every(Number.isSafeInteger) ||
    leaseSeconds < 2 ||
    leaseSeconds > 3600 ||
    heartbeatSeconds < 1 ||
    heartbeatSeconds >= leaseSeconds ||
    pollSeconds < 1 ||
    pollSeconds > 3600 ||
    maxAttempts < 1 ||
    maxAttempts > 20 ||
    backoffSeconds < 1 ||
    backoffSeconds > 86400 ||
    abortGraceSeconds < 1 ||
    abortGraceSeconds > 60
  )
    throw new RecoveryError('INVALID_CONFIG')
  async function runOnce(signal = new AbortController().signal): Promise<boolean> {
    if (signal.aborted) return false
    const claim = await store.claim(leaseSeconds, maxAttempts)
    if (!claim) return false
    if (signal.aborted) return false
    if (!(await store.start(claim))) throw new RecoveryError('OWNERSHIP_LOST')
    if (signal.aborted) throw new RecoveryError('OWNERSHIP_UNCERTAIN')
    const controller = new AbortController()
    const stop = () => controller.abort()
    signal.addEventListener('abort', stop, { once: true })
    if (signal.aborted) controller.abort()
    let heartbeatError: unknown
    const heartbeats = (async () => {
      while (!controller.signal.aborted) {
        await delay(heartbeatSeconds * 1000, controller.signal)
        if (controller.signal.aborted) break
        try {
          if (!(await store.heartbeat(claim, leaseSeconds)))
            throw new RecoveryError('OWNERSHIP_LOST')
        } catch (error) {
          heartbeatError = error
          controller.abort()
        }
      }
    })()
    // Attach rejection handling immediately, including if the processor ignores abort.
    const execution = Promise.resolve()
      .then(() => processor(claim.projection, controller.signal))
      .then(
        () => ({ failed: false as const }),
        (error: unknown) => ({ failed: true as const, error }),
      )
    let abortTimer: ReturnType<typeof setTimeout> | undefined
    let onAbort: (() => void) | undefined
    const aborted = new Promise<{ timedOut: true }>((resolve) => {
      onAbort = () => {
        abortTimer = setTimeout(() => resolve({ timedOut: true }), abortGraceSeconds * 1000)
      }
      if (controller.signal.aborted) onAbort()
      else controller.signal.addEventListener('abort', onAbort, { once: true })
    })
    const outcome = await Promise.race([execution, aborted])
    if (abortTimer) clearTimeout(abortTimer)
    if (onAbort) controller.signal.removeEventListener('abort', onAbort)
    const interrupted = controller.signal.aborted || signal.aborted
    controller.abort()
    await heartbeats
    signal.removeEventListener('abort', stop)
    if (
      heartbeatError instanceof RecoveryError &&
      heartbeatError.message === 'TRANSITION_INDETERMINATE'
    )
      throw heartbeatError
    if (heartbeatError || interrupted || 'timedOut' in outcome)
      throw new RecoveryError('OWNERSHIP_UNCERTAIN')
    if (outcome.failed) {
      if (
        !(await store.fail(
          claim,
          outcome.error instanceof SafeRetryError,
          'PROCESSOR_ERROR',
          backoffSeconds,
        ))
      )
        throw new RecoveryError('OWNERSHIP_LOST')
      throw new RecoveryError('PROCESSOR_FAILED')
    }
    if (!(await store.succeed(claim))) throw new RecoveryError('OWNERSHIP_LOST')
    return true
  }
  return {
    runOnce,
    async run(signal: AbortSignal): Promise<void> {
      let primary: unknown
      let failed = false
      try {
        while (!signal.aborted) {
          try {
            await runOnce(signal)
          } catch (error) {
            if (!(error instanceof RecoveryError && error.message === 'PROCESSOR_FAILED'))
              throw error
          }
          if (!signal.aborted) await delay(pollSeconds * 1000, signal)
        }
      } catch (error) {
        failed = true
        primary = error
        throw error
      } finally {
        try {
          await store.close()
        } catch {
          const closeError = new RecoveryError('CLOSE_FAILED')
          if (failed) throw new AggregateError([primary, closeError], 'WORKER_AND_CLOSE_FAILED')
          throw closeError
        }
      }
    },
  }
}
