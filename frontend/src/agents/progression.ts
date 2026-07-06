/**
 * ProgressionAgent — gamification & retention (persistent, broad domain agent)
 * ────────────────────────────────────────────────────────────────────────
 * The single source of truth for everything progression-related: XP, scholar
 * rank, activity milestones, daily streaks, and (Task 4) streak freezes.
 *
 * Previously this logic was copy-pasted into Dashboard, StudentProfile, and
 * RewardHistory — three subtly divergent copies. It now lives here behind a
 * stable surface (`state()` plus granular pure helpers) so every screen renders
 * from identical numbers, and future capabilities (badges, seasonal challenges,
 * XP multipliers) extend this agent rather than re-deriving state.
 *
 * Pure and deterministic: pass `now` to make time explicit and testable.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Minimal structural shape the agent needs from a reward history entry. */
export interface ProgressionHistoryItem {
  activity: string;
  reward: number;
  timestamp: number;
}

export interface ActivityCounts {
  volunteering: number;
  tutoring: number;
  tutoringOrMath: number;
  workshop: number;
  science: number;
}

export interface RankInfo {
  name: string;
  nextName: string;
  minXP: number;
  maxXP: number;
  reqMsg: string;
}

export interface RankUnlocks {
  silver: boolean;
  gold: boolean;
  platinum: boolean;
  diamond: boolean;
}

/** Persisted progression state (freezes land in Task 4; defaults are inert). */
export interface StoredProgression {
  /** Available streak-freeze tokens. */
  freezes?: number;
  /** Internal bookkeeping for freeze accrual/consumption (Task 4). */
  freezeConsumedDays?: string[];
  lastAwardedStreakMilestone?: number;
}

export interface ProgressionState {
  xp: number;
  streak: number;
  counts: ActivityCounts;
  unlocks: RankUnlocks;
  rankInfo: RankInfo;
  progressPercent: number;
  freezes: number;
}

/** XP awarded per XLM earned. */
export const XP_PER_XLM = 100;

// ─── Streak ────────────────────────────────────────────────────────────────

