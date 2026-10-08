import 'server-only'

const operations = ['read', 'lookup', 'configuration', 'webhook'] as const
const resourceKinds = ['product', 'variant', 'category', 'order', 'store', 'webhook'] as const
const methods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const

/** Internal context only; upstream messages, headers, bodies and causes are not accepted. */
export interface NuvemshopErrorContext {
  operation?: (typeof operations)[number]
  resourceKind?: (typeof resourceKinds)[number]
  method?: (typeof methods)[number]
  providerStatus?: number
  /** Caller-generated UUID v4; never copy a provider identifier or credential here. */
  correlationId?: string
  rateLimitLimit?: number
  rateLimitRemaining?: number
  /** Provider reset duration in milliseconds, not an epoch or retry delay. */
  resetMs?: number
}

const definitions = {
  CONFIGURATION: ['NuvemshopConfigurationError', 'Nuvemshop configuration is invalid.'],
  AUTHENTICATION: ['NuvemshopAuthenticationError', 'Nuvemshop authentication failed.'],
  AUTHORIZATION: ['NuvemshopAuthorizationError', 'Nuvemshop access is not authorized.'],
  ACCOUNT_SUSPENDED: ['NuvemshopAccountSuspendedError', 'Nuvemshop account is suspended.'],
  NOT_FOUND: ['NuvemshopNotFoundError', 'Nuvemshop resource was not found.'],
  VALIDATION: ['NuvemshopValidationError', 'Nuvemshop input is invalid.'],
  PROTOCOL: ['NuvemshopProtocolError', 'Nuvemshop response is incompatible.'],
  RATE_LIMIT: ['NuvemshopRateLimitError', 'Nuvemshop rate limit was reached.'],
  NETWORK: ['NuvemshopNetworkError', 'Nuvemshop connection failed.'],
  PROVIDER: ['NuvemshopProviderError', 'Nuvemshop provider failed.'],
  LOOKUP_INCOMPLETE: ['NuvemshopLookupIncompleteError', 'Nuvemshop lookup is incomplete.'],
  WEBHOOK: ['NuvemshopWebhookError', 'Nuvemshop webhook is invalid.'],
} as const

type ErrorKind = keyof typeof definitions
export type NuvemshopErrorCode = `NUVEMSHOP_${ErrorKind}_ERROR`
export type NuvemshopErrorMetadata = Readonly<NuvemshopErrorContext>
export interface SafeNuvemshopError {
  readonly code: NuvemshopErrorCode
  readonly message: string
  readonly retryEligible: boolean
  readonly metadata: NuvemshopErrorMetadata
}

