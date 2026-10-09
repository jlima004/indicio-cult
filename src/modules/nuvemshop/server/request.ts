import 'server-only'

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
  type NuvemshopErrorContext,
} from './errors'
import { readDecimalId, readUlid } from './schemas/ids'
import { decodeLosslessJson } from './schemas/lossless-json'

/** Official Nuvemshop host. Callers cannot select `api.tiendanube.com`. */
export const NUVEMSHOP_API_ORIGIN = 'https://api.nuvemshop.com.br'
/** Internal pin. Not read from the environment or from a consumer. */
export const NUVEMSHOP_API_VERSION = '2025-03'
/** Documented `Name (contact)` form. Public site only; no app id and no secret. */
export const NUVEMSHOP_USER_AGENT = 'Indicio Cult (https://indiciocult.com.br)'
/**
 * Single-attempt ceiling. NUV-05 owns retries, jitter and the 9s total budget.
 * This timer does not schedule another request.
 */
export const NUVEMSHOP_ATTEMPT_TIMEOUT_MS = 4_000

const MAX_RESPONSE_CHARS = 1_048_576
const MAX_STORE_ID_LENGTH = 256
const MAX_TOKEN_LENGTH = 4_096
const MAX_SEGMENTS = 8
const RESOURCE_SEGMENT = /^[a-z][a-z0-9_-]{0,63}$/
const CORRELATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const methods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
const operations = ['read', 'lookup'] as const
const resourceKinds = ['product', 'variant', 'category', 'order', 'store', 'webhook'] as const

type Method = (typeof methods)[number]
type Operation = (typeof operations)[number]
type ResourceKind = (typeof resourceKinds)[number]

const successStatuses: Record<Method, readonly number[]> = {
  GET: [200],
  HEAD: [200],
  POST: [200, 201],
  PUT: [200, 201],
  PATCH: [200, 201],
  DELETE: [200, 204],
}

const transportFailures = [
  NuvemshopAuthenticationError,
  NuvemshopAuthorizationError,
  NuvemshopAccountSuspendedError,
  NuvemshopNotFoundError,
  NuvemshopValidationError,
  NuvemshopProtocolError,
  NuvemshopRateLimitError,
  NuvemshopNetworkError,
  NuvemshopProviderError,
] as const

export type NuvemshopRequestInput = {
  readonly method: Method
  /** Path segments under `/{version}/{store_id}`. Never an absolute URL. */
  readonly segments: readonly string[]
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly operation?: Operation
  readonly resourceKind?: ResourceKind
  readonly correlationId?: string
}

export type NuvemshopRequestSuccess = {
  readonly status: number
  readonly rawBody: string
}

type AttemptContext = {
  readonly operation: Operation
  readonly method: Method
  readonly resourceKind?: ResourceKind
  readonly correlationId?: string
}

type PreparedNuvemshopAttempt = {
  readonly method: Method
  readonly segments: readonly string[]
  readonly body?: string
  readonly signal?: AbortSignal
  readonly context: AttemptContext
}

function failValidation(context?: NuvemshopErrorContext): never {
  throw new NuvemshopValidationError(context)
}

function isTransportFailure(error: unknown): boolean {
  return transportFailures.some((ErrorType) => error instanceof ErrorType)
}

function readMethod(value: unknown): Method {
  const method = methods.find((candidate) => candidate === value)
  if (method === undefined) failValidation()
  return method
}

function readOperation(value: unknown): Operation {
  if (value === undefined) return 'read'
  const operation = operations.find((candidate) => candidate === value)
  if (operation === undefined) failValidation()
  return operation
}

function readResourceKind(value: unknown): ResourceKind | undefined {
  if (value === undefined) return undefined
  const resourceKind = resourceKinds.find((candidate) => candidate === value)
  if (resourceKind === undefined) failValidation()
  return resourceKind
}

function readCorrelationId(value: unknown): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.length !== 36 || !CORRELATION_ID.test(value)) {
    failValidation()
  }
  return value
}

function readSegment(segment: unknown, context: NuvemshopErrorContext): string {
  if (typeof segment !== 'string') failValidation(context)
  if (RESOURCE_SEGMENT.test(segment)) return segment
  if (readDecimalId(segment) === segment) return segment
  if (readUlid(segment) === segment) return segment
  failValidation(context)
}

function readSegments(value: unknown, context: NuvemshopErrorContext): readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SEGMENTS) {
    failValidation(context)
  }
  return value.map((segment) => readSegment(segment, context))
}

