// @vitest-environment node
import { webcrypto } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getNuvemshopHmacConfig } from '@/lib/env/nuvemshop'
import { NuvemshopWebhookError } from '@/modules/nuvemshop/server/errors'

const secret = 'synthetic-nuv14-current-material'
const encoder = new TextEncoder()
const limit = 1_048_576
const sourcePath = path.resolve('src/modules/nuvemshop/server/webhook-auth.ts')
type Verify = (request: Request, signatureValues: readonly string[]) => Promise<Uint8Array>

// No missing-module import is attempted during RED. Capability assertions below
// report absent behavior, while real config/error/oracle controls still execute.
async function loadModule(): Promise<Record<string, unknown>> {
  return existsSync(sourcePath) ? import(/* @vite-ignore */ sourcePath) : {}
}

async function verifier(): Promise<Verify> {
  const loaded = await loadModule()
  expect(loaded.verifyNuvemshopWebhook, 'NUV-14 verifier capability is absent').toBeTypeOf(
    'function',
  )
  return loaded.verifyNuvemshopWebhook as Verify
}

// Independent oracle: production is required to use Node createHmac, whereas
// fixtures use WebCrypto importKey/sign. Never call production to sign fixtures.
async function sign(bytes: Uint8Array, key = secret): Promise<string> {
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await webcrypto.subtle.sign('HMAC', cryptoKey, Uint8Array.from(bytes))
  return Buffer.from(digest).toString('hex')
}

function requestFrom(
  chunks: readonly Uint8Array[],
  options: {
    headers?: HeadersInit
    cancel?: () => void | PromiseLike<void>
    signal?: AbortSignal
  } = {},
): Request {
  let index = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index === chunks.length) controller.close()
      else controller.enqueue(chunks[index++])
    },
    cancel: options.cancel,
  })
  return new Request('https://fixture.invalid/webhook', {
    method: 'POST',
    body,
    duplex: 'half',
    headers: options.headers,
    signal: options.signal,
  } as RequestInit & { duplex: 'half' })
}

