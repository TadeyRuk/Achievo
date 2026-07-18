/// <reference types="vitest/config" />
import path from 'node:path'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function swCacheHashPlugin(): Plugin {
  const buildHash = createHash('sha256')
    .update(String(Date.now()))
    .digest('hex')
    .slice(0, 12)

  return {
    name: 'sw-cache-hash',
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(__dirname, 'dist')
      const swPath = path.join(outDir, 'sw.js')
      if (!existsSync(swPath)) return
      const src = readFileSync(swPath, 'utf8')
      writeFileSync(swPath, src.replaceAll('__BUILD_HASH__', buildHash), 'utf8')
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swCacheHashPlugin()],
  resolve: {
    alias: {
      '@achievo/contracts': path.resolve(__dirname, '../packages/contracts/src/index.ts'),
      '@achievo/sdk': path.resolve(__dirname, '../packages/sdk/src/index.ts'),
      '@achievo/shared': path.resolve(__dirname, '../packages/shared/src/index.ts'),
      '@achievo/stellar': path.resolve(__dirname, '../packages/stellar/src/index.ts'),
      '@achievo/identity': path.resolve(__dirname, '../packages/identity/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    server: {
      deps: {
        inline: [
          '@creit.tech/stellar-wallets-kit',
          '@stellar/freighter-api',
          '@achievo/contracts',
          '@achievo/sdk',
          '@achievo/shared',
          '@achievo/stellar',
          '@achievo/identity',
        ],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary', 'json'],
      // Floors set just under current coverage (statements 69%, branches 65%,
      // functions 63%, lines 71%) so this is a ratchet against regression,
      // not an unmet aspiration — raise these as coverage grows.
      thresholds: {
        statements: 65,
        branches: 60,
        functions: 55,
        lines: 65,
      },
    },
  },
})
