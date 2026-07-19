/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Keypair } from '@stellar/stellar-sdk'
import { createHash, createHmac } from 'node:crypto'

const claimOnce = vi.fn().mockResolvedValue(true)
const releaseClaim = vi.fn().mockResolvedValue(undefined)
const listRecent = vi.fn().mockResolvedValue([])
const addRecent = vi.fn().mockResolvedValue(undefined)
const appendPayout = vi.fn().mockResolvedValue(undefined)
const reserveBudget = vi.fn().mockResolvedValue(true)
const getIdentityByWallet = vi.fn().mockResolvedValue(null)
const bindIdentity = vi.fn().mockResolvedValue({
  id: 'id_test',
  walletPublicKey: 'GTEST',
  createdAt: '2026-01-01T00:00:00.000Z',
})
const issueSessionToken = vi.fn().mockReturnValue({ token: 'sess', expiresAt: Date.now() + 1000 })

vi.mock('../_server/infrastructure/store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/store')>()),
  claimOnce: (...args: unknown[]) => claimOnce(...args),
  releaseClaim: (...args: unknown[]) => releaseClaim(...args),
  listRecent: (...args: unknown[]) => listRecent(...args),
  addRecent: (...args: unknown[]) => addRecent(...args),
  appendPayout: (...args: unknown[]) => appendPayout(...args),
  reserveBudget: (...args: unknown[]) => reserveBudget(...args),
  StoreUnavailableError: class StoreUnavailableError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'StoreUnavailableError'
    }
  },
}))

vi.mock('../_server/infrastructure/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/identity')>()),
  getIdentityByWallet: (...args: unknown[]) => getIdentityByWallet(...args),
  bindIdentity: (...args: unknown[]) => bindIdentity(...args),
  issueSessionToken: (...args: unknown[]) => issueSessionToken(...args),
}))

vi.mock('../_server/infrastructure/stellar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/stellar')>()),
  horizonServer: {
    loadAccount: vi.fn().mockResolvedValue({
      accountId: 'GADMIN',
      sequenceNumber: () => '1',
    }),
  },
  rpcServer: {
    prepareTransaction: vi.fn().mockImplementation(async (tx: { sign?: unknown }) => ({
      ...tx,
      sign: vi.fn(),
    })),
    sendTransaction: vi.fn().mockResolvedValue({ status: 'ERROR', errorResult: { oops: true } }),
    getTransaction: vi.fn(),
  },
}))

vi.mock('../_server/infrastructure/evaluator', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/evaluator')>()),
  ScoringAgent: {
    evaluate: vi.fn(),
  },
}))

vi.mock('../_server/infrastructure/integrity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/integrity')>()),
  IntegrityAgent: {
    assess: vi.fn().mockReturnValue({ effortMultiplier: 1, flagged: false, reasons: [] }),
    fingerprint: vi.fn().mockReturnValue('fp'),
  },
}))

vi.mock('../_server/infrastructure/telegram', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/telegram')>()),
  notifyPayoutTelegram: vi.fn(),
  notifyOpsAlert: vi.fn(),
}))

import handler from '../reward'
import { ScoringAgent } from '../_server/infrastructure/evaluator'
import {
  TransactionBuilder,
  Networks,
  Operation,
  Account,
  BASE_FEE,
} from '@stellar/stellar-sdk'

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
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

function intentHash(text: string) {
  return createHash('sha256').update(text.trim()).digest('hex')
}

function testKeypair(fill: number) {
  const seed = new Uint8Array(32)
  seed.fill(fill)
  return Keypair.fromRawEd25519Seed(seed)
}

function buildSignedChallenge(walletKp: Keypair, nonce: string, expiry: number) {
  const account = new Account(walletKp.publicKey(), '0')
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.manageData({
        name: 'achievo-challenge',
        value: Buffer.from(nonce, 'hex'),
      }),
    )
    .setTimebounds(0, Math.floor(expiry / 1000))
    .build()
  tx.sign(walletKp)
  return tx.toXDR()
}

