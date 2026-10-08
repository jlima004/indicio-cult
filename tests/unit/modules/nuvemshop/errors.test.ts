import { describe, expect, it, vi } from 'vitest'

import {
  NuvemshopAccountSuspendedError,
  NuvemshopAuthenticationError,
  NuvemshopAuthorizationError,
  NuvemshopConfigurationError,
  NuvemshopLookupIncompleteError,
  NuvemshopNetworkError,
  NuvemshopNotFoundError,
  NuvemshopProtocolError,
  NuvemshopProviderError,
  NuvemshopRateLimitError,
  NuvemshopValidationError,
  NuvemshopWebhookError,
  type NuvemshopErrorContext,
} from '@/modules/nuvemshop/server/errors'

const correlationId = '2a1de28d-4acf-4d42-8f39-a44b6fd25414'
const taxonomy = [
  [
    NuvemshopConfigurationError,
    'NUVEMSHOP_CONFIGURATION_ERROR',
    'Nuvemshop configuration is invalid.',
  ],
  [
    NuvemshopAuthenticationError,
    'NUVEMSHOP_AUTHENTICATION_ERROR',
    'Nuvemshop authentication failed.',
  ],
  [
    NuvemshopAuthorizationError,
    'NUVEMSHOP_AUTHORIZATION_ERROR',
    'Nuvemshop access is not authorized.',
  ],
  [
    NuvemshopAccountSuspendedError,
    'NUVEMSHOP_ACCOUNT_SUSPENDED_ERROR',
    'Nuvemshop account is suspended.',
  ],
  [NuvemshopNotFoundError, 'NUVEMSHOP_NOT_FOUND_ERROR', 'Nuvemshop resource was not found.'],
  [NuvemshopValidationError, 'NUVEMSHOP_VALIDATION_ERROR', 'Nuvemshop input is invalid.'],
  [NuvemshopProtocolError, 'NUVEMSHOP_PROTOCOL_ERROR', 'Nuvemshop response is incompatible.'],
  [NuvemshopRateLimitError, 'NUVEMSHOP_RATE_LIMIT_ERROR', 'Nuvemshop rate limit was reached.'],
  [NuvemshopNetworkError, 'NUVEMSHOP_NETWORK_ERROR', 'Nuvemshop connection failed.'],
  [NuvemshopProviderError, 'NUVEMSHOP_PROVIDER_ERROR', 'Nuvemshop provider failed.'],
  [
    NuvemshopLookupIncompleteError,
    'NUVEMSHOP_LOOKUP_INCOMPLETE_ERROR',
    'Nuvemshop lookup is incomplete.',
  ],
  [NuvemshopWebhookError, 'NUVEMSHOP_WEBHOOK_ERROR', 'Nuvemshop webhook is invalid.'],
] as const

// Deliberate runtime misuse: callers cannot rely on TypeScript to sanitize input.
function hostileContext(value: unknown): NuvemshopErrorContext {
  return value as NuvemshopErrorContext
}

