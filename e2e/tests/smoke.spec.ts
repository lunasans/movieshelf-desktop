import { test, expect } from '../fixtures/app'

test('App startet und zeigt Dashboard', async ({ page }) => {
  await expect(page).toHaveURL(/#\/(movies|dashboard|onboarding)?$/)
})

test('Sidebar ist vorhanden', async ({ page }) => {
  const sidebar = page.locator('nav, aside, [class*="sidebar"]').first()
  await expect(sidebar).toBeVisible()
})

test('Titel-Leiste ist vorhanden', async ({ page }) => {
  // data-testid statt Klassenname: die TitleBar traegt reine Utility-Klassen,
  // ein Treffer auf [class*="titlebar"] war nie moeglich.
  await expect(page.getByTestId('titlebar')).toBeVisible()
})
