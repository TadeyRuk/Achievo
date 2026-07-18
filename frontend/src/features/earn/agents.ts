/**
 * Achievo Agent Pipeline — client-side hints only.
 * Server Groq evaluation in api/reward.ts is authoritative for payouts.
 */

import {
  ACTIVITY_WHITELIST,
  classifyActivityKeyword,
  estimateBaseReward,
  estimateMaxReward,
  isKnownActivity,
} from '@achievo/shared';

export interface ActivityResult {
  activity: string;
  valid: boolean;
  /** Base reward hint (not max). */
  suggestedReward: number;
  /** Max possible after effort bonus — for UI estimates. */
  maxReward: number;
}

export interface VerificationResult {
  status: 'approved' | 'rejected';
  reason?: string;
}

export interface RewardResult {
  reward: number;
  currency: 'XLM';
}

export interface FeedbackResult {
  message: string;
  type: 'success' | 'failure';
}

export function activityAgent(text: string): ActivityResult {
  const matched = classifyActivityKeyword(text);

  if (matched === 'unknown') {
    return { activity: 'unknown', valid: false, suggestedReward: 0, maxReward: 0 };
  }

  return {
    activity: matched,
    valid: true,
    suggestedReward: estimateBaseReward(matched),
    maxReward: estimateMaxReward(matched),
  };
}

export function verificationAgent(activity: string): VerificationResult {
  if (activity === 'unknown' || !isKnownActivity(activity)) {
    return {
      status: 'rejected',
      reason: `"${activity}" is not a recognized activity. Allowed: ${ACTIVITY_WHITELIST.join(', ')}.`,
    };
  }
  return { status: 'approved' };
}

/** Preview estimate — uses max (base + max bonus) so UI never overstates server payout. */
export function rewardAgent(activity: string): RewardResult {
  const reward = estimateMaxReward(activity);
  return { reward, currency: 'XLM' };
}

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