async function expectRejected(
  request: Request,
  signatures: readonly string[],
): Promise<Error & { code: string; toJSON(): unknown }> {
  const verify = await verifier()
  const error = await verify(request, signatures).then(
    () => undefined,
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(Error)
  expect(error).toMatchObject({
    name: 'NuvemshopWebhookError',
    code: 'NUVEMSHOP_WEBHOOK_ERROR',
    message: 'Nuvemshop webhook is invalid.',
    retryEligible: false,
  })
  return error as Error & { code: string; toJSON(): unknown }
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', secret)
  vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', undefined)
  vi.stubEnv('NUVEMSHOP_STORE_ID', undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.doMock('server-only', () => ({}))
})

describe('NUV-14 controls independent of absent verifier', () => {
  it('checks the WebCrypto oracle against RFC 4231 case 2', async () => {
    const actual = await sign(encoder.encode('what do ya want for nothing?'), 'Jefe')
    expect(actual === '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843').toBe(true)
  })

  it('existing configuration supplies current material without API credentials', () => {
    expect(getNuvemshopHmacConfig().clientSecret === secret).toBe(true)
  })

  it('existing webhook error projection is fixed and contains no upstream inputs', () => {
    expect(new NuvemshopWebhookError().toJSON()).toEqual({
      code: 'NUVEMSHOP_WEBHOOK_ERROR',
      message: 'Nuvemshop webhook is invalid.',
      retryEligible: false,
      metadata: {},
    })
  })
})

describe('NUV-14 raw-byte authenticity', () => {
  it('H01 accepts original bytes and strict hex using current config only', async () => {
    const bytes = encoder.encode('{"synthetic":true}')
    const verify = await verifier()
    const request = requestFrom([bytes])
    const result = await verify(request, [await sign(bytes)])
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result).toEqual(bytes)
    expect(request.bodyUsed).toBe(true)
    expect(request.body?.locked).toBe(false)
  })

  it.each([
    ['H02 missing', []],
    ['H03 empty', ['']],
    ['H04 preserved duplicates', ['0'.repeat(64), '0'.repeat(64)]],
    ['H05 combined', [`${'0'.repeat(64)}, ${'0'.repeat(64)}`]],
    ['H06 Base64', ['A'.repeat(43) + '=']],
    ['H07 short', ['0'.repeat(63)]],
    ['H08 long', ['0'.repeat(65)]],
    ['H09 nonhex', ['g'.repeat(64)]],
    ['extra prefix', ['sha256=' + '0'.repeat(64)]],
    ['extra suffix', ['0'.repeat(64) + '\n']],
    ['leading whitespace', [' ' + '0'.repeat(64)]],
  ] as const)('%s rejects without coercion', async (_label, values) => {
    await expectRejected(requestFrom([encoder.encode('fixture')]), values)
  })

  it('H05 rejects native Headers combined duplicates at the observable boundary', async () => {
    const bytes = encoder.encode('fixture')
    const digest = await sign(bytes)
    const headers = new Headers()
    headers.append('x-linkedstore-hmac-sha256', digest)
    headers.append('x-linkedstore-hmac-sha256', digest)
    const combined = headers.get('x-linkedstore-hmac-sha256')!
    await expectRejected(requestFrom([bytes], { headers }), [combined])
  })

  it.each([
    ['H10 other body', 'different fixture'],
    ['H11 one byte', '{"a":2,"b":2}'],
    ['H12 equivalent JSON', '{"b":2,"a":1}'],
    ['H29 whitespace', '{ "a":1,"b":2}'],
    ['H29 CRLF', '{"a":1,"b":2}\r\n'],
    ['BOM', '\uFEFF{"a":1,"b":2}'],
  ])('%s rejects changed bytes', async (_label, altered) => {
    const original = encoder.encode('{"a":1,"b":2}')
    await expectRejected(requestFrom([encoder.encode(altered)]), [await sign(original)])
  })

  it('H13 authenticates multibyte UTF-8 fragmented at every byte', async () => {
    const bytes = encoder.encode('á雪🙂')
    const verify = await verifier()
    const chunks = Array.from(bytes, (byte) => Uint8Array.of(byte))
    expect(await verify(requestFrom(chunks), [await sign(bytes)])).toEqual(bytes)
  })

  it('H14 authenticates only offset view bytes, excluding backing-buffer sentinels', async () => {
    const backing = Uint8Array.of(91, 92, 4, 0, 255, 93, 94)
    const view = backing.subarray(2, 5)
    const verify = await verifier()
    expect(await verify(requestFrom([view]), [await sign(view)])).toEqual(Uint8Array.of(4, 0, 255))
  })

  it('H23 access token changes do not affect signatures', async () => {
    const bytes = encoder.encode('fixture')
    const signature = await sign(bytes)
    const verify = await verifier()
    for (const token of ['synthetic-first-token', 'synthetic-second-token', undefined]) {
      vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', token)
      expect(await verify(requestFrom([bytes]), [signature])).toEqual(bytes)
    }
  })

  it('H24 rejects an incorrect current secret', async () => {
    const bytes = encoder.encode('fixture')
    await expectRejected(requestFrom([bytes]), [await sign(bytes, 'synthetic-other-material')])
  })

  it('H25 authenticates non-JSON bytes without parsing or requiring store ID', async () => {
    const bytes = encoder.encode('not JSON {')
    const parse = vi.spyOn(JSON, 'parse')
    const verify = await verifier()
    parse.mockClear()
    expect(await verify(requestFrom([bytes]), [await sign(bytes)])).toEqual(bytes)
    expect(parse).not.toHaveBeenCalled()
  })

  it('H28 reads current configuration per operation with no previous-secret fallback', async () => {
    const bytes = encoder.encode('fixture')
    const oldSignature = await sign(bytes)
    const verify = await verifier()
    expect(await verify(requestFrom([bytes]), [oldSignature])).toEqual(bytes)
    vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', 'synthetic-new-material')
    await expectRejected(requestFrom([bytes]), [oldSignature])
    expect(
      await verify(requestFrom([bytes]), [await sign(bytes, 'synthetic-new-material')]),
    ).toEqual(bytes)
  })

  it('H30 preserves arbitrary binary bytes including invalid UTF-8 and NUL', async () => {
    const bytes = Uint8Array.of(0, 255, 192, 128, 239, 187, 191, 13, 10)
    const verify = await verifier()
    expect(await verify(requestFrom([bytes]), [await sign(bytes)])).toEqual(bytes)
  })

  it('accepts uppercase hex digits without permitting textual normalization', async () => {
    const bytes = encoder.encode('fixture')
    const verify = await verifier()
    expect(await verify(requestFrom([bytes]), [(await sign(bytes)).toUpperCase()])).toEqual(bytes)
  })
})

