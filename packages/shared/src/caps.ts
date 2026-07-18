import { STROOP_FACTOR } from "./constants.js";

/** Max single payout (matches on-chain MAX_REWARD_PER_TX). */
export const MAX_REWARD_PER_TX_XLM = 20;

/** Max treasury disbursement per UTC day (matches on-chain MAX_DAILY_TREASURY). */
export const DAILY_TREASURY_CAP_XLM = 100;

/** Max payout to one recipient per UTC day (matches on-chain MAX_DAILY_PER_RECIPIENT). */
export const DAILY_RECIPIENT_CAP_XLM = 20;

export const MAX_REWARD_PER_TX_STROOPS = MAX_REWARD_PER_TX_XLM * STROOP_FACTOR;
export const DAILY_TREASURY_CAP_STROOPS = DAILY_TREASURY_CAP_XLM * STROOP_FACTOR;
export const DAILY_RECIPIENT_CAP_STROOPS = DAILY_RECIPIENT_CAP_XLM * STROOP_FACTOR;

/** UTC calendar day key `YYYY-MM-DD` for Redis budget counters. */
export function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
