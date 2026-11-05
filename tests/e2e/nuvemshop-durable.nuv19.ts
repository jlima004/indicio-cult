import { createHmac, randomBytes } from 'node:crypto'

import { expect, test } from '@playwright/test'
import { Pool } from 'pg'

const socket = process.env.NUV19_TEST_SOCKET
if (!socket || !/^\/tmp\/nuv19-pg-[A-Za-z0-9_-]+\/socket$/.test(socket)) {
  throw new Error('NUV19_TEST_SOCKET must identify the isolated local PostgreSQL fixture')
}

for (const [mode, origin] of [
  ['normal', 'http://127.0.0.1:3000'],
  ['maintenance', 'http://127.0.0.1:3001'],
] as const) {
  test(`${mode}: committed business duplicates and lifecycle work survive the HTTP ACK`, async ({
    request,
  }) => {
    const pool = new Pool({ host: socket, port: 5432, database: 'nuv19_test', user: 'jlima' })
    // String IDs avoid precision loss and let this run independently of other tests.
    const id = BigInt(`0x${randomBytes(12).toString('hex')}`).toString()
    const post = async (event: string) => {
      const body = JSON.stringify({ event, store_id: '9', id, unused: 'discard-me' })
      const signature = createHmac('sha256', 'nuv19-local-http-secret').update(body).digest('hex')
      const started = performance.now()
      const response = await request.post(`${origin}/api/webhooks/nuvemshop/events`, {
        data: body,
        headers: { 'content-type': 'application/json', 'x-linkedstore-hmac-sha256': signature },
        maxRedirects: 0,
      })
      const elapsedMs = performance.now() - started
      expect(response.status()).toBe(204)
      expect(elapsedMs).toBeLessThan(3000)
      console.info(
        'NUV19_HTTP_ACK',
        JSON.stringify({ mode, event, elapsedMs: +elapsedMs.toFixed(2) }),
      )
    }

    try {
      await post('product/updated')
      await post('product/updated')
      await post('app/uninstalled')

      const result = await pool.query(
        `SELECT r.attempt_id, r.family, r.classification, r.projection, w.state, w.receipt_id
         FROM nuvemshop_intake.receipts r
         JOIN nuvemshop_intake.work w ON w.receipt_id = r.attempt_id
         WHERE r.projection->>'resourceId' = $1 OR r.projection->>'appId' = $1`,
        [id],
      )
      expect(result.rows).toHaveLength(3)
      expect(new Set(result.rows.map((row) => row.attempt_id)).size).toBe(3)
      for (const row of result.rows) {
        expect(row.classification).toBe('received')
        expect(row.state).toBe('received')
        expect(row.receipt_id).toBe(row.attempt_id)
        const isBusiness = row.family === 'business'
        expect(row.family).toBe(isBusiness ? 'business' : 'lifecycle')
        expect(row.projection).toEqual({
          event: isBusiness ? 'product/updated' : 'app/uninstalled',
          storeId: '9',
          correlationId: expect.any(String),
          ...(isBusiness ? { resourceId: id } : { appId: id }),
        })
      }
      expect(result.rows.filter((row) => row.family === 'business')).toHaveLength(2)
      expect(result.rows.filter((row) => row.family === 'lifecycle')).toHaveLength(1)
    } finally {
      await pool.end()
    }
  })
}
