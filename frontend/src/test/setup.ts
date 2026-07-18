// Vitest global test setup.
// Extends `expect` with @testing-library/jest-dom matchers (e.g. toBeInTheDocument)
// and cleans up the rendered DOM between tests.
import { webcrypto } from 'node:crypto'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// @stellar/stellar-sdk v15 Keypair.random() uses @noble/ed25519, which rejects
// seeds produced under jsdom's crypto. Prefer Node's Web Crypto implementation.
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: webcrypto,
})

afterEach(() => {
  cleanup()
})
