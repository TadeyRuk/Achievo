/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Keypair } from '@stellar/stellar-sdk'
import { createHash } from 'node:crypto'

vi.mock('../_server/infrastructure/store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/store')>()),
  claimOnce: vi.fn().mockResolvedValue(true),
  StoreUnavailableError: class StoreUnavailableError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'StoreUnavailableError'
    }
  },
}))

vi.mock('../_server/infrastructure/stellar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/stellar')>()),
  horizonServer: {
    loadAccount: vi.fn().mockRejectedValue(new Error('not funded')),
  },
  rpcServer: {},
  issueChallenge: vi.fn(async (_wallet: string, hash: string) => ({
    nonce: 'ab'.repeat(16),
    expiry: Date.now() + 60_000,
    mac: 'cd'.repeat(32),
    intentHash: hash.toLowerCase(),
    challengeXdr: 'AAAA',
  })),
}))

import handler from '../nonce'
import { claimOnce } from '../_server/infrastructure/store'

interface MockResponse {
  statusCode: number
  body: unknown
  status(code: number): MockResponse
  json(payload: unknown): MockResponse
}

function makeRes(): MockResponse {
  return {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
}

function testKeypair(fill: number) {
  const seed = new Uint8Array(32)
  seed.fill(fill)
  return Keypair.fromRawEd25519Seed(seed)
}

describe('/api/nonce', () => {
  const wallet = testKeypair(7).publicKey()
  const intentHash = createHash('sha256').update('tutored peers in math').digest('hex')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(claimOnce).mockResolvedValue(true)
    process.env.NONCE_HMAC_SECRET = 'test-nonce-secret'
    delete process.env.VERCEL_ENV
  })

  it('rejects missing intentHash', async () => {
    const res = makeRes()
    await handler(
      { method: 'GET', query: { wallet }, headers: {}, socket: { remoteAddress: '1.1.1.1' } } as never,
      res as never,
    )
    expect(res.statusCode).toBe(400)
  })

  it('rejects invalid wallet', async () => {
    const res = makeRes()
    await handler(
      {
        method: 'GET',
        query: { wallet: 'not-a-key', intentHash },
        headers: {},
        socket: { remoteAddress: '1.1.1.1' },
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(400)
  })

  it('issues a challenge when intentHash is valid', async () => {
    const res = makeRes()
    await handler(
      {
        method: 'GET',
        query: { wallet, intentHash },
        headers: { 'x-forwarded-for': '9.9.9.9' },
        socket: { remoteAddress: '9.9.9.9' },
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(200)
    const body = res.body as { nonce: string; mac: string; challengeXdr: string; intentHash: string }
    expect(body.nonce).toMatch(/^[a-f0-9]{32}$/)
    expect(body.mac).toMatch(/^[a-f0-9]{64}$/)
    expect(body.challengeXdr).toBeTruthy()
    expect(body.intentHash).toBe(intentHash)
  })

  it('returns 429 when IP rate limit hits', async () => {
    vi.mocked(claimOnce).mockResolvedValue(false)
    const res = makeRes()
    await handler(
      {
        method: 'GET',
        query: { wallet, intentHash },
        headers: { 'x-forwarded-for': '8.8.8.8' },
        socket: { remoteAddress: '8.8.8.8' },
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(429)
  })
})
