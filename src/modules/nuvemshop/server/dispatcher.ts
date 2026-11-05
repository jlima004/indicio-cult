import 'server-only'

import type { BusinessTopic, VerifiedWebhookEvent } from './webhook-schema'
import { NuvemshopAuthenticationError, NuvemshopAccountSuspendedError } from './errors'
import { SafeRetryError } from './durability/worker'

export type BusinessSignal = Extract<VerifiedWebhookEvent, { resourceId: string }>
export type EffectResult = 'applied' | 'retry-safe' | 'indeterminate'
export interface Consumer {
  /** Stable across process restarts and deployments. */
  id: string
  topics: readonly BusinessTopic[]
  handle(event: BusinessSignal, signal: AbortSignal): Promise<EffectResult>
  reconcile(storeId: string, signal: AbortSignal): Promise<EffectResult>
}

export function createConsumerRegistry() {
  const consumers = new Map<string, Consumer>()
  return {
    register(consumer: Consumer): void {
      if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(consumer.id) || consumers.has(consumer.id))
        throw new Error('INVALID_CONSUMER_ID')
      consumers.set(consumer.id, consumer)
    },
    consumersFor(topic: BusinessTopic): Consumer[] {
      return [...consumers.values()].filter((consumer) => consumer.topics.includes(topic))
    },
    all(): Consumer[] {
      return [...consumers.values()]
    },
  }
}

export type DispatchIdentity = Pick<
  import('./durability/worker').RecoveryClaim,
  'receiptId' | 'token' | 'generation'
>
export interface OperationalSnapshot {
  storeId: string
  status: 'paused' | 'disconnected' | 'reconciling' | 'active'
  epoch: string
  resumeRequested: boolean
  accessConfirmed: boolean
  reason: string | null
}
export type ProbeResult = 'ready' | 'unauthorized' | 'suspended' | 'indeterminate'
export type SignalStart =
  | { status: 'ready'; generation: string; epoch: string }
  | { status: 'completed' | 'paused' | 'busy' | 'uncertain' }
export interface DispatchStore {
  registerConsumer(storeId: string, consumerId: string): Promise<boolean>
  getOperation(storeId: string): Promise<OperationalSnapshot>
  applyLifecycle(identity: DispatchIdentity): Promise<OperationalSnapshot>
  recordProbe(storeId: string, epoch: string, result: ProbeResult): Promise<OperationalSnapshot>
  beginReconciliation(
    identity: DispatchIdentity,
    consumerId: string,
    epoch: string,
  ): Promise<'ready' | 'completed' | 'busy' | 'uncertain' | 'paused'>
  finishReconciliation(
    identity: DispatchIdentity,
    consumerId: string,
    epoch: string,
    outcome: 'applied' | 'retry_safe' | 'indeterminate',
  ): Promise<boolean>
  beginSignal(identity: DispatchIdentity, consumerId: string): Promise<SignalStart>
  finishSignal(
    identity: DispatchIdentity,
    consumerId: string,
    generation: string,
    epoch: string,
    outcome: 'applied' | 'retry_safe' | 'indeterminate',
  ): Promise<boolean>
}

async function guardedEffect(
  store: DispatchStore,
  storeId: string,
  epoch: string,
  signal: AbortSignal,
  allowed: readonly OperationalSnapshot['status'][],
  effect: (signal: AbortSignal) => Promise<EffectResult>,
): Promise<EffectResult> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setInterval> | undefined
  const stopPolling = () => {
    if (timer) clearInterval(timer)
  }
  controller.signal.addEventListener('abort', stopPolling, { once: true })
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  let pending: Promise<void> | undefined
  const check = () => {
    if (!pending)
      pending = store
        .getOperation(storeId)
        .then(
          (current) => {
            if (
              current.epoch !== epoch ||
              !current.accessConfirmed ||
              !allowed.includes(current.status)
            )
              controller.abort()
          },
          () => controller.abort(),
        )
        .finally(() => {
          pending = undefined
        })
    return pending
  }
  try {
    await check()
    if (signal.aborted) controller.abort()
    if (controller.signal.aborted) return 'indeterminate'
    timer = setInterval(() => {
      void check()
    }, 1000)
    let result: EffectResult
    try {
      result = await effect(controller.signal)
    } catch {
      result = 'indeterminate'
    }
    if (timer) clearInterval(timer)
    if (pending) await pending
    return signal.aborted || controller.signal.aborted ? 'indeterminate' : result
  } finally {
    if (timer) clearInterval(timer)
    signal.removeEventListener('abort', abort)
    controller.signal.removeEventListener('abort', stopPolling)
  }
}

