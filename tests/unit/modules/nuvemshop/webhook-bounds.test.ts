// @vitest-environment node
import { createHmac, randomBytes } from 'node:crypto'
import { performance } from 'node:perf_hooks'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NuvemshopWebhookError } from '@/modules/nuvemshop/server/errors'
import * as lossless from '@/modules/nuvemshop/server/schemas/lossless-json'
import { classifyNuvemshopWebhook } from '@/modules/nuvemshop/server/webhook-schema'

const secret = randomBytes(32).toString('hex')
const base = '{"event":"order/paid","store_id":9,"id":9007199254740993'
function classify(extra: string) {
  const body = base + extra + '}'
  const signature = createHmac('sha256', secret).update(body).digest('hex')
  return classifyNuvemshopWebhook(
    new Request('https://fixture.invalid', { method: 'POST', body }),
    [signature],
  )
}
beforeEach(() => {
  vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', secret)
  vi.stubEnv('NUVEMSHOP_STORE_ID', '9')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('NUV-19 bounded authenticated JSON preflight', () => {
  it.each([
    ['depth', ',"extra":' + '['.repeat(33) + '0' + ']'.repeat(33)],
    ['containers', ',"extra":[' + Array(1024).fill('{}').join(',') + ']'],
    ['elements', ',"extra":[' + Array(8193).fill('0').join(',') + ']'],
    [
      'properties',
      ',"extra":{' + Array.from({ length: 4097 }, (_, i) => `"k${i}":0`).join(',') + '}',
    ],
    ['numeric cost', ',"extra":' + '9'.repeat(100_000)],
  ])('rejects excessive %s before the lossless decoder', async (_name, extra) => {
    const decode = vi.spyOn(lossless, 'decodeObject')
    const start = performance.now()
    await expect(classify(extra)).rejects.toBeInstanceOf(NuvemshopWebhookError)
    expect(decode).not.toHaveBeenCalled()
    expect(performance.now() - start).toBeLessThan(1000)
  })

  it('does not count brackets, escaped quotes, colons or commas in strings', async () => {
    const punctuation = JSON.stringify('[]{}:,"\\'.repeat(8000))
    await expect(classify(',"extra":' + punctuation)).resolves.toMatchObject({
      resourceId: '9007199254740993',
    })
  })

  it('accepts bounded nested structures and preserves exact integer IDs', async () => {
    const body =
      '{"event":"order/paid","store_id":9,"id":9007199254740993,"extra":' +
      '['.repeat(20) +
      '{}' +
      ']'.repeat(20) +
      '}'
    const signature = createHmac('sha256', secret).update(body).digest('hex')
    await expect(
      classifyNuvemshopWebhook(new Request('https://fixture.invalid', { method: 'POST', body }), [
        signature,
      ]),
    ).resolves.toMatchObject({ resourceId: '9007199254740993' })
  })

  it('still rejects invalid syntax after a permissive lexical cost check', async () => {
    await expect(classify(',"extra":[1,]')).rejects.toBeInstanceOf(NuvemshopWebhookError)
  })
})

it('lets an abort deadline interrupt a producer with continuously ready empty chunks', async () => {
  const body = new TextEncoder().encode(base + '}')
  const signature = createHmac('sha256', secret).update(body).digest('hex')
  let chunks = 0
  let cancelled = false
  const controller = new AbortController()
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(producer) {
        if (chunks++ < 10000) producer.enqueue(new Uint8Array())
        else {
          producer.enqueue(body)
          producer.close()
        }
      },
      cancel() {
        cancelled = true
      },
    },
    { highWaterMark: 0 },
  )
  const req = new Request('https://fixture.invalid', {
    method: 'POST',
    body: stream,
    signal: controller.signal,
    duplex: 'half',
  } as RequestInit)
  const timer = setTimeout(() => controller.abort(), 0)
  try {
    await expect(classifyNuvemshopWebhook(req, [signature])).rejects.toBeInstanceOf(
      NuvemshopWebhookError,
    )
    expect(cancelled).toBe(true)
    expect(chunks).toBeLessThan(10000)
  } finally {
    clearTimeout(timer)
  }
})

it('retains bounded proportional storage for an unauthenticated one-byte stalled body', async () => {
  const allocations: number[] = []
  const original = Uint8Array
  const observed = new Proxy(original, {
    construct(target, args) {
      if (typeof args[0] === 'number') allocations.push(args[0])
      return Reflect.construct(target, args)
    },
  })
  let sent = false
  const controller = new AbortController()
  const input = new Request('https://fixture.invalid', {
    method: 'POST',
    signal: controller.signal,
    body: new ReadableStream<Uint8Array>(
      {
        pull(producer) {
          if (!sent) {
            sent = true
            producer.enqueue(original.of(123))
          }
        },
      },
      { highWaterMark: 0 },
    ),
    duplex: 'half',
  } as RequestInit)
  vi.stubGlobal('Uint8Array', observed)
  const pending = classifyNuvemshopWebhook(input, ['0'.repeat(64)])
  const rejected = expect(pending).rejects.toBeInstanceOf(NuvemshopWebhookError)
  try {
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(sent).toBe(true)
    expect(Math.max(0, ...allocations)).toBeLessThanOrEqual(1024)
  } finally {
    controller.abort()
    await rejected
    vi.unstubAllGlobals()
  }
})
