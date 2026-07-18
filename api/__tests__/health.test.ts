/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getRedis = vi.fn()

vi.mock('../_server/infrastructure/store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/store')>()),
  getRedis: (...args: unknown[]) => getRedis(...args),
  StoreUnavailableError: class StoreUnavailableError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'StoreUnavailableError'
    }
  },
}))

vi.mock('@achievo/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@achievo/shared')>()),
  CONTRACT_ID: 'CTESTCONTRACT',
  SOROBAN_RPC_URL: 'https://rpc.example.test',
}))

type MockResponse = {
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

describe('api/health', () => {
  beforeEach(() => {
    vi.resetModules()
    getRedis.mockReset()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('rejects non-GET/HEAD methods', async () => {
    const { default: handler } = await import('../health')
    const res = makeRes()
    await handler({ method: 'POST' } as never, res as never)
    expect(res.statusCode).toBe(405)
  })

  it('reports ok:true with degraded redis when in-memory fallback is used outside production', async () => {
    getRedis.mockReturnValue(null)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))

    const { default: handler } = await import('../health')
    const res = makeRes()
    await handler({ method: 'GET' } as never, res as never)

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      ok: true,
      rewardsPaused: false,
      checks: { contractId: 'ok', redis: 'degraded', rpc: 'ok' },
    })
  })

  it('marks redis ok when getRedis returns a working client', async () => {
    getRedis.mockReturnValue({ ping: vi.fn().mockResolvedValue('PONG') })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))

    const { default: handler } = await import('../health')
    const res = makeRes()
    await handler({ method: 'HEAD' } as never, res as never)

    expect(res.body).toMatchObject({ checks: { redis: 'ok' } })
  })

  it('marks redis down when the ping call throws', async () => {
    getRedis.mockReturnValue({ ping: vi.fn().mockRejectedValue(new Error('conn refused')) })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))

    const { default: handler } = await import('../health')
    const res = makeRes()
    await handler({ method: 'GET' } as never, res as never)

    expect(res.body).toMatchObject({ checks: { redis: 'down' } })
  })

  it('marks rpc degraded when the RPC call responds not-ok, and down when it throws', async () => {
    getRedis.mockReturnValue(null)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })))

    const { default: handler } = await import('../health')
    const res1 = makeRes()
    await handler({ method: 'GET' } as never, res1 as never)
    expect(res1.body).toMatchObject({ checks: { rpc: 'degraded' } })

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    const res2 = makeRes()
    await handler({ method: 'GET' } as never, res2 as never)
    expect(res2.body).toMatchObject({ checks: { rpc: 'down' } })
  })

  it('returns 503 with rewardsPaused when any check is down in production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    getRedis.mockReturnValue(null)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))

    const { default: handler } = await import('../health')
    const res = makeRes()
    await handler({ method: 'GET' } as never, res as never)

    expect(res.statusCode).toBe(503)
    expect(res.body).toMatchObject({ ok: false, rewardsPaused: true, checks: { redis: 'down', rpc: 'down' } })
  })
})
