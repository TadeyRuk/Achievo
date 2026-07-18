import type {
  NonceApiRequest,
  NonceApiSuccess,
  PayoutsApiSuccess,
  PublicPayoutEntry,
  ReconcileApiSuccess,
  RewardActivity,
  RewardApiPending,
  RewardApiRequest,
  RewardApiSuccess,
} from '@achievo/contracts';
import {
  BASE_REWARD,
  MAX_ACTIVITY_TEXT_LENGTH,
  MAX_BONUS,
  MAX_REWARD_PER_TX_XLM,
  isKnownActivity,
} from '@achievo/shared';
import { error, json, methodNotAllowed, type HttpRoute } from '../../http';
import type {
  BudgetReservation,
  NoncePorts,
  PayoutRecord,
  PayoutsPorts,
  RateClaims,
  ReconcilePorts,
  RewardPorts,
} from './ports';

export function createNonceRoute(ports: NoncePorts): HttpRoute {
  return async (request) => {
    if (request.method !== 'GET') return methodNotAllowed();
    try {
      const walletRaw = request.query.wallet;
      const intentRaw = request.query.intentHash;
      const input: NonceApiRequest = {
        wallet: (Array.isArray(walletRaw) ? walletRaw[0] : walletRaw)?.trim() ?? '',
        intentHash: (Array.isArray(intentRaw) ? intentRaw[0] : intentRaw)?.trim() ?? '',
      };
      if (!input.wallet || !ports.isValidWallet(input.wallet)) {
        return error(400, 'Invalid wallet address.');
      }
      if (!/^[a-f0-9]{64}$/i.test(input.intentHash)) {
        return error(400, 'intentHash must be a 64-character hex SHA-256 digest.');
      }
      if (
        request.clientIp !== 'unknown' &&
        !(await ports.claimOnce(`rate:nonce:ip:${request.clientIp}`, 60))
      ) {
        return error(429, 'Too many challenge requests. Wait a moment and retry.');
      }
      if (!ports.nonceSecret) return error(500, 'Server configuration error.');
      return json<NonceApiSuccess>(200, await ports.issueChallenge(input.wallet, input.intentHash));
    } catch (cause) {
      return ports.isStoreUnavailable(cause)
        ? error(503, (cause as Error).message)
        : error(500, 'Failed to issue challenge.');
    }
  };
}

