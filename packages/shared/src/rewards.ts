/** Canonical activity types rewarded by Achievo. */
export type ActivityType =
  | "tutoring"
  | "workshop"
  | "volunteering"
  | "event"
  | "participation";

/** Base XLM reward before effort bonus (server authoritative). */
export const BASE_REWARD: Record<ActivityType, number> = {
  tutoring: 5,
  workshop: 2,
  volunteering: 10,
  event: 3,
  participation: 3,
};

/** Max effort bonus in XLM (server authoritative). */
export const MAX_BONUS: Record<ActivityType, number> = {
  tutoring: 5,
  workshop: 3,
  volunteering: 5,
  event: 2,
  participation: 2,
};

export const ACTIVITY_WHITELIST: ActivityType[] = Object.keys(
  BASE_REWARD,
) as ActivityType[];

/** Max total a client may preview for an activity (base + max bonus). */
export function estimateMaxReward(activity: string): number {
  if (!(activity in BASE_REWARD)) return 0;
  const key = activity as ActivityType;
  return BASE_REWARD[key] + MAX_BONUS[key];
}

/** Base-only estimate for lightweight client pipeline hints. */
export function estimateBaseReward(activity: string): number {
  if (!(activity in BASE_REWARD)) return 0;
  return BASE_REWARD[activity as ActivityType];
}

export function isKnownActivity(activity: string): activity is ActivityType {
  return activity in BASE_REWARD;
}

/** First whitelist keyword found in free-form text (client preview + heuristic). */
export function classifyActivityKeyword(text: string): ActivityType | "unknown" {
  const lower = text.toLowerCase();
  const matched = ACTIVITY_WHITELIST.find((keyword) => lower.includes(keyword));
  return matched ?? "unknown";
}
