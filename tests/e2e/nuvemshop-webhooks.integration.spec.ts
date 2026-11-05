import { createHmac } from 'node:crypto'
import { request as httpRequest } from 'node:http'

import { expect, test } from '@playwright/test'

const body = JSON.stringify({ event: 'order/paid', store_id: '9', id: 7 })
const signature = createHmac('sha256', 'nuv19-local-http-secret').update(body).digest('hex')
const eventsPath = '/api/webhooks/nuvemshop/events'
const privacyPaths = [
  '/api/webhooks/nuvemshop/store-redact',
  '/api/webhooks/nuvemshop/customers-redact',
  '/api/webhooks/nuvemshop/customers-data-request',
]

// An array sends two actual header fields over HTTP, rather than a pre-joined value.
function postWithDuplicateSignatures(
  origin: string,
): Promise<{ status: number | undefined; contentType: string | undefined }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      `${origin}${eventsPath}`,
      {
        method: 'POST',
        headers: [
          'Host',
          new URL(origin).host,
          'Content-Type',
          'application/json',
          'Content-Length',
          String(Buffer.byteLength(body)),
          'X-Linkedstore-Hmac-Sha256',
          signature,
          'X-Linkedstore-Hmac-Sha256',
          signature,
        ],
      },
      (res) => {
        res.resume()
        res.on('end', () =>
          resolve({ status: res.statusCode, contentType: res.headers['content-type'] }),
        )
      },
    )
    req.on('error', reject)
    req.end(body)
  })
}

for (const [mode, origin] of [
  ['normal', 'http://127.0.0.1:3000'],
  ['maintenance', 'http://127.0.0.1:3001'],
] as const) {
  test(`${mode}: webhook reaches authentication and fails closed without a ledger`, async ({
    request,
  }) => {
    const invalid = await request.post(`${origin}${eventsPath}`, {
      data: body,
      headers: { 'content-type': 'application/json', 'x-linkedstore-hmac-sha256': '0'.repeat(64) },
      maxRedirects: 0,
    })
    expect(invalid.status()).toBe(400)

    const valid = await request.post(`${origin}${eventsPath}`, {
      data: body,
      headers: { 'content-type': 'application/json', 'x-linkedstore-hmac-sha256': signature },
      maxRedirects: 0,
    })
    expect(valid.status()).toBeGreaterThanOrEqual(500)
    expect(valid.status()).toBeLessThan(600)

    expect(await postWithDuplicateSignatures(origin)).toEqual({
      status: 400,
      contentType: 'application/problem+json',
    })
  })

  test(`${mode}: privacy routes have no handler and operational routes reach their handlers`, async ({
    request,
  }) => {
    for (const path of privacyPaths) {
      const response = await request.post(`${origin}${path}`, { data: body, maxRedirects: 0 })
      expect(response.status()).toBe(404)
    }

    const live = await request.get(`${origin}/api/live`)
    expect(live.status()).toBe(200)
    expect(live.headers()['cache-control']).toBe('no-store')
    expect(await live.json()).toEqual({ status: 'live' })

    // With the synthetic, unreachable local Supabase configured for this run,
    // health returns its own degraded response instead of maintenance HTML.
    const health = await request.get(`${origin}/api/health`)
    expect(health.status()).toBe(503)
    expect(health.headers()['retry-after']).toBeUndefined()
    expect(await health.json()).toEqual({ status: 'degraded', supabase: 'error' })
  })
}

test('maintenance blocks webhook prefix and suffix variants', async ({ request }) => {
  for (const path of [
    '/api/webhooks',
    '/api/webhooks/nuvemshop',
    '/api/webhooks/nuvemshop/unknown',
    '/api/webhooks/other',
    '/api/webhooks/nuvemshop/events-extra',
    '/api/webhooks/nuvemshop/events/extra',
  ]) {
    const response = await request.post(`http://127.0.0.1:3001${path}`, { maxRedirects: 0 })
    expect(response.status()).toBe(503)
    expect(response.headers()['retry-after']).toBe('300')
  }
})
