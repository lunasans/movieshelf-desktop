import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout:  30_000,
  retries:  process.env.CI ? 1 : 0,
  // Die App haelt einen Single-Instance-Lock (main.ts): eine zweite Instanz
  // beendet sich sofort selbst. Parallele Worker koennen also nicht laufen.
  workers:  1,
  use: {
    headless: !!process.env.CI,
  },
  reporter: process.env.CI ? 'github' : 'list',
})
