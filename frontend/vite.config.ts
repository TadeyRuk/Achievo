/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    server: {
      deps: {
        // These wallet/SDK packages ship CommonJS entry points whose named
        // exports break Vitest's default externalization. Inlining lets Vite
        // transform them so transitive imports (e.g. contract.ts → wallet.ts)
        // resolve in the test environment.
        inline: [
          '@creit.tech/stellar-wallets-kit',
          '@stellar/freighter-api',
        ],
      },
    },
  },
})
