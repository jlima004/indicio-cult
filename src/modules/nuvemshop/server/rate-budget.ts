import 'server-only'

import {
  NuvemshopAccountSuspendedError,
  NuvemshopAuthenticationError,
  NuvemshopAuthorizationError,
  NuvemshopConfigurationError,
  NuvemshopNetworkError,
  NuvemshopNotFoundError,
  NuvemshopProtocolError,
  NuvemshopProviderError,
  NuvemshopRateLimitError,
  NuvemshopValidationError,
  type NuvemshopErrorContext,
} from './errors'
import {
  performNuvemshopAttempt,
  type NuvemshopAttemptContext,
  type NuvemshopAttemptLease,
  type NuvemshopRateLimitMetadata,
  type NuvemshopRequestSuccess,
  type PreparedNuvemshopAttempt,
} from './request'

const TOTAL_MS = 9_000
const SPACING_MS = 500
const MAX_STORES = 128
const MAX_WAITERS = 128
type Config = { readonly storeId: string; readonly accessToken: string }
type TypedError = NuvemshopNetworkError | NuvemshopRateLimitError | NuvemshopProviderError

interface ResetWindow {
  due: number
  limit: number
  sequence: number
  outstanding: number
}
interface Budget {
  nextSend: number
  active: number
  issued: NuvemshopAttemptLease | null
  sequence: number
  epoch: number
  credit: number | undefined
  limit: number | undefined
  blocked: boolean
  hardBlocked: boolean
  reset: ResetWindow | null
  running: Set<Lease>
  changed: Set<() => void>
  credential: string
  credentialEpoch: number
  flights: Map<string, Flight>
  waiters: number
}
interface Lease {
  flight: Flight
  attempt: PreparedNuvemshopAttempt
  config: Config
  budget: Budget
  deadline: number
  attemptNumber: number
  epoch: number
  state: 'issued' | 'running' | 'settled'
  sequence: number
  sentAt: number
  observed: boolean
  providerStatus?: number
}
interface Flight {
  attempt: PreparedNuvemshopAttempt
  config: Config
  budget: Budget
  deadline: number
  controller: AbortController
  waiters: number
  lastError?: TypedError
  terminalError?: Error
  running: boolean
  listeners: Set<Waiter>
}
interface Waiter {
  success: (result: NuvemshopRequestSuccess) => void
  failure: (error: unknown) => void
}
interface NuvemshopHttpObservation {
  readonly status: number
  readonly rateLimit: NuvemshopRateLimitMetadata
  readonly attemptSequence: number
  readonly sentAtMs: number
  readonly receivedAtMs: number
}

// Neither registry nor its keys leave this server module. Unknown/exhausted
// budgets are never evicted to manufacture a fresh cold-start allowance.
const budgets = new Map<string, Budget>()
const leases = new WeakMap<NuvemshopAttemptLease, Lease>()

/** Trusted clock seam: tests replace the platform clock, never request input. */
export function nuvemshopMonotonicNow(): number {
  return performance.now()
}

function wake(budget: Budget): void {
  for (const listener of [...budget.changed]) listener()
}

function getBudget(config: Config, context: NuvemshopAttemptContext): Budget {
  if (
    config.storeId.length > 256 ||
    !/^[0-9]+$/.test(config.storeId) ||
    !/[1-9]/.test(config.storeId) ||
    config.accessToken.length < 1 ||
    config.accessToken.length > 4096 ||
    /[^\u0021-\u007E]/.test(config.accessToken)
  ) {
    throw new NuvemshopConfigurationError({ operation: 'configuration' })
  }
  // A fixed internal app identity is implicit in this module. Keep URL/store
  // spelling intact; only the private accounting key removes decimal aliases.
  const key = config.storeId.replace(/^0+/, '')
  let budget = budgets.get(key)
  if (!budget) {
    if (budgets.size >= MAX_STORES) throw new NuvemshopRateLimitError(context)
    budget = {
      nextSend: 0,
      active: 0,
      issued: null,
      sequence: 0,
      epoch: 0,
      credit: undefined,
      limit: undefined,
      blocked: false,
      hardBlocked: false,
      reset: null,
      running: new Set(),
      changed: new Set(),
      credential: config.accessToken,
      credentialEpoch: 0,
      flights: new Map(),
      waiters: 0,
    }
    budgets.set(key, budget)
  } else if (budget.credential !== config.accessToken) {
    if (budget.credentialEpoch >= Number.MAX_SAFE_INTEGER)
      throw new NuvemshopConfigurationError({ operation: 'configuration' })
    budget.credential = config.accessToken
    budget.credentialEpoch += 1
  }
  return budget
}

