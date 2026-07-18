import { describe, expect, it, vi } from 'vitest';
import type { HttpRequest } from '../_server/http';
import {
  createReconcileRoute,
  createRewardRoute,
} from '../_server/features/rewards/routes';
import type {
  NoncePorts,
  PayoutsPorts,
  ReconcilePorts,
  RewardPorts,
} from '../_server/features/rewards/ports';

function request(body: unknown): HttpRequest {
  return {
    method: 'POST',
    headers: {},
    query: {},
    body,
    clientIp: '203.0.113.8',
  };
}

function createPorts(): RewardPorts & NoncePorts & PayoutsPorts & ReconcilePorts {
  return {
    adminSecret: 'SADMIN',
    nonceSecret: 'nonce-secret',
    cronSecret: undefined,
    isValidWallet: vi.fn().mockReturnValue(true),
    hashIntent: vi.fn().mockReturnValue('a'.repeat(64)),
    verifyChallenge: vi.fn().mockReturnValue({ ok: true }),
    issueChallenge: vi.fn(),
    claimOnce: vi.fn().mockResolvedValue(true),
    claimRates: vi.fn().mockResolvedValue({
      ok: true,
      claims: { walletKey: 'rate:wallet:GTEST', ipKey: 'rate:ip:203.0.113.8' },
    }),
    releaseRates: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue({
      evaluation: {
        activity: 'tutoring',
        valid: true,
        score: 0.5,
        criteria: [{ key: 'effort', label: 'Effort', score: 0.5, weight: 1 }],
        rationale: 'Eligible tutoring',
      },
      scoringMode: 'groq',
    }),
    assessIntegrity: vi.fn().mockReturnValue({
      effortMultiplier: 1,
      flagged: false,
      reasons: [],
    }),
    fingerprint: vi.fn().mockReturnValue('fingerprint'),
    listRecent: vi.fn().mockResolvedValue([]),
    addRecent: vi.fn().mockResolvedValue(undefined),
    reserveBudgets: vi.fn().mockResolvedValue({
      ok: true,
      reservation: { treasuryKey: 'treasury', recipientKey: 'recipient', units: 75 },
    }),
    releaseBudgets: vi.fn().mockResolvedValue(undefined),
    submitReward: vi.fn().mockResolvedValue({ ok: true, txHash: 'tx-success' }),
    markPending: vi.fn().mockResolvedValue(undefined),
    bindIdentity: vi.fn().mockResolvedValue({
      id: 'id-test',
      walletPublicKey: 'GTEST',
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
    issueSession: vi.fn().mockReturnValue({ token: 'session-token' }),
    appendPayout: vi.fn().mockResolvedValue(undefined),
    listPayouts: vi.fn().mockResolvedValue([]),
    redactWallet: vi.fn((wallet: string) => wallet),
    transactionUrl: vi.fn((hash: string) => hash),
    notifyPayout: vi.fn().mockResolvedValue(undefined),
    notifyOps: vi.fn().mockResolvedValue(undefined),
    listPending: vi.fn().mockResolvedValue([]),
    removePending: vi.fn().mockResolvedValue(undefined),
    transactionStatus: vi.fn().mockResolvedValue('pending'),
    getDailyDisbursed: vi.fn().mockResolvedValue(0),
    treasuryDailyCap: 100,
    now: () => new Date('2026-07-18T00:00:00.000Z'),
    isStoreUnavailable: vi.fn().mockReturnValue(false),
  };
}

const validBody = {
  activityText: 'I tutored classmates for two hours.',
  wallet: 'GTEST',
  nonce: 'nonce',
  expiry: 1,
  mac: 'mac',
  signedXdr: 'xdr',
  intentHash: 'a'.repeat(64),
};

describe('reward feature route', () => {
  it('rejects invalid submissions before side effects', async () => {
    const ports = createPorts();
    const result = await createRewardRoute(ports)(
      request({ ...validBody, activityText: 'bad' }),
    );
    expect(result.status).toBe(400);
    expect(ports.claimOnce).not.toHaveBeenCalled();
  });

  it('releases rate claims after evaluation rejection', async () => {
    const ports = createPorts();
    vi.mocked(ports.evaluate).mockResolvedValue({
      evaluation: {
        activity: 'unknown',
        valid: false,
        score: 0,
        criteria: [],
        rationale: 'Not eligible',
      },
      scoringMode: 'heuristic',
    });
    const result = await createRewardRoute(ports)(request(validBody));
    expect(result.status).toBe(422);
    expect(ports.releaseRates).toHaveBeenCalledTimes(1);
    expect(ports.reserveBudgets).not.toHaveBeenCalled();
  });

  it('releases rate claims when budget reservation fails', async () => {
    const ports = createPorts();
    vi.mocked(ports.reserveBudgets).mockResolvedValue({
      ok: false,
      error: 'Daily treasury budget exceeded.',
    });
    const result = await createRewardRoute(ports)(request(validBody));
    expect(result.status).toBe(429);
    expect(ports.releaseRates).toHaveBeenCalledTimes(1);
    expect(ports.releaseBudgets).not.toHaveBeenCalled();
  });

  it('keeps claims and budgets reserved for pending settlement', async () => {
    const ports = createPorts();
    vi.mocked(ports.submitReward).mockResolvedValue({
      ok: false,
      pending: true,
      txHash: 'tx-pending',
      error: 'confirmation pending',
    });
    const result = await createRewardRoute(ports)(request(validBody));
    expect(result.status).toBe(202);
    expect(ports.markPending).toHaveBeenCalledWith(
      expect.objectContaining({ txHash: 'tx-pending' }),
    );
    expect(ports.releaseRates).not.toHaveBeenCalled();
    expect(ports.releaseBudgets).not.toHaveBeenCalled();
  });

  it('releases rate and budget reservations after payout rejection', async () => {
    const ports = createPorts();
    vi.mocked(ports.submitReward).mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Transaction rejected',
    });
    const result = await createRewardRoute(ports)(request(validBody));
    expect(result.status).toBe(500);
    expect(ports.releaseRates).toHaveBeenCalledTimes(1);
    expect(ports.releaseBudgets).toHaveBeenCalledWith(
      expect.objectContaining({ treasuryKey: 'treasury', recipientKey: 'recipient' }),
    );
  });

  it('returns a successful payout even when notification fails', async () => {
    const ports = createPorts();
    vi.mocked(ports.notifyPayout).mockRejectedValue(new Error('Telegram unavailable'));
    const result = await createRewardRoute(ports)(request(validBody));
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ txHash: 'tx-success', identityId: 'id-test' });
    expect(ports.appendPayout).toHaveBeenCalledTimes(1);
    expect(ports.releaseRates).not.toHaveBeenCalled();
    expect(ports.releaseBudgets).not.toHaveBeenCalled();
  });
});

describe('reconcile feature route', () => {
  it('settles a confirmed pending payout and removes it', async () => {
    const ports = createPorts();
    vi.mocked(ports.listPending).mockResolvedValue([
      {
        txHash: 'tx-pending',
        wallet: 'GTEST',
        rewardXlm: 7.5,
        activity: 'tutoring',
        createdAt: '2026-07-18T00:00:00.000Z',
      },
    ]);
    vi.mocked(ports.transactionStatus).mockResolvedValue('success');
    const result = await createReconcileRoute(ports)({
      method: 'GET',
      headers: {},
      query: {},
      body: undefined,
      clientIp: 'unknown',
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ settled: 1, pending: 0, failed: 0 });
    expect(ports.appendPayout).toHaveBeenCalledTimes(1);
    expect(ports.removePending).toHaveBeenCalledWith('tx-pending');
  });
});