// Read only named own data properties. No enumeration, getters, coercion or upstream traversal.
function ownValue(context: unknown, key: keyof NuvemshopErrorContext): unknown {
  try {
    if (typeof context !== 'object' || context === null || Array.isArray(context)) return undefined
    const descriptor = Object.getOwnPropertyDescriptor(context, key)
    return descriptor && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

// Compatibility validation only. NUV-04 owns classification of actual HTTP responses.
function compatibleStatus(kind: ErrorKind, status: unknown): status is number {
  if (!nonnegativeInteger(status)) return false
  switch (kind) {
    case 'AUTHENTICATION':
      return status === 401
    case 'ACCOUNT_SUSPENDED':
      return status === 402
    case 'AUTHORIZATION':
      return status === 403
    case 'NOT_FOUND':
      return status === 404
    case 'RATE_LIMIT':
      return status === 429
    case 'PROVIDER':
      return status >= 500 && status <= 599
    case 'PROTOCOL':
      return status >= 200 && status <= 499 && ![401, 402, 403, 404, 429].includes(status)
    default:
      return false
  }
}

function safeMetadata(kind: ErrorKind, context: unknown): NuvemshopErrorMetadata {
  const metadata: NuvemshopErrorContext = {}
  const operationValue = ownValue(context, 'operation')
  const resourceValue = ownValue(context, 'resourceKind')
  const methodValue = ownValue(context, 'method')
  const operation = operations.find((value) => value === operationValue)
  const resourceKind = resourceKinds.find((value) => value === resourceValue)
  const method = methods.find((value) => value === methodValue)
  if (operation !== undefined) metadata.operation = operation
  if (resourceKind !== undefined) metadata.resourceKind = resourceKind
  if (method !== undefined) metadata.method = method

  const providerStatus = ownValue(context, 'providerStatus')
  if (compatibleStatus(kind, providerStatus)) metadata.providerStatus = providerStatus
  const correlationId = ownValue(context, 'correlationId')
  if (
    typeof correlationId === 'string' &&
    correlationId.length === 36 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(correlationId)
  ) {
    metadata.correlationId = correlationId
  }

  if (kind === 'RATE_LIMIT') {
    const limit = ownValue(context, 'rateLimitLimit')
    const remaining = ownValue(context, 'rateLimitRemaining')
    const resetMs = ownValue(context, 'resetMs')
    if (
      nonnegativeInteger(limit) &&
      limit > 0 &&
      nonnegativeInteger(remaining) &&
      remaining <= limit
    ) {
      metadata.rateLimitLimit = limit
      metadata.rateLimitRemaining = remaining
    }
    if (nonnegativeInteger(resetMs)) metadata.resetMs = resetMs
  }
  return Object.freeze(metadata)
}

class NuvemshopError extends Error {
  declare readonly code: NuvemshopErrorCode
  declare readonly metadata: NuvemshopErrorMetadata
  /** Pure eligibility hint. NUV-05 still owns admission, budget, attempts and backoff. */
  declare readonly retryEligible: boolean
  readonly #projection: SafeNuvemshopError

  constructor(kind: ErrorKind, context?: NuvemshopErrorContext) {
    const [name, message] = definitions[kind]
    super(message)
    const metadata = safeMetadata(kind, context)
    const code: NuvemshopErrorCode = `NUVEMSHOP_${kind}_ERROR`
    const retryEligible =
      (kind === 'RATE_LIMIT' || kind === 'NETWORK' || kind === 'PROVIDER') &&
      (metadata.method === 'GET' || metadata.method === 'HEAD') &&
      (metadata.operation === 'read' || metadata.operation === 'lookup')
    this.#projection = Object.freeze({ code, message, retryEligible, metadata })
    Object.defineProperties(this, {
      name: { value: name, writable: false, configurable: false },
      message: { value: message, writable: false, configurable: false },
      code: { value: code, enumerable: true },
      metadata: { value: metadata, enumerable: true },
      retryEligible: { value: retryEligible, enumerable: true },
    })
  }

  /** The controlled observable surface; arbitrary Error objects and logging are out of scope. */
  toJSON(): SafeNuvemshopError {
    return this.#projection
  }
}

export class NuvemshopConfigurationError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('CONFIGURATION', context)
  }
}
export class NuvemshopAuthenticationError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('AUTHENTICATION', context)
  }
}
export class NuvemshopAuthorizationError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('AUTHORIZATION', context)
  }
}
export class NuvemshopAccountSuspendedError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('ACCOUNT_SUSPENDED', context)
  }
}
export class NuvemshopNotFoundError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('NOT_FOUND', context)
  }
}
export class NuvemshopValidationError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('VALIDATION', context)
  }
}
export class NuvemshopProtocolError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('PROTOCOL', context)
  }
}
export class NuvemshopRateLimitError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('RATE_LIMIT', context)
  }
}
export class NuvemshopNetworkError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('NETWORK', context)
  }
}
export class NuvemshopProviderError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('PROVIDER', context)
  }
}
export class NuvemshopLookupIncompleteError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('LOOKUP_INCOMPLETE', context)
  }
}
export class NuvemshopWebhookError extends NuvemshopError {
  constructor(context?: NuvemshopErrorContext) {
    super('WEBHOOK', context)
  }
}
