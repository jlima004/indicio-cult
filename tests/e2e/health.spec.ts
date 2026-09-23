import { expect, test } from '@playwright/test'

test('health reports a live Supabase connection', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.status).toBe('ok')
  expect(body.supabase).toBe('ok')
})
