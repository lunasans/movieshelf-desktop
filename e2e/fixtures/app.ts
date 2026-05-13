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
