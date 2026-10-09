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

  it('rejects a client import of the transport', async () => {
    vi.doUnmock('server-only')
    vi.resetModules()

    await expect(import('@/modules/nuvemshop/server/client')).rejects.toThrow(/Client Component/)
  })
})