function readBody(
  method: Method,
  body: unknown,
  context: NuvemshopErrorContext,
): string | undefined {
  if (body === undefined) return undefined
  if (method === 'GET' || method === 'HEAD' || method === 'DELETE') failValidation(context)
  if (typeof body !== 'object' || body === null) failValidation(context)
  let encoded: string
  try {
    encoded = JSON.stringify(body)
  } catch {
    failValidation(context)
  }
  if (encoded.length === 0 || encoded.length > MAX_RESPONSE_CHARS) failValidation(context)
  return encoded
}

function readSignal(value: unknown, context: NuvemshopErrorContext): AbortSignal | undefined {
  if (value === undefined) return undefined
  if (!(value instanceof AbortSignal)) failValidation(context)
  return value
}

/** Validates caller input before configuration is read and before any fetch. */
export function prepareNuvemshopAttempt(input: NuvemshopRequestInput): PreparedNuvemshopAttempt {
  if (typeof input !== 'object' || input === null) failValidation()
  const method = readMethod(input.method)
  const operation = readOperation(input.operation)
  const resourceKind = readResourceKind(input.resourceKind)
  const correlationId = readCorrelationId(input.correlationId)
  const context: AttemptContext = {
    operation,
    method,
    ...(resourceKind === undefined ? {} : { resourceKind }),
    ...(correlationId === undefined ? {} : { correlationId }),
  }
  return {
    method,
    segments: readSegments(input.segments, context),
    body: readBody(method, input.body, context),
    signal: readSignal(input.signal, context),
    context,
  }
}

function assertTransportSecret(accessToken: string): void {
  if (
    accessToken.length === 0 ||
    accessToken.length > MAX_TOKEN_LENGTH ||
    /[^\u0021-\u007E]/.test(accessToken)
  ) {
    throw new NuvemshopConfigurationError({ operation: 'configuration' })
  }
}

function fixedUrl(storeId: string, segments: readonly string[], context: AttemptContext): URL {
  if (
    storeId.length === 0 ||
    storeId.length > MAX_STORE_ID_LENGTH ||
    /[^0-9]/.test(storeId) ||
    !/[1-9]/.test(storeId)
  ) {
    throw new NuvemshopConfigurationError({ operation: 'configuration' })
  }
  const path = segments.map((segment) => encodeURIComponent(segment)).join('/')
  let url: URL
  try {
    url = new URL(`${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/${storeId}/${path}`)
  } catch {
    failValidation(context)
  }
  const pathname = `/${NUVEMSHOP_API_VERSION}/${storeId}/${path}`
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'api.nuvemshop.com.br' ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    url.hash !== '' ||
    url.search !== '' ||
    url.pathname !== pathname
  ) {
    failValidation(context)
  }
  return url
}

function headerCount(value: string | null): number | undefined {
  if (value === null || !/^(?:0|[1-9]\d{0,15})$/.test(value)) return undefined
  let parsed = 0
  for (let index = 0; index < value.length; index += 1) {
    parsed = parsed * 10 + value.charCodeAt(index) - 48
  }
  if (!Number.isSafeInteger(parsed) || parsed < 0) return undefined
  return parsed
}

function rateLimitMetadata(
  headers: Headers,
): Pick<NuvemshopErrorContext, 'rateLimitLimit' | 'rateLimitRemaining' | 'resetMs'> {
  const limit = headerCount(headers.get('x-rate-limit-limit'))
  const remaining = headerCount(headers.get('x-rate-limit-remaining'))
  const resetMs = headerCount(headers.get('x-rate-limit-reset'))
  return {
    ...(limit !== undefined && limit > 0 && remaining !== undefined && remaining <= limit
      ? { rateLimitLimit: limit, rateLimitRemaining: remaining }
      : {}),
    ...(resetMs === undefined ? {} : { resetMs }),
  }
}

function failureForStatus(status: number, base: AttemptContext, headers: Headers): never {
  const context = { ...base, providerStatus: status }
  switch (status) {
    case 401:
      throw new NuvemshopAuthenticationError(context)
    case 402:
      throw new NuvemshopAccountSuspendedError(context)
    case 403:
      throw new NuvemshopAuthorizationError(context)
    case 404:
      throw new NuvemshopNotFoundError(context)
    case 429:
      throw new NuvemshopRateLimitError({ ...context, ...rateLimitMetadata(headers) })
    default:
      if (status >= 500 && status <= 599) throw new NuvemshopProviderError(context)
      throw new NuvemshopProtocolError(context)
  }
}

