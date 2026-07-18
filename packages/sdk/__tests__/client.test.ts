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
  it('submits an activity after hashing its trimmed text and signing the nonce challenge', async () => {
    const activityText = '  Tutored five students for two hours.  ';
    const trimmedActivity = activityText.trim();
    const intentHash = createHash('sha256').update(trimmedActivity).digest('hex');
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({
        nonce: 'nonce-1',
        expiry: 123,
        mac: 'mac-1',
        intentHash,
        challengeXdr: 'challenge-xdr',
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
    const client = createAchievoClient({ fetch });

    const result = await client.submitActivity({
      wallet: 'G-WALLET',
      activityText,
      signChallenge,
    });

    expect(result.txHash).toBe('tx-1');
    expect(signChallenge).toHaveBeenCalledWith('challenge-xdr');
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `/api/nonce?wallet=${encodeURIComponent('G-WALLET')}&intentHash=${intentHash}`,
      { method: 'GET' },
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/reward',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          activityText: trimmedActivity,
          wallet: 'G-WALLET',
          nonce: 'nonce-1',
          expiry: 123,
          mac: 'mac-1',
          signedXdr: 'signed-xdr',
          intentHash,
        }),
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
    const body = { error: 'Too many challenge requests. Wait a moment and retry.' };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse(body, 429));
    const client = createAchievoClient({ fetch });

    const promise = client.getNonce({ wallet: 'G-WALLET', intentHash: 'a'.repeat(64) });

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

  it('allows payout entries from reconcile to omit effortScore', () => {
    const reconciledPayout: PublicPayoutEntry = {
      txHash: 'tx-reconciled',
      wallet: 'G-WA…LLET',
      identityId: null,
      amount: 5,
      activity: 'tutoring',
      scoringMode: null,
      createdAt: '2026-07-18T00:00:00.000Z',
    };

    expect(reconciledPayout.effortScore).toBeUndefined();
  });

  it('returns a 202 pending reward as a typed result instead of throwing', async () => {
    const pending = {
      pending: true as const,
      txHash: 'tx-pending',
      reward: 5,
      activity: 'tutoring',
      error: 'Submission status is uncertain.',
      scoringMode: 'heuristic',
    };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse(pending, 202));
    const client = createAchievoClient({ fetch });

    await expect(client.submitReward({
      activityText: 'Tutored a student.',
      wallet: 'G-WALLET',
      nonce: 'nonce-1',
      expiry: 123,
      mac: 'mac-1',
      signedXdr: 'signed-xdr',
      intentHash: 'a'.repeat(64),
    })).resolves.toEqual(pending);
  });

  it('does not submit a reward when the signer rejects', async () => {
    const nonce = {
      nonce: 'nonce-1',
      expiry: 123,
      mac: 'mac-1',
      intentHash: 'a'.repeat(64),
      challengeXdr: 'challenge-xdr',
    };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse(nonce));
    const signerError = new Error('User declined the signature.');
    const client = createAchievoClient({ fetch });

    await expect(client.submitActivity({
      wallet: 'G-WALLET',
      activityText: 'Tutored a student.',
      signChallenge: vi.fn().mockRejectedValue(signerError),
    })).rejects.toBe(signerError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps browser URLs relative and robustly joins a non-empty base URL', async () => {
    const relativeFetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ ok: true, rewardsPaused: false, checks: {}, network: 'testnet' }),
    );
    const absoluteFetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ ok: true, rewardsPaused: false, checks: {}, network: 'testnet' }),
    );

    await createAchievoClient({ fetch: relativeFetch }).getHealth();
    await createAchievoClient({
      baseUrl: 'https://achievo.example/root///',
      fetch: absoluteFetch,
    }).getHealth();

    expect(relativeFetch).toHaveBeenCalledWith('/api/health', { method: 'GET' });
    expect(absoluteFetch).toHaveBeenCalledWith(
      'https://achievo.example/root/api/health',
      { method: 'GET' },
    );
  });
});