describe('Nuvemshop safe error taxonomy', () => {
  it.each(taxonomy)(
    '%s has its own stable identity, code and fixed message',
    (ErrorType, code, message) => {
      const error = new ErrorType()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ErrorType)
      expect(error.name).toBe(ErrorType.name)
      expect(error.code).toBe(code)
      expect(error.message).toBe(message)
      expect(error.retryEligible).toBe(false)
      expect(error.toJSON()).toEqual({ code, message, retryEligible: false, metadata: {} })
      for (const [OtherErrorType] of taxonomy) {
        if (OtherErrorType !== ErrorType) expect(error).not.toBeInstanceOf(OtherErrorType)
      }
    },
  )

  it.each([
    [NuvemshopAuthenticationError, 401],
    [NuvemshopAccountSuspendedError, 402],
    [NuvemshopAuthorizationError, 403],
    [NuvemshopNotFoundError, 404],
    [NuvemshopRateLimitError, 429],
    [NuvemshopProviderError, 503],
  ] as const)('%s retains only its compatible provider status %i', (ErrorType, providerStatus) => {
    const error = new ErrorType({ providerStatus, operation: 'read', method: 'GET' })
    expect(error.metadata.providerStatus).toBe(providerStatus)
    expect(error.toJSON().metadata.providerStatus).toBe(providerStatus)
  })

  it('keeps account suspension separate from insufficient authorization', () => {
    const suspended = new NuvemshopAccountSuspendedError({ providerStatus: 402 })
    const forbidden = new NuvemshopAuthorizationError({ providerStatus: 403 })
    expect(suspended.code).not.toBe(forbidden.code)
    expect(suspended).not.toBeInstanceOf(NuvemshopAuthorizationError)
    expect(suspended.retryEligible).toBe(false)
    expect(forbidden.retryEligible).toBe(false)
  })

  it.each([400, 422])(
    'remote %i remains protocol failure and is never eligible',
    (providerStatus) => {
      const error = new NuvemshopProtocolError({ providerStatus, operation: 'read', method: 'GET' })
      expect(error.metadata.providerStatus).toBe(providerStatus)
      expect(error).not.toBeInstanceOf(NuvemshopValidationError)
      expect(error.retryEligible).toBe(false)
    },
  )

  it('local invalid input stays distinct, has no remote status and performs no fetch', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    try {
      const error = new NuvemshopValidationError(hostileContext({ providerStatus: 400 }))
      expect(error.code).toBe('NUVEMSHOP_VALIDATION_ERROR')
      expect(error.metadata).toEqual({})
      expect(error.retryEligible).toBe(false)
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it.each(['connection', 'timeout', 'abort'])(
    'network %s has a fixed safe classification',
    (reason) => {
      const error = new NuvemshopNetworkError(
        hostileContext({ reason, message: `unsafe-${reason}` }),
      )
      expect(error.code).toBe('NUVEMSHOP_NETWORK_ERROR')
      expect(error.message).toBe('Nuvemshop connection failed.')
      expect(error.metadata).toEqual({})
    },
  )

  it.each(['ambiguous', 'incomplete'])('lookup %s does not collapse into not found', (reason) => {
    const error = new NuvemshopLookupIncompleteError(
      hostileContext({ operation: 'lookup', reason }),
    )
    expect(error.code).toBe('NUVEMSHOP_LOOKUP_INCOMPLETE_ERROR')
    expect(error).not.toBeInstanceOf(NuvemshopNotFoundError)
    expect(error.retryEligible).toBe(false)
  })

  it.each(['signature', 'envelope', 'store'])(
    'invalid webhook %s stays safe and terminal',
    (reason) => {
      const error = new NuvemshopWebhookError(hostileContext({ operation: 'webhook', reason }))
      expect(error.code).toBe('NUVEMSHOP_WEBHOOK_ERROR')
      expect(error.metadata).toEqual({ operation: 'webhook' })
      expect(error.retryEligible).toBe(false)
    },
  )
})

describe('pure retry eligibility, without retry authorization', () => {
  const transient = [NuvemshopRateLimitError, NuvemshopNetworkError, NuvemshopProviderError]

  it.each(transient)(
    '%s permits only a bounded future read policy to consider GET/HEAD',
    (ErrorType) => {
      for (const operation of ['read', 'lookup'] as const) {
        for (const method of ['GET', 'HEAD'] as const) {
          expect(new ErrorType({ operation, method }).retryEligible).toBe(true)
        }
      }
    },
  )

  it.each(transient)(
    '%s never marks writes, effects, unknown methods or missing context eligible',
    (ErrorType) => {
      for (const method of [
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
        'get',
        'GET\n',
        '',
        null,
        123,
      ]) {
        expect(new ErrorType(hostileContext({ operation: 'read', method })).retryEligible).toBe(
          false,
        )
      }
      for (const operation of ['configuration', 'webhook', 'arbitrary', undefined]) {
        expect(new ErrorType(hostileContext({ operation, method: 'GET' })).retryEligible).toBe(
          false,
        )
      }
      expect(new ErrorType({ operation: 'read' }).retryEligible).toBe(false)
      expect(new ErrorType().retryEligible).toBe(false)
      expect(new ErrorType(hostileContext({ retryEligible: true })).retryEligible).toBe(false)
    },
  )

  it.each(taxonomy.filter(([ErrorType]) => !transient.includes(ErrorType)))(
    '%s remains terminal for GET/HEAD',
    (ErrorType) => {
      for (const method of ['GET', 'HEAD'] as const) {
        expect(new ErrorType({ operation: 'read', method }).retryEligible).toBe(false)
      }
    },
  )
})

describe('closed and validated metadata', () => {
  it('preserves a safe internal correlation and only allowlisted context', () => {
    const error = new NuvemshopNotFoundError({
      operation: 'read',
      resourceKind: 'product',
      method: 'HEAD',
      providerStatus: 404,
      correlationId,
    })
    expect(error.metadata).toEqual({
      operation: 'read',
      resourceKind: 'product',
      method: 'HEAD',
      providerStatus: 404,
      correlationId,
    })
  })

  it.each(['read', 'lookup', 'configuration', 'webhook'] as const)(
    'allows operation %s',
    (operation) => {
      expect(new NuvemshopConfigurationError({ operation }).metadata.operation).toBe(operation)
    },
  )

  it.each(['product', 'variant', 'category', 'order', 'store', 'webhook'] as const)(
    'allows resource kind %s',
    (resourceKind) => {
      expect(new NuvemshopConfigurationError({ resourceKind }).metadata.resourceKind).toBe(
        resourceKind,
      )
    },
  )

  it('retains millisecond reset and consistent rate counts only on rate errors', () => {
    const context = { rateLimitLimit: 40, rateLimitRemaining: 0, resetMs: 1500 }
    expect(new NuvemshopRateLimitError(context).metadata).toEqual(context)
    for (const [ErrorType] of taxonomy) {
      if (ErrorType !== NuvemshopRateLimitError) expect(new ErrorType(context).metadata).toEqual({})
    }
  })

  it('accepts zero reset as metadata without authorizing any immediate request', () => {
    const error = new NuvemshopRateLimitError({ resetMs: 0 })
    expect(error.metadata.resetMs).toBe(0)
    expect(error.retryEligible).toBe(false)
  })

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1500', null, {}, []])(
    'drops invalid reset %j without coercion',
    (resetMs) => {
      expect(new NuvemshopRateLimitError(hostileContext({ resetMs })).metadata).toEqual({})
    },
  )

  it.each([
    [0, 0],
    [-1, 0],
    [40, 41],
    [40, -1],
    [40, 0.5],
    ['40', 0],
    [40, '0'],
    [Infinity, 0],
    [40, NaN],
    [Number.MAX_SAFE_INTEGER + 1, 0],
    [undefined, 0],
    [40, undefined],
  ])('drops inconsistent rate pair limit=%j remaining=%j', (rateLimitLimit, rateLimitRemaining) => {
    expect(
      new NuvemshopRateLimitError(hostileContext({ rateLimitLimit, rateLimitRemaining })).metadata,
    ).toEqual({})
  })

  it.each([0, 99, 600, 401.5, NaN, Infinity, '401', null, {}, 402, 403])(
    'drops incompatible authentication status %j',
    (providerStatus) => {
      expect(new NuvemshopAuthenticationError(hostileContext({ providerStatus })).metadata).toEqual(
        {},
      )
    },
  )

  it.each([401, 402, 403, 404, 429, 500, 599])(
    'does not let protocol fallback claim specific status %i',
    (providerStatus) => {
      expect(new NuvemshopProtocolError({ providerStatus }).metadata).toEqual({})
    },
  )

  it.each([500, 599])('retains 5xx provider status %i', (providerStatus) => {
    expect(new NuvemshopProviderError({ providerStatus }).metadata.providerStatus).toBe(
      providerStatus,
    )
  })

  it.each([400, 429, 499, 600, '503'])(
    'drops incompatible provider status %j',
    (providerStatus) => {
      expect(new NuvemshopProviderError(hostileContext({ providerStatus })).metadata).toEqual({})
    },
  )

  it.each([
    '',
    'person@example.invalid',
    'Bearer SYNTHETIC-TOKEN',
    'https://example.invalid/?secret=SYNTHETIC',
    'a'.repeat(512),
    `${correlationId}\n`,
    `\0${correlationId}`,
    correlationId.replace('-4d42-', '-1d42-'),
    null,
    42,
    {},
  ])('drops hostile correlation %j', (value) => {
    expect(new NuvemshopNotFoundError(hostileContext({ correlationId: value })).metadata).toEqual(
      {},
    )
  })

  it('bounds context cardinality by finite operation/resource/method allowlists', () => {
    for (let index = 0; index < 32; index++) {
      const error = new NuvemshopNetworkError(
        hostileContext({
          operation: `read-${index}`,
          resourceKind: `order-${index}`,
          method: `GET-${index}`,
        }),
      )
      expect(error.metadata).toEqual({})
      expect(error.retryEligible).toBe(false)
    }
  })

  it.each([null, true, 42, 'SYNTHETIC-TOKEN', Symbol('SYNTHETIC'), [], new Error('SYNTHETIC')])(
    'ignores an unexpected context type %j',
    (value) => {
      const error = new NuvemshopNetworkError(hostileContext(value))
      expect(error.metadata).toEqual({})
      expect(error.retryEligible).toBe(false)
    },
  )

  it('does not coerce objects, invoke getters or inherit external metadata', () => {
    const getter = vi.fn(() => {
      throw new Error('SYNTHETIC-GETTER')
    })
    const coercion = { toString: getter, valueOf: getter, toJSON: getter }
    const context = Object.create({ operation: 'read', method: 'GET', correlationId })
    for (const field of [
      'operation',
      'resourceKind',
      'method',
      'providerStatus',
      'correlationId',
      'rateLimitLimit',
      'rateLimitRemaining',
      'resetMs',
      'cause',
      'message',
      'upstream',
      'toJSON',
    ]) {
      Object.defineProperty(context, field, { get: getter, enumerable: true })
    }
    const error = new NuvemshopRateLimitError(hostileContext(context))
    expect(error.toJSON().metadata).toEqual({})
    const other = new NuvemshopRateLimitError(
      hostileContext({
        operation: coercion,
        resourceKind: coercion,
        correlationId: coercion,
        providerStatus: coercion,
        resetMs: coercion,
      }),
    )
    expect(other.toJSON().metadata).toEqual({})
    expect(getter).not.toHaveBeenCalled()
  })

  it('tolerates a revoked proxy without exposing its error or invoking accessors', () => {
    const proxy = Proxy.revocable({}, {})
    proxy.revoke()
    const error = new NuvemshopNetworkError(hostileContext(proxy.proxy))
    expect(error.toJSON().metadata).toEqual({})
    expect(error.message).toBe('Nuvemshop connection failed.')
  })
})

