import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { getNuvemshopHmacConfig } from '@/lib/env/nuvemshop'

import { NuvemshopWebhookError } from './errors'

const MAX_BODY_BYTES = 1_048_576

function readSignature(values: readonly string[]): Buffer {
  const value = values[0]
  if (
    values.length !== 1 ||
    typeof value !== 'string' ||
    value.length !== 64 ||
    !/^[0-9a-fA-F]{64}$/.test(value)
  ) {
    throw new NuvemshopWebhookError()
  }
  return Buffer.from(value, 'hex')
}

async function readBody(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<Uint8Array> {
  // Fixed storage also bounds metadata when producers send tiny or empty chunks.
  const bytes = new Uint8Array(MAX_BODY_BYTES)
  let length = 0
  try {
    while (true) {
      if (signal.aborted) throw new NuvemshopWebhookError()
      const { done, value } = await reader.read()
      if (signal.aborted) throw new NuvemshopWebhookError()
      if (done) return bytes.subarray(0, length)
      if (!(value instanceof Uint8Array)) throw new NuvemshopWebhookError()
      // Read the native view length, even when a subclass shadows byteLength.
      const chunkLength = Reflect.get(Uint8Array.prototype, 'byteLength', value) as number
      if (chunkLength > MAX_BODY_BYTES - length) {
        throw new NuvemshopWebhookError()
      }
      // Copy the view before the next read can reuse its backing memory.
      bytes.set(value, length)
      length += chunkLength
    }
  } catch {
    throw new NuvemshopWebhookError()
  }
}

/** Authenticates original bytes only; the caller must preserve signature multiplicity. */
export async function verifyNuvemshopWebhook(
  request: Request,
  signatureValues: readonly string[],
): Promise<Uint8Array> {
  const body = request.body
  if (request.bodyUsed || !body || body.locked) throw new NuvemshopWebhookError()

  let reader: ReadableStreamDefaultReader<Uint8Array>
  try {
    reader = body.getReader()
  } catch {
    throw new NuvemshopWebhookError()
  }

  let cancelled = false
  const cancel = () => {
    if (cancelled) return
    cancelled = true
    try {
      // Cancellation closes pending reads immediately; producer cleanup may never settle.
      void reader.cancel().catch(() => {})
    } catch {
      // Cleanup must neither leak an upstream error nor replace the safe failure.
    }
  }
  const signal = request.signal
  signal.addEventListener('abort', cancel, { once: true })
  let verified = false
  try {
    if (signal.aborted) throw new NuvemshopWebhookError()
    const receivedDigest = readSignature(signatureValues)
    // Preserve the existing safe configuration failure contract and lazy access.
    const { clientSecret } = getNuvemshopHmacConfig()
    const bytes = await readBody(reader, signal)
    if (signal.aborted) throw new NuvemshopWebhookError()
    const expectedDigest = createHmac('sha256', clientSecret).update(bytes).digest()
    if (!timingSafeEqual(expectedDigest, receivedDigest)) throw new NuvemshopWebhookError()
    verified = true
    return bytes
  } finally {
    signal.removeEventListener('abort', cancel)
    if (!verified) cancel()
    reader.releaseLock()
  }
}
