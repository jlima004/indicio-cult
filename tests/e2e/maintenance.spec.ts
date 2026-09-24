import { expect, test } from '@playwright/test'

const maintenanceUrl = 'http://127.0.0.1:3001'

test('maintenance serves 503 while health stays available', async ({ page, request }) => {
  const response = await page.goto(maintenanceUrl)

  expect(response?.status()).toBe(503)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'O arquivo está em ajuste. Voltamos em breve.',
  )

  const health = await request.get(`${maintenanceUrl}/api/health`)
  expect(health.status()).toBe(200)
})
