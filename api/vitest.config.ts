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
      reporter: ['text', 'lcov'],
      include: ['_lib/**/*.ts', '_agents/**/*.ts', '*.ts'],
      exclude: ['__tests__/**', 'vitest.config.ts'],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
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
