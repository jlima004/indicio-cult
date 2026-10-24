// @vitest-environment node
import { webcrypto } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getNuvemshopHmacConfig } from '@/lib/env/nuvemshop'
import { NuvemshopWebhookError } from '@/modules/nuvemshop/server/errors'
import * as lossless from '@/modules/nuvemshop/server/schemas/lossless-json'
import { readDecimalId } from '@/modules/nuvemshop/server/schemas/ids'
import * as webhookAuth from '@/modules/nuvemshop/server/webhook-auth'

const sourcePath = path.resolve('src/modules/nuvemshop/server/webhook-schema.ts')
const secret = 'synthetic-nuv15-independent-oracle'
const store = '123456789012345678901234567890'
const encoder = new TextEncoder()
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
type Result = {
  event: string
  storeId: string
  correlationId: string
  resourceId?: string
  appId?: string
  classification?: string
}
type Options = { unknownEventPolicy?: (event: string) => boolean }
type Classify = (
  request: Request,
  signatureValues: readonly string[],
  options?: Options,
) => Promise<Result>

// RED never attempts a missing-module import: behavioral capabilities fail in
// executed tests, while the real verifier/decoder/config/oracle controls execute.
async function classifier(): Promise<Classify> {
  const loaded: Record<string, unknown> = existsSync(sourcePath)
    ? await import(/* @vite-ignore */ sourcePath)
    : {}
  expect(
    loaded.classifyNuvemshopWebhook,
    'NUV-15 authenticated classifier capability is absent',
  ).toBeTypeOf('function')
  return loaded.classifyNuvemshopWebhook as Classify
}

// Independent RFC-checked oracle. Production HMAC is never used to sign fixtures.
async function sign(bytes: Uint8Array, key = secret): Promise<string> {
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return Buffer.from(
    await webcrypto.subtle.sign('HMAC', cryptoKey, Uint8Array.from(bytes)),
  ).toString('hex')
}
function request(bytes: Uint8Array, headers?: HeadersInit): Request {
  return new Request('https://fixture.invalid/webhook', {
    method: 'POST',
    body: Uint8Array.from(bytes),
    headers,
  })
}
async function classify(raw: string, options?: Options): Promise<Result> {
  const fn = await classifier()
  const bytes = encoder.encode(raw)
  return fn(request(bytes), [await sign(bytes)], options)
}
function envelope(event: string, fields: Record<string, unknown> = {}): string {
  return JSON.stringify({ event, store_id: store, ...fields })
}
async function rejected(raw: string, options?: Options) {
  const error: unknown = await classify(raw, options).then(
    () => undefined,
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(NuvemshopWebhookError)
  expect(error).toMatchObject({
    code: 'NUVEMSHOP_WEBHOOK_ERROR',
    message: 'Nuvemshop webhook is invalid.',
    retryEligible: false,
  })
  return error as NuvemshopWebhookError
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', secret)
  vi.stubEnv('NUVEMSHOP_STORE_ID', store)
  vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', undefined)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('NUV-15 independent existing controls', () => {
  it('WebCrypto fixture oracle matches RFC 4231 case 2', async () => {
    expect(await sign(encoder.encode('what do ya want for nothing?'), 'Jefe')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    )
  })
  it('existing raw verifier authenticates independent fixtures without API token', async () => {
    const bytes = encoder.encode(envelope('order/paid', { id: 7 }))
    expect(await webhookAuth.verifyNuvemshopWebhook(request(bytes), [await sign(bytes)])).toEqual(
      bytes,
    )
    expect(getNuvemshopHmacConfig()).toEqual({ clientSecret: secret })
  })
  it('existing decoder preserves large decimal tokens and duplicate last-key semantics', () => {
    const decoded = lossless.decodeObject(
      '{"id":1,"id":9007199254740993,"store_id":"other","store_id":"123"}',
    )
    expect(readDecimalId(decoded.id)).toBe('9007199254740993')
    expect(decoded.store_id).toBe('123')
  })
  it('existing decimal reader rejects rounded/unproven tokens and noncanonical strings', () => {
    expect(readDecimalId(lossless.decodeObject('{"id":9007199254740993.0}').id)).toBeUndefined()
    expect(readDecimalId('0007')).toBeUndefined()
  })
  it('existing safe error has no arbitrary upstream projection', () => {
    expect(new NuvemshopWebhookError().toJSON()).toEqual({
      code: 'NUVEMSHOP_WEBHOOK_ERROR',
      message: 'Nuvemshop webhook is invalid.',
      retryEligible: false,
      metadata: {},
    })
  })
})

