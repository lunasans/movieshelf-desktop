import { test, expect } from '../fixtures/app'

test('App startet und zeigt Dashboard', async ({ page }) => {
  await expect(page).toHaveURL(/#\/(movies|dashboard|onboarding)/)
})

test('Sidebar ist vorhanden', async ({ page }) => {
  const sidebar = page.locator('nav, aside, [class*="sidebar"]').first()
  await expect(sidebar).toBeVisible()
})

test('Titel-Leiste ist vorhanden', async ({ page }) => {
  const titlebar = page.locator('[class*="titlebar"], [class*="TitleBar"]').first()
  await expect(titlebar).toBeVisible()
})
