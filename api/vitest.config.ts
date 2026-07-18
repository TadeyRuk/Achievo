import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: __dirname,
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary', 'json'],
      include: ['_lib/**/*.ts', '_agents/**/*.ts', '*.ts'],
      exclude: ['__tests__/**', 'vitest.config.ts'],
      // Raised from the original 50/50/40 floor now that Phase 0's store/http/
      // health/payout tests pushed real coverage to ~63%/61%/53% — set just
      // under that so this stays a ratchet, not a hard pin on today's exact number.
      thresholds: {
        lines: 60,
        functions: 58,
        branches: 50,
      },
    },
  },


  resolve: {
    alias: {
      '@achievo/shared': path.resolve(__dirname, '../packages/shared/src/index.ts'),
      '@achievo/stellar': path.resolve(__dirname, '../packages/stellar/src/index.ts'),
      '@achievo/identity': path.resolve(__dirname, '../packages/identity/src/index.ts'),
    },
  },
})
