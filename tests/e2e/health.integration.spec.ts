import { expect, test } from '@playwright/test'

test('health reports a live Supabase connection', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.status).toBe('ok')
  expect(body.supabase).toBe('ok')
})

test('health reports a live Supabase connection during maintenance', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:3001/api/health')

  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.status).toBe('ok')
  expect(body.supabase).toBe('ok')
})