export function createRewardRoute(ports: RewardPorts): HttpRoute {
  return async (request) => {
    if (request.method !== 'POST') return methodNotAllowed();
    const input = (request.body ?? {}) as Partial<RewardApiRequest>;
    let rateClaims: RateClaims | null = null;
    let budgetReservation: BudgetReservation | null = null;

    try {
      const wallet = typeof input.wallet === 'string' ? input.wallet : '';
      if (!wallet || !ports.isValidWallet(wallet)) {
        return error(400, 'Invalid Stellar wallet address.');
      }
      const activityText = typeof input.activityText === 'string' ? input.activityText.trim() : '';
      if (activityText.length < 5) return error(400, 'Activity description too short.');
      if (activityText.length > MAX_ACTIVITY_TEXT_LENGTH) {
        return error(
          400,
          `Activity description must be at most ${MAX_ACTIVITY_TEXT_LENGTH} characters.`,
        );
      }
      if (!input.nonce || !input.expiry || !input.mac || !input.signedXdr) {
        return error(400, 'Missing wallet ownership proof. Please retry.');
      }
      const intentHash = ports.hashIntent(activityText);
      if (input.intentHash && input.intentHash.toLowerCase() !== intentHash) {
        return error(400, 'Activity text does not match challenge intent.');
      }
      if (!ports.payoutConfigured() || !ports.nonceSecret) {
        return error(503, 'Server configuration error.');
      }
      const proof = ports.verifyChallenge({
        wallet,
        nonce: input.nonce,
        expiry: input.expiry,
        mac: input.mac,
        signedXdr: input.signedXdr,
        intentHash,
      });
      if (!proof.ok) return error(401, proof.error ?? 'Invalid wallet ownership proof.');
      if (!(await ports.claimOnce(`nonce:${input.nonce}`, 300))) {
        return error(401, 'Challenge nonce has already been used.');
      }

      const rates = await ports.claimRates(request.clientIp, wallet);
      if (!rates.ok) return error(rates.status, rates.error);
      rateClaims = rates.claims;

      const { evaluation, scoringMode } = await ports.evaluate(activityText);
      if (!evaluation.valid || !isKnownActivity(evaluation.activity)) {
        await ports.releaseRates(rateClaims);
        rateClaims = null;
        return json(422, {
          error: `Activity not eligible for reward. ${evaluation.rationale}`,
          activity: evaluation.activity,
          scoringMode,
        });
      }

      const activity = evaluation.activity as RewardActivity;
      const recentKey = `recent:wallet:${wallet}`;
      let recent: string[] = [];
      try {
        recent = await ports.listRecent(recentKey);
      } catch {
        recent = [];
      }
      const integrity = ports.assessIntegrity(activityText, recent);
      const effortScore =
        Math.round(evaluation.score * integrity.effortMultiplier * 1000) / 1000;
      const base = BASE_REWARD[activity];
      const bonus = Math.round(effortScore * MAX_BONUS[activity] * 10) / 10;
      const reward = Math.min(
        Math.round((base + bonus) * 10) / 10,
        MAX_REWARD_PER_TX_XLM,
      );

      const budgets = await ports.reserveBudgets(wallet, reward);
      if (!budgets.ok) {
        await ports.releaseRates(rateClaims);
        rateClaims = null;
        return error(429, budgets.error);
      }
      budgetReservation = budgets.reservation;
      const submitted = await ports.submitReward({
        wallet,
        rewardXlm: reward,
        activity,
      });

      if (!submitted.ok && 'pending' in submitted && submitted.pending) {
        try {
          await ports.markPending({
            txHash: submitted.txHash,
            wallet,
            rewardXlm: reward,
            activity,
            createdAt: ports.now().toISOString(),
          });
        } catch {
          // Pending ledger persistence is best effort after a successful submit.
        }
        void ports
          .notifyOps(
            `⏳ Pending reconcile\nTx: <code>${submitted.txHash}</code>\nAmount: ${reward} XLM\nCategory: <code>${activity}</code>`,
          )
          .catch(() => undefined);
        rateClaims = null;
        budgetReservation = null;
        return json<RewardApiPending>(202, {
          pending: true,
          txHash: submitted.txHash,
          reward,
          activity,
          error: submitted.error,
          scoringMode,
        });
      }

      if (!submitted.ok) {
        await ports.releaseBudgets(budgetReservation);
        budgetReservation = null;
        await ports.releaseRates(rateClaims);
        rateClaims = null;
        const status = 'status' in submitted ? submitted.status : 500;
        return error(status, submitted.error);
      }

      rateClaims = null;
      budgetReservation = null;
      try {
        await ports.addRecent(
          recentKey,
          ports.fingerprint(activityText),
          20,
          30 * 24 * 60 * 60,
        );
      } catch {
        // Recent history is best effort after payout.
      }

      let identityId: string | null = null;
      let sessionToken: string | null = null;
      try {
        const identity = await ports.bindIdentity(wallet);
        identityId = identity.id;
        sessionToken = ports.issueSession(identity).token;
      } catch {
        // Identity bind is best effort after payout.
      }
      const payout = {
        txHash: submitted.txHash,
        wallet,
        identityId,
        amount: reward,
        activity,
        effortScore,
        scoringMode,
        createdAt: ports.now().toISOString(),
      };
      try {
        await ports.appendPayout(JSON.stringify(payout));
      } catch {
        // Public payout ledger is best effort after payout.
      }
      void ports
        .notifyPayout({
          txHash: submitted.txHash,
          wallet,
          amount: reward,
          activity,
          effortScore,
        })
        .catch(() => undefined);

      return json<RewardApiSuccess>(200, {
        txHash: submitted.txHash,
        reward,
        base,
        bonus,
        effortScore,
        activity,
        reason: evaluation.rationale,
        criteria: evaluation.criteria,
        flagged: integrity.flagged,
        flagReason: integrity.reasons[0] ?? null,
        integrityReasons: integrity.reasons,
        scoringMode,
        identityId,
        sessionToken,
      });
    } catch (cause) {
      if (ports.isStoreUnavailable(cause)) return error(503, (cause as Error).message);
      await ports.releaseBudgets(budgetReservation);
      await ports.releaseRates(rateClaims);
      const message = (cause as Error).message ?? String(cause);
      if (message.includes('Daily treasury') || message.includes('Daily recipient')) {
        return error(429, 'On-chain daily payout cap exceeded. Try again tomorrow.');
      }
      if (message.toLowerCase().includes('insufficient') || message.toLowerCase().includes('balance')) {
        return error(402, 'Insufficient treasury balance to cover this reward.');
      }
      if (message.includes('404') || message.toLowerCase().includes('not found')) {
        return error(404, 'Contract or account not found on Stellar testnet.');
      }
      return error(500, `Transaction failed: ${message}`);
    }
  };
}