describe('NUV-15 minimal authenticated event projection', () => {
  it.each(['product/updated', 'order/paid', 'order/fulfilled', 'order/cancelled'])(
    '%s projects resource identity only',
    async (event) => {
      const result = await classify(
        envelope(event, {
          id: 7,
          resourceId: 'spoof',
          appId: 'spoof',
          deliveryId: 'spoof',
          correlationId: 'provider-controlled',
          headers: { secret },
          customer: { email: 'synthetic@example.invalid' },
          rawBody: 'private',
        }),
      )
      expect(result).toEqual({
        event,
        storeId: store,
        resourceId: '7',
        correlationId: expect.stringMatching(uuid),
      })
    },
  )
  it('uninstalled uses App ID and never resource/delivery ID', async () => {
    expect(await classify(envelope('app/uninstalled', { id: '9007199254740993' }))).toEqual({
      event: 'app/uninstalled',
      storeId: store,
      appId: '9007199254740993',
      correlationId: expect.stringMatching(uuid),
    })
  })
  it.each(['app/suspended', 'app/resumed'])(
    '%s needs no invented ID and ignores unrelated identity fields',
    async (event) => {
      const expected = { event, storeId: store, correlationId: expect.stringMatching(uuid) }
      expect(await classify(envelope(event))).toEqual(expected)
      expect(
        await classify(
          envelope(event, { id: { untrusted: true }, appId: 'spoof', resourceId: 'spoof' }),
        ),
      ).toEqual(expected)
    },
  )
  it.each(['9007199254740993', '9'.repeat(40)])(
    'preserves raw decimal token %s losslessly',
    async (id) => {
      const result = await classify(`{"store_id":${store},"event":"order/paid","id":${id}}`)
      expect(result.resourceId).toBe(id)
      expect(result.storeId).toBe(store)
    },
  )
  it('generates independent local correlation UUIDs for identical provider bodies', async () => {
    const first = await classify(envelope('order/paid', { id: 7, correlationId: 'provider-id' }))
    const second = await classify(envelope('order/paid', { id: 7, correlationId: 'provider-id' }))
    expect(first.correlationId).toMatch(uuid)
    expect(second.correlationId).toMatch(uuid)
    expect(first.correlationId).not.toBe(second.correlationId)
  })
  it('compares trusted store canonical identity while preserving existing leading-zero config validity', async () => {
    vi.stubEnv('NUVEMSHOP_STORE_ID', '000' + store)
    expect((await classify(envelope('order/paid', { id: 7 }))).storeId).toBe(store)
  })
})