describe('NUV-14 bounded Request consumption', () => {
  it('H15 admits exactly 1 MiB', async () => {
    const bytes = new Uint8Array(limit).fill(73)
    const verify = await verifier()
    const actual = await verify(requestFrom([bytes]), [await sign(bytes)])
    expect(actual.byteLength).toBe(limit)
    expect(Buffer.from(actual).equals(Buffer.from(bytes))).toBe(true)
  })

  it.each([
    ['H16 oversized', undefined],
    ['H17 missing Content-Length', {}],
    ['H18 misleading Content-Length', { 'content-length': '1' }],
  ] as const)('%s rejects actual 1 MiB + 1 and cancels', async (_label, headers) => {
    const cancel = vi.fn()
    const bytes = new Uint8Array(limit + 1)
    const request = requestFrom([bytes, Uint8Array.of(1)], { headers, cancel })
    await expectRejected(request, [await sign(bytes)])
    expect(cancel).toHaveBeenCalledOnce()
    expect(request.body?.locked).toBe(false)
  })

  it('H19 counts fragmented chunks cumulatively and preserves their order', async () => {
    const chunks = Array.from({ length: 8192 }, (_, index) => Uint8Array.of(index % 256))
    const bytes = Uint8Array.from(chunks.map((chunk) => chunk[0]))
    const verify = await verifier()
    expect(await verify(requestFrom(chunks), [await sign(bytes)])).toEqual(bytes)
  })

  it('enforces the cap across chunks with zero-length chunks interspersed', async () => {
    const cancel = vi.fn()
    const request = requestFrom(
      [
        new Uint8Array(0),
        new Uint8Array(limit),
        new Uint8Array(0),
        Uint8Array.of(1),
        Uint8Array.of(2),
      ],
      { cancel },
    )
    await expectRejected(request, ['0'.repeat(64)])
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('copies each chunk before the producer reuses its backing memory', async () => {
    const shared = Uint8Array.of(1, 2)
    let pulls = 0
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (pulls++ === 0) controller.enqueue(shared)
          else {
            shared.fill(9)
            controller.close()
          }
        },
      },
      { highWaterMark: 0 },
    )
    const request = new Request('https://fixture.invalid', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })
    const verify = await verifier()
    expect(await verify(request, [await sign(Uint8Array.of(1, 2))])).toEqual(Uint8Array.of(1, 2))
  })

  it('H20 translates a stream failure into a safe error and releases its lock', async () => {
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error('synthetic-sensitive-upstream'))
      },
    })
    const request = new Request('https://fixture.invalid', {
      method: 'POST',
      body,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })
    const error = await expectRejected(request, ['0'.repeat(64)])
    expect(error.message.includes('synthetic-sensitive-upstream')).toBe(false)
    expect('cause' in error).toBe(false)
    expect(request.body?.locked).toBe(false)
  })

  it('H21 rejects repeated consumption without reading the Request twice', async () => {
    const bytes = encoder.encode('fixture')
    const verify = await verifier()
    const request = requestFrom([bytes])
    const signature = await sign(bytes)
    expect(await verify(request, [signature])).toEqual(bytes)
    await expectRejected(request, [signature])
  })

  it('rejects an externally locked stream without cancelling its owner', async () => {
    const bytes = Uint8Array.of(1)
    const cancel = vi.fn()
    const request = requestFrom([bytes], { cancel })
    const reader = request.body!.getReader()
    try {
      await expectRejected(request, [await sign(bytes)])
      expect(cancel).not.toHaveBeenCalled()
      expect((await reader.read()).value).toEqual(bytes)
    } finally {
      reader.releaseLock()
    }
  })

  it('accepts an empty stream with the matching empty-body HMAC', async () => {
    const verify = await verifier()
    const bytes = new Uint8Array()
    expect(await verify(requestFrom([]), [await sign(bytes)])).toEqual(bytes)
  })

  it('rejects a bodyless Request conservatively', async () => {
    await expectRejected(new Request('https://fixture.invalid', { method: 'POST' }), [
      '0'.repeat(64),
    ])
  })

  it.each(['throw', 'reject', 'pending'] as const)(
    'rejects invalid signature safely when cancellation will %s',
    async (mode) => {
      const cancel = vi.fn(() => {
        if (mode === 'throw') throw new Error('synthetic-cancel-detail')
        if (mode === 'reject') return Promise.reject(new Error('synthetic-cancel-detail'))
        return new Promise<void>(() => {})
      })
      const request = requestFrom([Uint8Array.of(1)], { cancel })
      await expectRejected(request, [])
      expect(cancel).toHaveBeenCalledOnce()
      expect(request.body?.locked).toBe(false)
    },
  )

  it('aborts a pending read, cancels the stream and releases the reader', async () => {
    const controller = new AbortController()
    const cancel = vi.fn()
    const body = new ReadableStream<Uint8Array>({ pull() {}, cancel })
    const request = new Request('https://fixture.invalid', {
      method: 'POST',
      body,
      duplex: 'half',
      signal: controller.signal,
    } as RequestInit & { duplex: 'half' })
    const verify = await verifier()
    const result = verify(request, ['0'.repeat(64)])
    await Promise.resolve()
    controller.abort(new Error('synthetic-sensitive-abort'))
    const error = await result.catch((reason: unknown) => reason)
    expect(error).toMatchObject({ code: 'NUVEMSHOP_WEBHOOK_ERROR' })
    expect(cancel).toHaveBeenCalledOnce()
    expect(request.body?.locked).toBe(false)
  })
})

