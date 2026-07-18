import { rpc } from '@stellar/stellar-sdk';
import { redactWallet } from '@achievo/identity';
import { getDailyDisbursed } from '@achievo/stellar';
import {
  CONTRACT_ID,
  DAILY_TREASURY_CAP_XLM,
  SOROBAN_RPC_URL,
} from '@achievo/shared';
import {
  createGeneralFeedbackRoute,
  createTransactionFeedbackRoute,
} from '../features/feedback/routes';
import { createHealthRoute } from '../features/health/routes';
import { createIdentityRoute } from '../features/identity/routes';
import {
  createNonceRoute,
  createPayoutsRoute,
  createReconcileRoute,
  createRewardRoute,
} from '../features/rewards/routes';
import {
  GoogleFormsConfigError,
  GoogleFormsSubmitError,
  notifyOpsAlert,
  notifyPayoutTelegram,
  stellarExpertTxUrl,
  submitFeedbackForm,
} from '../infrastructure/notifications';
import {
  appendPayout,
  claimOnce,
  getRedis,
  listPayouts,
  listRecent,
  addRecent,
  releaseClaim,
  StoreUnavailableError,
} from '../infrastructure/store';
import {
  bindIdentity,
  getIdentityByWallet,
  issueSessionToken,
  verifySessionToken,
} from '../infrastructure/identity';
import {
  claimRewardRates,
  listPendingReconcile,
  markPendingReconcile,
  releaseDailyBudgets,
  releaseRateClaims,
  removePendingReconcile,
  reserveDailyBudgets,
} from '../infrastructure/rewards';
import {
  hashActivityIntent,
  issueChallenge,
  rpcServer,
  StrKey,
  submitSendReward,
  verifyChallenge,
} from '../infrastructure/stellar';
import {
  HeuristicScoringAgent,
  ScoringAgent,
} from '../infrastructure/evaluator';
import { IntegrityAgent } from '../infrastructure/integrity';
import type { FeedbackPorts } from '../features/feedback/ports';
import type { HealthPorts } from '../features/health/ports';
import type { RewardPorts } from '../features/rewards/ports';

const feedbackPorts: FeedbackPorts = {
  claimOnce,
  releaseClaim,
  submitTransaction(payload) {
    return submitFeedbackForm({ type: 'transaction', comment: null, ...payload });
  },
  submitGeneral(payload) {
    return submitFeedbackForm({ type: 'general', comment: null, ...payload });
  },
  mapError(cause) {
    if (cause instanceof StoreUnavailableError || cause instanceof GoogleFormsConfigError) {
      return { status: 503, message: cause.message };
    }
    if (cause instanceof GoogleFormsSubmitError) {
      return { status: 502, message: cause.message };
    }
    return null;
  },
};

const healthPorts: HealthPorts = {
  get contractConfigured() {
    return Boolean(CONTRACT_ID && !String(CONTRACT_ID).includes('PLACEHOLDER'));
  },
  get production() {
    return process.env.VERCEL_ENV === 'production';
  },
  async checkRedis() {
    try {
      const redis = getRedis();
      if (!redis) return process.env.VERCEL_ENV === 'production' ? 'down' : 'degraded';
      await redis.ping();
      return 'ok';
    } catch {
      return 'down';
    }
  },
  async checkRpc() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(SOROBAN_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
        signal: controller.signal,
      });
      return response.ok ? 'ok' : 'degraded';
    } catch {
      return 'down';
    } finally {
      clearTimeout(timer);
    }
  },
};

const rewardPorts: RewardPorts = {
  get adminSecret() {
    return process.env.ADMIN_SECRET;
  },
  get nonceSecret() {
    return process.env.NONCE_HMAC_SECRET;
  },
  get cronSecret() {
    return process.env.CRON_SECRET;
  },
  isValidWallet: StrKey.isValidEd25519PublicKey,
  hashIntent: hashActivityIntent,
  verifyChallenge(input) {
    if (!process.env.NONCE_HMAC_SECRET) return { ok: false, error: 'Server configuration error.' };
    return verifyChallenge(
      process.env.NONCE_HMAC_SECRET,
      input.wallet,
      input.nonce,
      input.expiry,
      input.mac,
      input.signedXdr,
      input.intentHash,
    );
  },
  issueChallenge(wallet, intentHash) {
    if (!process.env.NONCE_HMAC_SECRET) throw new Error('Server configuration error.');
    return issueChallenge(wallet, intentHash, process.env.NONCE_HMAC_SECRET);
  },
  claimOnce,
  claimRates: claimRewardRates,
  releaseRates: releaseRateClaims,
  async evaluate(text) {
    try {
      return { evaluation: await ScoringAgent.evaluate(text), scoringMode: 'groq' };
    } catch {
      return { evaluation: HeuristicScoringAgent.evaluate(text), scoringMode: 'heuristic' };
    }
  },
  assessIntegrity(text, recent) {
    return IntegrityAgent.assess(text, { recent });
  },
  fingerprint: IntegrityAgent.fingerprint,
  listRecent,
  addRecent,
  reserveBudgets: reserveDailyBudgets,
  releaseBudgets: releaseDailyBudgets,
  submitReward: submitSendReward,
  markPending: markPendingReconcile,
  bindIdentity,
  issueSession: issueSessionToken,
  appendPayout,
  listPayouts,
  redactWallet,
  transactionUrl: stellarExpertTxUrl,
  notifyPayout: notifyPayoutTelegram,
  notifyOps: notifyOpsAlert,
  listPending: listPendingReconcile,
  removePending: removePendingReconcile,
  async transactionStatus(txHash) {
    const transaction = await rpcServer.getTransaction(txHash);
    if (transaction.status === rpc.Api.GetTransactionStatus.SUCCESS) return 'success';
    if (transaction.status === rpc.Api.GetTransactionStatus.FAILED) return 'failed';
    return 'pending';
  },
  getDailyDisbursed,
  treasuryDailyCap: DAILY_TREASURY_CAP_XLM,
  now() {
    return new Date();
  },
  isStoreUnavailable(cause) {
    return cause instanceof StoreUnavailableError;
  },
};

export const transactionFeedbackRoute = createTransactionFeedbackRoute(feedbackPorts);
export const generalFeedbackRoute = createGeneralFeedbackRoute(feedbackPorts);
export const healthRoute = createHealthRoute(healthPorts);
export const identityRoute = createIdentityRoute({
  isValidWallet: StrKey.isValidEd25519PublicKey,
  redactWallet,
  findByWallet: getIdentityByWallet,
  bind: bindIdentity,
  verifySession: verifySessionToken,
  issueSession: issueSessionToken,
  isStoreUnavailable(cause) {
    return cause instanceof StoreUnavailableError;
  },
});
export const nonceRoute = createNonceRoute(rewardPorts);
export const rewardRoute = createRewardRoute(rewardPorts);
export const payoutsRoute = createPayoutsRoute(rewardPorts);
export const reconcileRoute = createReconcileRoute(rewardPorts);