function reopen(budget: Budget, now: number): void {
  const reset = budget.reset
  if (budget.hardBlocked || !reset || now < reset.due) return
  // Every send after the snapshot and every other then-outstanding send is
  // still a debit, even if its response subsequently arrived or failed.
  budget.credit = Math.max(0, reset.limit - (budget.sequence - reset.sequence) - reset.outstanding)
  budget.limit = reset.limit
  budget.epoch += 1
  budget.reset = null
  budget.blocked = budget.credit === 0
  budget.hardBlocked = budget.blocked
}

function waitForChange(
  budget: Budget,
  due: number,
  deadline: number,
  signal: AbortSignal,
  context: NuvemshopAttemptContext,
): Promise<void> {
  const now = nuvemshopMonotonicNow()
  if (signal.aborted || now >= deadline) return Promise.reject(new NuvemshopNetworkError(context))
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      budget.changed.delete(onChange)
      signal.removeEventListener('abort', onAbort)
    }
    const onChange = () => {
      cleanup()
      resolve()
    }
    const onAbort = () => {
      cleanup()
      reject(new NuvemshopNetworkError(context))
    }
    const timer = setTimeout(onChange, Math.max(0, Math.min(due, deadline) - now))
    budget.changed.add(onChange)
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) onAbort()
  })
}

async function reserve(
  flight: Flight,
  attempt: PreparedNuvemshopAttempt,
  notBefore: number,
  attemptNumber: number,
): Promise<NuvemshopAttemptLease> {
  const budget = flight.budget
  while (true) {
    const now = nuvemshopMonotonicNow()
    if (flight.controller.signal.aborted || now >= flight.deadline)
      throw new NuvemshopNetworkError(attempt.context)
    reopen(budget, now)
    if (budget.hardBlocked || (budget.blocked && !budget.reset))
      throw new NuvemshopRateLimitError(attempt.context)
    const quotaDue = budget.blocked ? budget.reset!.due : now
    const due = Math.max(notBefore, budget.nextSend, quotaDue)
    if (due >= flight.deadline) {
      if (budget.blocked) throw new NuvemshopRateLimitError(attempt.context)
      throw new NuvemshopNetworkError(attempt.context)
    }
    if (due > now || budget.active >= 2 || budget.issued !== null) {
      await waitForChange(
        budget,
        due > now ? due : flight.deadline,
        flight.deadline,
        flight.controller.signal,
        attempt.context,
      )
      continue
    }
    const capability = Object.freeze({}) as NuvemshopAttemptLease
    leases.set(capability, {
      flight,
      attempt,
      config: flight.config,
      budget,
      deadline: flight.deadline,
      attemptNumber,
      epoch: budget.epoch,
      state: 'issued',
      sequence: 0,
      sentAt: 0,
      observed: false,
    })
    budget.issued = capability
    budget.active += 1
    return capability
  }
}

function leaseFor(
  capability: NuvemshopAttemptLease,
  attempt: PreparedNuvemshopAttempt,
  config: Config,
): Lease {
  const lease = leases.get(capability)
  if (
    !lease ||
    lease.state !== 'issued' ||
    lease.attempt !== attempt ||
    lease.config !== config ||
    lease.budget.issued !== capability
  )
    throw new NuvemshopValidationError()
  return lease
}

/** Internal capability inspection; it cannot renew the original deadline. */
export function inspectNuvemshopLease(
  capability: NuvemshopAttemptLease,
  attempt: PreparedNuvemshopAttempt,
  config: Config,
): { readonly deadline: number } {
  return { deadline: leaseFor(capability, attempt, config).deadline }
}

