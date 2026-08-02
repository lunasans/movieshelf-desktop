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
    await use(page)
  },
})

export { expect } from '@playwright/test'

export function electronAppPath() {
  return path.join(process.cwd(), 'release')
}

/**
 * Navigation im Renderer. Die App laeuft unter file:// mit Hash-Routing -
 * page.goto() wuerde die geladene Seite verlassen und die App abschiessen,
 * deshalb nur den Hash setzen und auf das Ziel warten.
 */
export async function navigate(page: Page, hashPath: string) {
  await page.evaluate((target) => { window.location.hash = target }, `#${hashPath}`)
  await page.waitForFunction(
    (target) => window.location.hash.startsWith(`#${target.split('?')[0]}`),
    hashPath,
  )
  // Vue braucht einen Tick, bis die Zielansicht im DOM steht.
  await page.waitForTimeout(300)
}
