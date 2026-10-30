import 'server-only'

import type { UnknownWebhookIgnoreEligibility, VerifiedWebhookEvent } from '../webhook-schema'

import { NuvemshopIntakeError } from './errors'
import type { intakeRetentionPolicies } from './retention'

export interface IntakeEnvelope {
  family: 'business' | 'lifecycle' | 'unknown'
  contractVersion: 1
  retentionPolicyKey: keyof typeof intakeRetentionPolicies
  classification: 'received' | 'ignored_unknown_event'
  projection: {
    event: string
    storeId: string
    correlationId: string
    resourceId?: string
    appId?: string
  }
}

const decimal = /^[1-9][0-9]{0,39}$/
export const reference = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const privacy = new Set([
  'app/store_redact',
  'customer/redact',
  'customers/data_request',
  'store/redact',
  'customers/redact',
])

export function validateAttemptId(value: string): void {
  if (typeof value !== 'string' || !uuid.test(value)) {
    throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_INPUT_ERROR')
  }
}

/** Projects an already authenticated NUV-15 result; never accepts a raw payload. */
export function projectWebhook(
  webhook: VerifiedWebhookEvent | UnknownWebhookIgnoreEligibility,
): IntakeEnvelope {
  const { event, storeId, correlationId } = webhook
  if (
    typeof event !== 'string' ||
    event.length > 256 ||
    !/^[a-z][a-z0-9_]*\/[a-z][a-z0-9_]*$/.test(event) ||
    privacy.has(event) ||
    typeof storeId !== 'string' ||
    !decimal.test(storeId) ||
    typeof correlationId !== 'string' ||
    !reference.test(correlationId)
  ) {
    throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_INPUT_ERROR')
  }
  const projection: IntakeEnvelope['projection'] = { event, storeId, correlationId }
  let family: IntakeEnvelope['family']
  switch (event) {
    case 'product/updated':
    case 'order/paid':
    case 'order/fulfilled':
    case 'order/cancelled':
      if (
        !('resourceId' in webhook) ||
        typeof webhook.resourceId !== 'string' ||
        !decimal.test(webhook.resourceId)
      ) {
        throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_INPUT_ERROR')
      }
      projection.resourceId = webhook.resourceId
      family = 'business'
      break
    case 'app/uninstalled':
      if (
        !('appId' in webhook) ||
        typeof webhook.appId !== 'string' ||
        !decimal.test(webhook.appId)
      ) {
        throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_INPUT_ERROR')
      }
      projection.appId = webhook.appId
      family = 'lifecycle'
      break
    case 'app/suspended':
    case 'app/resumed':
      family = 'lifecycle'
      break
    default:
      if (!('classification' in webhook) || webhook.classification !== 'unknown_ignore_eligible') {
        throw new NuvemshopIntakeError('NUVEMSHOP_INTAKE_INPUT_ERROR')
      }
      family = 'unknown'
  }
  return {
    family,
    contractVersion: 1,
    retentionPolicyKey: `${family}-v1`,
    classification: family === 'unknown' ? 'ignored_unknown_event' : 'received',
    projection,
  }
}