/** Final synchronous fence and fetch invocation. No await/caller callback. */
export function claimNuvemshopAttempt(
  capability: NuvemshopAttemptLease,
  attempt: PreparedNuvemshopAttempt,
  config: Config,
  init: RequestInit,
): void {
  const lease = leaseFor(capability, attempt, config)
  const budget = lease.budget
  const now = nuvemshopMonotonicNow()
  reopen(budget, now)
  if (attempt.signal?.aborted || init.signal?.aborted || now >= lease.deadline)
    throw new NuvemshopNetworkError(attempt.context)
  if (
    budget.blocked ||
    budget.hardBlocked ||
    lease.epoch !== budget.epoch ||
    budget.active > 2 ||
    now < budget.nextSend ||
    budget.credit === 0
  )
    throw new NuvemshopRateLimitError(attempt.context)
  lease.state = 'running'
  lease.flight.running = true
  lease.flight.terminalError = undefined
  // A prior transient belongs only to retry admission. Once this send is
  // admitted, cancellation/deadline must describe the current attempt.
  lease.flight.lastError = undefined
  lease.sequence = ++budget.sequence
  lease.sentAt = now
  budget.issued = null
  budget.nextSend = now + SPACING_MS
  if (budget.credit !== undefined) {
    budget.credit -= 1
    if (budget.credit === 0) budget.blocked = true
  }
  budget.running.add(lease)
}

/** Request's owner invokes the platform transport immediately after claim. */
export function wakeNuvemshopAdmission(capability: NuvemshopAttemptLease): void {
  const lease = leases.get(capability)
  if (lease?.state === 'running') wake(lease.budget)
}

/** Preserve a classified primary error while bounded body cancellation runs. */
export function rememberNuvemshopAttemptFailure(
  capability: NuvemshopAttemptLease,
  error: Error,
): void {
  const lease = leases.get(capability)
  if (lease?.state === 'running') lease.flight.terminalError = error
}

function postponeReset(
  budget: Budget,
  lease: Lease,
  observation: NuvemshopHttpObservation,
  limit: number,
  resetMs: number,
): void {
  const due = observation.receivedAtMs + resetMs
  const outstanding = [...budget.running].filter((running) => running !== lease).length
  const previous = budget.reset
  budget.reset =
    previous === null
      ? { due, limit, sequence: budget.sequence, outstanding }
      : {
          due: Math.max(previous.due, due),
          limit: Math.min(previous.limit, limit),
          sequence: Math.min(previous.sequence, budget.sequence),
          outstanding: Math.max(previous.outstanding, outstanding),
        }
}

/** Private trusted bookkeeping; called exactly once before body/classification. */
export function recordNuvemshopHttpObservation(
  capability: NuvemshopAttemptLease,
  observation: NuvemshopHttpObservation,
): void {
  const lease = leases.get(capability)
  if (!lease || lease.state !== 'running' || lease.observed) return
  lease.observed = true
  lease.providerStatus = observation.status
  const budget = lease.budget
  try {
    if (
      observation.attemptSequence !== lease.sequence ||
      observation.sentAtMs !== lease.sentAt ||
      observation.receivedAtMs < lease.sentAt
    )
      throw new Error()
    const rate = observation.rateLimit
    const complete =
      rate.limit.kind === 'valid' &&
      rate.remaining.kind === 'valid' &&
      rate.resetMs.kind === 'valid'
    if (observation.status === 429) {
      budget.credit = 0
      budget.blocked = true
      const reliable =
        complete &&
        rate.remaining.kind === 'valid' &&
        rate.remaining.value === 0 &&
        rate.resetMs.kind === 'valid' &&
        rate.resetMs.value > 0 &&
        lease.epoch === budget.epoch
      if (!reliable || budget.hardBlocked) {
        budget.hardBlocked = true
        budget.reset = null
      } else if (rate.limit.kind === 'valid' && rate.resetMs.kind === 'valid') {
        postponeReset(
          budget,
          lease,
          observation,
          budget.limit === undefined ? rate.limit.value : Math.min(budget.limit, rate.limit.value),
          rate.resetMs.value,
        )
      }
    } else if (lease.epoch === budget.epoch && !budget.hardBlocked) {
      if (rate.limit.kind === 'valid') {
        budget.limit =
          budget.limit === undefined ? rate.limit.value : Math.min(budget.limit, rate.limit.value)
        if (budget.credit !== undefined) budget.credit = Math.min(budget.credit, budget.limit)
        if (budget.reset) budget.reset.limit = Math.min(budget.reset.limit, budget.limit)
      }
      if (rate.limit.kind === 'valid' && rate.remaining.kind === 'valid') {
        // Older responses cannot raise credit, and uncertain concurrent sends
        // cannot be counted as provider-acknowledged free capacity.
        const outstanding = [...budget.running].filter((running) => running !== lease).length
        const subsequent = budget.sequence - lease.sequence
        const conservative = Math.max(
          0,
          Math.min(rate.remaining.value, budget.limit ?? rate.limit.value) -
            Math.max(outstanding, subsequent),
        )
        // A partial tuple may tighten known credit or establish a zero fence,
        // but cannot turn cold, unknown quota into trusted positive credit.
        if (complete || budget.credit !== undefined || conservative === 0)
          budget.credit =
            budget.credit === undefined ? conservative : Math.min(budget.credit, conservative)
        if (budget.credit === 0) budget.blocked = true
      }
      if (
        complete &&
        rate.limit.kind === 'valid' &&
        rate.resetMs.kind === 'valid' &&
        rate.resetMs.value > 0
      ) {
        postponeReset(budget, lease, observation, budget.limit!, rate.resetMs.value)
      }
    }
  } catch {
    // Bookkeeping failure cannot replace the approved HTTP error class.
    budget.credit = 0
    budget.blocked = true
    budget.hardBlocked = true
    budget.reset = null
  }
  wake(budget)
}

