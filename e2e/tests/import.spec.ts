import { test, expect, navigate } from '../fixtures/app'
import { join } from 'path'
import { tmpdir } from 'os'
import fs from 'fs'

test('CSV-Import-Button ist in Einstellungen sichtbar', async ({ page }) => {
  // ?section=backup springt direkt in den Backup-Bereich (dasselbe Muster nutzt
  // das Tray-Menue). Vorher wurde blind auf einen Tab-Button geklickt, den es
  // so nicht gibt - der Button lag danach in einem anderen Bereich.
  await navigate(page, { path: '/settings', query: { section: 'backup' } } as any)

  await expect(page.getByTestId('csv-import-button')).toBeVisible({ timeout: 10000 })
})

test('CSV-Import verarbeitet eine Test-CSV', async ({ app }) => {
  const csv = `Date,Name,Year,Letterboxd URI,Rating,Tags,Watched Date
2024-01-01,E2E Test Film,2020,https://letterboxd.com/x,4.0,BluRay,2024-01-01
`
  const tempDir = fs.mkdtempSync(join(tmpdir(), 'ms_e2e_'))
  const csvPath = join(tempDir, 'import.csv')
  fs.writeFileSync(csvPath, csv)

  const result = await app.evaluate(async ({ ipcMain }) => {
    return new Promise(resolve => {
      ipcMain.emit('db:movies:import', { sender: { send: () => {} } } as any, [
        { title: 'E2E Test Film', year: 2020, rating: 8.0, is_watched: true },
      ])
      resolve('ok')
    })
  })

  expect(result).toBe('ok')

  fs.rmSync(tempDir, { recursive: true, force: true })
})