describe('NUV-15 authentication and original Request boundary', () => {
  it.each([
    { signatures: [] },
    { signatures: [''] },
    { signatures: ['0'.repeat(64)] },
    { signatures: ['g'.repeat(64)] },
    { signatures: ['0'.repeat(63)] },
    { signatures: ['0'.repeat(64), '0'.repeat(64)] },
    { signatures: ['0'.repeat(64) + ', ' + '0'.repeat(64)] },
  ])(
    'rejects missing, invalid, duplicate or combined signatures $signatures before any JSON decoder',
    async ({ signatures }) => {
      const fn = await classifier()
      const req = request(encoder.encode('{invalid JSON'))
      const verify = vi.spyOn(webhookAuth, 'verifyNuvemshopWebhook')
      const parse = vi.spyOn(JSON, 'parse')
      const decode = vi.spyOn(lossless, 'decodeObject')
      await expect(fn(req, signatures)).rejects.toBeInstanceOf(NuvemshopWebhookError)
      expect(verify).toHaveBeenCalledExactlyOnceWith(req, signatures)
      expect(parse).not.toHaveBeenCalled()
      expect(decode).not.toHaveBeenCalled()
    },
  )
  it('does not authenticate a changed original body by reserializing equivalent JSON', async () => {
    const fn = await classifier()
    const original = encoder.encode(`{"store_id":"${store}","event":"order/paid","id":7}`)
    const altered = encoder.encode(`{ "store_id":"${store}", "event":"order/paid", "id":7 }`)
    await expect(fn(request(altered), [await sign(original)])).rejects.toBeInstanceOf(
      NuvemshopWebhookError,
    )
  })
  it('rejects authentic invalid UTF-8 rather than accepting replacement characters', async () => {
    const fn = await classifier()
    const prefix = encoder.encode(`{"store_id":"${store}","event":"order/paid","id":7,"extra":"`)
    const bytes = new Uint8Array([...prefix, 0xc3, 0x28, ...encoder.encode('"}')])
    await expect(fn(request(bytes), [await sign(bytes)])).rejects.toBeInstanceOf(
      NuvemshopWebhookError,
    )
  })
  it('rejects body over existing byte limit before JSON parsing', async () => {
    const fn = await classifier()
    const bytes = encoder.encode(envelope('order/paid', { id: 7, extra: 'x'.repeat(1_048_576) }))
    const signature = await sign(bytes)
    const req = request(bytes)
    const parse = vi.spyOn(JSON, 'parse')
    await expect(fn(req, [signature])).rejects.toBeInstanceOf(NuvemshopWebhookError)
    expect(parse).not.toHaveBeenCalled()
  })
  it('accepts a valid JSON body exactly at inherited byte limit', async () => {
    const raw = envelope('order/paid', { id: 7 })
    expect(await classify(raw + ' '.repeat(1_048_576 - encoder.encode(raw).length))).toMatchObject({
      resourceId: '7',
    })
  })
  it('consumes Request once, releases lock and safely rejects reuse', async () => {
    const fn = await classifier()
    const bytes = encoder.encode(envelope('order/paid', { id: 7 }))
    const req = request(bytes)
    const signatures = [await sign(bytes)]
    const json = vi.spyOn(req, 'json')
    const text = vi.spyOn(req, 'text')
    const arrayBuffer = vi.spyOn(req, 'arrayBuffer')
    expect((await fn(req, signatures)).resourceId).toBe('7')
    expect(req.bodyUsed).toBe(true)
    expect(req.body?.locked).toBe(false)
    expect(json).not.toHaveBeenCalled()
    expect(text).not.toHaveBeenCalled()
    expect(arrayBuffer).not.toHaveBeenCalled()
    await expect(fn(req, signatures)).rejects.toBeInstanceOf(NuvemshopWebhookError)
  })
  it('rejects an already aborted Request safely', async () => {
    const fn = await classifier()
    const bytes = encoder.encode(envelope('order/paid', { id: 7 }))
    const controller = new AbortController()
    controller.abort()
    const req = new Request('https://fixture.invalid', {
      method: 'POST',
      body: bytes,
      signal: controller.signal,
    })
    await expect(fn(req, [await sign(bytes)])).rejects.toBeInstanceOf(NuvemshopWebhookError)
  })
})