export function observeNuvemshopResponse(
  capability: NuvemshopAttemptLease,
  status: number,
  rateLimit: NuvemshopRateLimitMetadata,
): void {
  const lease = leases.get(capability)
  if (!lease) return
  recordNuvemshopHttpObservation(capability, {
    status,
    rateLimit,
    attemptSequence: lease.sequence,
    sentAtMs: lease.sentAt,
    receivedAtMs: nuvemshopMonotonicNow(),
  })
}

export function settleNuvemshopLease(capability: NuvemshopAttemptLease, errorCode?: string): void {
  const lease = leases.get(capability)
  if (!lease || lease.state === 'settled') return
  const sent = lease.state === 'running'
  lease.state = 'settled'
  lease.flight.running = false
  lease.budget.active -= 1
  lease.budget.running.delete(lease)
  if (lease.budget.issued === capability) lease.budget.issued = null
  if (sent) {
    try {
      console.info({
        event_name: 'nuvemshop_attempt',
        source: 'nuvemshop',
        operation: lease.attempt.context.operation,
        method: lease.attempt.method,
        request_or_delivery_correlation: lease.attempt.context.correlationId,
        retry_attempt: lease.attemptNumber,
        latency_ms: Math.max(0, nuvemshopMonotonicNow() - lease.sentAt),
        ...(lease.providerStatus === undefined ? {} : { provider_status: lease.providerStatus }),
        ...(errorCode === undefined ? {} : { error_code: errorCode }),
      })
    } catch {
      /* Telemetry failure cannot alter quota or transport outcome. */
    }
  }
  wake(lease.budget)
}

function jitterMs(): number {
  const value = Math.random()
  return Number.isFinite(value) ? Math.max(0, Math.min(500, Math.floor(value * 501))) : 500
}

async function runFlight(flight: Flight): Promise<NuvemshopRequestSuccess> {
  const attempt = Object.freeze({ ...flight.attempt, signal: flight.controller.signal })
  let notBefore = nuvemshopMonotonicNow()
  const maxAttempts = attempt.method === 'GET' || attempt.method === 'HEAD' ? 2 : 1
  for (let index = 0; index < maxAttempts; index += 1) {
    let lease: NuvemshopAttemptLease
    try {
      lease = await reserve(flight, attempt, notBefore, index)
    } catch (error) {
      throw flight.lastError ?? error
    }
    try {
      return await performNuvemshopAttempt(attempt, flight.config, lease)
    } catch (error) {
      if (leases.get(lease)?.sequence === 0 && flight.lastError) throw flight.lastError
      const eligible =
        error instanceof NuvemshopRateLimitError ||
        error instanceof NuvemshopNetworkError ||
        error instanceof NuvemshopProviderError
      if (
        !eligible ||
        !error.retryEligible ||
        index + 1 >= maxAttempts ||
        flight.controller.signal.aborted ||
        nuvemshopMonotonicNow() >= flight.deadline
      )
        throw error
      flight.lastError = error
      notBefore = nuvemshopMonotonicNow() + jitterMs()
    }
  }
  throw new NuvemshopNetworkError(attempt.context)
}

