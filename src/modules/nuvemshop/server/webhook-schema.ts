import 'server-only'

import { randomUUID } from 'node:crypto'

import { getNuvemshopWebhookConfig } from '@/lib/env/nuvemshop'

import { NuvemshopWebhookError } from './errors'
import { readDecimalId } from './schemas/ids'
import { decodeObject } from './schemas/lossless-json'
import { verifyNuvemshopWebhook } from './webhook-auth'

export type BusinessTopic = 'product/updated' | 'order/paid' | 'order/fulfilled' | 'order/cancelled'

export type VerifiedWebhookEvent =
  | { event: 'product/updated'; storeId: string; resourceId: string; correlationId: string }
  | { event: 'order/paid'; storeId: string; resourceId: string; correlationId: string }
  | { event: 'order/fulfilled'; storeId: string; resourceId: string; correlationId: string }
  | { event: 'order/cancelled'; storeId: string; resourceId: string; correlationId: string }
  | { event: 'app/uninstalled'; storeId: string; appId: string; correlationId: string }
  | { event: 'app/suspended' | 'app/resumed'; storeId: string; correlationId: string }

/** Eligibility only; a durable receipt and HTTP response belong to NUV-16/19. */
export interface UnknownWebhookIgnoreEligibility {
  classification: 'unknown_ignore_eligible'
  event: string
  storeId: string
  correlationId: string
}

export interface WebhookClassificationOptions {
  /** Trusted, synchronous, side-effect-free server policy; never derive from client input. */
  unknownEventPolicy?: (event: string) => boolean
}

// Exact official names and distinct local contract names, without alias inference.
const privacyTopics = new Set([
  'app/store_redact',
  'customer/redact',
  'customers/data_request',
  'store/redact',
  'customers/redact',
])

function requiredDecimalId(value: unknown): string {
  const id = readDecimalId(value)
  if (id === undefined) throw new NuvemshopWebhookError()
  return id
}

/** Authenticates original Request bytes before decoding or projecting any event. */
export async function classifyNuvemshopWebhook(
  request: Request,
  signatureValues: readonly string[],
  options?: WebhookClassificationOptions,
): Promise<VerifiedWebhookEvent | UnknownWebhookIgnoreEligibility> {
  try {
    // Native brand check also rejects objects forged with Request.prototype.
    Reflect.get(Request.prototype, 'bodyUsed', request)
    if (!Array.isArray(signatureValues)) throw new NuvemshopWebhookError()
  } catch {
    throw new NuvemshopWebhookError()
  }
  // Preserve the verifier's safe, lazy configuration failures and stream semantics.
  const bytes = await verifyNuvemshopWebhook(request, signatureValues)
  let envelope: Record<string, unknown>
  try {
    envelope = decodeObject(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new NuvemshopWebhookError()
  }
  const { storeId: configuredStoreId } = getNuvemshopWebhookConfig()
  const storeId = readDecimalId(envelope.store_id)
  if (storeId === undefined || storeId !== configuredStoreId.replace(/^0+/, '')) {
    throw new NuvemshopWebhookError()
  }
  const event = envelope.event
  // Local minimization policy for retained topics, not a provider format guarantee.
  if (
    typeof event !== 'string' ||
    event.length > 256 ||
    !/^[a-z][a-z0-9_]*\/[a-z][a-z0-9_]*$/.test(event) ||
    privacyTopics.has(event)
  ) {
    throw new NuvemshopWebhookError()
  }
  const correlationId = randomUUID()
  switch (event) {
    case 'product/updated':
      return { event, storeId, resourceId: requiredDecimalId(envelope.id), correlationId }
    case 'order/paid':
      return { event, storeId, resourceId: requiredDecimalId(envelope.id), correlationId }
    case 'order/fulfilled':
      return { event, storeId, resourceId: requiredDecimalId(envelope.id), correlationId }
    case 'order/cancelled':
      return { event, storeId, resourceId: requiredDecimalId(envelope.id), correlationId }
    case 'app/uninstalled':
      return { event, storeId, appId: requiredDecimalId(envelope.id), correlationId }
    case 'app/suspended':
    case 'app/resumed':
      return { event, storeId, correlationId }
    default:
      try {
        if (options?.unknownEventPolicy?.(event) === true) {
          return { classification: 'unknown_ignore_eligible', event, storeId, correlationId }
        }
      } catch {
        throw new NuvemshopWebhookError()
      }
      throw new NuvemshopWebhookError()
  }
}