describe('NUV-15 JSON, store and precise identifier validation', () => {
  it.each([
    '{',
    'null',
    '[]',
    'true',
    '7',
    '"string"',
    '{}',
    '{"event":"order/paid","id":7}',
    '{"store_id":"' + store + '","id":7}',
  ])('rejects authentic malformed envelope %s', async (raw) => {
    await rejected(raw)
  })
  it.each([null, 0, -1, 1.2, true, [], {}, '000123', '0', '1e3', '12\n', '１２', '9'.repeat(41)])(
    'rejects invalid store identity %j',
    async (store_id) => {
      await rejected(envelope('order/paid', { store_id, id: 7 }))
    },
  )
  it('rejects crossed store despite forged payload config and Headers', async () => {
    const fn = await classifier()
    const bytes = encoder.encode(
      envelope('order/paid', {
        store_id: '999',
        id: 7,
        NUVEMSHOP_STORE_ID: '999',
        allowedStoreId: '999',
      }),
    )
    await expect(
      fn(request(bytes, { 'x-store-id': '999', NUVEMSHOP_STORE_ID: '999' }), [await sign(bytes)]),
    ).rejects.toBeInstanceOf(NuvemshopWebhookError)
  })
  for (const event of ['order/paid', 'app/uninstalled']) {
    it.each([
      undefined,
      null,
      0,
      -1,
      1.25,
      true,
      [],
      {},
      '',
      '0007',
      '0',
      '-7',
      '1.2',
      '1e3',
      '7\n',
      '１２',
      '9'.repeat(41),
    ])(`${event} rejects absent/invalid resource or App ID %j`, async (id) => {
      await rejected(envelope(event, { id }))
    })
    it.each(['9007199254740993.0', '9007199254740993e0', '7.0000000000000001', '1e300', '-0'])(
      `${event} rejects noncanonical/unproven numeric token %s without rounding`,
      async (token) => {
        await rejected(`{"event":"${event}","store_id":"${store}","id":${token}}`)
      },
    )
  }
  it('honors decoder last-key semantics without resurrecting earlier valid store or ID', async () => {
    await rejected(`{"event":"order/paid","store_id":"${store}","store_id":"999","id":7}`)
    await rejected(`{"event":"order/paid","store_id":"${store}","id":7,"id":0}`)
    expect(
      (
        await classify(
          `{"event":"order/paid","store_id":"999","store_id":"${store}","id":0,"id":7}`,
        )
      ).resourceId,
    ).toBe('7')
  })
  it('handles duplicate topic according to last-key semantics and privacy boundary', async () => {
    await rejected(`{"store_id":"${store}","event":"order/paid","id":7,"event":"store/redact"}`, {
      unknownEventPolicy: () => true,
    })
    expect(
      (await classify(`{"store_id":"${store}","event":"store/redact","event":"order/paid","id":7}`))
        .event,
    ).toBe('order/paid')
  })
  it('does not treat inherited/prototype-shaped JSON fields as envelope identity', async () => {
    await rejected(`{"__proto__":{"event":"order/paid","store_id":"${store}","id":7}}`)
    expect(
      (
        await classify(
          envelope('order/paid', {
            id: 7,
            __proto__: null,
            constructor: { prototype: { polluted: true } },
          }),
        )
      ).resourceId,
    ).toBe('7')
    expect(Object.prototype).not.toHaveProperty('polluted')
  })
  it('retains safe missing runtime store config errors without requiring API credentials', async () => {
    const fn = await classifier()
    vi.stubEnv('NUVEMSHOP_STORE_ID', undefined)
    const bytes = encoder.encode(envelope('order/paid', { id: 7 }))
    await expect(fn(request(bytes), [await sign(bytes)])).rejects.toThrow(/NUVEMSHOP_STORE_ID/)
  })
})

