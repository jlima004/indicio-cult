import { readFileSync } from 'node:fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  NUVEMSHOP_API_ORIGIN,
  NUVEMSHOP_API_VERSION,
  NUVEMSHOP_ATTEMPT_TIMEOUT_MS,
  NUVEMSHOP_USER_AGENT,
  nuvemshopRequest,
  type NuvemshopRequestInput,
} from '@/modules/nuvemshop/server/client'
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
} from '@/modules/nuvemshop/server/errors'

const STORE_ID = '123456789012345678901234567890'
const TOKEN = 'synthetic-access-token'
const CLIENT_SECRET = 'synthetic-client-secret'
const APP_ID = 'synthetic-app-id'
const CORRELATION_ID = '2a1de28d-4acf-4d42-8f39-a44b6fd25414'
const ABOVE_MAX_SAFE = '9007199254740993'
const ABOVE_INT64 = '9223372036854775808'
const OFFICIAL_PRODUCTS = `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/${STORE_ID}/products`
const MAX_BODY_BYTES = 1_048_576
const OVERFLOW_TAIL_MARKER = 'NUV04-OVERFLOW-TAIL-MARKER'
const textEncoder = new TextEncoder()

const SECRET_MARKERS = [TOKEN, CLIENT_SECRET, APP_ID, 'Bearer', 'Authorization']

function stubConfig(overrides: Record<string, string | undefined> = {}) {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NUVEMSHOP_STORE_ID', STORE_ID)
  vi.stubEnv('NUVEMSHOP_ACCESS_TOKEN', TOKEN)
  vi.stubEnv('NUVEMSHOP_CLIENT_SECRET', CLIENT_SECRET)
  vi.stubEnv('NUVEMSHOP_APP_ID', APP_ID)
  vi.stubEnv('NUVEMSHOP_API_VERSION', '1999-01')
  for (const [key, value] of Object.entries(overrides)) vi.stubEnv(key, value)
}

function installFetch(
  impl: typeof fetch = async () =>
    new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json; charset=UTF-8' },
    }),
) {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestUrl(fetchMock: ReturnType<typeof vi.fn>): string {
  const [input] = fetchMock.mock.calls[0] ?? []
  return typeof input === 'string' ? input : input instanceof URL ? input.toString() : ''
}

function requestInit(fetchMock: ReturnType<typeof vi.fn>, index = 0): RequestInit {
  return (fetchMock.mock.calls[index]?.[1] ?? {}) as RequestInit
}

function headerRecord(init: RequestInit): Record<string, string> {
  const headers = init.headers
  if (headers instanceof Headers) return Object.fromEntries(headers.entries())
  if (Array.isArray(headers)) return Object.fromEntries(headers)
  return { ...(headers ?? {}) }
}

async function capture(input: NuvemshopRequestInput = { method: 'GET', segments: ['products'] }) {
  try {
    return { value: await nuvemshopRequest(input) }
  } catch (error) {
    return { error }
  }
}

function serialized(error: unknown): string {
  if (!(error instanceof Error)) return JSON.stringify(error)
  const projection = 'toJSON' in error && typeof error.toJSON === 'function' ? error.toJSON() : {}
  return JSON.stringify({
    name: error.name,
    message: error.message,
    stack: error.stack,
    projection,
  })
}

function expectRedacted(error: unknown) {
  const text = serialized(error)
  for (const marker of SECRET_MARKERS) expect(text).not.toContain(marker)
  expect(text).not.toContain(CLIENT_SECRET)
  expect(text).not.toContain('evil.example')
}

function chunkedBody(
  chunks: Uint8Array[],
  hooks?: { onPull?: (index: number, bytes: number) => void },
) {
  let index = 0
  let pulled = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close()
        return
      }
      const chunk = chunks[index]
      if (chunk === undefined) {
        controller.close()
        return
      }
      index += 1
      pulled += chunk.byteLength
      hooks?.onPull?.(index, pulled)
      controller.enqueue(chunk)
    },
  })
  return { stream, pulled: () => pulled, reads: () => index }
}

function streamJsonResponse(
  chunks: Uint8Array[],
  headers: Record<string, string> = {},
  hooks?: { onPull?: (index: number, bytes: number) => void },
) {
  const { stream, pulled, reads } = chunkedBody(chunks, hooks)
  const response = new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      ...headers,
    },
  })
  return { response, pulled, reads }
}

function fillerChunks(totalBytes: number, chunkSize: number, tail?: Uint8Array): Uint8Array[] {
  const chunks: Uint8Array[] = []
  let remaining = totalBytes - (tail?.byteLength ?? 0)
  while (remaining > 0) {
    const size = Math.min(chunkSize, remaining)
    chunks.push(new Uint8Array(size).fill(0x78))
    remaining -= size
  }
  if (tail !== undefined) chunks.push(tail)
  return chunks
}

function expectEarlyStop(
  metrics: { pulled: () => number; reads: () => number },
  chunkSize: number,
  refillBytes = chunkSize,
) {
  // The rejected chunk plus one platform refill. The application does not append either.
  expect(metrics.pulled()).toBeLessThanOrEqual(MAX_BODY_BYTES + chunkSize + refillBytes)
}

function expectNoOverflowLeak(error: unknown) {
  expectRedacted(error)
  expect(serialized(error)).not.toContain(OVERFLOW_TAIL_MARKER)
}

beforeEach(() => {
  stubConfig()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.doMock('server-only', () => ({}))
})