function parsePayouts(raw: string[]): PayoutRecord[] {
  const entries: PayoutRecord[] = [];
  for (const value of raw) {
    try {
      entries.push(JSON.parse(value) as PayoutRecord);
    } catch {
      // Skip malformed historical rows.
    }
  }
  return entries;
}

export function createPayoutsRoute(ports: PayoutsPorts): HttpRoute {
  return async (request) => {
    if (request.method !== 'GET') return methodNotAllowed();
    const entries = parsePayouts(await ports.listPayouts(200));
    const publicEntries: PublicPayoutEntry[] = entries.map((entry) => ({
      txHash: entry.txHash,
      wallet: ports.redactWallet(entry.wallet),
      identityId: entry.identityId ?? null,
      amount: entry.amount,
      activity: entry.activity,
      effortScore: entry.effortScore,
      scoringMode: entry.scoringMode ?? null,
      createdAt: entry.createdAt,
    }));
    const tableRows = publicEntries.slice(0, 50).map((entry, index) => ({
      n: index + 1,
      date: entry.createdAt.slice(0, 16).replace('T', ' '),
      wallet: entry.wallet,
      identityId: entry.identityId,
      amount: entry.amount,
      activity: entry.activity,
      txUrl: ports.transactionUrl(entry.txHash),
      txHash: entry.txHash,
    }));
    return json<PayoutsApiSuccess>(200, {
      count: entries.length,
      uniqueWallets: new Set(entries.map((entry) => entry.wallet)).size,
      uniqueIdentities: new Set(
        entries.map((entry) => entry.identityId).filter((id): id is string => Boolean(id)),
      ).size,
      totalXlm: Math.round(entries.reduce((sum, entry) => sum + entry.amount, 0) * 10) / 10,
      entries: publicEntries,
      tableRows,
    });
  };
}

export function createReconcileRoute(ports: ReconcilePorts): HttpRoute {
  return async (request) => {
    if (request.method !== 'POST' && request.method !== 'GET') return methodNotAllowed();
    const cronSecret = ports.cronSecret?.trim() ?? '';
    if (ports.production && !cronSecret) {
      return error(503, 'CRON_SECRET is required in production.');
    }
    if (cronSecret && (request.headers.authorization ?? '') !== `Bearer ${cronSecret}`) {
      return error(401, 'Unauthorized');
    }

    const settled: string[] = [];
    const failed: string[] = [];
    const stillPending: string[] = [];
    for (const entry of await ports.listPending()) {
      try {
        const status = await ports.transactionStatus(entry.txHash);
        if (status === 'success') {
          await ports
            .appendPayout(
              JSON.stringify({
                txHash: entry.txHash,
                wallet: entry.wallet,
                amount: entry.rewardXlm,
                activity: entry.activity,
                createdAt: entry.createdAt,
                reconciled: true,
              }),
            )
            .catch(() => undefined);
          await ports.removePending(entry.txHash);
          settled.push(entry.txHash);
        } else if (status === 'failed') {
          await ports.removePending(entry.txHash);
          failed.push(entry.txHash);
          void ports
            .notifyOps(
              `❌ Pending tx failed on-chain\n<code>${entry.txHash}</code>\nManual budget review may be needed.`,
            )
            .catch(() => undefined);
        } else {
          stillPending.push(entry.txHash);
          if (ports.now().getTime() - Date.parse(entry.createdAt) > 15 * 60 * 1000) {
            void ports
              .notifyOps(
                `⏰ Pending >15m\n<code>${entry.txHash}</code>\n${entry.rewardXlm} XLM · category <code>${entry.activity}</code>`,
              )
              .catch(() => undefined);
          }
        }
      } catch {
        stillPending.push(entry.txHash);
      }
    }

    let capAlert: string | null = null;
    try {
      const daily = await ports.getDailyDisbursed();
      if (daily >= ports.treasuryDailyCap * 0.8) {
        capAlert = `Treasury daily ${daily}/${ports.treasuryDailyCap} XLM (≥80%)`;
        void ports.notifyOps(`⚠️ ${capAlert}`).catch(() => undefined);
      }
    } catch {
      // Cap monitoring is best effort.
    }
    let ledgerCount = 0;
    try {
      ledgerCount = (await ports.listPayouts(50)).length;
    } catch {
      // Ledger sample is best effort.
    }
    return json<ReconcileApiSuccess>(200, {
      ok: true,
      pending: stillPending.length,
      settled: settled.length,
      failed: failed.length,
      ledgerSample: ledgerCount,
      capAlert,
    });
  };
}