describe('/api/reward', () => {
  const walletKp = testKeypair(3)
  const adminKp = testKeypair(9)
  const activityText = 'I tutored three classmates in calculus for two hours.'
  const hash = intentHash(activityText)

  beforeEach(() => {
    vi.clearAllMocks()
    claimOnce.mockResolvedValue(true)
    releaseClaim.mockResolvedValue(undefined)
    reserveBudget.mockResolvedValue(true)
    getIdentityByWallet.mockResolvedValue(null)
    process.env.ADMIN_SECRET = adminKp.secret()
    process.env.ATTESTOR_SECRET = Keypair.random().secret()
    process.env.NONCE_HMAC_SECRET = 'reward-test-secret'
    delete process.env.VERCEL_ENV
    delete process.env.SIGNER_URL
    delete process.env.SIGNER_HMAC_SECRET
  })

  function challengeBody(overrides: Record<string, unknown> = {}) {
    const nonce = (overrides.nonce as string) ?? 'ab'.repeat(16)
    const expiry = (overrides.expiry as number) ?? Date.now() + 60_000
    const text = (overrides.activityText as string) ?? activityText
    const hashForText = intentHash(text)
    const mac =
      (overrides.mac as string) ??
      createHmac('sha256', 'reward-test-secret')
        .update(`${nonce}:${expiry}:${hashForText}`)
        .digest('hex')
    const signedXdr =
      (overrides.signedXdr as string) ?? buildSignedChallenge(walletKp, nonce, expiry)
    return {
      activityText: text,
      wallet: walletKp.publicKey(),
      nonce,
      expiry,
      mac,
      signedXdr,
      intentHash: hashForText,
      ...overrides,
    }
  }

  it('rejects short activity text', async () => {
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        body: { activityText: 'hi', wallet: walletKp.publicKey() },
        headers: {},
        socket: {},
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(400)
  })

  it('rejects invalid challenge MAC', async () => {
    const nonce = 'ab'.repeat(16)
    const expiry = Date.now() + 60_000
    const signedXdr = buildSignedChallenge(walletKp, nonce, expiry)
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        body: {
          activityText,
          wallet: walletKp.publicKey(),
          nonce,
          expiry,
          mac: '00'.repeat(32),
          signedXdr,
          intentHash: hash,
        },
        headers: { 'x-forwarded-for': '2.2.2.2' },
        socket: {},
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(401)
  })

  it('rejects intent mismatch', async () => {
    const nonce = 'cd'.repeat(16)
    const expiry = Date.now() + 60_000
    const mac = createHmac('sha256', 'reward-test-secret')
      .update(`${nonce}:${expiry}:${hash}`)
      .digest('hex')
    const signedXdr = buildSignedChallenge(walletKp, nonce, expiry)
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        body: {
          activityText,
          wallet: walletKp.publicKey(),
          nonce,
          expiry,
          mac,
          signedXdr,
          intentHash: '11'.repeat(32),
        },
        headers: { 'x-forwarded-for': '3.3.3.3' },
        socket: {},
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(400)
  })

  it('returns 429 when wallet rate limit already claimed', async () => {
    const nonce = 'ef'.repeat(16)
    const expiry = Date.now() + 60_000
    const mac = createHmac('sha256', 'reward-test-secret')
      .update(`${nonce}:${expiry}:${hash}`)
      .digest('hex')
    const signedXdr = buildSignedChallenge(walletKp, nonce, expiry)

    claimOnce
      .mockResolvedValueOnce(true) // nonce
      .mockResolvedValueOnce(false) // wallet rate

    const res = makeRes()
    await handler(
      {
        method: 'POST',
        body: {
          activityText,
          wallet: walletKp.publicKey(),
          nonce,
          expiry,
          mac,
          signedXdr,
          intentHash: hash,
        },
        headers: { 'x-forwarded-for': '4.4.4.4' },
        socket: {},
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(429)
  })

  it('releases rate claims when AI rejects activity', async () => {
    const nonce = '11'.repeat(16)
    const expiry = Date.now() + 60_000
    const mac = createHmac('sha256', 'reward-test-secret')
      .update(`${nonce}:${expiry}:${hash}`)
      .digest('hex')
    const signedXdr = buildSignedChallenge(walletKp, nonce, expiry)

    vi.mocked(ScoringAgent.evaluate).mockResolvedValue({
      activity: 'unknown',
      valid: false,
      score: 0,
      criteria: [],
      rationale: 'Not an academic activity',
    })

    const res = makeRes()
    await handler(
      {
        method: 'POST',
        body: {
          activityText,
          wallet: walletKp.publicKey(),
          nonce,
          expiry,
          mac,
          signedXdr,
          intentHash: hash,
        },
        headers: { 'x-forwarded-for': '5.5.5.5' },
        socket: {},
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(422)
    expect(releaseClaim).toHaveBeenCalled()
  })

  it('falls back to heuristic when Groq fails and still rejects unknown activities', async () => {
    const nonce = '22'.repeat(16)
    const expiry = Date.now() + 60_000

    vi.mocked(ScoringAgent.evaluate).mockRejectedValue(new Error('Groq 503'))

    const unknownText = 'I bought groceries today at the market.'
    const unknownHash = intentHash(unknownText)
    const mac2 = createHmac('sha256', 'reward-test-secret')
      .update(`${nonce}:${expiry}:${unknownHash}`)
      .digest('hex')
    const signed2 = buildSignedChallenge(walletKp, nonce, expiry)

    const res = makeRes()
    await handler(
      {
        method: 'POST',
        body: {
          activityText: unknownText,
          wallet: walletKp.publicKey(),
          nonce,
          expiry,
          mac: mac2,
          signedXdr: signed2,
          intentHash: unknownHash,
        },
        headers: { 'x-forwarded-for': '6.6.6.6' },
        socket: {},
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(422)
    expect((res.body as { scoringMode?: string }).scoringMode).toBe('heuristic')
  })

  it('returns 429 when treasury daily budget is exhausted', async () => {
    const nonce = '33'.repeat(16)
    const expiry = Date.now() + 60_000
    const mac = createHmac('sha256', 'reward-test-secret')
      .update(`${nonce}:${expiry}:${hash}`)
      .digest('hex')
    const signedXdr = buildSignedChallenge(walletKp, nonce, expiry)

    vi.mocked(ScoringAgent.evaluate).mockResolvedValue({
      activity: 'tutoring',
      valid: true,
      score: 0.5,
      criteria: [{ key: 'effort', label: 'Effort', score: 0.5, weight: 1 }],
      rationale: 'Solid tutoring session',
    })
    reserveBudget.mockResolvedValueOnce(false)

    const res = makeRes()
    await handler(
      {
        method: 'POST',
        body: {
          activityText,
          wallet: walletKp.publicKey(),
          nonce,
          expiry,
          mac,
          signedXdr,
          intentHash: hash,
        },
        headers: { 'x-forwarded-for': '7.7.7.7' },
        socket: {},
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(429)
    expect(releaseClaim).toHaveBeenCalled()
  })

  it('claims only wallet and IP when no identity is bound', async () => {
    const nonce = '44'.repeat(16)
    const expiry = Date.now() + 60_000
    const body = challengeBody({ nonce, expiry })

    vi.mocked(ScoringAgent.evaluate).mockResolvedValue({
      activity: 'unknown',
      valid: false,
      score: 0,
      criteria: [],
      rationale: 'Not eligible',
    })

    const res = makeRes()
    await handler(
      {
        method: 'POST',
        body,
        headers: { 'x-forwarded-for': '8.8.8.8' },
        socket: {},
      } as never,
      res as never,
    )

    expect(res.statusCode).toBe(422)
    const keys = claimOnce.mock.calls.map((c) => c[0] as string)
    expect(keys).toContain(`nonce:${nonce}`)
    expect(keys).toContain(`rate:wallet:${walletKp.publicKey()}`)
    expect(keys).toContain('rate:ip:8.8.8.8')
    expect(keys.some((k) => k.startsWith('rate:identity:'))).toBe(false)
  })

  it('claims identity rate when wallet already has an identity', async () => {
    const nonce = '55'.repeat(16)
    const expiry = Date.now() + 60_000
    const body = challengeBody({ nonce, expiry })

    getIdentityByWallet.mockResolvedValue({
      id: 'id_existing',
      walletPublicKey: walletKp.publicKey(),
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    vi.mocked(ScoringAgent.evaluate).mockResolvedValue({
      activity: 'unknown',
      valid: false,
      score: 0,
      criteria: [],
      rationale: 'Not eligible',
    })

    const res = makeRes()
    await handler(
      {
        method: 'POST',
        body,
        headers: { 'x-forwarded-for': '9.9.9.9' },
        socket: {},
      } as never,
      res as never,
    )

    expect(res.statusCode).toBe(422)
    const keys = claimOnce.mock.calls.map((c) => c[0] as string)
    expect(keys).toContain('rate:identity:id_existing')
    expect(releaseClaim).toHaveBeenCalledWith('rate:identity:id_existing')
  })

  it('returns 429 and releases wallet/IP when identity rate is already claimed', async () => {
    const nonce = '66'.repeat(16)
    const expiry = Date.now() + 60_000
    const body = challengeBody({ nonce, expiry })

    getIdentityByWallet.mockResolvedValue({
      id: 'id_existing',
      walletPublicKey: walletKp.publicKey(),
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    claimOnce
      .mockResolvedValueOnce(true) // nonce
      .mockResolvedValueOnce(true) // wallet
      .mockResolvedValueOnce(true) // ip
      .mockResolvedValueOnce(false) // identity

    const res = makeRes()
    await handler(
      {
        method: 'POST',
        body,
        headers: { 'x-forwarded-for': '10.10.10.10' },
        socket: {},
      } as never,
      res as never,
    )

    expect(res.statusCode).toBe(429)
    expect((res.body as { error: string }).error).toMatch(/identity/i)
    expect(releaseClaim).toHaveBeenCalledWith(`rate:wallet:${walletKp.publicKey()}`)
    expect(releaseClaim).toHaveBeenCalledWith('rate:ip:10.10.10.10')
  })
})