function waiterError(error: unknown, context: NuvemshopAttemptContext): Error {
  const constructors = [
    NuvemshopAccountSuspendedError,
    NuvemshopAuthenticationError,
    NuvemshopAuthorizationError,
    NuvemshopConfigurationError,
    NuvemshopNetworkError,
    NuvemshopNotFoundError,
    NuvemshopProtocolError,
    NuvemshopProviderError,
    NuvemshopRateLimitError,
    NuvemshopValidationError,
  ]
  for (const ErrorType of constructors) {
    if (error instanceof ErrorType) {
      const metadata = error.metadata
      const safe: NuvemshopErrorContext = {
        ...context,
        providerStatus: metadata.providerStatus,
        rateLimitLimit: metadata.rateLimitLimit,
        rateLimitRemaining: metadata.rateLimitRemaining,
        resetMs: metadata.resetMs,
      }
      return new ErrorType(safe)
    }
  }
  return new NuvemshopNetworkError(context)
}

function join(
  flight: Flight,
  caller: PreparedNuvemshopAttempt,
  deadline: number,
  remove: () => void,
): Promise<NuvemshopRequestSuccess> {
  const signal = caller.signal
  flight.waiters += 1
  flight.budget.waiters += 1
  return new Promise((resolve, reject) => {
    let detached = false
    const detach = () => {
      if (detached) return false
      detached = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      flight.listeners.delete(waiter)
      flight.waiters -= 1
      flight.budget.waiters -= 1
      if (flight.waiters === 0) {
        remove()
        flight.controller.abort()
      }
      return true
    }
    const onAbort = () => {
      const failure = flight.running ? undefined : flight.lastError
      if (detach()) reject(waiterError(failure, caller.context))
    }
    const onDeadline = () => {
      const failure = flight.terminalError ?? (flight.running ? undefined : flight.lastError)
      if (detach()) reject(waiterError(failure, caller.context))
    }
    const waiter: Waiter = {
      success(result) {
        if (nuvemshopMonotonicNow() >= Math.min(deadline, flight.deadline)) {
          onDeadline()
          return
        }
        if (detach()) resolve(result)
      },
      failure(error) {
        if (detach()) reject(waiterError(error, caller.context))
      },
    }
    const timer = setTimeout(
      onDeadline,
      Math.max(0, Math.min(deadline, flight.deadline) - nuvemshopMonotonicNow()),
    )
    flight.listeners.add(waiter)
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) onAbort()
  })
}

/** Managed public-client operation. No clocks/deadlines/callbacks in caller input. */
export function executeNuvemshopRequest(
  attempt: PreparedNuvemshopAttempt,
  config: Config,
  enteredAt: number,
): Promise<NuvemshopRequestSuccess> {
  const deadline = enteredAt + TOTAL_MS
  if (attempt.signal?.aborted || nuvemshopMonotonicNow() >= deadline)
    return Promise.reject(new NuvemshopNetworkError(attempt.context))
  const budget = getBudget(config, attempt.context)
  if (budget.waiters >= MAX_WAITERS)
    return Promise.reject(new NuvemshopRateLimitError(attempt.context))
  const read = attempt.method === 'GET' || attempt.method === 'HEAD'
  const key = JSON.stringify([
    budget.credentialEpoch,
    config.storeId,
    attempt.method,
    attempt.segments,
    attempt.pagination,
    attempt.context.operation,
    attempt.context.resourceKind ?? null,
    attempt.readGeneration,
  ])
  let flight = read ? budget.flights.get(key) : undefined
  if (!flight || flight.controller.signal.aborted || nuvemshopMonotonicNow() >= flight.deadline) {
    const controller = new AbortController()
    const created: Flight = {
      attempt,
      config,
      budget,
      deadline,
      controller,
      waiters: 0,
      running: false,
      listeners: new Set(),
    }
    // One terminal subscription per flight. Aborted callers leave the removable
    // registry immediately instead of remaining in pending Promise reactions.
    void Promise.resolve()
      .then(() => runFlight(created))
      .finally(() => {
        if (budget.flights.get(key) === created) budget.flights.delete(key)
      })
      .then(
        (result) => {
          for (const waiter of [...created.listeners]) waiter.success(result)
        },
        (error: unknown) => {
          for (const waiter of [...created.listeners]) waiter.failure(error)
        },
      )
    flight = created
    if (read) budget.flights.set(key, created)
  }
  const selected = flight
  return join(selected, attempt, deadline, () => {
    if (budget.flights.get(key) === selected) budget.flights.delete(key)
  })
}
