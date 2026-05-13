import { test, expect } from '../fixtures/app'

test('Random-Picker-Button öffnet Modal', async ({ page }) => {
  // Navigate to movies view
  await page.waitForSelector('button[title="Zufälligen Film wählen"]', { timeout: 10000 })

  const btn = page.locator('button[title="Zufälligen Film wählen"]')
  await btn.click()

  // Modal should appear (contains dice icon or "Zufälliger Film" heading)
  const modal = page.locator('text=Zufälliger Film, text=Keine Filme').first()
  await expect(modal).toBeVisible({ timeout: 3000 })
})

test('Random-Picker Modal schließt mit X', async ({ page }) => {
  await page.waitForSelector('button[title="Zufälligen Film wählen"]', { timeout: 10000 })
  await page.locator('button[title="Zufälligen Film wählen"]').click()

  const closeBtn = page.locator('button:has(.bi-x-lg)').first()
  await closeBtn.click()

  await expect(page.locator('text=Zufälliger Film')).toBeHidden()
})
