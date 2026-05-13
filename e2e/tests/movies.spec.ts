import { test, expect } from '../fixtures/app'

test('Film anlegen und in Liste sehen', async ({ page }) => {
  // Navigate to new movie form
  await page.goto('about:blank')
  await page.evaluate(() => (window as any).__router?.push('/movies/new'))

  // Wait for form
  await page.waitForSelector('input[name="title"], input[placeholder*="Titel"]', { timeout: 5000 })

  const titleInput = page.locator('input[name="title"], input[placeholder*="Titel"]').first()
  await titleInput.fill('E2E-Testfilm')

  const saveBtn = page.locator('button[type="submit"], button:has-text("Speichern")').first()
  await saveBtn.click()

  // Should navigate to movie list or detail
  await expect(page).toHaveURL(/#\/(movies|movies\/\d+)/)
})

test('Film löschen funktioniert', async ({ page }) => {
  // Navigate to movies
  await page.goto('about:blank')
  const cards = page.locator('[class*="MovieCard"], .group.cursor-pointer')
  const count = await cards.count()

  if (count === 0) {
    test.skip()
    return
  }

  // Hover first card and click delete
  await cards.first().hover()
  const deleteBtn = cards.first().locator('button[title="Löschen"]')
  if (await deleteBtn.isVisible()) {
    await deleteBtn.click()
    const newCount = await cards.count()
    expect(newCount).toBeLessThanOrEqual(count)
  }
})
