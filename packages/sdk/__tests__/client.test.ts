import { createHash } from 'node:crypto';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { ApiError, createAchievoClient } from '../src/index.js';
import type {
  AchievoApiErrorBody,
  HealthApiError,
  PublicPayoutEntry,
} from '../src/index.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createAchievoClient', () => {
  it('submits an activity after SEP-10 auth and hashing its trimmed text', async () => {
    const activityText = '  Tutored five students for two hours.  ';
    const trimmedActivity = activityText.trim();
    const intentHash = createHash('sha256').update(trimmedActivity).digest('hex');
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({
        transaction: 'challenge-xdr',
        network_passphrase: 'Test SDF Network ; September 2015',
      }))
      .mockResolvedValueOnce(jsonResponse({
        token: 'jwt-token',
        wallet: 'G-WALLET',
        expiresAt: 123,
      }))
      .mockResolvedValueOnce(jsonResponse({
        txHash: 'tx-1',
        reward: 8,
        base: 5,
        bonus: 3,
        effortScore: 0.6,
        activity: 'tutoring',
        reason: 'Detailed tutoring activity.',
        criteria: [{ key: 'effort', label: 'Effort', score: 0.6, weight: 1 }],
        flagged: false,
        flagReason: null,
        integrityReasons: [],
        scoringMode: 'groq',
        identityId: 'identity-1',
        sessionToken: 'session-1',
      }));
    const signChallenge = vi.fn().mockResolvedValue('signed-xdr');
    const onAuthToken = vi.fn();
    const client = createAchievoClient({ fetch });

    const result = await client.submitActivity({
      wallet: 'G-WALLET',
      activityText,
      signChallenge,
      onAuthToken,
    });

    expect(result.txHash).toBe('tx-1');
    expect(signChallenge).toHaveBeenCalledWith('challenge-xdr');
    expect(onAuthToken).toHaveBeenCalledWith('jwt-token');
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `/api/web-auth?account=${encodeURIComponent('G-WALLET')}`,
      { method: 'GET' },
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/web-auth',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ transaction: 'signed-xdr' }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      '/api/reward',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-token',
        }),
        body: JSON.stringify({
          activityText: trimmedActivity,
          wallet: 'G-WALLET',
          intentHash,
        }),
      }),
    );
  });

  it('reuses a cached auth token without calling Web Auth', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        txHash: 'tx-2',
        reward: 5,
        base: 5,
        bonus: 0,
        effortScore: 0.2,
        activity: 'tutoring',
        reason: 'ok',
        criteria: [],
        flagged: false,
        flagReason: null,
        integrityReasons: [],
        scoringMode: 'heuristic',
        identityId: null,
        sessionToken: null,
      }),
    );
    const signChallenge = vi.fn();
    const client = createAchievoClient({ fetch });

    await client.submitActivity({
      wallet: 'G-WALLET',
      activityText: 'Tutored peers in math tonight.',
      authToken: 'cached-jwt',
      signChallenge,
    });

    expect(signChallenge).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      '/api/reward',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer cached-jwt' }),
      }),
    );
  });

  it('throws ApiError when a successful response contains malformed JSON', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response('<html>not json</html>', { status: 200 }),
    );
    const client = createAchievoClient({ fetch });

    await expect(client.getHealth()).rejects.toEqual(expect.objectContaining({
      name: 'ApiError',
      status: 200,
      message: 'Health API error 200: server returned non-JSON',
    }));
  });

  it('throws a typed ApiError for non-2xx responses', async () => {
    const body = { error: 'Too many auth requests. Wait a moment and retry.' };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse(body, 429));
    const client = createAchievoClient({ fetch });

    const promise = client.getWebAuthChallenge('G-WALLET');

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toEqual(expect.objectContaining({
      status: 429,
      body,
      message: body.error,
    }));
  });

  it('preserves the full degraded health payload in a typed ApiError', async () => {
    const body: HealthApiError = {
      ok: false,
      rewardsPaused: true,
      checks: {
        contractId: 'ok',
        redis: 'down',
        rpc: 'ok',
      },
      network: 'testnet',
    };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse(body, 503));
    const client = createAchievoClient({ fetch });

    const caught = await client.getHealth().catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(ApiError);
    const error = caught as ApiError;
    expectTypeOf(error.body).toEqualTypeOf<AchievoApiErrorBody | undefined>();
    expect(error).toEqual(expect.objectContaining({
      status: 503,
      body,
      message: 'Health API error 503',
    }));
  });

  it('preserves the health endpoint 405 error payload in the same wire type', async () => {
    const body: HealthApiError = { error: 'Method not allowed' };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse(body, 405));
    const client = createAchievoClient({ fetch });

    const caught = await client.getHealth().catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(ApiError);
    const error = caught as ApiError<HealthApiError>;
    expectTypeOf(error.body).toEqualTypeOf<HealthApiError | undefined>();
    expect(error).toEqual(expect.objectContaining({
      status: 405,
      body,
      message: 'Method not allowed',
    }));
  });

  it('maps payout table rows with typed PublicPayoutEntry entries', async () => {
    const entry: PublicPayoutEntry = {
      txHash: 'abc',
      wallet: 'G…',
      identityId: null,
      amount: 1,
      activity: 'tutoring',
      scoringMode: 'heuristic',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse({
      count: 1,
      uniqueWallets: 1,
      uniqueIdentities: 0,
      totalXlm: 1,
      entries: [entry],
      tableRows: [{
        n: 1,
        date: '2026-01-01',
        wallet: 'G…',
        identityId: null,
        amount: 1,
        activity: 'tutoring',
        txUrl: 'https://example.com',
        txHash: 'abc',
      }],
    }));
    const client = createAchievoClient({ fetch });
    const payouts = await client.getPayouts();
    expect(payouts.entries[0]).toEqual(entry);
  });
});
