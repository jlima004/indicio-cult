// @vitest-environment node
import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleNuvemshopIntake } from '@/modules/nuvemshop/server/webhook-intake'

const secret = 'local-secret-for-synthetic-fixtures'
const signed = (body: string, signature?: string) =>
  new Request('http://localhost/api/webhooks/nuvemshop/events', {
    method: 'POST',
    body,
    headers: {
      'x-linkedstore-hmac-sha256':
        signature ?? createHmac('sha256', secret).update(body).digest('hex'),
    },
  })
const body = (event: string, fields: object = {}) =>
  JSON.stringify({ event, store_id: '123', ...fields })
const receipt = {
  receiptId: 'x',
  intakeAt: '2026-01-01T00:00:00.000Z',
  terminalAt: null,
  classification: 'received' as const,
  workId: 'x',
}
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', secret)
  vi.stubEnv('NUVEMSHOP_STORE_ID', '123')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})
describe('business intake', () => {
  it.each([
    ['product/updated', { id: '9007199254740993' }, { resourceId: '9007199254740993' }],
    ['order/paid', { id: 2 }, { resourceId: '2' }],
    ['order/fulfilled', { id: 2 }, { resourceId: '2' }],
    ['order/cancelled', { id: 2 }, { resourceId: '2' }],
    ['app/uninstalled', { id: 2 }, { appId: '2' }],
    ['app/suspended', {}, {}],
    ['app/resumed', {}, {}],
  ])('persists %s after authenticating', async (event, fields, expected) => {
    const persist = vi.fn().mockResolvedValue(receipt)
    const response = await handleNuvemshopIntake(signed(body(event, fields)), () => ({ persist }))
    expect(response.status).toBe(204)
    expect(persist).toHaveBeenCalledWith({
      attemptId: expect.any(String),
      webhook: expect.objectContaining({ event, storeId: '123', ...expected }),
    })
    expect(JSON.stringify(persist.mock.calls)).not.toContain('store_id')
  })
  it('rejects ambiguous signature and unknown topics without storage', async () => {
    const persist = vi.fn().mockResolvedValue(receipt)
    for (const req of [
      signed(body('order/paid', { id: 1 }), 'a'.repeat(64) + ', ' + 'a'.repeat(64)),
      signed(body('new/topic')),
    ]) {
      expect((await handleNuvemshopIntake(req, () => ({ persist }))).status).toBe(400)
    }
    expect(persist).not.toHaveBeenCalled()
  })
  it('waits for commit and sanitizes failure', async () => {
    let resolve!: (value: typeof receipt) => void
    const pending = new Promise<typeof receipt>((r) => {
      resolve = r
    })
    const promise = handleNuvemshopIntake(signed(body('app/resumed')), () => ({
      persist: () => pending,
    }))
    let done = false
    void promise.then(() => {
      done = true
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(done).toBe(false)
    resolve(receipt)
    expect((await promise).status).toBe(204)
    const response = await handleNuvemshopIntake(signed(body('app/resumed')), () => ({
      persist: async () => {
        throw new Error('sensitive DSN')
      },
    }))
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('sensitive')
  })
  it('assigns distinct local attempt IDs', async () => {
    const persist = vi.fn().mockResolvedValue(receipt)
    await handleNuvemshopIntake(signed(body('app/resumed')), () => ({ persist }))
    await handleNuvemshopIntake(signed(body('app/resumed')), () => ({ persist }))
    expect(persist.mock.calls[0]![0].attemptId).not.toBe(persist.mock.calls[1]![0].attemptId)
  })
})

describe('failure boundaries', () => {
  it.each([
    [
      'missing signature',
      () => new Request('http://localhost', { method: 'POST', body: body('app/resumed') }),
    ],
    ['wrong signature', () => signed(body('app/resumed'), '0'.repeat(64))],
    ['malformed JSON', () => signed('{')],
    ['wrong store', () => signed(JSON.stringify({ event: 'app/resumed', store_id: '456' }))],
    ['privacy topic', () => signed(body('customer/redact'))],
  ])('rejects %s without touching storage', async (_name, makeRequest) => {
    const getLedger = vi.fn()
    expect((await handleNuvemshopIntake(makeRequest(), getLedger)).status).toBe(400)
    expect(getLedger).not.toHaveBeenCalled()
  })
  it('rejects an aborted request', async () => {
    const controller = new AbortController()
    controller.abort()
    const req = new Request('http://localhost', {
      method: 'POST',
      body: body('app/resumed'),
      signal: controller.signal,
      headers: { 'x-linkedstore-hmac-sha256': 'a'.repeat(64) },
    })
    expect((await handleNuvemshopIntake(req, vi.fn())).status).toBe(400)
  })
  it('returns failure at the deadline even if commit resolves later', async () => {
    vi.useFakeTimers()
    let resolve!: (value: typeof receipt) => void
    const persist = vi.fn().mockReturnValue(
      new Promise<typeof receipt>((r) => {
        resolve = r
      }),
    )
    const response = handleNuvemshopIntake(signed(body('app/resumed')), () => ({ persist }))
    await vi.waitFor(() => expect(persist).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(3000)
    expect((await response).status).toBe(503)
    resolve(receipt)
    await Promise.resolve()
    expect(persist).toHaveBeenCalledTimes(1)
  })
  it('bounds a stalled body stream', async () => {
    vi.useFakeTimers()
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true
      },
    })
    const req = new Request('http://localhost', {
      method: 'POST',
      body: stream,
      headers: { 'x-linkedstore-hmac-sha256': 'a'.repeat(64) },
      duplex: 'half',
    } as RequestInit)
    const response = handleNuvemshopIntake(req, vi.fn())
    await vi.advanceTimersByTimeAsync(3000)
    expect((await response).status).toBe(503)
    expect(cancelled).toBe(true)
  })
})