function responseLeftTarget(response: Response, expected: URL): boolean {
  if (response.url === '') return false
  try {
    const actual = new URL(response.url)
    return (
      actual.origin !== expected.origin ||
      actual.pathname !== expected.pathname ||
      actual.search !== ''
    )
  } catch {
    return true
  }
}

async function discard(response: Response): Promise<void> {
  try {
    await response.body?.cancel()
  } catch {
    // Untrusted bytes stay out of errors and logs.
  }
}

function acceptableLength(value: string): boolean {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) return false
  const digits = value.replace(/^0+/, '') || '0'
  const cap = String(MAX_RESPONSE_CHARS)
  if (digits.length !== cap.length) return digits.length < cap.length
  return digits <= cap
}

async function readBounded(response: Response, context: NuvemshopErrorContext): Promise<string> {
  const declared = response.headers.get('content-length')
  if (declared !== null && !acceptableLength(declared)) {
    await discard(response)
    throw new NuvemshopProtocolError(context)
  }
  const raw = await response.text()
  if (raw.length > MAX_RESPONSE_CHARS) throw new NuvemshopProtocolError(context)
  return raw
}

function isJsonContentType(value: string | null): boolean {
  return value?.split(';')[0]?.trim().toLowerCase() === 'application/json'
}

function expectsJson(method: Method, status: number): boolean {
  return method !== 'HEAD' && status !== 204
}

async function readSuccess(
  response: Response,
  expected: URL,
  attempt: PreparedNuvemshopAttempt,
): Promise<NuvemshopRequestSuccess> {
  const context = { ...attempt.context, providerStatus: response.status }
  if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status <= 399)) {
    await discard(response)
    throw new NuvemshopProtocolError(context)
  }
  if (responseLeftTarget(response, expected)) {
    await discard(response)
    throw new NuvemshopProtocolError(context)
  }
  if (!successStatuses[attempt.method].includes(response.status)) {
    await discard(response)
    failureForStatus(response.status, attempt.context, response.headers)
  }
  const rawBody = await readBounded(response, context)
  if (expectsJson(attempt.method, response.status)) {
    if (!isJsonContentType(response.headers.get('content-type'))) {
      throw new NuvemshopProtocolError(context)
    }
    try {
      decodeLosslessJson(rawBody)
    } catch {
      throw new NuvemshopProtocolError(context)
    }
  } else if (rawBody.length !== 0) {
    throw new NuvemshopProtocolError(context)
  }
  return { status: response.status, rawBody }
}

function bindAttempt(caller: AbortSignal | undefined): {
  signal: AbortSignal
  dispose: () => void
} {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), NUVEMSHOP_ATTEMPT_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  if (caller?.aborted) controller.abort()
  else caller?.addEventListener('abort', onAbort, { once: true })
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer)
      caller?.removeEventListener('abort', onAbort)
    },
  }
}

/**
 * One HTTPS attempt to the fixed API. No retry, no redirect follow, no caller URL.
 */
export async function performNuvemshopAttempt(
  attempt: PreparedNuvemshopAttempt,
  config: { readonly storeId: string; readonly accessToken: string },
): Promise<NuvemshopRequestSuccess> {
  const segments = readSegments(attempt.segments, attempt.context)
  assertTransportSecret(config.accessToken)
  const url = fixedUrl(config.storeId, segments, attempt.context)
  if (attempt.signal?.aborted) throw new NuvemshopNetworkError(attempt.context)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.accessToken}`,
    'User-Agent': NUVEMSHOP_USER_AGENT,
    Accept: 'application/json',
  }
  if (attempt.body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8'

  const attemptControl = bindAttempt(attempt.signal)
  try {
    if (attemptControl.signal.aborted) throw new NuvemshopNetworkError(attempt.context)
    const response = await fetch(url.toString(), {
      method: attempt.method,
      headers,
      body: attempt.body,
      redirect: 'manual',
      cache: 'no-store',
      credentials: 'omit',
      signal: attemptControl.signal,
    })
    return await readSuccess(response, url, attempt)
  } catch (error) {
    if (isTransportFailure(error)) throw error
    throw new NuvemshopNetworkError(attempt.context)
  } finally {
    attemptControl.dispose()
  }
}