describe('NUV-14 configuration, redaction and server boundary', () => {
  it.each([undefined, '', ' \t\n'])(
    'H22 propagates safe missing or invalid config',
    async (value) => {
      const verify = await verifier()
      vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', value)
      const cancel = vi.fn()
      const error = await verify(requestFrom([Uint8Array.of(1)], { cancel }), [
        '0'.repeat(64),
      ]).catch((reason: unknown) => reason)
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message.includes('NUVEMSHOP_CLIENT_SECRET')).toBe(true)
      expect(cancel).toHaveBeenCalledOnce()
    },
  )

  it('H26 exposes no secret, signature, payload or upstream detail in errors or logs', async () => {
    const bytes = encoder.encode('synthetic-sensitive-payload')
    const signature = await sign(encoder.encode('different'))
    const logs = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'debug'),
    ]
    const fetch = vi.fn(() => {
      throw new Error('network forbidden')
    })
    vi.stubGlobal('fetch', fetch)
    const error = await expectRejected(requestFrom([bytes]), [signature])
    const visible = [
      String(error),
      error.stack,
      JSON.stringify(error),
      JSON.stringify(error.toJSON()),
    ].join('\n')
    for (const sensitive of [secret, signature, new TextDecoder().decode(bytes)]) {
      expect(visible.includes(sensitive)).toBe(false)
    }
    expect('cause' in error).toBe(false)
    for (const log of logs) expect(log).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('imports without requiring credentials', async () => {
    vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', undefined)
    const loaded = await loadModule()
    expect(loaded.verifyNuvemshopWebhook).toBeTypeOf('function')
  })

  it('H27 rejects import outside the server-only boundary', async () => {
    expect(existsSync(sourcePath), 'NUV-14 server boundary capability is absent').toBe(true)
    vi.resetModules()
    vi.doUnmock('server-only')
    try {
      await expect(import(/* @vite-ignore */ sourcePath)).rejects.toThrow(/Server Component/)
    } finally {
      vi.doMock('server-only', () => ({}))
      vi.resetModules()
    }
  })
})

