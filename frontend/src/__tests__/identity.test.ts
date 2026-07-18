/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { identityIdFromWallet, redactWallet } from '@achievo/identity'

vi.mock('../../../api/_lib/store', () => {
  const mem = new Map<string, unknown>()
  return {
    getJson: vi.fn(async (key: string) => mem.get(key) ?? null),
    setJson: vi.fn(async (key: string, value: unknown) => {
      mem.set(key, value)
    }),
    StoreUnavailableError: class StoreUnavailableError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'StoreUnavailableError'
      }
    },
  }
})

import {
  bindIdentity,
  issueSessionToken,
  verifySessionToken,
  getIdentityByWallet,
} from '../../../api/_lib/identity'

describe('@achievo/identity helpers', () => {
  it('redacts wallets and builds stable ids', () => {
    const wallet = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV'
    expect(redactWallet(wallet)).toMatch(/^GABC…/)
    expect(identityIdFromWallet(wallet)).toMatch(/^id_/)
  })
})

describe('identity bind + session', () => {
  const wallet = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NONCE_HMAC_SECRET = 'identity-test-secret'
  })

  it('binds once and reuses the same identity', async () => {
    const a = await bindIdentity(wallet, { displayName: 'Ada' })
    const b = await bindIdentity(wallet)
    expect(a.id).toBe(b.id)
    expect(a.displayNameHash).toBeTruthy()
    const loaded = await getIdentityByWallet(wallet)
    expect(loaded?.id).toBe(a.id)
  })

  it('issues and verifies session tokens; rejects wallet mismatch', () => {
    const identity = {
      id: 'id_test',
      walletPublicKey: wallet,
      createdAt: new Date().toISOString(),
    }
    const { token } = issueSessionToken(identity)
    expect(verifySessionToken(token, wallet).ok).toBe(true)
    expect(verifySessionToken(token, 'GOTHER').ok).toBe(false)
  })
})
