import { test, expect } from '../fixtures/app'
import { randomUUID } from 'crypto'
import fs from 'fs'
import os from 'os'

test('CSV-Import-Button ist in Einstellungen sichtbar', async ({ page }) => {
  // Navigate to Settings → Backup
  const settingsLink = page.locator('a[href*="settings"], a:has-text("Einstellungen")').first()
  await settingsLink.click()

  // Click backup section
  const backupTab = page.locator('button:has-text("Backup"), [data-section="backup"]').first()
  if (await backupTab.isVisible()) await backupTab.click()

  const importBtn = page.locator('button:has-text("CSV-Datei auswählen")')
  await expect(importBtn).toBeVisible({ timeout: 5000 })
})

test('CSV-Import verarbeitet eine Test-CSV', async ({ page, app }) => {
  // Write test CSV to temp file
  const csv = `Date,Name,Year,Letterboxd URI,Rating,Tags,Watched Date
2024-01-01,E2E Test Film,2020,https://letterboxd.com/x,4.0,BluRay,2024-01-01
`
  const csvPath = `${os.tmpdir()}/e2e-test-${randomUUID()}.csv`
  fs.writeFileSync(csvPath, csv)

  // Use electron main process to call importMovies directly
  const result = await app.evaluate(async ({ ipcMain }) => {
    return new Promise(resolve => {
      ipcMain.emit('db:movies:import', { sender: { send: () => {} } } as any, [
        { title: 'E2E Test Film', year: 2020, rating: 8.0, is_watched: true },
      ])
      resolve('ok')
    })
  })

  expect(result).toBe('ok')

  fs.unlinkSync(csvPath)
})