/** Local "YYYY-MM-DD" day key, matching the historical toLocaleDateString("en-CA"). */
function dayKey(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

/**
 * Consecutive days (ending today) with at least one reward. If today has no
 * entry yet, the streak is measured from yesterday so an active streak isn't
 * shown as broken before the user logs today's activity.
 */
export function computeStreak(history: ProgressionHistoryItem[], now: Date = new Date()): number {
  if (history.length === 0) return 0;
  const daySet = new Set(history.map((item) => dayKey(new Date(item.timestamp))));
  let count = 0;
  const today = new Date(now);
  const startOffset = daySet.has(dayKey(today)) ? 0 : 1;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (daySet.has(dayKey(d))) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// ─── XP & activity counts ────────────────────────────────────────────────────

export function computeXp(history: ProgressionHistoryItem[]): number {
  const totalEarned = history.reduce((sum, item) => sum + item.reward, 0);
  return Math.round(totalEarned * XP_PER_XLM);
}

export function activityCounts(history: ProgressionHistoryItem[]): ActivityCounts {
  const has = (item: ProgressionHistoryItem, kw: string) =>
    item.activity.toLowerCase().includes(kw);
  return {
    volunteering: history.filter((h) => has(h, "volunteer")).length,
    tutoring: history.filter((h) => has(h, "tutor")).length,
    tutoringOrMath: history.filter((h) => has(h, "tutor") || has(h, "math")).length,
    workshop: history.filter((h) => has(h, "workshop")).length,
    science: history.filter((h) => has(h, "science")).length,
  };
}

// ─── Rank ────────────────────────────────────────────────────────────────────

export function computeUnlocks(xp: number, streak: number, counts: ActivityCounts): RankUnlocks {
  return {
    silver: xp >= 1000 && counts.volunteering >= 1,
    gold: xp >= 2500 && counts.tutoringOrMath >= 1,
    platinum: xp >= 5000 && counts.workshop >= 1 && streak >= 3,
    diamond: xp >= 10000 && counts.science >= 1 && streak >= 5,
  };
}

/**
 * Current rank + what's needed to reach the next one. Behaviour is a faithful
 * port of the logic previously inlined in RewardHistory.
 */
export function getRankInfo(xp: number, streak: number, counts: ActivityCounts): RankInfo {
  const isDiamond = xp >= 10000 && counts.science >= 1 && streak >= 5;
  const isPlatinum = xp >= 5000 && counts.workshop >= 1 && streak >= 3;
  const isGold = xp >= 2500 && counts.tutoringOrMath >= 1;
  const isSilver = xp >= 1000 && counts.volunteering >= 1;

  if (isDiamond) {
    return {
      name: "Diamond Scholar",
      nextName: "Max Rank",
      minXP: 10000,
      maxXP: 10000,
      reqMsg: "You have reached the highest scholar rank!",
    };
  } else if (isPlatinum) {
    let reqMsg = "";
    if (xp < 10000) {
      const diff = 10000 - xp;
      reqMsg = `${diff.toLocaleString()} XP (~${diff / 100} XLM)`;
    }
    if (counts.science < 1) reqMsg = reqMsg ? `${reqMsg} + 1 Science` : "1 Science";
    if (streak < 5) reqMsg = reqMsg ? `${reqMsg} + 5-day streak` : "5-day streak";
    return {
      name: "Platinum Scholar",
      nextName: "Diamond Scholar",
      minXP: 5000,
      maxXP: 10000,
      reqMsg: reqMsg ? `Need ${reqMsg}` : "Ready to rank up!",
    };
  } else if (isGold) {
    let reqMsg = "";
    if (xp < 5000) {
      const diff = 5000 - xp;
      reqMsg = `${diff.toLocaleString()} XP (~${diff / 100} XLM)`;
    }
    if (counts.workshop < 1) reqMsg = reqMsg ? `${reqMsg} + 1 Workshop` : "1 Workshop";
    if (streak < 3) reqMsg = reqMsg ? `${reqMsg} + 3-day streak` : "3-day streak";
    return {
      name: "Gold Scholar",
      nextName: "Platinum Scholar",
      minXP: 2500,
      maxXP: 5000,
      reqMsg: reqMsg ? `Need ${reqMsg}` : "Ready to rank up!",
    };
  } else if (isSilver) {
    let reqMsg = "";
    if (xp < 2500) {
      const diff = 2500 - xp;
      reqMsg = `${diff.toLocaleString()} XP (~${diff / 100} XLM)`;
    }
    if (counts.tutoringOrMath < 1) reqMsg = reqMsg ? `${reqMsg} + 1 Tutoring/Math` : "1 Tutoring/Math";
    return {
      name: "Silver Scholar",
      nextName: "Gold Scholar",
      minXP: 1000,
      maxXP: 2500,
      reqMsg: reqMsg ? `Need ${reqMsg}` : "Ready to rank up!",
    };
  } else {
    let reqMsg = "";
    if (xp < 1000) {
      const diff = 1000 - xp;
      reqMsg = `${diff.toLocaleString()} XP (~${diff / 100} XLM)`;
    }
    if (counts.volunteering < 1) reqMsg = reqMsg ? `${reqMsg} + 1 Volunteering` : "1 Volunteering";
    return {
      name: "Bronze Scholar",
      nextName: "Silver Scholar",
      minXP: 0,
      maxXP: 1000,
      reqMsg: reqMsg ? `Need ${reqMsg}` : "Ready to rank up!",
    };
  }
}

export function progressPercent(xp: number, rank: RankInfo): number {
  return rank.minXP === rank.maxXP
    ? 100
    : Math.min(100, Math.max(0, ((xp - rank.minXP) / (rank.maxXP - rank.minXP)) * 100));
}

// ─── Public agent surface ──────────────────────────────────────────────────

export const ProgressionAgent = {
  computeStreak,
  computeXp,
  activityCounts,
  computeUnlocks,
  getRankInfo,
  progressPercent,

  /**
   * Aggregate the full progression snapshot from reward history (+ optional
   * persisted state). This is the stable entry point screens should prefer.
   */
  state(
    history: ProgressionHistoryItem[],
    stored: StoredProgression = {},
    now: Date = new Date(),
  ): ProgressionState {
    const streak = computeStreak(history, now);
    const xp = computeXp(history);
    const counts = activityCounts(history);
    const rankInfo = getRankInfo(xp, streak, counts);
    return {
      xp,
      streak,
      counts,
      unlocks: computeUnlocks(xp, streak, counts),
      rankInfo,
      progressPercent: progressPercent(xp, rankInfo),
      freezes: stored.freezes ?? 0,
    };
  },
};
