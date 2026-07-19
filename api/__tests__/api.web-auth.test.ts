/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Keypair, Networks, TransactionBuilder, WebAuth } from '@stellar/stellar-sdk';

vi.mock('../_server/infrastructure/store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/store')>()),
  claimOnce: vi.fn().mockResolvedValue(true),
  StoreUnavailableError: class StoreUnavailableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'StoreUnavailableError';
    }
  },
}));

import handler from '../web-auth';
import { claimOnce } from '../_server/infrastructure/store';

interface MockResponse {
  statusCode: number;
  body: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function makeRes(): MockResponse {
  return {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function testKeypair(fill: number) {
  const seed = new Uint8Array(32);
  seed.fill(fill);
  return Keypair.fromRawEd25519Seed(seed);
}

describe('/api/web-auth', () => {
  const serverKp = testKeypair(11);
  const clientKp = testKeypair(7);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimOnce).mockResolvedValue(true);
    process.env.SEP10_SERVER_SECRET = serverKp.secret();
    process.env.SEP10_JWT_SECRET = 'test-sep10-jwt-secret';
    process.env.HOME_DOMAIN = 'achievo.test';
    process.env.WEB_AUTH_DOMAIN = 'achievo.test';
    process.env.STELLAR_NETWORK = 'testnet';
    delete process.env.NETWORK_PASSPHRASE;
    delete process.env.VERCEL_ENV;
  });

  it('rejects missing account', async () => {
    const res = makeRes();
    await handler(
      { method: 'GET', query: {}, headers: {}, socket: { remoteAddress: '1.1.1.1' } } as never,
      res as never,
    );
    expect(res.statusCode).toBe(400);
  });

  it('issues a SEP-10 challenge and JWT for a signed response', async () => {
    const challengeRes = makeRes();
    await handler(
      {
        method: 'GET',
        query: { account: clientKp.publicKey() },
        headers: {},
        socket: { remoteAddress: '1.1.1.1' },
      } as never,
      challengeRes as never,
    );
    expect(challengeRes.statusCode).toBe(200);
    const challengeBody = challengeRes.body as {
      transaction: string;
      network_passphrase: string;
    };
    expect(challengeBody.network_passphrase).toBe(Networks.TESTNET);
    expect(challengeBody.transaction.length).toBeGreaterThan(20);

    const tx = TransactionBuilder.fromXDR(challengeBody.transaction, Networks.TESTNET);
    tx.sign(clientKp);

    const tokenRes = makeRes();
    await handler(
      {
        method: 'POST',
        body: { transaction: tx.toXDR() },
        headers: {},
        socket: { remoteAddress: '1.1.1.1' },
      } as never,
      tokenRes as never,
    );
    expect(tokenRes.statusCode).toBe(200);
    const tokenBody = tokenRes.body as { token: string; wallet: string; expiresAt: number };
    expect(tokenBody.wallet).toBe(clientKp.publicKey());
    expect(tokenBody.token.split('.')).toHaveLength(3);
    expect(tokenBody.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(WebAuth.verifyTxSignedBy(tx, clientKp.publicKey())).toBe(true);
  });
});
