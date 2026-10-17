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
import {
  claimNuvemshopAttempt,
  inspectNuvemshopLease,
  nuvemshopMonotonicNow,
  observeNuvemshopResponse,
  rememberNuvemshopAttemptFailure,
  settleNuvemshopLease,
  wakeNuvemshopAdmission,
} from './rate-budget'

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

/** Bytes consumed from an external response. Not a UTF-16 length. */
const MAX_RESPONSE_BYTES = 1_048_576
/** Decoded code units, also the request-body ceiling. Matches the lossless decoder. */
const MAX_RESPONSE_CHARS = 1_048_576
const MAX_STORE_ID_LENGTH = 256
const MAX_TOKEN_LENGTH = 4_096
const MAX_SEGMENTS = 8
// Category owns this closed minimum; callers cannot select fields or a mode.
// https://nuvemshop.dev/en-US/api/resources/2025-03/category
const CATEGORY_LIST_FIELDS = 'id,name,handle,parent,visibility'
const ENCODED_CATEGORY_LIST_FIELDS = CATEGORY_LIST_FIELDS.replaceAll(',', '%2C')
const CORRELATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

// Closed path grammar from the official 2025-03 resource docs. Methods remain
// transport policy; new paths require documented roles and regression tests.
// https://tiendanube.github.io/api-documentation/resources/{resource}
const routeTemplates = [
  ['products'],
  ['products', ':decimal-id'],
  ['products', ':decimal-id', 'variants'],
  ['products', ':decimal-id', 'variants', ':decimal-id'],
  ['categories'],
  ['categories', ':decimal-id'],
  ['orders'],
  ['orders', ':decimal-id'],
  ['orders', ':decimal-id', 'fulfillment-orders'],
  ['orders', ':decimal-id', 'fulfillment-orders', ':ulid'],
  ['store'],
  ['webhooks'],
  ['webhooks', ':decimal-id'],
  // Order NF-e uses owner_id in a future query, never as another path segment.
  ['metafields', 'orders'],
] as const

type RoutePart = (typeof routeTemplates)[number][number]

const methods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
const operations = ['read', 'lookup'] as const
const resourceKinds = ['product', 'variant', 'category', 'order', 'store', 'webhook'] as const

export type NuvemshopMethod = (typeof methods)[number]
export type NuvemshopOperation = (typeof operations)[number]
export type NuvemshopResourceKind = (typeof resourceKinds)[number]
export type NuvemshopDecimalId = string
export type NuvemshopUlid = string
export type NuvemshopRoute =
  | readonly ['products']
  | readonly ['products', NuvemshopDecimalId]
  | readonly ['products', NuvemshopDecimalId, 'variants']
  | readonly ['products', NuvemshopDecimalId, 'variants', NuvemshopDecimalId]
  | readonly ['categories']
  | readonly ['categories', NuvemshopDecimalId]
  | readonly ['orders']
  | readonly ['orders', NuvemshopDecimalId]
  | readonly ['orders', NuvemshopDecimalId, 'fulfillment-orders']
  | readonly ['orders', NuvemshopDecimalId, 'fulfillment-orders', NuvemshopUlid]
  | readonly ['store']
  | readonly ['webhooks']
  | readonly ['webhooks', NuvemshopDecimalId]
  | readonly ['metafields', 'orders']

type Method = NuvemshopMethod
type Operation = NuvemshopOperation
type ResourceKind = NuvemshopResourceKind

const successStatuses: Record<Method, readonly number[]> = {
  GET: [200],
  HEAD: [200],
  POST: [200, 201],
  PUT: [200, 201],
  PATCH: [200, 201],
  DELETE: [200, 204],
}

