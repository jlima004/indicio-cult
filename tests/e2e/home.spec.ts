import { expect, test } from '@playwright/test'

test('home shows the wordmark and one visible heading', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('img', { name: 'Indicio Cult' })).toBeVisible()
  const headings = page.getByRole('heading', { level: 1 })
  await expect(headings).toHaveCount(1)
  await expect(headings).toBeVisible()
})