describe('safe observable projection', () => {
  const sensitiveFixtures = [
    ['bearer token', 'Bearer SYNTHETIC-TOKEN-ONLY'],
    ['client secret', 'SYNTHETIC-CLIENT-SECRET-ONLY'],
    ['Authorization', 'Authorization: Bearer SYNTHETIC-AUTH-ONLY'],
    ['HMAC', 'SYNTHETIC-HMAC-ONLY'],
    ['URL/query', 'https://example.invalid/orders?token=SYNTHETIC-QUERY-ONLY'],
    ['raw body', '{"raw":"SYNTHETIC-BODY-ONLY"}'],
    ['contactEmail', 'synthetic-person@example.invalid'],
    ['address', 'SYNTHETIC-STREET-ONLY 123'],
    ['external stack', 'Error: SYNTHETIC-STACK-ONLY\n at external (file:1:1)'],
    ['controls and length', `SYNTHETIC-CONTROL-ONLY\r\n\0${'x'.repeat(2048)}`],
  ] as const

  it.each(sensitiveFixtures)(
    'never incorporates synthetic %s into controlled surfaces',
    (_label, sensitive) => {
      const upstream = new Error(sensitive, { cause: { contactEmail: sensitive } })
      for (const [ErrorType, code, message] of taxonomy) {
        const error = new ErrorType(
          hostileContext({
            message: sensitive,
            cause: upstream,
            upstream,
            body: sensitive,
            contactEmail: sensitive,
            Authorization: sensitive,
            token: sensitive,
            clientSecret: sensitive,
            signature: sensitive,
            url: sensitive,
            stack: sensitive,
            metadata: { raw: sensitive },
            operation: sensitive,
            resourceKind: sensitive,
            method: sensitive,
            providerStatus: sensitive,
            correlationId: sensitive,
            rateLimitLimit: sensitive,
            rateLimitRemaining: sensitive,
            resetMs: sensitive,
          }),
        )
        expect(error.message).toBe(message)
        expect(error.toString()).not.toContain(sensitive)
        expect(error.metadata).toEqual({})
        expect(error.cause).toBeUndefined()
        expect(Object.hasOwn(error, 'upstream')).toBe(false)
        expect(error.toJSON()).toEqual({ code, message, retryEligible: false, metadata: {} })
        expect(JSON.parse(JSON.stringify(error))).toEqual(error.toJSON())
        expect(JSON.stringify(error)).not.toContain(sensitive)
        expect(JSON.stringify(error.metadata)).not.toContain(sensitive)
      }
    },
  )

  it('excludes local stack, cause and added raw properties from its public projection', () => {
    const error = new NuvemshopNetworkError()
    error.stack = 'SYNTHETIC-STACK-ONLY'
    Object.assign(error, { cause: new Error('SYNTHETIC-CAUSE-ONLY'), raw: 'SYNTHETIC-RAW-ONLY' })
    expect(error.toJSON()).toEqual({
      code: 'NUVEMSHOP_NETWORK_ERROR',
      message: 'Nuvemshop connection failed.',
      retryEligible: false,
      metadata: {},
    })
    expect(JSON.stringify(error)).not.toMatch(/stack|cause|raw|SYNTHETIC/)
  })

  it('snapshots and freezes metadata without retaining or freezing the caller object', () => {
    const context = {
      operation: 'read' as const,
      resourceKind: 'order' as const,
      method: 'GET' as const,
      correlationId,
    }
    const error = new NuvemshopNetworkError(context)
    context.correlationId = 'synthetic-person@example.invalid'
    expect(error.metadata.correlationId).toBe(correlationId)
    expect(Object.isFrozen(context)).toBe(false)
    expect(Object.isFrozen(error.metadata)).toBe(true)
    expect(Object.isFrozen(error.toJSON())).toBe(true)
    expect(Reflect.set(error.metadata, 'correlationId', context.correlationId)).toBe(false)
    expect(Reflect.set(error, 'code', 'SYNTHETIC-CODE-ONLY')).toBe(false)
    expect(Reflect.set(error, 'message', 'SYNTHETIC-MESSAGE-ONLY')).toBe(false)
    expect(Reflect.set(error, 'metadata', { raw: 'SYNTHETIC-RAW-ONLY' })).toBe(false)
    expect(Reflect.set(error, 'retryEligible', false)).toBe(false)
    expect(error.toJSON().retryEligible).toBe(true)
  })
})
