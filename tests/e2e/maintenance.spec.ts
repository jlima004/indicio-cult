import { expect, test } from '@playwright/test'

const maintenanceUrl = 'http://127.0.0.1:3001'

test('maintenance serves 503 while liveness stays available', async ({ page, request }) => {
  const response = await page.goto(maintenanceUrl)

  expect(response?.status()).toBe(503)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'O arquivo está em ajuste. Voltamos em breve.',
  )

  const live = await request.get(`${maintenanceUrl}/api/live`)
  expect(live.status()).toBe(200)
  expect(live.headers()['cache-control']).toBe('no-store')
  expect(await live.json()).toEqual({ status: 'live' })
})
