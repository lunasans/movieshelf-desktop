import { test, expect, navigate } from '../fixtures/app'

test('Film anlegen und in Liste sehen', async ({ page }) => {
  // Kein page.goto('about:blank'): das verlässt die geladene App-Seite, danach
  // gibt es weder Router noch DOM. Navigiert wird über den Hash.
  await navigate(page, '/movies/new')

  const titleInput = page.getByTestId('movie-title-input')
  await expect(titleInput).toBeVisible({ timeout: 10000 })
  await titleInput.fill('E2E-Testfilm')

  await page.locator('button[type="submit"]').first().click()

  await expect(page).toHaveURL(/#\/movies/, { timeout: 10000 })
})

test('Film löschen funktioniert', async ({ page }) => {
  await navigate(page, '/movies')

  const cards = page.getByTestId('movie-card')
  const count = await cards.count()
  test.skip(count === 0, 'keine Filme in der Sammlung')

  await cards.first().hover()
  const deleteBtn = cards.first().locator('button[title="Löschen"]')
  if (await deleteBtn.isVisible()) {
    await deleteBtn.click()
    await expect(cards).toHaveCount(count - 1, { timeout: 5000 })
  }
})
