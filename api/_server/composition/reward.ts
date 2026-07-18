import { createRewardRoute } from '../features/rewards/routes';
import type { RewardPorts } from '../features/rewards/ports';
import {
  notifyOpsAlert,
  notifyPayoutTelegram,
} from '../infrastructure/telegram';
import {
  addRecent,
  appendPayout,
  claimOnce,
  listRecent,
  StoreUnavailableError,
} from '../infrastructure/store';
import {
  bindIdentity,
  issueSessionToken,
} from '../infrastructure/identity';
import {
  claimRewardRates,
  markPendingReconcile,
  releaseDailyBudgets,
  releaseRateClaims,
  reserveDailyBudgets,
} from '../infrastructure/rewards';
import {
  hashActivityIntent,
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
  notifyPayout: notifyPayoutTelegram,
  notifyOps: notifyOpsAlert,
  now() {
    return new Date();
  },
  isStoreUnavailable(cause) {
    return cause instanceof StoreUnavailableError;
  },
};

export const rewardRoute = createRewardRoute(rewardPorts);
