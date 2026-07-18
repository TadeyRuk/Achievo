import { rpc } from '@stellar/stellar-sdk';
import { redactWallet } from '@achievo/identity';
import { getDailyDisbursed } from '@achievo/stellar';
import { DAILY_TREASURY_CAP_XLM } from '@achievo/shared';
import {
  createNonceRoute,
  createPayoutsRoute,
  createReconcileRoute,
  createRewardRoute,
} from '../features/rewards/routes';
import type { RewardPorts } from '../features/rewards/ports';
import {
  notifyOpsAlert,
  notifyPayoutTelegram,
  stellarExpertTxUrl,
} from '../infrastructure/notifications';
import {
  addRecent,
  appendPayout,
  claimOnce,
  listPayouts,
  listRecent,
  StoreUnavailableError,
} from '../infrastructure/store';
import {
  bindIdentity,
  issueSessionToken,
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

export const nonceRoute = createNonceRoute(rewardPorts);
export const rewardRoute = createRewardRoute(rewardPorts);
export const payoutsRoute = createPayoutsRoute(rewardPorts);
export const reconcileRoute = createReconcileRoute(rewardPorts);
