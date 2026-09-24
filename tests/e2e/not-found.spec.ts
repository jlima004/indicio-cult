import { expect, test } from '@playwright/test'

test('unknown route renders the exact branded 404 copy', async ({ page }) => {
  const response = await page.goto('/rota-inexistente-t12')

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Esse rastro não leva a lugar nenhum.',
  )
})
