import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StrKey } from '@stellar/stellar-sdk';
import {
  BASE_REWARD,
  MAX_ACTIVITY_TEXT_LENGTH,
  MAX_BONUS,
  MAX_REWARD_PER_TX_XLM,
  isKnownActivity,
} from '@achievo/shared';
import {
  claimOnce,
  listRecent,
  addRecent,
  appendPayout,
  StoreUnavailableError,
} from './_lib/store';
import { hashActivityIntent } from './_lib/payout/intent';
import { IntegrityAgent } from './_agents/integrity';
import { notifyPayoutTelegram } from './_lib/notify/telegram';
import { bindIdentity, issueSessionToken } from './_lib/identity';
import { verifyChallenge } from './_lib/payout/challenge';
import { evaluateSubmission } from './_lib/payout/evaluateSubmission';
import {
  releaseDailyBudgets,
  reserveDailyBudgets,
  type BudgetReservation,
} from './_lib/payout/dailyBudgets';
import { claimRewardRates, releaseRateClaims, type RateClaimSet } from './_lib/payout/rateClaims';
import { submitSendReward } from './_lib/payout/submitReward';
import { markPendingReconcile } from './_lib/payout/pendingReconcile';
import { notifyOpsAlert } from './_lib/notify/telegram';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { activityText, wallet, nonce, expiry, mac, signedXdr, intentHash: bodyIntent } = req.body as {
    activityText?: string;
    wallet?: string;
    nonce?: string;
    expiry?: number;
    mac?: string;
    signedXdr?: string;
    intentHash?: string;
  };

  let rateClaims: RateClaimSet | null = null;
  let budgetReservation: BudgetReservation | null = null;

  try {
    if (!wallet || !StrKey.isValidEd25519PublicKey(wallet)) {
      return res.status(400).json({ error: 'Invalid Stellar wallet address.' });
    }

    const trimmed = typeof activityText === 'string' ? activityText.trim() : '';
    if (trimmed.length < 5) {
      return res.status(400).json({ error: 'Activity description too short.' });
    }
    if (trimmed.length > MAX_ACTIVITY_TEXT_LENGTH) {
      return res.status(400).json({
        error: `Activity description must be at most ${MAX_ACTIVITY_TEXT_LENGTH} characters.`,
      });
    }

    if (!nonce || !expiry || !mac || !signedXdr) {
      return res.status(400).json({ error: 'Missing wallet ownership proof. Please retry.' });
    }

    const intentHash = hashActivityIntent(trimmed);
    if (bodyIntent && bodyIntent.toLowerCase() !== intentHash) {
      return res.status(400).json({ error: 'Activity text does not match challenge intent.' });
    }

    const adminSecret = process.env.ADMIN_SECRET;
    const nonceSecret = process.env.NONCE_HMAC_SECRET;
    if (!adminSecret || !nonceSecret) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    const proof = verifyChallenge(
      nonceSecret, wallet, nonce, expiry, mac, signedXdr, intentHash,
    );
    if (!proof.ok) return res.status(401).json({ error: proof.error });

    const nonceKey = `nonce:${nonce}`;
    const claimed = await claimOnce(nonceKey, 300);
    if (!claimed) {
      return res.status(401).json({ error: 'Challenge nonce has already been used.' });
    }

    const rates = await claimRewardRates(req, wallet);
    if (!rates.ok) {
      return res.status(rates.status).json({ error: rates.error });
    }
    rateClaims = rates.claims;

    const { evaluation, scoringMode } = await evaluateSubmission(trimmed);

    if (!evaluation.valid || !isKnownActivity(evaluation.activity)) {
      await releaseRateClaims(rateClaims);
      rateClaims = null;
      return res.status(422).json({
        error: `Activity not eligible for reward. ${evaluation.rationale}`,
        activity: evaluation.activity,
        scoringMode,
      });
    }

    const recentKey = `recent:wallet:${wallet}`;
    let recent: string[] = [];
    try {
      recent = await listRecent(recentKey);
    } catch {
      recent = [];
    }
    const integrity = IntegrityAgent.assess(trimmed, { recent });

    const effortScore = Math.round(evaluation.score * integrity.effortMultiplier * 1000) / 1000;
    const base = BASE_REWARD[evaluation.activity];
    const bonus = Math.round(effortScore * MAX_BONUS[evaluation.activity] * 10) / 10;
    const reward = Math.min(Math.round((base + bonus) * 10) / 10, MAX_REWARD_PER_TX_XLM);

    const budgets = await reserveDailyBudgets(wallet, reward);
    if (!budgets.ok) {
      await releaseRateClaims(rateClaims);
      rateClaims = null;
      return res.status(429).json({ error: budgets.error });
    }
    budgetReservation = budgets.reservation;

    const submitted = await submitSendReward({
      adminSecret,
      wallet,
      rewardXlm: reward,
      activity: evaluation.activity,
    });

    if (!submitted.ok && 'pending' in submitted && submitted.pending) {
      // Keep budgets/rate claims reserved until reconcile confirms success or failure.
      try {
        await markPendingReconcile({
          txHash: submitted.txHash,
          wallet,
          rewardXlm: reward,
          activity: evaluation.activity,
          createdAt: new Date().toISOString(),
        });
      } catch { /* ignore */ }
      void notifyOpsAlert(
        `⏳ Pending reconcile\nTx: <code>${submitted.txHash}</code>\nWallet: ${wallet}\nAmount: ${reward} XLM`,
      );
      rateClaims = null;
      budgetReservation = null;
      return res.status(202).json({
        pending: true,
        txHash: submitted.txHash,
        reward,
        activity: evaluation.activity,
        error: submitted.error,
        scoringMode,
      });
    }

    if (!submitted.ok) {
      await releaseDailyBudgets(budgetReservation);
      budgetReservation = null;
      await releaseRateClaims(rateClaims);
      rateClaims = null;
      const status = 'status' in submitted ? submitted.status : 500;
      return res.status(status).json({ error: submitted.error });
    }

    // Success — keep rate slots and budgets.
    rateClaims = null;
    budgetReservation = null;

    try {
      await addRecent(recentKey, IntegrityAgent.fingerprint(trimmed), 20, 30 * 24 * 60 * 60);
    } catch { /* ignore */ }

    let identityId: string | null = null;
    let sessionToken: string | null = null;
    try {
      const identity = await bindIdentity(wallet);
      identityId = identity.id;
      sessionToken = issueSessionToken(identity).token;
    } catch { /* identity bind is best-effort after payout */ }

    const payoutRecord = {
      txHash: submitted.txHash,
      wallet,
      identityId,
      amount: reward,
      activity: evaluation.activity,
      effortScore,
      scoringMode,
      createdAt: new Date().toISOString(),
    };
    try {
      await appendPayout(JSON.stringify(payoutRecord));
    } catch { /* ignore */ }
    void notifyPayoutTelegram({
      txHash: submitted.txHash,
      wallet,
      amount: reward,
      activity: evaluation.activity,
      effortScore,
    });

    return res.status(200).json({
      txHash: submitted.txHash,
      reward,
      base,
      bonus,
      effortScore,
      activity: evaluation.activity,
      reason: evaluation.rationale,
      criteria: evaluation.criteria,
      flagged: integrity.flagged,
      flagReason: integrity.reasons[0] ?? null,
      integrityReasons: integrity.reasons,
      scoringMode,
      identityId,
      sessionToken,
    });
  } catch (err) {
    if (err instanceof StoreUnavailableError) {
      return res.status(503).json({ error: err.message });
    }
    await releaseDailyBudgets(budgetReservation);
    await releaseRateClaims(rateClaims);

    const msg = (err as Error).message ?? String(err);
    if (msg.includes('Daily treasury') || msg.includes('Daily recipient')) {
      return res.status(429).json({ error: 'On-chain daily payout cap exceeded. Try again tomorrow.' });
    }
    if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
      return res.status(402).json({ error: 'Insufficient treasury balance to cover this reward.' });
    }
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      return res.status(404).json({ error: 'Contract or account not found on Stellar testnet.' });
    }
    return res.status(500).json({ error: `Transaction failed: ${msg}` });
  }
}
