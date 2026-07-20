import { createRewardRoute } from '../features/rewards/routes.js';
import type { RewardPorts } from '../features/rewards/ports.js';
import {
  notifyOpsAlert,
  notifyPayoutTelegram,
} from '../infrastructure/telegram.js';
import {
  addRecent,
  appendPayout,
  claimOnce,
  listRecent,
  StoreUnavailableError,
} from '../infrastructure/store/index.js';
import {
  bindIdentity,
  issueSessionToken,
} from '../infrastructure/identity.js';
import {
  claimRewardRates,
  markPendingReconcile,
  releaseDailyBudgets,
  releaseRateClaims,
  reserveDailyBudgets,
} from '../infrastructure/rewards.js';
import {
  hashActivityIntent,
  StrKey,
} from '../infrastructure/stellar.js';
import {
  HeuristicScoringAgent,
  ScoringAgent,
} from '../infrastructure/evaluator.js';
import { IntegrityAgent } from '../infrastructure/integrity.js';
import {
  signAndSubmitReward,
  treasurySignerConfigured,
} from '../infrastructure/treasurySigner.js';
import { sep10Configured, verifyRewardAuthToken } from '../infrastructure/sep10.js';

const rewardPorts: RewardPorts = {
  payoutConfigured() {
    return treasurySignerConfigured() && sep10Configured();
  },
  isValidWallet: StrKey.isValidEd25519PublicKey,
  hashIntent: hashActivityIntent,
  verifyAuthToken: verifyRewardAuthToken,
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
  submitReward: signAndSubmitReward,
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
