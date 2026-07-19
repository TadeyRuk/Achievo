/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Keypair } from '@stellar/stellar-sdk'
import { createHash } from 'node:crypto'
import { signSep10Jwt } from '../_server/infrastructure/jwt'

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

describe('/api/reward', () => {
  const walletKp = testKeypair(3)
  const adminKp = testKeypair(9)
  const activityText = 'I tutored three classmates in calculus for two hours.'
  const hash = intentHash(activityText)
  const jwtSecret = 'reward-test-jwt-secret'
  const homeDomain = 'achievo.test'

  function authToken(wallet = walletKp.publicKey()) {
    return signSep10Jwt({ sub: wallet, iss: homeDomain, ttlSeconds: 1800 }, jwtSecret)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    claimOnce.mockResolvedValue(true)
    releaseClaim.mockResolvedValue(undefined)
    reserveBudget.mockResolvedValue(true)
    getIdentityByWallet.mockResolvedValue(null)
    process.env.ADMIN_SECRET = adminKp.secret()
    process.env.ATTESTOR_SECRET = Keypair.random().secret()
    process.env.SEP10_SERVER_SECRET = Keypair.random().secret()
    process.env.SEP10_JWT_SECRET = jwtSecret
    process.env.HOME_DOMAIN = homeDomain
    process.env.WEB_AUTH_DOMAIN = homeDomain
    delete process.env.VERCEL_ENV
    delete process.env.SIGNER_URL
    delete process.env.SIGNER_HMAC_SECRET
  })

  function rewardBody(overrides: Record<string, unknown> = {}) {
    const text = (overrides.activityText as string) ?? activityText
    return {
      activityText: text,
      wallet: walletKp.publicKey(),
      intentHash: intentHash(text),
      ...overrides,
    }
  }

  function post(body: Record<string, unknown>, ip: string, token = authToken()) {
    return {
      method: 'POST' as const,
      body,
      headers: {
        authorization: `Bearer ${token}`,
        'x-forwarded-for': ip,
      },
      socket: {},
    }
  }

  it('rejects short activity text', async () => {
    const res = makeRes()
    await handler(post({ activityText: 'hi', wallet: walletKp.publicKey() }, '1.1.1.1') as never, res as never)
    expect(res.statusCode).toBe(400)
  })

  it('rejects invalid auth token', async () => {
    const res = makeRes()
    await handler(post(rewardBody(), '2.2.2.2', 'not-a-jwt') as never, res as never)
    expect(res.statusCode).toBe(401)
  })

  it('rejects intent mismatch', async () => {
    const res = makeRes()
    await handler(
      post(rewardBody({ intentHash: '11'.repeat(32) }), '3.3.3.3') as never,
      res as never,
    )
    expect(res.statusCode).toBe(400)
  })

  it('returns 429 when wallet rate limit already claimed', async () => {
    claimOnce
      .mockResolvedValueOnce(true) // intent
      .mockResolvedValueOnce(false) // wallet rate

    const res = makeRes()
    await handler(post(rewardBody(), '4.4.4.4') as never, res as never)
    expect(res.statusCode).toBe(429)
  })

  it('releases rate claims when AI rejects activity', async () => {
    vi.mocked(ScoringAgent.evaluate).mockResolvedValue({
      activity: 'unknown',
      valid: false,
      score: 0,
      criteria: [],
      rationale: 'Not an academic activity',
    })

    const res = makeRes()
    await handler(post(rewardBody(), '5.5.5.5') as never, res as never)
    expect(res.statusCode).toBe(422)
    expect(releaseClaim).toHaveBeenCalled()
  })

  it('falls back to heuristic when Groq fails and still rejects unknown activities', async () => {
    vi.mocked(ScoringAgent.evaluate).mockRejectedValue(new Error('Groq 503'))

    const unknownText = 'I bought groceries today at the market.'
    const res = makeRes()
    await handler(post(rewardBody({ activityText: unknownText }), '6.6.6.6') as never, res as never)
    expect(res.statusCode).toBe(422)
    expect((res.body as { scoringMode?: string }).scoringMode).toBe('heuristic')
  })

  it('returns 429 when treasury daily budget is exhausted', async () => {
    vi.mocked(ScoringAgent.evaluate).mockResolvedValue({
      activity: 'tutoring',
      valid: true,
      score: 0.5,
      criteria: [{ key: 'effort', label: 'Effort', score: 0.5, weight: 1 }],
      rationale: 'Solid tutoring session',
    })
    reserveBudget.mockResolvedValueOnce(false)

    const res = makeRes()
    await handler(post(rewardBody(), '7.7.7.7') as never, res as never)
    expect(res.statusCode).toBe(429)
    expect(releaseClaim).toHaveBeenCalled()
  })

  it('claims intent then wallet and IP when no identity is bound', async () => {
    vi.mocked(ScoringAgent.evaluate).mockResolvedValue({
      activity: 'unknown',
      valid: false,
      score: 0,
      criteria: [],
      rationale: 'Not eligible',
    })

    const res = makeRes()
    await handler(post(rewardBody(), '8.8.8.8') as never, res as never)

    expect(res.statusCode).toBe(422)
    const keys = claimOnce.mock.calls.map((c) => c[0] as string)
    expect(keys).toContain(`intent:${walletKp.publicKey()}:${hash}`)
    expect(keys).toContain(`rate:wallet:${walletKp.publicKey()}`)
    expect(keys).toContain('rate:ip:8.8.8.8')
    expect(keys.some((k) => k.startsWith('rate:identity:'))).toBe(false)
  })

  it('claims identity rate when wallet already has an identity', async () => {
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
    await handler(post(rewardBody(), '9.9.9.9') as never, res as never)

    expect(res.statusCode).toBe(422)
    const keys = claimOnce.mock.calls.map((c) => c[0] as string)
    expect(keys).toContain('rate:identity:id_existing')
    expect(releaseClaim).toHaveBeenCalledWith('rate:identity:id_existing')
  })

  it('returns 429 and releases wallet/IP when identity rate is already claimed', async () => {
    getIdentityByWallet.mockResolvedValue({
      id: 'id_existing',
      walletPublicKey: walletKp.publicKey(),
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    claimOnce
      .mockResolvedValueOnce(true) // intent
      .mockResolvedValueOnce(true) // wallet
      .mockResolvedValueOnce(true) // ip
      .mockResolvedValueOnce(false) // identity

    const res = makeRes()
    await handler(post(rewardBody(), '10.10.10.10') as never, res as never)

    expect(res.statusCode).toBe(429)
    expect((res.body as { error: string }).error).toMatch(/identity/i)
    expect(releaseClaim).toHaveBeenCalledWith(`rate:wallet:${walletKp.publicKey()}`)
    expect(releaseClaim).toHaveBeenCalledWith('rate:ip:10.10.10.10')
  })
})