export function createDispatcher({
  store,
  registry,
  probe,
  probeTimeoutMs = 5000,
}: {
  store: DispatchStore
  registry: ReturnType<typeof createConsumerRegistry>
  probe?: (storeId: string, signal: AbortSignal) => Promise<ProbeResult>
  probeTimeoutMs?: number
}): import('./durability/worker').RecoveryProcessor {
  if (!Number.isSafeInteger(probeTimeoutMs) || probeTimeoutMs < 1 || probeTimeoutMs > 30000)
    throw new Error('INVALID_PROBE_TIMEOUT')
  async function runConsumerEffect(
    storeId: string,
    epoch: string,
    effect: () => Promise<EffectResult>,
  ): Promise<EffectResult> {
    try {
      return await effect()
    } catch (error) {
      const result =
        error instanceof NuvemshopAuthenticationError
          ? 'unauthorized'
          : error instanceof NuvemshopAccountSuspendedError
            ? 'suspended'
            : null
      if (result) await store.recordProbe(storeId, epoch, result)
      return 'indeterminate'
    }
  }
  async function reconcileConsumer(
    storeId: string,
    epoch: string,
    consumer: Consumer,
    signal: AbortSignal,
    identity: DispatchIdentity,
  ): Promise<import('./durability/worker').DeferredDispatch | undefined> {
    const start = await store.beginReconciliation(identity, consumer.id, epoch)
    if (start === 'completed') return
    if (start === 'busy') return { disposition: 'deferred', reason: 'RECONCILIATION_PENDING' }
    if (start === 'paused') return { disposition: 'deferred', reason: 'OPERATION_PAUSED' }
    if (start !== 'ready') throw new Error('RECONCILIATION_INDETERMINATE')
    const outcome = await guardedEffect(
      store,
      storeId,
      epoch,
      signal,
      ['reconciling', 'active'],
      (localSignal) =>
        runConsumerEffect(storeId, epoch, () => consumer.reconcile(storeId, localSignal)),
    )
    const recorded =
      outcome === 'applied' ? 'applied' : outcome === 'retry-safe' ? 'retry_safe' : 'indeterminate'
    if (!(await store.finishReconciliation(identity, consumer.id, epoch, recorded)))
      throw new Error('RECONCILIATION_UNCONFIRMED')
    if (recorded === 'retry_safe') throw new SafeRetryError()
    if (recorded !== 'applied') throw new Error('RECONCILIATION_INDETERMINATE')
  }
  async function runProbe(
    storeId: string,
    operation: OperationalSnapshot,
    signal: AbortSignal,
  ): Promise<OperationalSnapshot | null> {
    if (signal.aborted) throw new Error('DISPATCH_ABORTED')
    if (!probe) return null
    const controller = new AbortController()
    const abort = () => controller.abort()
    signal.addEventListener('abort', abort, { once: true })
    let timer: ReturnType<typeof setTimeout> | undefined
    let result: ProbeResult = 'indeterminate'
    try {
      result = await Promise.race([
        Promise.resolve()
          .then(() => probe(storeId, controller.signal))
          .catch((error: unknown): ProbeResult =>
            error instanceof NuvemshopAuthenticationError
              ? 'unauthorized'
              : error instanceof NuvemshopAccountSuspendedError
                ? 'suspended'
                : 'indeterminate',
          ),
        new Promise<'indeterminate'>((resolve) => {
          timer = setTimeout(() => {
            controller.abort()
            resolve('indeterminate')
          }, probeTimeoutMs)
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
      controller.abort()
      signal.removeEventListener('abort', abort)
    }
    if (signal.aborted) throw new Error('DISPATCH_ABORTED')
    const afterProbe = await store.recordProbe(storeId, operation.epoch, result)
    return result === 'ready' && afterProbe.accessConfirmed && afterProbe.epoch === operation.epoch
      ? afterProbe
      : null
  }
  return async (projection, signal, claim) => {
    if (signal.aborted) throw new Error('DISPATCH_ABORTED')
    const { event, storeId, correlationId } = projection
    if (!storeId || !correlationId) throw new Error('INVALID_PROJECTION')
    if (event === 'app/suspended' || event === 'app/uninstalled' || event === 'app/resumed') {
      const operation = await store.applyLifecycle(claim)
      if (event !== 'app/resumed' || operation.status === 'disconnected' || !probe) return
      for (const consumer of registry.all()) await store.registerConsumer(storeId, consumer.id)
      if (!(await runProbe(storeId, operation, signal))) return
      for (const consumer of registry.all()) {
        if (signal.aborted) throw new Error('DISPATCH_ABORTED')
        const deferred = await reconcileConsumer(storeId, operation.epoch, consumer, signal, claim)
        if (deferred) return deferred
      }
      return
    }
    if (
      !['product/updated', 'order/paid', 'order/fulfilled', 'order/cancelled'].includes(event) ||
      !projection.resourceId
    )
      throw new Error('INVALID_PROJECTION')
    const topic = event as BusinessTopic
    const consumers = registry.consumersFor(topic)
    if (!consumers.length) return { disposition: 'deferred', reason: 'NO_CONSUMER' }
    const business = {
      event: topic,
      storeId,
      resourceId: projection.resourceId,
      correlationId,
    } as BusinessSignal
    for (const consumer of consumers) {
      if (signal.aborted) throw new Error('DISPATCH_ABORTED')
      const needsReconciliation = await store.registerConsumer(storeId, consumer.id)
      if (needsReconciliation) {
        let operation = await store.getOperation(storeId)
        if (operation.resumeRequested && !operation.accessConfirmed) {
          const probed = await runProbe(storeId, operation, signal)
          if (!probed) return { disposition: 'deferred', reason: 'OPERATION_PAUSED' }
          operation = probed
        }
        if (operation.accessConfirmed && ['active', 'reconciling'].includes(operation.status)) {
          const deferred = await reconcileConsumer(
            storeId,
            operation.epoch,
            consumer,
            signal,
            claim,
          )
          if (deferred) return deferred
        }
      }
      const start = await store.beginSignal(claim, consumer.id)
      if (start.status === 'completed') continue
      if (start.status === 'paused') return { disposition: 'deferred', reason: 'OPERATION_PAUSED' }
      if (start.status === 'busy') return { disposition: 'deferred', reason: 'DISPATCH_BUSY' }
      if (start.status !== 'ready') throw new Error('DISPATCH_INDETERMINATE')
      const result = await guardedEffect(
        store,
        storeId,
        start.epoch,
        signal,
        ['active', 'reconciling'],
        (localSignal) =>
          runConsumerEffect(storeId, start.epoch, () => consumer.handle(business, localSignal)),
      )
      const outcome =
        result === 'retry-safe' ? 'retry_safe' : result === 'applied' ? 'applied' : 'indeterminate'
      if (!(await store.finishSignal(claim, consumer.id, start.generation, start.epoch, outcome)))
        throw new Error('DISPATCH_UNCONFIRMED')
      if (outcome === 'retry_safe') {
        throw new SafeRetryError()
      }
      if (outcome !== 'applied' || signal.aborted) throw new Error('DISPATCH_INDETERMINATE')
    }
  }
}