describe('Nuvemshop fixed transport', () => {
  describe('URL and egress', () => {
    it('requests only the pinned HTTPS origin, version and configured store', async () => {
      const fetchMock = installFetch()

      const result = await capture({
        method: 'GET',
        segments: ['products', ABOVE_MAX_SAFE],
        storeId: '999',
        url: 'http://evil.example/steal',
        baseUrl: 'http://127.0.0.1',
        host: 'api.tiendanube.com',
        headers: { Authorization: 'Bearer injected', Host: 'evil.example' },
      } as NuvemshopRequestInput)

      expect(result.value?.status).toBe(200)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(requestUrl(fetchMock)).toBe(
        `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/${STORE_ID}/products/${ABOVE_MAX_SAFE}`,
      )
      expect(requestInit(fetchMock).redirect).toBe('manual')
      expect(requestInit(fetchMock).cache).toBe('no-store')
      expect(requestInit(fetchMock).credentials).toBe('omit')
      expect(requestUrl(fetchMock)).not.toContain(TOKEN)
      expect(requestUrl(fetchMock)).not.toContain('tiendanube')
      expect(requestUrl(fetchMock)).not.toContain('evil.example')
      expect(requestUrl(fetchMock)).not.toContain('999')
    })

    it.each([
      ['alternate host', ['api.tiendanube.com']],
      ['absolute https url', ['https://evil.example/products']],
      ['absolute http url', ['http://api.nuvemshop.com.br/2025-03/1/products']],
      ['protocol-relative url', ['//evil.example/products']],
      ['userinfo', ['user:pass@evil.example']],
      ['dot segment', ['.']],
      ['parent segment', ['..']],
      ['traversal inside products', ['products', '..', 'orders']],
      ['slash traversal', ['products/../orders']],
      ['encoded traversal', ['%2e%2e']],
      ['encoded slash', ['products%2F..%2Forders']],
      ['backslash', ['..\\..\\etc']],
      ['query in segment', ['products?page=1']],
      ['fragment', ['products#secret']],
      ['empty segment', ['products', '']],
      ['whitespace', [' products']],
      ['leading-zero id', ['01']],
      ['zero id', ['0']],
      ['negative id', ['-12']],
      ['fraction', ['1.5']],
      ['exponent', ['1e3']],
    ] as const)('blocks %s before fetch', async (_label, segments) => {
      const fetchMock = installFetch()

      const result = await capture({ method: 'GET', segments })

      expect(result.error).toBeInstanceOf(NuvemshopValidationError)
      expect(fetchMock).not.toHaveBeenCalled()
      expectRedacted(result.error)
    })

    it('rejects an empty segment list before fetch', async () => {
      const fetchMock = installFetch()
      const result = await capture({ method: 'GET', segments: [] })
      expect(result.error).toBeInstanceOf(NuvemshopValidationError)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('rejects an unsafe numeric id before fetch and does not stringify it', async () => {
      const fetchMock = installFetch()
      const unsafe = Number.MAX_SAFE_INTEGER + 2

      const result = await capture({
        method: 'GET',
        segments: [unsafe] as unknown as readonly string[],
      })

      expect(Number.isSafeInteger(unsafe)).toBe(false)
      expect(result.error).toBeInstanceOf(NuvemshopValidationError)
      expect(fetchMock).not.toHaveBeenCalled()
      expectRedacted(result.error)
      expect(serialized(result.error)).not.toContain(String(unsafe))
    })

    it('preserves a valid decimal id above int64 exactly in the URL', async () => {
      const fetchMock = installFetch()

      await capture({ method: 'GET', segments: ['orders', ABOVE_INT64] })

      expect(requestUrl(fetchMock)).toBe(
        `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/${STORE_ID}/orders/${ABOVE_INT64}`,
      )
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it.each([301, 302, 307, 308])('does not follow redirect %i or its Location', async (status) => {
      const fetchMock = installFetch(async () => {
        return new Response(null, {
          status,
          headers: { Location: `https://evil.example/steal?access_token=${TOKEN}` },
        })
      })

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(result.error).not.toBeInstanceOf(NuvemshopValidationError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(requestUrl(fetchMock)).toBe(OFFICIAL_PRODUCTS)
      expect(requestInit(fetchMock).redirect).toBe('manual')
      expect(serialized(result.error)).not.toContain('evil.example')
      expect(serialized(result.error)).not.toContain(TOKEN)
      expect((result.error as NuvemshopProtocolError).retryEligible).toBe(false)
    })

    it('rejects an opaque redirect without a second request', async () => {
      const fetchMock = installFetch()
      fetchMock.mockResolvedValue({
        status: 0,
        type: 'opaqueredirect',
        url: 'https://evil.example/followed',
        headers: new Headers({ Location: 'https://evil.example/followed' }),
        body: null,
        json: async () => {
          throw new Error('response.json is forbidden')
        },
        text: async () => TOKEN,
      } as unknown as Response)

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(serialized(result.error)).not.toContain(TOKEN)
      expect(serialized(result.error)).not.toContain('evil.example')
    })

    it('rejects a final response whose URL left the fixed target', async () => {
      const response = new Response('{"ok":true}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
      Object.defineProperty(response, 'url', { value: 'https://evil.example/products' })
      const fetchMock = installFetch(async () => response)

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(requestUrl(fetchMock)).toBe(OFFICIAL_PRODUCTS)
      expectRedacted(result.error)
    })
  })

  describe('headers and authentication', () => {
    it('sends Bearer, User-Agent and Accept, and Content-Type only with a JSON body', async () => {
      const fetchMock = installFetch(async (_input, init) => {
        const method = init?.method
        const raw = method === 'POST' ? '{"id":1}' : '{"ok":true}'
        return new Response(raw, {
          status: method === 'POST' ? 201 : 200,
          headers: { 'content-type': 'application/json; charset=UTF-8' },
        })
      })

      await capture()
      const readHeaders = headerRecord(requestInit(fetchMock))
      expect(readHeaders).toEqual({
        Authorization: `Bearer ${TOKEN}`,
        'User-Agent': NUVEMSHOP_USER_AGENT,
        Accept: 'application/json',
      })
      expect(NUVEMSHOP_USER_AGENT).toBe('Indicio Cult (https://indiciocult.com.br)')
      expect(readHeaders['Content-Type']).toBeUndefined()

      await capture({ method: 'POST', segments: ['products'], body: { name: 'synthetic' } })
      const writeHeaders = headerRecord(requestInit(fetchMock, 1))
      expect(writeHeaders['Content-Type']).toBe('application/json; charset=utf-8')
      expect(writeHeaders.Authorization).toBe(`Bearer ${TOKEN}`)
      expect(requestInit(fetchMock, 1).body).toBe('{"name":"synthetic"}')
      expect(String(requestInit(fetchMock, 1).body)).not.toContain(TOKEN)
    })

    it('does not require the app id or client secret and does not send them', async () => {
      stubConfig({ NUVEMSHOP_CLIENT_SECRET: undefined, NUVEMSHOP_APP_ID: undefined })
      const fetchMock = installFetch()

      const result = await capture()

      expect(result.value?.status).toBe(200)
      const headers = JSON.stringify(headerRecord(requestInit(fetchMock)))
      expect(headers).not.toContain(CLIENT_SECRET)
      expect(headers).not.toContain(APP_ID)
      expect(requestUrl(fetchMock)).not.toContain('app_id')
    })

    it('fails closed on a header-injecting token without calling fetch', async () => {
      stubConfig({ NUVEMSHOP_ACCESS_TOKEN: `synthetic\r\nX-Evil: ${TOKEN}` })
      const fetchMock = installFetch()

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopConfigurationError)
      expect(fetchMock).not.toHaveBeenCalled()
      expectRedacted(result.error)
    })
  })

  describe('status mapping', () => {
    it.each([
      [401, NuvemshopAuthenticationError],
      [402, NuvemshopAccountSuspendedError],
      [403, NuvemshopAuthorizationError],
      [404, NuvemshopNotFoundError],
      [429, NuvemshopRateLimitError],
      [500, NuvemshopProviderError],
      [502, NuvemshopProviderError],
      [503, NuvemshopProviderError],
      [504, NuvemshopProviderError],
      [400, NuvemshopProtocolError],
      [422, NuvemshopProtocolError],
      [415, NuvemshopProtocolError],
      [418, NuvemshopProtocolError],
    ] as const)('maps HTTP %i to %s exactly once', async (status, ErrorType) => {
      const fetchMock = installFetch(
        async () =>
          new Response(`{"error":"${TOKEN}","email":"person@example.com"}`, {
            status,
            headers: {
              'content-type': 'application/json',
              'x-rate-limit-limit': status === 429 ? '40' : TOKEN,
              'x-rate-limit-remaining': status === 429 ? '0' : 'nope',
              'x-rate-limit-reset': status === 429 ? '1500' : 'soon',
            },
          }),
      )

      const result = await capture({
        method: 'GET',
        segments: ['products', '15'],
        operation: 'read',
        resourceKind: 'product',
        correlationId: CORRELATION_ID,
      })

      expect(result.error).toBeInstanceOf(ErrorType)
      expect(result.error).not.toBeInstanceOf(NuvemshopValidationError)
      if (ErrorType !== NuvemshopProtocolError) {
        expect(result.error).not.toBeInstanceOf(NuvemshopProtocolError)
      }
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const error = result.error as InstanceType<typeof ErrorType>
      expect(error.metadata.providerStatus).toBe(status)
      expect(error.metadata.correlationId).toBe(CORRELATION_ID)
      expect(error.metadata.resourceKind).toBe('product')
      expect(error.metadata.method).toBe('GET')
      expect(serialized(error)).not.toContain(TOKEN)
      expect(serialized(error)).not.toContain('person@example.com')
      expect(serialized(error)).not.toContain('{"error"')
      if (status === 400 || status === 422 || status === 402 || status === 401 || status === 403) {
        expect(error.retryEligible).toBe(false)
      }
      if (status === 429) {
        expect(error).toBeInstanceOf(NuvemshopRateLimitError)
        expect(error.metadata.rateLimitLimit).toBe(40)
        expect(error.metadata.rateLimitRemaining).toBe(0)
        expect(error.metadata.resetMs).toBe(1500)
        expect(error.retryEligible).toBe(true)
      }
      if (status >= 500) expect(error.retryEligible).toBe(true)
    })

    it('keeps remote 400 distinct from local validation and does not retry', async () => {
      const fetchMock = installFetch(
        async () => new Response('{"message":"cannot be blank"}', { status: 400 }),
      )

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(result.error).not.toBeInstanceOf(NuvemshopValidationError)
      expect((result.error as NuvemshopProtocolError).retryEligible).toBe(false)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(serialized(result.error)).not.toContain('cannot be blank')
    })

    it('returns the raw JSON body for an expected success without response.json()', async () => {
      const raw = `{"id":${ABOVE_MAX_SAFE},"variant_id":${ABOVE_INT64}}`
      const response = new Response(raw, {
        status: 200,
        headers: { 'content-type': 'application/json; charset=UTF-8' },
      })
      const json = vi.spyOn(response, 'json')
      const fetchMock = installFetch(async () => response)

      const result = await capture({ method: 'GET', segments: ['products', ABOVE_MAX_SAFE] })

      expect(result.value).toEqual({ status: 200, rawBody: raw })
      expect(result.value?.rawBody).not.toContain('9007199254740992')
      expect(json).not.toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it.each(['{"secret":', '', '   ', 'LEAKED-BODY'])(
      'rejects a malformed success body (%j) as a protocol error',
      async (raw) => {
        const fetchMock = installFetch(
          async () =>
            new Response(raw, {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
        )

        const result = await capture()
        const error = result.error as NuvemshopProtocolError

        expect(error).toBeInstanceOf(NuvemshopProtocolError)
        expect(error.message).toBe('Nuvemshop response is incompatible.')
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(JSON.stringify(error.toJSON())).not.toContain('LEAKED-BODY')
        expect(JSON.stringify(error.toJSON())).not.toContain('secret')
      },
    )

    it('rejects an incompatible success content type', async () => {
      const fetchMock = installFetch(
        async () =>
          new Response('<html>secret</html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
          }),
      )

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(serialized(result.error)).not.toContain('secret')
      expect(serialized(result.error)).not.toContain('<html>')
    })

    it('rejects an unexpected success status', async () => {
      const fetchMock = installFetch(
        async () =>
          new Response('{"ok":true}', {
            status: 201,
            headers: { 'content-type': 'application/json' },
          }),
      )

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('rejects a success payload above the lossless cap', async () => {
      const fetchMock = installFetch(
        async () =>
          new Response('{}', {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'content-length': '1048577',
            },
          }),
      )

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('network, abort and timeout', () => {
    it('does not fetch when the caller signal is already aborted', async () => {
      const fetchMock = installFetch()
      const signal = AbortSignal.abort()

      const result = await capture({ method: 'GET', segments: ['products'], signal })

      expect(result.error).toBeInstanceOf(NuvemshopNetworkError)
      expect(fetchMock).not.toHaveBeenCalled()
      expectRedacted(result.error)
    })

    it('propagates an in-flight abort and does not retry', async () => {
      const controller = new AbortController()
      const fetchMock = installFetch((_input, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        })
      })

      const pending = nuvemshopRequest({
        method: 'GET',
        segments: ['products'],
        signal: controller.signal,
      })
      controller.abort()

      await expect(pending).rejects.toBeInstanceOf(NuvemshopNetworkError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(requestInit(fetchMock).signal).toBeInstanceOf(AbortSignal)
    })

    it('times out a single attempt at the internal budget', async () => {
      vi.useFakeTimers()
      const fetchMock = installFetch((_input, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        })
      })

      const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
      const settled = pending.then(
        () => 'resolved' as const,
        (error: unknown) => error,
      )
      await vi.advanceTimersByTimeAsync(NUVEMSHOP_ATTEMPT_TIMEOUT_MS - 1)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)

      await expect(settled).resolves.toBeInstanceOf(NuvemshopNetworkError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(NUVEMSHOP_ATTEMPT_TIMEOUT_MS).toBe(4000)
    })

    it.each(['getaddrinfo ENOTFOUND api.nuvemshop.com.br', 'network down'])(
      'maps a rejected fetch (%s) to a network error without retry',
      async (reason) => {
        const fetchMock = installFetch(async () => {
          throw new TypeError(`${reason} ${TOKEN}`)
        })

        const result = await capture()

        expect(result.error).toBeInstanceOf(NuvemshopNetworkError)
        expect(result.error).not.toBeInstanceOf(NuvemshopProviderError)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect((result.error as NuvemshopNetworkError).message).toBe('Nuvemshop connection failed.')
        expect(serialized(result.error)).not.toContain(TOKEN)
        expect(serialized(result.error)).not.toContain(reason)
      },
    )
  })

  describe('local validation and redaction', () => {
    it('preserves a configured store id with leading zeros exactly', async () => {
      stubConfig({ NUVEMSHOP_STORE_ID: '000123' })
      const fetchMock = installFetch()

      const result = await capture()

      expect(result.value?.status).toBe(200)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(requestUrl(fetchMock)).toBe(
        `${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/000123/products`,
      )
      expect(requestInit(fetchMock).credentials).toBe('omit')
    })

    it('reports missing credentials as configuration failure without echoing them', async () => {
      stubConfig({ NUVEMSHOP_ACCESS_TOKEN: undefined })
      const fetchMock = installFetch()

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopConfigurationError)
      expect((result.error as NuvemshopConfigurationError).message).toBe(
        'Nuvemshop configuration is invalid.',
      )
      expect(fetchMock).not.toHaveBeenCalled()
      expectRedacted(result.error)
    })

    it('rejects invalid caller input before fetch even when configuration is missing', async () => {
      stubConfig({ NUVEMSHOP_ACCESS_TOKEN: undefined, NUVEMSHOP_STORE_ID: undefined })
      const fetchMock = installFetch()

      const result = await capture({
        method: 'GET',
        segments: ['products', '..'],
        correlationId: TOKEN,
      })

      expect(result.error).toBeInstanceOf(NuvemshopValidationError)
      expect(result.error).not.toBeInstanceOf(NuvemshopConfigurationError)
      expect(fetchMock).not.toHaveBeenCalled()
      expectRedacted(result.error)
    })

    it('rejects a body on a read and an invalid correlation id before fetch', async () => {
      const fetchMock = installFetch()

      const withBody = await capture({
        method: 'GET',
        segments: ['products'],
        body: { access_token: TOKEN },
      })
      const withCorrelation = await capture({
        method: 'GET',
        segments: ['products'],
        correlationId: 'not-a-uuid',
      })

      expect(withBody.error).toBeInstanceOf(NuvemshopValidationError)
      expect(withCorrelation.error).toBeInstanceOf(NuvemshopValidationError)
      expect(fetchMock).not.toHaveBeenCalled()
      expectRedacted(withBody.error)
      expectRedacted(withCorrelation.error)
    })

    it('omits hostile rate-limit header text from metadata', async () => {
      installFetch(
        async () =>
          new Response(null, {
            status: 429,
            headers: {
              'x-rate-limit-limit': TOKEN,
              'x-rate-limit-remaining': '0',
              'x-rate-limit-reset': '1500',
            },
          }),
      )

      const result = await capture()
      const error = result.error as NuvemshopRateLimitError

      expect(error).toBeInstanceOf(NuvemshopRateLimitError)
      expect(error.metadata.rateLimitLimit).toBeUndefined()
      expect(error.metadata.rateLimitRemaining).toBeUndefined()
      expect(error.metadata.resetMs).toBe(1500)
      expectRedacted(error)
    })
  })

  describe('bounded response streaming', () => {
    const CHUNK = 32 * 1024

    function overCapHostileChunks(chunkSize = CHUNK) {
      const tail = textEncoder.encode(OVERFLOW_TAIL_MARKER)
      const total = MAX_BODY_BYTES + 128 * 1024 + tail.byteLength
      return fillerChunks(total, chunkSize, tail)
    }

    it('rejects an absent Content-Length body above the cap without reading the tail (RED)', async () => {
      const chunks = overCapHostileChunks()
      const { response, pulled, reads } = streamJsonResponse(chunks)
      const fetchMock = installFetch(async () => response)

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(requestUrl(fetchMock)).toBe(OFFICIAL_PRODUCTS)
      expectEarlyStop({ pulled, reads }, CHUNK)
      expect(reads()).toBeLessThan(chunks.length)
      expectNoOverflowLeak(result.error)
    })

    it('accepts an absent Content-Length body under the cap and preserves raw JSON', async () => {
      const raw = '{"ok":true,"note":"under-cap"}'
      const chunks = [textEncoder.encode(raw)]
      const { response } = streamJsonResponse(chunks)
      installFetch(async () => response)

      const result = await capture()

      expect(result.value).toEqual({ status: 200, rawBody: raw })
    })

    it('accepts a declared Content-Length of exactly 1 MiB when the streamed body matches', async () => {
      const raw = `{"k":"${'a'.repeat(MAX_BODY_BYTES - 8)}"}`
      expect(textEncoder.encode(raw).byteLength).toBe(MAX_BODY_BYTES)
      const { response } = streamJsonResponse([textEncoder.encode(raw)], {
        'content-length': String(MAX_BODY_BYTES),
      })
      installFetch(async () => response)

      const result = await capture()

      expect(result.value?.status).toBe(200)
      expect(result.value?.rawBody).toBe(raw)
      expect(result.value?.rawBody.length).toBe(MAX_BODY_BYTES)
    })

    it('rejects a lying Content-Length under the cap when the streamed body exceeds it (RED)', async () => {
      const chunks = overCapHostileChunks(16 * 1024)
      const { response, pulled, reads } = streamJsonResponse(chunks, {
        'content-length': String(MAX_BODY_BYTES - 4096),
      })
      installFetch(async () => response)

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expectEarlyStop({ pulled, reads }, 16 * 1024)
      expect(reads()).toBeLessThan(chunks.length)
      expectNoOverflowLeak(result.error)
    })

    it('rejects a declared Content-Length above the cap as a protocol error', async () => {
      installFetch(
        async () =>
          new Response('{}', {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'content-length': String(MAX_BODY_BYTES + 1),
            },
          }),
      )

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expectNoOverflowLeak(result.error)
    })

    it.each(['12abc', '-1', '01', '1.5'])(
      'rejects malformed Content-Length %j as a protocol error',
      async (contentLength) => {
        installFetch(
          async () =>
            new Response('{}', {
              status: 200,
              headers: {
                'content-type': 'application/json',
                'content-length': contentLength,
              },
            }),
        )

        const result = await capture()

        expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
        expectNoOverflowLeak(result.error)
      },
    )

    it('rejects a huge integer Content-Length as a protocol error', async () => {
      installFetch(
        async () =>
          new Response('{}', {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'content-length': `9${'0'.repeat(80)}`,
            },
          }),
      )

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expectNoOverflowLeak(result.error)
    })

    it('stops after the cap when many small chunks exceed it only by sum (RED)', async () => {
      const small = 4096
      const chunks = overCapHostileChunks(small)
      const { response, pulled, reads } = streamJsonResponse(chunks)
      installFetch(async () => response)

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expectEarlyStop({ pulled, reads }, small)
      expect(reads()).toBeLessThan(chunks.length)
      expectNoOverflowLeak(result.error)
    })

    it('stops after one platform refill when a single chunk exceeds the cap (RED)', async () => {
      const markerTail = textEncoder.encode(OVERFLOW_TAIL_MARKER)
      const oversized = new Uint8Array(MAX_BODY_BYTES + 64 * 1024)
      oversized.fill(0x79)
      const chunks = [oversized, markerTail, new Uint8Array([0x63])]
      const { response, reads } = streamJsonResponse(chunks)
      installFetch(async () => response)

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(reads()).toBe(2)
      expectNoOverflowLeak(result.error)
    })

    it('stops near the cap when varied chunk sizes cross the limit (RED)', async () => {
      const sizes = [100_000, 500_000, 400_000, 200_000]
      const tail = textEncoder.encode(OVERFLOW_TAIL_MARKER)
      const chunks = [
        ...sizes.map((n) => new Uint8Array(n).fill(0x61)),
        tail,
        new Uint8Array([0x62]),
      ]
      const maxChunk = Math.max(...sizes, tail.byteLength)
      const { response, pulled, reads } = streamJsonResponse(chunks)
      installFetch(async () => response)

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expectEarlyStop({ pulled, reads }, maxChunk)
      expect(reads()).toBeLessThan(chunks.length)
      expectNoOverflowLeak(result.error)
    })

    it('maps a stream error mid-read to a network error without an unhandled rejection', async () => {
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(textEncoder.encode('{"partial":'))
          controller.error(new TypeError('stream read failed'))
        },
      })
      installFetch(
        async () =>
          new Response(stream, {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      )

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopNetworkError)
      expect(result.error).not.toBeInstanceOf(NuvemshopProtocolError)
      expectNoOverflowLeak(result.error)
    })

    it('preserves ASCII JSON from a streamed body exactly', async () => {
      const raw = `{"id":${ABOVE_MAX_SAFE},"variant_id":${ABOVE_INT64}}`
      const { response } = streamJsonResponse([textEncoder.encode(raw)])
      installFetch(async () => response)

      const result = await capture({ method: 'GET', segments: ['products', ABOVE_MAX_SAFE] })

      expect(result.value?.rawBody).toBe(raw)
      expect(result.value?.rawBody).toContain(ABOVE_MAX_SAFE)
      expect(result.value?.rawBody).toContain(ABOVE_INT64)
      expect(result.value?.rawBody).not.toContain('9007199254740992')
    })

    it('preserves UTF-8 accents in rawBody from streamed chunks', async () => {
      const raw = '{"label":"café","char":"ã"}'
      const { response } = streamJsonResponse([textEncoder.encode(raw)])
      installFetch(async () => response)

      const result = await capture()

      expect(result.value?.rawBody).toBe(raw)
      expect(result.value?.rawBody).toContain('café')
      expect(result.value?.rawBody).toContain('ã')
    })

    it('decodes a multibyte character split across chunk boundaries', async () => {
      const full = textEncoder.encode('{"word":"café"}')
      const splitAt = full.indexOf(0xc3)
      expect(splitAt).toBeGreaterThan(0)
      expect(full[splitAt + 1]).toBe(0xa9)
      const prefix = full.subarray(0, splitAt)
      const suffix = full.subarray(splitAt)
      const { response } = streamJsonResponse([prefix, suffix])
      installFetch(async () => response)

      const result = await capture()

      expect(result.value?.rawBody).toBe('{"word":"café"}')
    })

    it('rejects when UTF-8 byte length exceeds the cap even if string length does not (RED)', async () => {
      const twoByteChar = '\u00e9'
      const charCount = Math.floor(MAX_BODY_BYTES / 2) + 512
      const inner = twoByteChar.repeat(charCount)
      const raw = `{"data":"${inner}"}`
      expect(raw.length).toBeLessThan(MAX_BODY_BYTES)
      expect(textEncoder.encode(raw).byteLength).toBeGreaterThan(MAX_BODY_BYTES)
      const chunkSize = 64 * 1024
      const rawBytes = textEncoder.encode(raw)
      const tail = textEncoder.encode(OVERFLOW_TAIL_MARKER)
      const chunks: Uint8Array[] = []
      for (let offset = 0; offset < rawBytes.byteLength; offset += chunkSize) {
        chunks.push(rawBytes.subarray(offset, offset + chunkSize))
      }
      const overflowPad = new Uint8Array(256 * 1024).fill(0x65)
      chunks.push(overflowPad, tail)
      const totalBytes = rawBytes.byteLength + overflowPad.byteLength + tail.byteLength
      expect(totalBytes).toBeGreaterThan(MAX_BODY_BYTES + chunkSize)
      const { response, pulled, reads } = streamJsonResponse(chunks)
      installFetch(async () => response)

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(result.value).toBeUndefined()
      expectEarlyStop({ pulled, reads }, chunkSize, overflowPad.byteLength)
      expect(pulled()).toBeLessThan(totalBytes)
      expect(reads()).toBeLessThan(chunks.length)
      expectNoOverflowLeak(result.error)
    })

    it('propagates caller abort while body chunks are being pulled', async () => {
      const controller = new AbortController()
      let pullCount = 0
      let releaseSecondPull: (() => void) | undefined
      const fetchMock = installFetch((_input, init) => {
        const stream = new ReadableStream<Uint8Array>({
          pull(streamController) {
            pullCount += 1
            if (pullCount === 1) {
              streamController.enqueue(textEncoder.encode('{"head":'))
              return
            }
            return new Promise<void>((resolve, reject) => {
              releaseSecondPull = resolve
              init?.signal?.addEventListener(
                'abort',
                () => reject(new DOMException('The operation was aborted.', 'AbortError')),
                { once: true },
              )
            })
          },
        })
        return Promise.resolve(
          new Response(stream, {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      })

      const pending = nuvemshopRequest({
        method: 'GET',
        segments: ['products'],
        signal: controller.signal,
      })
      for (let i = 0; i < 50 && pullCount < 2; i += 1) {
        await Promise.resolve()
      }
      expect(pullCount).toBeGreaterThanOrEqual(2)
      controller.abort()

      await expect(pending).rejects.toBeInstanceOf(NuvemshopNetworkError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      releaseSecondPull?.()
    })

    it('times out a hung streamed body at the attempt budget', async () => {
      vi.useFakeTimers()
      const fetchMock = installFetch((_input, init) => {
        const stream = new ReadableStream<Uint8Array>({
          pull() {
            return new Promise<void>((_resolve, reject) => {
              init?.signal?.addEventListener(
                'abort',
                () => reject(new DOMException('The operation was aborted.', 'AbortError')),
                { once: true },
              )
            })
          },
        })
        return Promise.resolve(
          new Response(stream, {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      })

      const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
      const settled = pending.then(
        () => 'resolved' as const,
        (error: unknown) => error,
      )
      await vi.advanceTimersByTimeAsync(NUVEMSHOP_ATTEMPT_TIMEOUT_MS)

      await expect(settled).resolves.toBeInstanceOf(NuvemshopNetworkError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('redacts secrets and overflow markers on over-cap streaming errors (RED path)', async () => {
      const chunks = overCapHostileChunks()
      const { response } = streamJsonResponse(chunks)
      installFetch(async () => response)

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expectNoOverflowLeak(result.error)
      expect(serialized(result.error)).not.toContain(TOKEN)
      expect(serialized(result.error)).not.toContain('Authorization')
    })

    it('does not pull further when Content-Length is already above the cap', async () => {
      const chunks = overCapHostileChunks()
      const { response, reads } = streamJsonResponse(chunks, {
        'content-length': String(MAX_BODY_BYTES + 1),
      })
      await Promise.resolve()
      const primed = reads()
      installFetch(async () => response)

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(reads()).toBe(primed)
      expect(reads()).toBeLessThan(chunks.length)
      expectNoOverflowLeak(result.error)
    })

    it('preserves whitespace, newlines and JSON escapes from streamed chunks', async () => {
      const raw = '{\n  "note": "line\\nnext",\n  "path": "a\\\\b"\n}'
      const bytes = textEncoder.encode(raw)
      const { response } = streamJsonResponse([bytes.subarray(0, 8), bytes.subarray(8)])
      installFetch(async () => response)

      const result = await capture()

      expect(result.value?.rawBody).toBe(raw)
    })

    it('rejects invalid UTF-8 instead of inserting a replacement character', async () => {
      const bytes = new Uint8Array([
        ...textEncoder.encode('{"x":"'),
        0xff,
        ...textEncoder.encode('"}'),
      ])
      const { response } = streamJsonResponse([bytes])
      installFetch(async () => response)

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(result.error).not.toBeInstanceOf(NuvemshopNetworkError)
      expect(serialized(result.error)).not.toContain('\uFFFD')
      expect(serialized(result.error)).not.toContain('{"x":')
    })

    it('accepts HEAD when the body is absent', async () => {
      installFetch(async () => new Response(null, { status: 200 }))

      const result = await capture({ method: 'HEAD', segments: ['products'] })

      expect(result.value).toEqual({ status: 200, rawBody: '' })
    })

    it('rejects a nonempty HEAD body without draining past the cap', async () => {
      const chunks = overCapHostileChunks()
      const { response, pulled, reads } = streamJsonResponse(chunks)
      installFetch(async () => response)

      const result = await capture({ method: 'HEAD', segments: ['products'] })

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expectEarlyStop({ pulled, reads }, CHUNK)
      expect(reads()).toBeLessThan(chunks.length)
      expectNoOverflowLeak(result.error)
    })

    it('accepts DELETE 204 when the body is absent', async () => {
      installFetch(async () => new Response(null, { status: 204 }))

      const result = await capture({
        method: 'DELETE',
        segments: ['products', ABOVE_MAX_SAFE],
      })

      expect(result.value).toEqual({ status: 204, rawBody: '' })
    })

    it('keeps the protocol error when cancel fails after the cap', async () => {
      const chunks = overCapHostileChunks(8 * 1024)
      let index = 0
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (index >= chunks.length) {
            controller.close()
            return
          }
          const chunk = chunks[index]
          index += 1
          controller.enqueue(chunk)
        },
        cancel() {
          throw new Error(`cancel leaked ${OVERFLOW_TAIL_MARKER} ${TOKEN}`)
        },
      })
      installFetch(
        async () =>
          new Response(stream, {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      )

      const result = await capture()

      expect(result.error).toBeInstanceOf(NuvemshopProtocolError)
      expect(result.error).not.toBeInstanceOf(NuvemshopNetworkError)
      expect(index).toBeLessThan(chunks.length)
      expectNoOverflowLeak(result.error)
    })

    describe('readable stream close transition', () => {
      async function settleBeforeTimeout<T>(pending: Promise<T>): Promise<T> {
        let settled = false
        const guarded = pending.finally(() => {
          settled = true
        })
        void guarded.catch(() => undefined)
        await vi.advanceTimersByTimeAsync(0)
        for (let turn = 0; turn < 20 && !settled; turn += 1) {
          await Promise.resolve()
        }
        if (!settled) {
          await vi.advanceTimersByTimeAsync(NUVEMSHOP_ATTEMPT_TIMEOUT_MS)
        }
        return await guarded
      }

      function jsonResponseFromStart(
        start: (controller: ReadableStreamDefaultController<Uint8Array>) => void,
        headers: Record<string, string> = {},
      ) {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            start(controller)
            controller.close()
          },
        })
        return new Response(stream, {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            ...headers,
          },
        })
      }

      it('accepts JSON enqueued in start before close is requested', async () => {
        vi.useFakeTimers()
        const raw = '{"ok":true}'
        const fetchMock = installFetch(async () =>
          jsonResponseFromStart((controller) => {
            controller.enqueue(textEncoder.encode(raw))
          }),
        )

        const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
        const result = await settleBeforeTimeout(pending)

        expect(result).toEqual({ status: 200, rawBody: raw })
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })

      it('joins two chunks enqueued in start before close into one JSON body', async () => {
        vi.useFakeTimers()
        const raw = '{"part":1}'
        const fetchMock = installFetch(async () =>
          jsonResponseFromStart((controller) => {
            controller.enqueue(textEncoder.encode('{"part":'))
            controller.enqueue(textEncoder.encode('1}'))
          }),
        )

        const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
        const result = await settleBeforeTimeout(pending)

        expect(result).toEqual({ status: 200, rawBody: raw })
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })

      it('joins many small chunks enqueued in start before close', async () => {
        vi.useFakeTimers()
        const raw = '{"n":12345678}'
        const pieces = [...raw].map((char) => char)
        expect(pieces.length).toBeGreaterThanOrEqual(8)
        const fetchMock = installFetch(async () =>
          jsonResponseFromStart((controller) => {
            for (const piece of pieces) {
              controller.enqueue(textEncoder.encode(piece))
            }
          }),
        )

        const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
        const result = await settleBeforeTimeout(pending)

        expect(result).toEqual({ status: 200, rawBody: raw })
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })

      it('closes during a later pull while an earlier chunk remains queued', async () => {
        vi.useFakeTimers()
        const raw = '{"part":1}'
        let pullCount = 0
        const fetchMock = installFetch(async () => {
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(textEncoder.encode('{"part":'))
            },
            pull(controller) {
              pullCount += 1
              if (pullCount === 1) return
              controller.enqueue(textEncoder.encode('1}'))
              controller.close()
            },
          })
          return new Response(stream, {
            status: 200,
            headers: { 'content-type': 'application/json; charset=UTF-8' },
          })
        })

        const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
        const result = await settleBeforeTimeout(pending)

        expect(result).toEqual({ status: 200, rawBody: raw })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(pullCount).toBeGreaterThanOrEqual(2)
      })

      it('rejects an empty stream closed in start as a protocol error', async () => {
        vi.useFakeTimers()
        const fetchMock = installFetch(async () =>
          jsonResponseFromStart(() => {
            /* enqueue nothing */
          }),
        )

        const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
        const error = await settleBeforeTimeout(pending).catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(NuvemshopProtocolError)
        expect(error).not.toBeInstanceOf(NuvemshopNetworkError)
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })

      it('accepts a single-chunk body of exactly 1 MiB enqueued in start before close', async () => {
        vi.useFakeTimers()
        const raw = `{"k":"${'a'.repeat(MAX_BODY_BYTES - 8)}"}`
        expect(textEncoder.encode(raw).byteLength).toBe(MAX_BODY_BYTES)
        const fetchMock = installFetch(async () =>
          jsonResponseFromStart((controller) => {
            controller.enqueue(textEncoder.encode(raw))
          }),
        )

        const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
        const result = await settleBeforeTimeout(pending)

        expect(result.status).toBe(200)
        expect(result.rawBody).toBe(raw)
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })

      it('rejects one chunk above the cap enqueued in start before close', async () => {
        vi.useFakeTimers()
        const oversized = new Uint8Array(MAX_BODY_BYTES + 1).fill(0x7b)
        const fetchMock = installFetch(async () =>
          jsonResponseFromStart((controller) => {
            controller.enqueue(oversized)
          }),
        )

        const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
        const error = await settleBeforeTimeout(pending).catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(NuvemshopProtocolError)
        expect(error).not.toBeInstanceOf(NuvemshopNetworkError)
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })

      it('rejects many start-enqueued chunks above the cap without Content-Length', async () => {
        vi.useFakeTimers()
        const chunkSize = 256 * 1024
        const chunkCount = Math.ceil((MAX_BODY_BYTES + 64 * 1024) / chunkSize)
        const fetchMock = installFetch(async () =>
          jsonResponseFromStart((controller) => {
            for (let i = 0; i < chunkCount; i += 1) {
              controller.enqueue(new Uint8Array(chunkSize).fill(0x78))
            }
          }),
        )

        const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
        const error = await settleBeforeTimeout(pending).catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(NuvemshopProtocolError)
        expect(error).not.toBeInstanceOf(NuvemshopNetworkError)
        expectNoOverflowLeak(error)
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })

      it('rejects a lying Content-Length when start-enqueued body exceeds the cap', async () => {
        vi.useFakeTimers()
        const chunkSize = 256 * 1024
        const chunkCount = Math.ceil((MAX_BODY_BYTES + 64 * 1024) / chunkSize)
        const fetchMock = installFetch(async () =>
          jsonResponseFromStart(
            (controller) => {
              for (let i = 0; i < chunkCount; i += 1) {
                controller.enqueue(new Uint8Array(chunkSize).fill(0x78))
              }
            },
            { 'content-length': '16' },
          ),
        )

        const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
        const error = await settleBeforeTimeout(pending).catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(NuvemshopProtocolError)
        expectNoOverflowLeak(error)
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })

      it('decodes UTF-8 split across start-enqueued chunks before close', async () => {
        vi.useFakeTimers()
        const full = textEncoder.encode('{"word":"café"}')
        const splitAt = full.indexOf(0xc3)
        expect(splitAt).toBeGreaterThan(0)
        const prefix = full.subarray(0, splitAt)
        const suffix = full.subarray(splitAt)
        const fetchMock = installFetch(async () =>
          jsonResponseFromStart((controller) => {
            controller.enqueue(prefix)
            controller.enqueue(suffix)
          }),
        )

        const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
        const result = await settleBeforeTimeout(pending)

        expect(result).toEqual({ status: 200, rawBody: '{"word":"café"}' })
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })

      it('rejects invalid UTF-8 enqueued in start before close without replacement chars', async () => {
        vi.useFakeTimers()
        const bytes = new Uint8Array([
          ...textEncoder.encode('{"x":"'),
          0xff,
          ...textEncoder.encode('"}'),
        ])
        const fetchMock = installFetch(async () =>
          jsonResponseFromStart((controller) => {
            controller.enqueue(bytes)
          }),
        )

        const pending = nuvemshopRequest({ method: 'GET', segments: ['products'] })
        const error = await settleBeforeTimeout(pending).catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(NuvemshopProtocolError)
        expect(error).not.toBeInstanceOf(NuvemshopNetworkError)
        expect(serialized(error)).not.toContain('\uFFFD')
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })

      it('preserves large decimal ids from a start-enqueued JSON body before close', async () => {
        vi.useFakeTimers()
        const raw = `{"id":${ABOVE_MAX_SAFE},"variant_id":${ABOVE_INT64}}`
        const fetchMock = installFetch(async () =>
          jsonResponseFromStart((controller) => {
            controller.enqueue(textEncoder.encode(raw))
          }),
        )

        const pending = nuvemshopRequest({
          method: 'GET',
          segments: ['products', ABOVE_MAX_SAFE],
        })
        const result = await settleBeforeTimeout(pending)

        expect(result.status).toBe(200)
        expect(result.rawBody).toBe(raw)
        expect(result.rawBody).toContain(ABOVE_MAX_SAFE)
        expect(result.rawBody).toContain(ABOVE_INT64)
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })

      it('does not read queued chunks via ReadableStream private queue state', () => {
        const source = readFileSync(
          `${process.cwd()}/src/modules/nuvemshop/server/request.ts`,
          'utf8',
        )
        expect(source).not.toContain('kState')
        expect(source).not.toContain('queueTotalSize')
        expect(source).not.toContain('queue.shift')
      })
    })
  })

  it('rejects a client import of the transport', async () => {
    vi.doUnmock('server-only')
    vi.resetModules()

    await expect(import('@/modules/nuvemshop/server/client')).rejects.toThrow(/Client Component/)
  })
})
