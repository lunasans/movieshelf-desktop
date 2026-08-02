import { test, expect, navigate } from '../fixtures/app'

// Der Button sitzt in der Filmansicht. Die App startet auf dem Dashboard -
// ohne Navigation konnte er nie gefunden werden.

test('Random-Picker-Button öffnet Modal', async ({ page }) => {
  await navigate(page, '/movies')

  const btn = page.getByTestId('random-picker-button')
  await expect(btn).toBeVisible({ timeout: 10000 })
  await btn.click()

  // Je nach Datenlage zeigt das Modal einen Film oder den Leer-Hinweis -
  // geprueft wird deshalb das Modal selbst, nicht sein Text.
  const modal = page.locator('.fixed.inset-0').first()
  await expect(modal).toBeVisible({ timeout: 3000 })
})

test('Random-Picker Modal schließt mit X', async ({ page }) => {
  await navigate(page, '/movies')

  await page.getByTestId('random-picker-button').click()
  const modal = page.locator('.fixed.inset-0').first()
  await expect(modal).toBeVisible({ timeout: 3000 })

  await page.locator('button:has(.bi-x-lg)').first().click()
  await expect(modal).toBeHidden({ timeout: 3000 })
})
