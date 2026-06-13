/**
 * Achievo Agent Pipeline
 * Five pure, deterministic functions that process a student activity
 * submission into an XLM reward decision — no external dependencies.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActivityResult {
  activity: string;
  valid: boolean;
  suggestedReward: number; // in XLM
}

export interface VerificationResult {
  status: 'approved' | 'rejected';
  reason?: string;
}

export interface RewardResult {
  reward: number; // in XLM
  currency: 'XLM';
}

export interface FeedbackResult {
  message: string;
  type: 'success' | 'failure';
}

// ─── Reward table ─────────────────────────────────────────────────────────────

const REWARD_TABLE: Record<string, number> = {
  tutoring:      5,
  workshop:      2,
  volunteering:  10,
  event:         3,
  participation: 3,
};

const ACTIVITY_WHITELIST = Object.keys(REWARD_TABLE);

// ─── Agent 1: Activity Agent ──────────────────────────────────────────────────
// Parses free-form student text into a structured activity type + reward hint.

export function activityAgent(text: string): ActivityResult {
  const lower = text.toLowerCase();
  const matched = ACTIVITY_WHITELIST.find((keyword) => lower.includes(keyword));

  if (!matched) {
    return { activity: 'unknown', valid: false, suggestedReward: 0 };
  }

  return {
    activity: matched,
    valid: true,
    suggestedReward: REWARD_TABLE[matched],
  };
}

// ─── Agent 2: Verification Agent ─────────────────────────────────────────────
// Validates the activity type against the approved whitelist.

export function verificationAgent(activity: string): VerificationResult {
  if (activity === 'unknown' || !ACTIVITY_WHITELIST.includes(activity)) {
    return {
      status: 'rejected',
      reason: `"${activity}" is not a recognized activity. Allowed: ${ACTIVITY_WHITELIST.join(', ')}.`,
    };
  }
  return { status: 'approved' };
}

// ─── Agent 3: Reward Decision Agent ──────────────────────────────────────────
// Assigns the canonical XLM reward for a verified activity type.

export function rewardAgent(activity: string): RewardResult {
  const reward = REWARD_TABLE[activity] ?? 0;
  return { reward, currency: 'XLM' };
}

// ─── Agent 4: Stellar Agent (handled externally) ─────────────────────────────
// Implemented via sendRewardOnChain() in contract.ts — it builds, signs,
// and submits the Soroban send_reward transaction using the connected wallet.

// ─── Agent 5: Transaction Feedback Agent ─────────────────────────────────────
// Formats the blockchain result into a human-readable UI message.

export function feedbackAgent(result: {
  success: boolean;
  txHash?: string;
  reward?: number;
}): FeedbackResult {
  if (result.success && result.txHash) {
    return {
      message: `Reward of ${result.reward} XLM sent! Transaction: ${result.txHash.slice(0, 8)}...`,
      type: 'success',
    };
  }
  return {
    message: 'Transaction failed. Please try again.',
    type: 'failure',
  };
}
