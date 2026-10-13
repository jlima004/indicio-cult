import 'server-only'

import { getNuvemshopApiConfig } from '@/lib/env/nuvemshop'

import { NuvemshopConfigurationError } from './errors'
import {
  NUVEMSHOP_API_VERSION,
  prepareNuvemshopAttempt,
  type NuvemshopRequestInput,
  type NuvemshopRequestSuccess,
} from './request'
import { executeNuvemshopRequest, nuvemshopMonotonicNow } from './rate-budget'

export {
  NUVEMSHOP_API_ORIGIN,
  NUVEMSHOP_API_VERSION,
  NUVEMSHOP_ATTEMPT_TIMEOUT_MS,
  NUVEMSHOP_USER_AGENT,
} from './request'

export type { NuvemshopRequestInput, NuvemshopRequestSuccess } from './request'

function readTransportConfig(): { storeId: string; accessToken: string } {
  let config: ReturnType<typeof getNuvemshopApiConfig>
  try {
    config = getNuvemshopApiConfig()
  } catch {
    throw new NuvemshopConfigurationError({ operation: 'configuration' })
  }
  if (config.apiVersion !== NUVEMSHOP_API_VERSION) {
    throw new NuvemshopConfigurationError({ operation: 'configuration' })
  }
  return Object.freeze({ storeId: config.storeId, accessToken: config.accessToken })
}

/**
 * Authenticated, process-budgeted request. Resource modules own response schemas.
 * The caller cannot supply a URL, host, version or store id.
 */
export async function nuvemshopRequest(
  input: NuvemshopRequestInput,
): Promise<NuvemshopRequestSuccess> {
  const enteredAt = nuvemshopMonotonicNow()
  const prepared = prepareNuvemshopAttempt(input)
  const attempt =
    prepared.context.correlationId === undefined
      ? Object.freeze({
          ...prepared,
          context: Object.freeze({ ...prepared.context, correlationId: crypto.randomUUID() }),
        })
      : prepared
  return executeNuvemshopRequest(attempt, readTransportConfig(), enteredAt)
}