describe('NUV-15 trusted unknown eligibility and mandatory privacy separation', () => {
  it('unknown with explicit trusted synthetic policy is eligibility only, with no invented identifiers or ACK', async () => {
    const policy = vi.fn((event: string) => event === 'synthetic/updated')
    const result = await classify(
      envelope('synthetic/updated', {
        id: null,
        ackAllowed: true,
        receipt: 'spoof',
        status: 'ignored_unknown_event',
      }),
      { unknownEventPolicy: policy },
    )
    expect(result).toEqual({
      classification: 'unknown_ignore_eligible',
      event: 'synthetic/updated',
      storeId: store,
      correlationId: expect.stringMatching(uuid),
    })
    expect(policy).toHaveBeenCalledExactlyOnceWith('synthetic/updated')
  })
  it('unknown defaults fail-closed without policy', async () => {
    await rejected(envelope('synthetic/updated'))
  })
  it('unknown policy denying topic fails closed', async () => {
    await rejected(envelope('synthetic/updated'), { unknownEventPolicy: () => false })
  })
  it.each(['true', 1, {}, Promise.resolve(true), undefined])(
    'requires literal boolean true rather than truthy/async policy result %j',
    async (decision) => {
      await rejected(envelope('synthetic/updated'), {
        unknownEventPolicy: (() => decision) as unknown as (event: string) => boolean,
      })
    },
  )
  it('sanitizes a throwing trusted policy failure', async () => {
    const error = await rejected(envelope('synthetic/updated'), {
      unknownEventPolicy: () => {
        throw new Error('synthetic-policy-sensitive-data')
      },
    })
    expect(JSON.stringify(error)).not.toContain('synthetic-policy-sensitive-data')
  })
  it('payload policy-shaped data and headers cannot authorize ignore', async () => {
    const fn = await classifier()
    const bytes = encoder.encode(
      envelope('synthetic/updated', {
        unknownEventPolicy: true,
        policy: { unknown: 'allow' },
        ignore: true,
        ackAllowed: true,
      }),
    )
    await expect(
      fn(request(bytes, { 'x-ignore-unknown': 'true', 'unknown-event-policy': 'allow' }), [
        await sign(bytes),
      ]),
    ).rejects.toBeInstanceOf(NuvemshopWebhookError)
  })
  it.each([
    'store/redact',
    'customers/redact',
    'customers/data_request',
    'app/store_redact',
    'customer/redact',
  ])('rejects privacy topic %s before unknown policy is called', async (event) => {
    const policy = vi.fn(() => true)
    await rejected(envelope(event), { unknownEventPolicy: policy })
    expect(policy).not.toHaveBeenCalled()
  })
  it.each([
    null,
    7,
    {},
    [],
    '',
    'order',
    '/paid',
    'order/',
    'order/paid/extra',
    'Order/paid',
    'order/paid\n',
    'ordér/paid',
    'x'.repeat(257) + '/updated',
  ])('rejects malformed/unbounded unknown topic %j before policy', async (event) => {
    const policy = vi.fn(() => true)
    await rejected(JSON.stringify({ event, store_id: store }), { unknownEventPolicy: policy })
    expect(policy).not.toHaveBeenCalled()
  })
  it('does not consult unknown policy for known events or crossed store', async () => {
    const policy = vi.fn(() => true)
    await classify(envelope('order/paid', { id: 7 }), { unknownEventPolicy: policy })
    await rejected(envelope('synthetic/updated', { store_id: '999' }), {
      unknownEventPolicy: policy,
    })
    expect(policy).not.toHaveBeenCalled()
  })
  it('rejects unsafe input shapes at the public authenticated boundary', async () => {
    const fn = await classifier()
    for (const input of [
      envelope('order/paid', { id: 7 }),
      { event: 'order/paid', store_id: store, id: 7 },
    ]) {
      await expect(fn(input as unknown as Request, [])).rejects.toBeInstanceOf(
        NuvemshopWebhookError,
      )
    }
  })
  it('produces safe errors without body, PII, credentials, signatures or arbitrary metadata', async () => {
    const error = await rejected(
      envelope('order/paid', {
        id: 'synthetic-sensitive-id',
        customer: 'synthetic@example.invalid',
        token: secret,
      }),
    )
    const observed = JSON.stringify({
      error: error.toJSON(),
      name: error.name,
      message: error.message,
      cause: error.cause,
    })
    for (const sensitive of [
      secret,
      'synthetic-sensitive-id',
      'synthetic@example.invalid',
      'customer',
      'token',
    ])
      expect(observed).not.toContain(sensitive)
  })
  it('known events and unknown eligibility have zero network effects or logging', async () => {
    const fetch = vi.fn(() => {
      throw new Error('Unexpected external operation')
    })
    vi.stubGlobal('fetch', fetch)
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await classify(envelope('order/paid', { id: 7 }))
    await classify(envelope('synthetic/updated'), { unknownEventPolicy: () => true })
    expect(fetch).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})