it('rejects a consumed body and a changed signed body', async () => {
  const used = signed(body('app/resumed'))
  await used.arrayBuffer()
  expect((await handleNuvemshopIntake(used, vi.fn())).status).toBe(400)
  const original = body('app/resumed')
  const digest = createHmac('sha256', secret).update(original).digest('hex')
  expect((await handleNuvemshopIntake(signed(body('app/suspended'), digest), vi.fn())).status).toBe(
    400,
  )
})

it('accepts a signed body at the byte limit and rejects one byte more', async () => {
  const prefix = '{"event":"app/resumed","store_id":"123","padding":"'
  const suffix = '"}'
  const exact = prefix + 'x'.repeat(1_048_576 - prefix.length - suffix.length) + suffix
  const persist = vi.fn().mockResolvedValue(receipt)
  expect((await handleNuvemshopIntake(signed(exact), () => ({ persist }))).status).toBe(204)
  expect((await handleNuvemshopIntake(signed(exact + ' '), () => ({ persist }))).status).toBe(400)
  expect(persist).toHaveBeenCalledTimes(1)
})

it('rejects invalid UTF-8 even when its raw bytes have a valid signature', async () => {
  const bytes = Uint8Array.from([0xff])
  const digest = createHmac('sha256', secret).update(bytes).digest('hex')
  const req = new Request('http://localhost', {
    method: 'POST',
    body: bytes,
    headers: { 'x-linkedstore-hmac-sha256': digest },
  })
  expect((await handleNuvemshopIntake(req, vi.fn())).status).toBe(400)
})

it('uses the actual route and fails closed when pool configuration is absent', async () => {
  vi.stubEnv('NUVEMSHOP_INTAKE_HOST', undefined)
  const { POST, runtime } = await import('@/app/api/webhooks/nuvemshop/events/route')
  const response = await POST(signed(body('app/resumed')))
  expect(runtime).toBe('nodejs')
  expect(response.status).toBe(500)
  expect(await response.text()).not.toContain('NUVEMSHOP_INTAKE_HOST')
})

it('rejects duplicate signature fields when Headers combines them', async () => {
  const payload = body('app/resumed')
  const digest = createHmac('sha256', secret).update(payload).digest('hex')
  const headers = new Headers()
  headers.append('x-linkedstore-hmac-sha256', digest)
  headers.append('x-linkedstore-hmac-sha256', digest)
  expect(headers.get('x-linkedstore-hmac-sha256')).toContain(',')
  const req = new Request('http://localhost', { method: 'POST', headers, body: payload })
  const getLedger = vi.fn()
  expect((await handleNuvemshopIntake(req, getLedger)).status).toBe(400)
  expect(getLedger).not.toHaveBeenCalled()
})
