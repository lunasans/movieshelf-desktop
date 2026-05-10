import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['electron/handlers/__tests__/**/*.test.ts'],
    setupFiles: ['electron/handlers/__tests__/setup.ts'],
  },
})
