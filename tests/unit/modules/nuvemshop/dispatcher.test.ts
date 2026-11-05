// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createConsumerRegistry } from '@/modules/nuvemshop/server/dispatcher'

describe('explicit consumer registry', () => {
  it('rejects duplicate stable identities and exposes no implicit consumers', () => {
    const registry = createConsumerRegistry()
    expect(registry.consumersFor('order/paid')).toEqual([])
    const consumer = {
      id: 'orders-v1',
      topics: ['order/paid'] as const,
      handle: vi.fn<import('@/modules/nuvemshop/server/dispatcher').Consumer['handle']>(
        async () => 'applied' as const,
      ),
      reconcile: vi.fn(),
    }
    registry.register(consumer)
    expect(registry.consumersFor('order/paid')).toEqual([consumer])
    expect(() => registry.register(consumer)).toThrow()
  })
})

describe('business dispatch', () => {
  it('defers an unregistered signal without inventing an effect', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const store = {} as Parameters<typeof createDispatcher>[0]['store']
    const dispatch = createDispatcher({ store, registry: createConsumerRegistry() })
    const projection = { event: 'order/paid', storeId: '1', resourceId: '2', correlationId: 'c' }
    const claim = { receiptId: 'r', token: 't', generation: '1', projection }
    await expect(dispatch(projection, new AbortController().signal, claim)).resolves.toEqual({
      disposition: 'deferred',
      reason: 'NO_CONSUMER',
    })
  })
})

