import { test as base } from '@playwright/test'
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers'
import { ElectronApplication, Page, _electron as electron } from 'playwright'
import path from 'path'

type AppFixtures = {
  app: ElectronApplication
  page: Page
}

export const test = base.extend<AppFixtures>({
  app: async ({}, use) => {
    const latestBuild = findLatestBuild('release')
    const appInfo = parseElectronApp(latestBuild)

    const electronApp = await electron.launch({
      args: [appInfo.main],
      executablePath: appInfo.executable,
      env: { ...process.env, NODE_ENV: 'test' },
    })

    await use(electronApp)
    await electronApp.close()
  },

  page: async ({ app }, use) => {
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    // Ein frisches Profil ist standalone, ohne TMDb-Key und leer - der Guard in
    // router/index.ts leitet dann jede Route auf /onboarding um, weshalb keine
    // Zielansicht je erreichbar war. Wie ein Nutzer, der das hinter sich hat.
    await page.evaluate(() => localStorage.setItem('onboarding_done', '1'))
    await use(page)
  },
})

export { expect } from '@playwright/test'

export function electronAppPath() {
  return path.join(process.cwd(), 'release')
}

/**
 * Navigation im Renderer ueber den Vue-Router (in main.ts als window.__router
 * hinterlegt). page.goto() wuerde die App-Seite verlassen, und location.hash
 * direkt zu setzen reisst unter file:// die Seite weg.
 */
export async function navigate(page: Page, path: string | { path: string; query?: Record<string, string> }) {
  await page.waitForFunction(() => Boolean((window as any).__router), undefined, { timeout: 15000 })
  await page.evaluate((target) => (window as any).__router.push(target), path)
  // Vue braucht einen Tick, bis die Zielansicht im DOM steht.
  await page.waitForTimeout(500)
}
