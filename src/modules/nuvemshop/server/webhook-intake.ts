import 'server-only'

import { randomUUID } from 'node:crypto'

import { problem } from '@/lib/http'

import type { CommittedIntake, IntakeInput } from './durability'
import { NuvemshopWebhookError } from './errors'
import { classifyNuvemshopWebhook } from './webhook-schema'

const ACK_BUDGET_MS = 3000

type Ledger = { persist(input: IntakeInput): Promise<CommittedIntake> }

/** Route-specific deadline also bounds an incomplete body stream. */
export async function handleNuvemshopIntake(
  request: Request,
  getLedger: () => Ledger,
): Promise<Response> {
  const controller = new AbortController()
  const started = performance.now()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<Response>((resolve) => {
    timer = setTimeout(() => {
      controller.abort()
      resolve(problem(503, 'Webhook temporarily unavailable'))
    }, ACK_BUDGET_MS)
  })
  const operation = (async (): Promise<Response> => {
    try {
      if (request.bodyUsed || !request.body || request.body.locked) {
        return problem(400, 'Invalid webhook')
      }
      // Request transfers the original stream without decoding or changing its bytes.
      const boundedRequest = new Request(request, {
        signal: AbortSignal.any([request.signal, controller.signal]),
      })
      const signature = boundedRequest.headers.get('x-linkedstore-hmac-sha256')
      const webhook = await classifyNuvemshopWebhook(
        boundedRequest,
        signature === null ? [] : [signature],
      )
      if (
        controller.signal.aborted ||
        request.signal.aborted ||
        performance.now() - started >= ACK_BUDGET_MS
      ) {
        return problem(503, 'Webhook temporarily unavailable')
      }
      // No unknown policy is configured: eligibility alone is never authorization.
      if ('classification' in webhook) return problem(400, 'Invalid webhook')
      await getLedger().persist({ attemptId: randomUUID(), webhook })
      if (
        controller.signal.aborted ||
        request.signal.aborted ||
        performance.now() - started >= ACK_BUDGET_MS
      ) {
        return problem(503, 'Webhook temporarily unavailable')
      }
      return new Response(null, { status: 204 })
    } catch (error) {
      if (controller.signal.aborted) return problem(503, 'Webhook temporarily unavailable')
      if (error instanceof NuvemshopWebhookError) return problem(400, 'Invalid webhook')
      return problem(500, 'Webhook unavailable')
    }
  })()
  try {
    return await Promise.race([operation, timeout])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