const transportFailures = [
  NuvemshopConfigurationError,
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

export interface NuvemshopPaginationQuery {
  readonly page?: number
  readonly perPage?: number
}

export interface NuvemshopPagePosition {
  readonly page: number
  readonly perPage: number
}

export interface NuvemshopRequestInput {
  readonly method: Method
  /** Supported path under `/{version}/{store_id}`; each template fixes ID domains. */
  readonly segments: readonly string[]
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly operation?: Operation
  readonly resourceKind?: ResourceKind
  readonly correlationId?: string
  readonly query?: NuvemshopPaginationQuery
  readonly readGeneration?: number
}

export interface NuvemshopRequestSuccess {
  readonly status: number
  readonly rawBody: string
  readonly metadata: NuvemshopResponseMetadata
}

export interface NuvemshopAttemptContext {
  readonly operation: Operation
  readonly method: Method
  readonly resourceKind?: ResourceKind
  readonly correlationId?: string
}

type AttemptContext = NuvemshopAttemptContext

export interface PreparedNuvemshopAttempt {
  readonly method: Method
  readonly segments: NuvemshopRoute
  readonly body?: string
  readonly signal?: AbortSignal
  readonly context: AttemptContext
  readonly pagination: NuvemshopPagePosition | null
  readonly readGeneration: number
}

export type NuvemshopHeaderField<T> =
  | { readonly kind: 'absent' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'valid'; readonly value: T }

export interface NuvemshopRateLimitMetadata {
  readonly limit: NuvemshopHeaderField<number>
  readonly remaining: NuvemshopHeaderField<number>
  readonly resetMs: NuvemshopHeaderField<number>
}

export type NuvemshopLinkRelation = 'next' | 'prev' | 'first' | 'last'
export type NuvemshopListProjection = 'category-minimum-v1'
export interface NuvemshopLinkTarget {
  readonly relation: NuvemshopLinkRelation
  readonly origin: 'https://api.nuvemshop.com.br'
  readonly apiVersion: '2025-03'
  readonly storeId: string
  readonly segments: NuvemshopRoute
  readonly pagination: NuvemshopPagePosition
  readonly projection?: NuvemshopListProjection
}
export interface NuvemshopPaginationHeaders {
  readonly totalCount: NuvemshopHeaderField<number>
  readonly links: NuvemshopHeaderField<readonly NuvemshopLinkTarget[]>
}
export interface NuvemshopRequestIdentity {
  readonly origin: 'https://api.nuvemshop.com.br'
  readonly apiVersion: '2025-03'
  readonly storeId: string
  readonly method: NuvemshopMethod
  readonly segments: NuvemshopRoute
  readonly pagination: NuvemshopPagePosition | null
  readonly projection?: NuvemshopListProjection
}
export interface NuvemshopResponseMetadata {
  readonly request: NuvemshopRequestIdentity
  readonly rateLimit: NuvemshopRateLimitMetadata
  readonly pagination: NuvemshopPaginationHeaders
}

declare const nuvemshopLeaseBrand: unique symbol
export interface NuvemshopAttemptLease {
  readonly [nuvemshopLeaseBrand]: true
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

function matchesRoutePart(segment: string, part: RoutePart): boolean {
  if (part === ':decimal-id') return readDecimalId(segment) === segment
  if (part === ':ulid') return readUlid(segment) === segment
  return segment === part
}

function readSegments(value: unknown, context: NuvemshopErrorContext): NuvemshopRoute {
  if (!Array.isArray(value)) failValidation(context)
  const length: unknown = value.length
  if (
    typeof length !== 'number' ||
    !Number.isInteger(length) ||
    length < 1 ||
    length > MAX_SEGMENTS
  ) {
    failValidation(context)
  }
  // Keep caller methods, species and proxies out of the prepared path.
  const segments: string[] = []
  for (let index = 0; index < length; index += 1) {
    const segment: unknown = value[index]
    if (typeof segment !== 'string') failValidation(context)
    segments.push(segment)
  }
  const supported = routeTemplates.some(
    (template) =>
      template.length === segments.length &&
      template.every((part, index) => {
        const segment = segments[index]
        return segment !== undefined && matchesRoutePart(segment, part)
      }),
  )
  if (!supported) {
    failValidation(context)
  }
  return Object.freeze(segments) as NuvemshopRoute
}

function isPageCollection(method: Method, segments: NuvemshopRoute): boolean {
  return (
    (method === 'GET' || method === 'HEAD') &&
    ((segments.length === 1 &&
      ['products', 'categories', 'orders', 'webhooks'].includes(segments[0])) ||
      (segments.length === 3 && segments[0] === 'products' && segments[2] === 'variants'))
  )
}

/** Pure route policy: already part of NUV-05's coalescing identity. */
export function nuvemshopListProjection(
  method: Method,
  segments: readonly string[],
): NuvemshopListProjection | undefined {
  return method === 'GET' && segments.length === 1 && segments[0] === 'categories'
    ? 'category-minimum-v1'
    : undefined
}

function readPagination(
  value: unknown,
  method: Method,
  segments: NuvemshopRoute,
  context: AttemptContext,
): NuvemshopPagePosition | null {
  if (value === undefined) return null
  if (typeof value !== 'object' || value === null || Array.isArray(value)) failValidation(context)
  const prototype: unknown = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) failValidation(context)
  const keys = Reflect.ownKeys(value)
  if (keys.length > 2 || keys.some((key) => key !== 'page' && key !== 'perPage'))
    failValidation(context)
  if (!isPageCollection(method, segments)) failValidation(context)
  const query = value as NuvemshopPaginationQuery
  for (const key of ['page', 'perPage'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (keys.includes(key) !== (descriptor !== undefined)) failValidation(context)
    if (descriptor === undefined && key in query) failValidation(context)
  }
  const pageValue = query.page
  const perPageValue = query.perPage
  if (
    (!keys.includes('page') && pageValue !== undefined) ||
    (!keys.includes('perPage') && perPageValue !== undefined)
  )
    failValidation(context)
  const page = pageValue === undefined ? 1 : pageValue
  const perPage = perPageValue === undefined ? 30 : perPageValue
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(perPage) ||
    perPage < 1 ||
    perPage > 200
  ) {
    failValidation(context)
  }
  return Object.freeze({ page, perPage })
}

function readGenerationValue(value: unknown, method: Method, context: AttemptContext): number {
  if (value === undefined) return 0
  if (
    (method !== 'GET' && method !== 'HEAD') ||
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    failValidation(context)
  }
  return value
}

function readBody(
  method: Method,
  body: unknown,
  context: NuvemshopErrorContext,
): string | undefined {
  if (body === undefined) return undefined
  if (method === 'GET' || method === 'HEAD' || method === 'DELETE') failValidation(context)
  if (typeof body !== 'object' || body === null) failValidation(context)
  let encoded: unknown
  try {
    encoded = JSON.stringify(body)
  } catch {
    failValidation(context)
  }
  if (typeof encoded !== 'string' || encoded.length === 0 || encoded.length > MAX_RESPONSE_CHARS) {
    failValidation(context)
  }
  return encoded
}

function readSignal(value: unknown, context: NuvemshopErrorContext): AbortSignal | undefined {
  if (value === undefined) return undefined
  if (!(value instanceof AbortSignal)) failValidation(context)
  const aborted = Object.getOwnPropertyDescriptor(AbortSignal.prototype, 'aborted')?.get?.call(
    value,
  )
  if (typeof aborted !== 'boolean') failValidation(context)
  // Check the native brand, then stop retaining caller accessors for later reads.
  return AbortSignal.any([value])
}

/** Validates caller input before configuration is read and before any fetch. */
export function prepareNuvemshopAttempt(input: NuvemshopRequestInput): PreparedNuvemshopAttempt {
  let context: AttemptContext | undefined
  try {
    if (typeof input !== 'object' || input === null) failValidation()
    const method = readMethod(input.method)
    const operation = readOperation(input.operation)
    const resourceKind = readResourceKind(input.resourceKind)
    const correlationId = readCorrelationId(input.correlationId)
    context = Object.freeze({
      operation,
      method,
      ...(resourceKind === undefined ? {} : { resourceKind }),
      ...(correlationId === undefined ? {} : { correlationId }),
    })
    const segments = readSegments(input.segments, context)
    const pagination = readPagination(input.query, method, segments, context)
    const readGeneration = readGenerationValue(input.readGeneration, method, context)
    return Object.freeze({
      method,
      segments,
      body: readBody(method, input.body, context),
      signal: readSignal(input.signal, context),
      context,
      pagination,
      readGeneration,
    })
  } catch {
    // Never inspect or rethrow a caller-controlled exception, even an Error subclass.
    failValidation(context)
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

function fixedUrl(
  storeId: string,
  segments: readonly string[],
  context: AttemptContext,
  pagination: NuvemshopPagePosition | null,
): URL {
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
  const query =
    pagination === null ? [] : [`page=${pagination.page}`, `per_page=${pagination.perPage}`]
  if (nuvemshopListProjection(context.method, segments) !== undefined)
    query.push(`fields=${CATEGORY_LIST_FIELDS}`)
  const search = query.length === 0 ? '' : `?${query.join('&')}`
  url.search = search
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'api.nuvemshop.com.br' ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    url.hash !== '' ||
    url.search !== search ||
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
    // Subtract on the bounded digit before adding; an intermediate char-code
    // addition near MAX_SAFE_INTEGER would round an otherwise valid scalar.
    parsed = parsed * 10 + (value.charCodeAt(index) - 48)
  }
  if (!Number.isSafeInteger(parsed) || parsed < 0) return undefined
  return parsed
}

function absent<T>(): NuvemshopHeaderField<T> {
  return Object.freeze({ kind: 'absent' })
}

function invalid<T>(): NuvemshopHeaderField<T> {
  return Object.freeze({ kind: 'invalid' })
}

function valid<T>(value: T): NuvemshopHeaderField<T> {
  return Object.freeze({ kind: 'valid', value })
}

function scalarHeader(value: string | null): NuvemshopHeaderField<number> {
  if (value === null) return absent()
  const parsed = headerCount(value)
  return parsed === undefined ? invalid() : valid(parsed)
}

function parseRateLimit(headers: Headers): NuvemshopRateLimitMetadata {
  let limit = scalarHeader(headers.get('x-rate-limit-limit'))
  let remaining = scalarHeader(headers.get('x-rate-limit-remaining'))
  const resetMs = scalarHeader(headers.get('x-rate-limit-reset'))
  if (limit.kind === 'valid' && limit.value === 0) limit = invalid()
  if (remaining.kind === 'valid') {
    if (limit.kind !== 'valid') remaining = invalid()
    else if (remaining.value > limit.value) {
      limit = invalid()
      remaining = invalid()
    }
  }
  return Object.freeze({ limit, remaining, resetMs })
}

function publicRateMetadata(
  rate: NuvemshopRateLimitMetadata,
): Pick<NuvemshopErrorContext, 'rateLimitLimit' | 'rateLimitRemaining' | 'resetMs'> {
  return {
    ...(rate.limit.kind === 'valid' && rate.remaining.kind === 'valid'
      ? { rateLimitLimit: rate.limit.value, rateLimitRemaining: rate.remaining.value }
      : {}),
    ...(rate.resetMs.kind === 'valid' ? { resetMs: rate.resetMs.value } : {}),
  }
}

/** Split relation entries outside URI targets, which can contain field commas. */
function linkEntries(value: string): string[] | undefined {
  const entries: string[] = []
  let start = 0
  let insideTarget = false
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (char === '<') {
      if (insideTarget) return undefined
      insideTarget = true
    } else if (char === '>') {
      if (!insideTarget) return undefined
      insideTarget = false
    } else if (char === ',' && !insideTarget) {
      entries.push(value.slice(start, index))
      if (entries.length >= 4) return undefined
      start = index + 1
    }
  }
  if (insideTarget) return undefined
  entries.push(value.slice(start))
  return entries
}

/** Lexical projection only. NUV-06 owns request/link navigation equality. */
function parseLinks(
  value: string | null,
  projection: NuvemshopListProjection | undefined,
): NuvemshopHeaderField<readonly NuvemshopLinkTarget[]> {
  if (value === null) return absent()
  if (value.length > 8192 || /[\u0000-\u0008\u000A-\u001F\u007F-\uFFFF]/.test(value))
    return invalid()
  const entries = linkEntries(value)
  if (entries === undefined) return invalid()
  const targets: NuvemshopLinkTarget[] = []
  const seen = new Set<string>()
  try {
    for (const entry of entries) {
      const match = /^[ \t]*<([^<>\s]+)>[ \t]*;[ \t]*rel="(next|prev|first|last)"[ \t]*$/.exec(
        entry,
      )
      if (!match) return invalid()
      const uri = match[1]!
      const relation = match[2]! as NuvemshopLinkRelation
      if (
        uri.length > 1536 ||
        seen.has(relation) ||
        !uri.startsWith(`${NUVEMSHOP_API_ORIGIN}/${NUVEMSHOP_API_VERSION}/`) ||
        /[\\#]/.test(uri)
      )
        return invalid()
      seen.add(relation)
      const parts = uri.split('?')
      if (parts.length !== 2) return invalid()
      const url = new URL(uri)
      const rawPath = parts[0]!.slice(NUVEMSHOP_API_ORIGIN.length)
      if (
        rawPath.includes('%') ||
        url.origin !== NUVEMSHOP_API_ORIGIN ||
        url.pathname !== rawPath ||
        url.username !== '' ||
        url.password !== '' ||
        url.port !== '' ||
        url.hash !== ''
      )
        return invalid()
      const path = rawPath.split('/')
      const storeId = path[2]!
      if (
        storeId.length === 0 ||
        storeId.length > MAX_STORE_ID_LENGTH ||
        /[^0-9]/.test(storeId) ||
        !/[1-9]/.test(storeId)
      )
        return invalid()
      const segments = readSegments(path.slice(3), {})
      const fields = parts[1]!.split('&')
      if (fields.length !== (projection === undefined ? 2 : 3)) return invalid()
      let page: number | undefined
      let perPage: number | undefined
      let hasProjection = false
      for (const field of fields) {
        const pair = field.split('=')
        if (pair.length !== 2) return invalid()
        if (pair[0] === 'fields') {
          // Admit two exact whole-value spellings, never general percent decoding.
          if (
            projection === undefined ||
            hasProjection ||
            (pair[1] !== CATEGORY_LIST_FIELDS && pair[1] !== ENCODED_CATEGORY_LIST_FIELDS)
          )
            return invalid()
          hasProjection = true
          continue
        }
        const number = headerCount(pair[1]!)
        if (number === undefined || number < 1) return invalid()
        if (pair[0] === 'page' && page === undefined) page = number
        else if (pair[0] === 'per_page' && perPage === undefined && number <= 200) perPage = number
        else return invalid()
      }
      if (page === undefined || perPage === undefined) return invalid()
      if (
        projection !== undefined &&
        (!hasProjection || nuvemshopListProjection('GET', segments) !== projection)
      )
        return invalid()
      targets.push(
        Object.freeze({
          relation,
          origin: NUVEMSHOP_API_ORIGIN,
          apiVersion: NUVEMSHOP_API_VERSION,
          storeId,
          segments,
          pagination: Object.freeze({ page, perPage }),
          ...(projection === undefined ? {} : { projection }),
        }),
      )
    }
    return valid(Object.freeze(targets))
  } catch {
    return invalid()
  }
}

function responseMetadata(
  headers: Headers,
  expected: URL,
  attempt: PreparedNuvemshopAttempt,
): NuvemshopResponseMetadata {
  const projection = nuvemshopListProjection(attempt.method, attempt.segments)
  return Object.freeze({
    request: Object.freeze({
      origin: NUVEMSHOP_API_ORIGIN,
      apiVersion: NUVEMSHOP_API_VERSION,
      storeId: expected.pathname.split('/')[2]!,
      method: attempt.method,
      segments: Object.freeze([...attempt.segments]) as NuvemshopRoute,
      pagination: attempt.pagination === null ? null : Object.freeze({ ...attempt.pagination }),
      ...(projection === undefined ? {} : { projection }),
    }),
    rateLimit: parseRateLimit(headers),
    pagination: Object.freeze({
      totalCount: scalarHeader(headers.get('x-total-count')),
      links: parseLinks(headers.get('link'), projection),
    }),
  })
}

function errorForStatus(
  status: number,
  base: AttemptContext,
  rate: NuvemshopRateLimitMetadata,
): Error {
  const context = { ...base, providerStatus: status }
  switch (status) {
    case 401:
      return new NuvemshopAuthenticationError(context)
    case 402:
      return new NuvemshopAccountSuspendedError(context)
    case 403:
      return new NuvemshopAuthorizationError(context)
    case 404:
      return new NuvemshopNotFoundError(context)
    case 429:
      return new NuvemshopRateLimitError({ ...context, ...publicRateMetadata(rate) })
    default:
      if (status >= 500 && status <= 599) return new NuvemshopProviderError(context)
      return new NuvemshopProtocolError(context)
  }
}

function responseLeftTarget(response: Response, expected: URL): boolean {
  if (response.url === '') return false
  try {
    const actual = new URL(response.url)
    return (
      actual.origin !== expected.origin ||
      actual.pathname !== expected.pathname ||
      actual.search !== expected.search ||
      actual.hash !== '' ||
      actual.username !== '' ||
      actual.password !== ''
    )
  } catch {
    return true
  }
}

function isCanonicalLength(value: string): boolean {
  return /^(?:0|[1-9]\d*)$/.test(value)
}

function acceptableLength(value: string): boolean {
  const cap = String(MAX_RESPONSE_BYTES)
  if (value.length !== cap.length) return value.length < cap.length
  return value <= cap
}

function abortReason(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

/**
 * Stops a body without waiting forever and without letting cancel failure escape.
 * An already-aborted attempt returns immediately so cleanup cannot extend the timeout.
 */
async function cancelSource(
  source: { cancel: (reason?: unknown) => Promise<void> },
  signal: AbortSignal,
): Promise<void> {
  try {
    const finished = source.cancel().then(
      () => undefined,
      () => undefined,
    )
    if (signal.aborted) return
    await new Promise<void>((resolve) => {
      const onAbort = () => resolve()
      signal.addEventListener('abort', onAbort, { once: true })
      void finished.then(() => {
        signal.removeEventListener('abort', onAbort)
        resolve()
      })
    })
  } catch {
    // A secondary cancel failure must not replace the primary error.
  }
}

async function discard(response: Response, signal: AbortSignal): Promise<void> {
  if (response.body == null) return
  await cancelSource(response.body, signal)
}

function decodeUtf8(
  decoder: TextDecoder,
  context: NuvemshopErrorContext,
  chunk?: Uint8Array,
): string {
  try {
    return chunk === undefined ? decoder.decode() : decoder.decode(chunk, { stream: true })
  } catch (error) {
    if (error instanceof TypeError) throw new NuvemshopProtocolError(context)
    throw error
  }
}

async function readBounded(
  response: Response,
  method: Method,
  context: NuvemshopErrorContext,
  signal: AbortSignal,
  lease?: NuvemshopAttemptLease,
): Promise<string> {
  const declared = response.headers.get('content-length')
  // HEAD declares the corresponding GET representation's size, not received bytes.
  if (
    declared !== null &&
    (!isCanonicalLength(declared) || (method !== 'HEAD' && !acceptableLength(declared)))
  ) {
    const error = new NuvemshopProtocolError(context)
    if (lease !== undefined) rememberNuvemshopAttemptFailure(lease, error)
    await discard(response, signal)
    throw error
  }

  if (response.body == null) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const parts: string[] = []
  let receivedBytes = 0
  let receivedChars = 0
  let canceling: Promise<void> | undefined
  const stop = () => {
    canceling ??= reader.cancel().then(
      () => undefined,
      () => undefined,
    )
  }
  if (signal.aborted) stop()
  else signal.addEventListener('abort', stop, { once: true })

  try {
    if (signal.aborted) throw abortReason()
    return await new Promise<string>((resolve, reject) => {
      let settled = false
      const fail = (error: unknown) => {
        if (settled) return
        settled = true
        stop()
        reject(error)
      }
      const succeed = (value: string) => {
        if (settled) return
        settled = true
        resolve(value)
      }
      // Stay on read()'s reaction. Awaiting inside the async function lets the
      // stream refill one more chunk before cancel can run.
      const pump = () => {
        reader.read().then((result) => {
          if (settled) return
          try {
            if (signal.aborted) {
              fail(abortReason())
              return
            }
            if (result.done) {
              const flushed = decodeUtf8(decoder, context)
              receivedChars += flushed.length
              if (receivedChars > MAX_RESPONSE_CHARS) {
                fail(new NuvemshopProtocolError(context))
                return
              }
              if (flushed.length > 0) parts.push(flushed)
              succeed(parts.join(''))
              return
            }
            const value = result.value
            if (value.byteLength === 0) {
              pump()
              return
            }
            if (method === 'HEAD' || receivedBytes + value.byteLength > MAX_RESPONSE_BYTES) {
              fail(new NuvemshopProtocolError(context))
              return
            }
            receivedBytes += value.byteLength
            const decoded = decodeUtf8(decoder, context, value)
            receivedChars += decoded.length
            if (receivedChars > MAX_RESPONSE_CHARS) {
              fail(new NuvemshopProtocolError(context))
              return
            }
            if (decoded.length > 0) parts.push(decoded)
            pump()
          } catch (error) {
            fail(error)
          }
        }, fail)
      }
      pump()
    })
  } catch (error) {
    if (lease !== undefined && error instanceof NuvemshopProtocolError)
      rememberNuvemshopAttemptFailure(lease, error)
    stop()
    await cancelSource({ cancel: () => canceling ?? Promise.resolve() }, signal)
    if (signal.aborted && !(error instanceof NuvemshopProtocolError)) throw abortReason()
    throw error
  } finally {
    signal.removeEventListener('abort', stop)
  }
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
  signal: AbortSignal,
  lease?: NuvemshopAttemptLease,
): Promise<NuvemshopRequestSuccess> {
  const context = { ...attempt.context, providerStatus: response.status }
  if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status <= 399)) {
    const error = new NuvemshopProtocolError(context)
    if (lease !== undefined) rememberNuvemshopAttemptFailure(lease, error)
    await discard(response, signal)
    throw error
  }
  if (responseLeftTarget(response, expected)) {
    const error = new NuvemshopProtocolError(context)
    if (lease !== undefined) rememberNuvemshopAttemptFailure(lease, error)
    await discard(response, signal)
    throw error
  }
  const metadata = responseMetadata(response.headers, expected, attempt)
  if (lease !== undefined) observeNuvemshopResponse(lease, response.status, metadata.rateLimit)
  if (!successStatuses[attempt.method].includes(response.status)) {
    const error = errorForStatus(response.status, attempt.context, metadata.rateLimit)
    if (lease !== undefined) rememberNuvemshopAttemptFailure(lease, error)
    await discard(response, signal)
    throw error
  }
  const rawBody = await readBounded(response, attempt.method, context, signal, lease)
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
  return Object.freeze({ status: response.status, rawBody, metadata })
}

function bindAttempt(
  caller: AbortSignal | undefined,
  deadline?: number,
): {
  signal: AbortSignal
  expired: () => boolean
  dispose: () => void
} {
  const controller = new AbortController()
  const startedAt = nuvemshopMonotonicNow()
  const expiresAt = Math.min(startedAt + NUVEMSHOP_ATTEMPT_TIMEOUT_MS, deadline ?? Infinity)
  const timer = setTimeout(() => controller.abort(), Math.max(0, expiresAt - startedAt))
  const onAbort = () => controller.abort()
  if (caller?.aborted) controller.abort()
  else caller?.addEventListener('abort', onAbort, { once: true })
  return {
    signal: controller.signal,
    expired: () => controller.signal.aborted || nuvemshopMonotonicNow() >= expiresAt,
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
  lease?: NuvemshopAttemptLease,
): Promise<NuvemshopRequestSuccess> {
  const execution = lease === undefined ? undefined : inspectNuvemshopLease(lease, attempt, config)
  const attemptControl = bindAttempt(attempt.signal, execution?.deadline)
  let errorCode: string | undefined
  try {
    const segments = readSegments(attempt.segments, attempt.context)
    assertTransportSecret(config.accessToken)
    const url = fixedUrl(config.storeId, segments, attempt.context, attempt.pagination)
    if (attemptControl.expired()) throw new NuvemshopNetworkError(attempt.context)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.accessToken}`,
      'User-Agent': NUVEMSHOP_USER_AGENT,
      Accept: 'application/json',
    }
    if (attempt.body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8'
    const init: RequestInit = {
      method: attempt.method,
      headers,
      body: attempt.body,
      redirect: 'manual',
      cache: 'no-store',
      credentials: 'omit',
      signal: attemptControl.signal,
    }
    const target = url.toString()
    let pendingResponse: Promise<Response>
    if (lease === undefined) pendingResponse = fetch(target, init)
    else {
      claimNuvemshopAttempt(lease, attempt, config, init)
      // All caller-controlled preparation is finished before the claim. There
      // is no await or callback between the shared fence and this invocation.
      try {
        pendingResponse = fetch(target, init)
      } finally {
        wakeNuvemshopAdmission(lease)
      }
    }
    const response = await pendingResponse
    const result = await readSuccess(response, url, attempt, attemptControl.signal, lease)
    // Synchronous decoding/validation can delay timer callbacks. Check only
    // otherwise-successful work so classified HTTP/protocol errors stay primary.
    if (attemptControl.expired()) throw new NuvemshopNetworkError(attempt.context)
    return result
  } catch (error) {
    if (isTransportFailure(error)) {
      errorCode = (error as NuvemshopNetworkError).code
      throw error
    }
    errorCode = 'NUVEMSHOP_NETWORK_ERROR'
    throw new NuvemshopNetworkError(attempt.context)
  } finally {
    attemptControl.dispose()
    if (lease !== undefined) settleNuvemshopLease(lease, errorCode)
  }
}