describe('NUV-14 adversarial reader regressions', () => {
  it.each([0, 1])(
    'rejects truncated-body HMAC when a chunk spoofs byteLength %i',
    async (fakeLength) => {
      class MisreportedChunk extends Uint8Array {
        get byteLength() {
          return fakeLength
        }
      }
      const chunk = new MisreportedChunk([1, 2])
      const truncated = Uint8Array.of(1, 2).subarray(0, fakeLength)
      await expectRejected(requestFrom([chunk]), [await sign(truncated)])
    },
  )

  it.each([0, 1])(
    'authenticates all original chunk bytes despite spoofed byteLength %i',
    async (fakeLength) => {
      class MisreportedChunk extends Uint8Array {
        get byteLength() {
          return fakeLength
        }
      }
      const original = Uint8Array.of(1, 2)
      const verify = await verifier()
      expect(
        await verify(requestFrom([new MisreportedChunk(original)]), [await sign(original)]),
      ).toEqual(original)
    },
  )

  it('rejects a partially consumed Request after its external reader releases the lock', async () => {
    const cancel = vi.fn()
    const request = requestFrom([Uint8Array.of(1), Uint8Array.of(2)], { cancel })
    const reader = request.body!.getReader()
    await reader.read()
    reader.releaseLock()
    expect(request.bodyUsed).toBe(true)
    expect(request.body?.locked).toBe(false)
    await expectRejected(request, [await sign(Uint8Array.of(2))])
    expect(cancel).not.toHaveBeenCalled()
  })

  it('rejects a concurrent verifier without disturbing the first reader', async () => {
    let producer!: ReadableStreamDefaultController<Uint8Array>
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        producer = controller
      },
    })
    const request = new Request('https://fixture.invalid', {
      method: 'POST',
      body,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })
    const verify = await verifier()
    const bytes = Uint8Array.of(1, 2)
    const signature = await sign(bytes)
    const first = verify(request, [signature])
    expect(request.body?.locked).toBe(true)
    await expectRejected(request, [signature])
    producer.enqueue(bytes)
    producer.close()
    expect(await first).toEqual(bytes)
    expect(request.body?.locked).toBe(false)
  })

  it('rejects an already aborted Request and cancels its owned body', async () => {
    const controller = new AbortController()
    controller.abort()
    const cancel = vi.fn()
    const request = requestFrom([Uint8Array.of(1)], { signal: controller.signal, cancel })
    await expectRejected(request, [await sign(Uint8Array.of(1))])
    expect(cancel).toHaveBeenCalledOnce()
    expect(request.body?.locked).toBe(false)
  })

  it('rejects a runtime non-byte chunk with safe cancellation', async () => {
    const cancel = vi.fn()
    const body = new ReadableStream({
      pull(controller) {
        controller.enqueue('synthetic-invalid-chunk')
      },
      cancel,
    })
    const request = new Request('https://fixture.invalid', {
      method: 'POST',
      body,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })
    await expectRejected(request, [await sign(new Uint8Array())])
    expect(cancel).toHaveBeenCalledOnce()
    expect(request.body?.locked).toBe(false)
  })
})

describe('NUV-14 abort acceptance boundary', () => {
  it('rejects abort after EOF resolution before the verifier acceptance continuation', async () => {
    const abortController = new AbortController()
    const bytes = Uint8Array.of(1, 2)
    let sent = false
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (!sent) {
            sent = true
            controller.enqueue(bytes)
          } else {
            controller.close()
            queueMicrotask(() => abortController.abort())
          }
        },
      },
      { highWaterMark: 0 },
    )
    const request = new Request('https://fixture.invalid', {
      method: 'POST',
      body,
      duplex: 'half',
      signal: abortController.signal,
    } as RequestInit & { duplex: 'half' })
    await expectRejected(request, [await sign(bytes)])
    expect(request.body?.locked).toBe(false)
  })
})

describe('NUV-14 abort after bounded read completion', () => {
  it('rejects a native abort queued at EOF before the HMAC acceptance continuation', async () => {
    const verify = await verifier()
    const bytes = Uint8Array.of(1, 2)
    const signature = await sign(bytes)
    const abortController = new AbortController()
    let sent = false
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (!sent) {
            sent = true
            controller.enqueue(bytes)
          } else {
            controller.close()
            queueMicrotask(() => abortController.abort())
          }
        },
      },
      { highWaterMark: 0 },
    )
    const request = new Request('https://fixture.invalid', {
      method: 'POST',
      body,
      duplex: 'half',
      signal: abortController.signal,
    } as RequestInit & { duplex: 'half' })
    // Invoke directly: no helper import or signing await may alter the native
    // EOF/readBody/outer-verifier microtask ordering under examination.
    const outcome = await verify(request, [signature]).then(
      () => ({ accepted: true, code: undefined }),
      (error: unknown) => ({ accepted: false, code: (error as { code?: string }).code }),
    )
    expect(request.signal.aborted).toBe(true)
    expect(outcome).toEqual({ accepted: false, code: 'NUVEMSHOP_WEBHOOK_ERROR' })
    expect(request.body?.locked).toBe(false)
  })
})