describe('dispatcher safety', () => {
  const snapshot = {
    storeId: '1',
    status: 'reconciling' as const,
    epoch: '7',
    resumeRequested: true,
    accessConfirmed: true,
    reason: null,
  }
  const claim = {
    receiptId: 'r',
    token: 't',
    generation: '3',
    projection: {
      event: 'order/paid',
      storeId: '1',
      resourceId: '2',
      correlationId: 'c',
      raw: 'secret',
    },
  }
  function fixture() {
    const store = {
      registerConsumer: vi.fn(async () => false),
      getOperation: vi.fn(async () => ({ ...snapshot, status: 'active' as const })),
      applyLifecycle: vi.fn(async () => snapshot),
      recordProbe: vi.fn(async () => snapshot),
      beginReconciliation: vi.fn(async () => 'ready' as const),
      finishReconciliation: vi.fn(async () => true),
      beginSignal: vi.fn(async () => ({ status: 'ready' as const, generation: '4', epoch: '7' })),
      finishSignal: vi.fn(async () => true),
    }
    const consumer = {
      id: 'orders-v1',
      topics: ['order/paid'] as const,
      handle: vi.fn<import('@/modules/nuvemshop/server/dispatcher').Consumer['handle']>(
        async () => 'applied' as const,
      ),
      reconcile: vi.fn(async () => 'applied' as const),
    }
    const registry = createConsumerRegistry()
    registry.register(consumer)
    return { store, registry, consumer }
  }
  it('passes only the minimal signal and fenced identity, not raw payload', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    await createDispatcher({ store, registry })(
      claim.projection,
      new AbortController().signal,
      claim,
    )
    expect(vi.mocked(consumer.handle).mock.calls[0]).toEqual([
      {
        event: 'order/paid',
        storeId: '1',
        resourceId: '2',
        correlationId: 'c',
      },
      expect.any(AbortSignal),
    ])
    expect(store.beginSignal).toHaveBeenCalledWith(claim, 'orders-v1')
    expect(store.finishSignal).toHaveBeenCalledWith(claim, 'orders-v1', '4', '7', 'applied')
  })
  it('quarantines an exception from the handler and redacts the original error', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    consumer.handle.mockRejectedValue(new Error('secret PII'))
    await expect(
      createDispatcher({ store, registry })(claim.projection, new AbortController().signal, claim),
    ).rejects.toThrow('DISPATCH_INDETERMINATE')
    expect(store.finishSignal).toHaveBeenCalledWith(claim, 'orders-v1', '4', '7', 'indeterminate')
  })
  it('preserves work while paused and never calls a handler', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    store.beginSignal.mockResolvedValue({ status: 'paused' } as never)
    await expect(
      createDispatcher({ store, registry })(claim.projection, new AbortController().signal, claim),
    ).resolves.toEqual({ disposition: 'deferred', reason: 'OPERATION_PAUSED' })
    expect(consumer.handle).not.toHaveBeenCalled()
  })
  it('does not resume without a probe or after uninstall', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    const resumed = {
      ...claim,
      projection: { event: 'app/resumed', storeId: '1', correlationId: 'c' },
    }
    await createDispatcher({ store, registry })(
      resumed.projection,
      new AbortController().signal,
      resumed,
    )
    expect(store.recordProbe).not.toHaveBeenCalled()
    store.applyLifecycle.mockResolvedValue({ ...snapshot, status: 'disconnected' } as never)
    const probe = vi.fn(async () => 'ready' as const)
    await createDispatcher({ store, registry, probe })(
      resumed.projection,
      new AbortController().signal,
      resumed,
    )
    expect(probe).not.toHaveBeenCalled()
    expect(consumer.reconcile).not.toHaveBeenCalled()
  })
  it('does not start a probe when ownership was aborted during lifecycle persistence', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry } = fixture()
    const controller = new AbortController()
    store.applyLifecycle.mockImplementation(async () => {
      controller.abort()
      return snapshot
    })
    const resumed = {
      ...claim,
      projection: { event: 'app/resumed', storeId: '1', correlationId: 'c' },
    }
    const probe = vi.fn(async () => 'ready' as const)
    await expect(
      createDispatcher({ store, registry, probe })(resumed.projection, controller.signal, resumed),
    ).rejects.toThrow('DISPATCH_ABORTED')
    expect(probe).not.toHaveBeenCalled()
  })
  it.each(['unauthorized', 'suspended', 'indeterminate'] as const)(
    'does not reconcile after a %s probe',
    async (result) => {
      const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
      const { store, registry, consumer } = fixture()
      const resumed = {
        ...claim,
        projection: { event: 'app/resumed', storeId: '1', correlationId: 'c' },
      }
      await createDispatcher({ store, registry, probe: async () => result })(
        resumed.projection,
        new AbortController().signal,
        resumed,
      )
      expect(store.recordProbe).toHaveBeenCalledWith('1', '7', result)
      expect(consumer.reconcile).not.toHaveBeenCalled()
    },
  )
  it('records successful reconciliation only after a ready probe and applied result', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    const resumed = {
      ...claim,
      projection: { event: 'app/resumed', storeId: '1', correlationId: 'c' },
    }
    await createDispatcher({ store, registry, probe: async () => 'ready' })(
      resumed.projection,
      new AbortController().signal,
      resumed,
    )
    expect(consumer.reconcile).toHaveBeenCalledOnce()
    expect(store.finishReconciliation).toHaveBeenCalledWith(
      expect.objectContaining({ receiptId: 'r' }),
      'orders-v1',
      '7',
      'applied',
    )
  })
  it('does not reconcile if another process changes the operational epoch', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    store.getOperation.mockResolvedValue({ ...snapshot, status: 'active', epoch: '8' })
    const resumed = {
      ...claim,
      projection: { event: 'app/resumed', storeId: '1', correlationId: 'c' },
    }
    await expect(
      createDispatcher({ store, registry, probe: async () => 'ready' })(
        resumed.projection,
        new AbortController().signal,
        resumed,
      ),
    ).rejects.toThrow()
    expect(consumer.reconcile).not.toHaveBeenCalled()
  })
  it('does not mark a failed reconciliation complete', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    consumer.reconcile.mockRejectedValue(new Error('private'))
    const resumed = {
      ...claim,
      projection: { event: 'app/resumed', storeId: '1', correlationId: 'c' },
    }
    await expect(
      createDispatcher({ store, registry, probe: async () => 'ready' })(
        resumed.projection,
        new AbortController().signal,
        resumed,
      ),
    ).rejects.toThrow('RECONCILIATION_INDETERMINATE')
    expect(store.finishReconciliation).toHaveBeenCalledWith(
      expect.objectContaining({ receiptId: 'r' }),
      'orders-v1',
      '7',
      'indeterminate',
    )
  })
  it('aborts a running handler when another process suspends the integration', async () => {
    vi.useFakeTimers()
    try {
      const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
      const { store, registry, consumer } = fixture()
      consumer.handle.mockImplementation(
        async (...args) =>
          new Promise((resolve) => args[1].addEventListener('abort', () => resolve('applied'))),
      )
      const run = createDispatcher({ store, registry })(
        claim.projection,
        new AbortController().signal,
        claim,
      )
      const rejection = expect(run).rejects.toThrow('DISPATCH_INDETERMINATE')
      await vi.waitFor(() => expect(consumer.handle).toHaveBeenCalledOnce())
      store.getOperation.mockResolvedValue({ ...snapshot, status: 'paused' } as never)
      await vi.advanceTimersByTimeAsync(1000)
      await rejection
      expect(store.finishSignal).toHaveBeenCalledWith(claim, 'orders-v1', '4', '7', 'indeterminate')
    } finally {
      vi.useRealTimers()
    }
  })
  it('classifies transport authentication and suspension errors without a remote call', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { NuvemshopAuthenticationError, NuvemshopAccountSuspendedError } =
      await import('@/modules/nuvemshop/server/errors')
    const resumed = {
      ...claim,
      projection: { event: 'app/resumed', storeId: '1', correlationId: 'c' },
    }
    for (const [error, expected] of [
      [new NuvemshopAuthenticationError(), 'unauthorized'],
      [new NuvemshopAccountSuspendedError(), 'suspended'],
    ] as const) {
      const { store, registry, consumer } = fixture()
      await createDispatcher({
        store,
        registry,
        probe: async () => {
          throw error
        },
      })(resumed.projection, new AbortController().signal, resumed)
      expect(store.recordProbe).toHaveBeenCalledWith('1', '7', expected)
      expect(consumer.reconcile).not.toHaveBeenCalled()
    }
  })
  it('does not retry an uncertain start or treat a database failure as success', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    store.beginSignal.mockResolvedValue({ status: 'uncertain' } as never)
    await expect(
      createDispatcher({ store, registry })(claim.projection, new AbortController().signal, claim),
    ).rejects.toThrow('DISPATCH_INDETERMINATE')
    expect(consumer.handle).not.toHaveBeenCalled()
    store.beginSignal.mockRejectedValue(new Error('database unavailable'))
    await expect(
      createDispatcher({ store, registry })(claim.projection, new AbortController().signal, claim),
    ).rejects.toThrow()
  })
  it('allows a reconciled consumer to operate while other consumers remain pending', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    store.getOperation.mockResolvedValue(snapshot as never)
    await createDispatcher({ store, registry })(
      claim.projection,
      new AbortController().signal,
      claim,
    )
    expect(consumer.handle).toHaveBeenCalledOnce()
  })
  it('records a suspension reported by a consumer without retrying its uncertain effect', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { NuvemshopAccountSuspendedError } = await import('@/modules/nuvemshop/server/errors')
    const { store, registry, consumer } = fixture()
    consumer.handle.mockRejectedValue(new NuvemshopAccountSuspendedError())
    await expect(
      createDispatcher({ store, registry })(claim.projection, new AbortController().signal, claim),
    ).rejects.toThrow()
    expect(store.recordProbe).toHaveBeenCalledWith('1', '7', 'suspended')
    expect(store.finishSignal).toHaveBeenCalledWith(claim, 'orders-v1', '4', '7', 'indeterminate')
  })
  it('performs initial reconciliation for a newly registered consumer without a resume event', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    store.registerConsumer.mockResolvedValue(true)
    await createDispatcher({ store, registry })(
      claim.projection,
      new AbortController().signal,
      claim,
    )
    expect(consumer.reconcile).toHaveBeenCalledOnce()
    expect(store.finishReconciliation).toHaveBeenCalledWith(
      expect.objectContaining({ receiptId: 'r' }),
      'orders-v1',
      '7',
      'applied',
    )
    expect(consumer.handle).toHaveBeenCalledOnce()
  })
  it('leaves a new consumer pending when initial reconciliation fails', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    store.registerConsumer.mockResolvedValue(true)
    consumer.reconcile.mockRejectedValue(new Error('unknown outcome'))
    await expect(
      createDispatcher({ store, registry })(claim.projection, new AbortController().signal, claim),
    ).rejects.toThrow()
    expect(store.finishReconciliation).toHaveBeenCalledWith(
      expect.objectContaining({ receiptId: 'r' }),
      'orders-v1',
      '7',
      'indeterminate',
    )
    expect(consumer.handle).not.toHaveBeenCalled()
  })
  it.each(['busy', 'uncertain'] as const)(
    'never invokes reconciliation when durable latch is %s',
    async (status) => {
      const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
      const { store, registry, consumer } = fixture()
      store.registerConsumer.mockResolvedValue(true)
      store.beginReconciliation.mockResolvedValue(status as never)
      const run = createDispatcher({ store, registry })(
        claim.projection,
        new AbortController().signal,
        claim,
      )
      if (status === 'busy')
        await expect(run).resolves.toEqual({
          disposition: 'deferred',
          reason: 'RECONCILIATION_PENDING',
        })
      else await expect(run).rejects.toThrow('RECONCILIATION_INDETERMINATE')
      expect(consumer.reconcile).not.toHaveBeenCalled()
      expect(consumer.handle).not.toHaveBeenCalled()
    },
  )
  it('probes an authorized reinstall and reconciles before dispatching a pending business signal', async () => {
    const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
    const { store, registry, consumer } = fixture()
    store.registerConsumer.mockResolvedValue(true)
    store.getOperation.mockResolvedValueOnce({
      ...snapshot,
      status: 'paused',
      accessConfirmed: false,
      resumeRequested: true,
    } as never)
    const probe = vi.fn(async () => 'ready' as const)
    await createDispatcher({ store, registry, probe })(
      claim.projection,
      new AbortController().signal,
      claim,
    )
    expect(probe).toHaveBeenCalledOnce()
    expect(store.recordProbe).toHaveBeenCalledWith('1', '7', 'ready')
    expect(consumer.reconcile).toHaveBeenCalledOnce()
    expect(consumer.handle).toHaveBeenCalledOnce()
  })
  it('stops polling after abort even when the consumer ignores its signal', async () => {
    vi.useFakeTimers()
    try {
      const { createDispatcher } = await import('@/modules/nuvemshop/server/dispatcher')
      const { store, registry, consumer } = fixture()
      let finish!: (value: 'applied') => void
      consumer.handle.mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
      const controller = new AbortController()
      const run = createDispatcher({ store, registry })(claim.projection, controller.signal, claim)
      const rejection = expect(run).rejects.toThrow('DISPATCH_INDETERMINATE')
      await vi.waitFor(() => expect(consumer.handle).toHaveBeenCalledOnce())
      controller.abort()
      const checks = store.getOperation.mock.calls.length
      await vi.advanceTimersByTimeAsync(3000)
      expect(store.getOperation).toHaveBeenCalledTimes(checks)
      expect(vi.getTimerCount()).toBe(0)
      finish('applied')
      await rejection
    } finally {
      vi.useRealTimers()
    }
  })
})
