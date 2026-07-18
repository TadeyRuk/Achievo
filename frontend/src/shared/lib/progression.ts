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

/** Streak length at each multiple of which a freeze token is awarded. */
export const FREEZE_MILESTONE = 7;

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

export interface StreakReconciliation {
  /** Freeze-aware streak length (single-day gaps bridged by tokens). */
  streak: number;
  /** Freeze tokens remaining after bridging + awarding this run. */
  freezes: number;
  /** Freeze tokens newly awarded this run (for a "pop" animation). */
  freezesEarned: number;
  /** The StoredProgression to persist so results are stable across sessions. */
  storedNext: Required<StoredProgression>;
}

/**
 * Freeze-aware streak. Walks backwards from today (with the same today-not-yet-
 * logged grace as computeStreak) and:
 *   • bridges an ISOLATED single missed day by consuming one freeze token
 *     (a two-day gap always breaks the streak, tokens or not);
 *   • re-bridges days already paid for on a prior run (idempotent);
 *   • awards one freeze token per FREEZE_MILESTONE (7) days of streak, once
 *     per milestone crossed (no double-award).
 *
 * Pure + deterministic. `storedNext` is what the caller should persist.
 */
export function reconcileStreak(
  history: ProgressionHistoryItem[],
  stored: StoredProgression = {},
  now: Date = new Date(),
): StreakReconciliation {
  let freezes = Math.max(0, stored.freezes ?? 0);
  const consumed = new Set(stored.freezeConsumedDays ?? []);
  const earnedMilestone0 = stored.lastAwardedStreakMilestone ?? 0;

  const finish = (streak: number, earned: number): StreakReconciliation => {
    let freezesEarned = 0;
    let earnedMilestone = earnedMilestone0;
    const target = Math.floor(streak / FREEZE_MILESTONE) * FREEZE_MILESTONE;
    if (target > earnedMilestone0) {
      freezesEarned = (target - earnedMilestone0) / FREEZE_MILESTONE;
      freezes += freezesEarned;
      earnedMilestone = target;
    }
    return {
      streak,
      freezes,
      freezesEarned: earned + freezesEarned,
      storedNext: {
        freezes,
        freezeConsumedDays: [...consumed],
        lastAwardedStreakMilestone: earnedMilestone,
      },
    };
  };

  if (history.length === 0) return finish(0, 0);

  const daySet = new Set(history.map((item) => dayKey(new Date(item.timestamp))));
  const today = new Date(now);
  const startOffset = daySet.has(dayKey(today)) ? 0 : 1;

  let count = 0;
  const MAX = 365 * 2;
  for (let i = startOffset; i < MAX; ) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);

    if (daySet.has(key)) {
      count++;
      i++;
      continue;
    }

    // Missed day. Only an isolated single gap (older neighbour active) can be bridged.
    const older = new Date(today);
    older.setDate(today.getDate() - (i + 1));
    const olderActive = daySet.has(dayKey(older));

    if (olderActive && consumed.has(key)) {
      i++; // already paid for on a prior run — bridge for free
      continue;
    }
    if (olderActive && freezes > 0) {
      freezes--;
      consumed.add(key);
      i++;
      continue;
    }
    break; // two-day gap, or no token available
  }

  return finish(count, 0);
}

// ─── XP & activity counts ───────────────────────────────────────────────────────

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

// ─── Your Next Win (dashboard coach card) ────────────────────────────────────

export type NextWinKind =
  | "first_activity"
  | "streak_at_risk"
  | "rank_progress"
  | "max_rank";

export interface NextWin {
  kind: NextWinKind;
  title: string;
  subtitle: string;
  requirements: string[];
  progressPercent: number | null;
  ctaLabel: string;
}

/** Days until the next freeze-token milestone; null if not within 2 days. */
function freezeBullet(streak: number): string | null {
  if (streak <= 0) return null;
  const nextMilestone = (Math.floor(streak / FREEZE_MILESTONE) + 1) * FREEZE_MILESTONE;
  const daysUntil = nextMilestone - streak;
  if (daysUntil <= 0 || daysUntil > 2) return null;
  return daysUntil === 1
    ? "1 more day until a streak freeze token"
    : `${daysUntil} more days until a streak freeze token`;
}

/** Structured bullets for what's still needed to reach the next scholar rank. */
function rankRequirementBullets(
  xp: number,
  streak: number,
  counts: ActivityCounts,
  rank: RankInfo,
): string[] {
  if (rank.nextName === "Max Rank") return [];
  if (rank.reqMsg === "Ready to rank up!") return ["You're ready to rank up!"];

  const bullets: string[] = [];
  if (rank.name === "Bronze Scholar") {
    if (xp < 1000) {
      const diff = 1000 - xp;
      bullets.push(`${diff.toLocaleString()} XP (~${diff / 100} XLM)`);
    }
    if (counts.volunteering < 1) bullets.push("1 volunteering activity");
  } else if (rank.name === "Silver Scholar") {
    if (xp < 2500) {
      const diff = 2500 - xp;
      bullets.push(`${diff.toLocaleString()} XP (~${diff / 100} XLM)`);
    }
    if (counts.tutoringOrMath < 1) bullets.push("1 tutoring or math activity");
  } else if (rank.name === "Gold Scholar") {
    if (xp < 5000) {
      const diff = 5000 - xp;
      bullets.push(`${diff.toLocaleString()} XP (~${diff / 100} XLM)`);
    }
    if (counts.workshop < 1) bullets.push("1 workshop activity");
    if (streak < 3) bullets.push("3-day streak");
  } else if (rank.name === "Platinum Scholar") {
    if (xp < 10000) {
      const diff = 10000 - xp;
      bullets.push(`${diff.toLocaleString()} XP (~${diff / 100} XLM)`);
    }
    if (counts.science < 1) bullets.push("1 science activity");
    if (streak < 5) bullets.push("5-day streak");
  }
  return bullets;
}

/**
 * Pick the single most useful next action for the dashboard coach card.
 * Priority: first activity → max rank → streak at risk → rank progress.
 * Daily goal is intentionally left to the hero metrics, not this card.
 */
export function getNextWin(
  history: ProgressionHistoryItem[],
  stored: StoredProgression = {},
  now: Date = new Date(),
  todayCount: number = 0,
): NextWin {
  const CTA = "Submit Activity";

  if (history.length === 0) {
    return {
      kind: "first_activity",
      title: "Log your first activity",
      subtitle: "Earn XP, start your streak, and unlock the First Win milestone.",
      requirements: [],
      progressPercent: null,
      ctaLabel: CTA,
    };
  }

  const rec = reconcileStreak(history, stored, now);
  const streak = rec.streak;
  const xp = computeXp(history);
  const counts = activityCounts(history);
  const rankInfo = getRankInfo(xp, streak, counts);
  const pct = progressPercent(xp, rankInfo);
  const freeze = freezeBullet(streak);

  if (rankInfo.nextName === "Max Rank") {
    const requirements = [
      streak > 0
        ? `Keep your ${streak}-day streak alive`
        : "Start a new streak to keep momentum",
    ];
    if (freeze) requirements.push(freeze);
    return {
      kind: "max_rank",
      title: "You're a Diamond Scholar",
      subtitle: "Highest rank unlocked — keep showing up.",
      requirements,
      progressPercent: 100,
      ctaLabel: CTA,
    };
  }

  if (streak > 0 && todayCount === 0) {
    const requirements = [`Keep your ${streak}-day streak — submit before midnight`];
    if (freeze) requirements.push(freeze);
    return {
      kind: "streak_at_risk",
      title: "Protect your streak",
      subtitle: "You haven't logged an activity today yet.",
      requirements,
      progressPercent: null,
      ctaLabel: CTA,
    };
  }

  const requirements = rankRequirementBullets(xp, streak, counts, rankInfo);
  if (freeze) requirements.push(freeze);

  return {
    kind: "rank_progress",
    title: `Reach ${rankInfo.nextName}`,
    subtitle: `Currently ${rankInfo.name} · ${xp.toLocaleString()} XP`,
    requirements,
    progressPercent: pct,
    ctaLabel: CTA,
  };
}

// ─── Public agent surface ──────────────────────────────────────────────────

export const ProgressionAgent = {
  computeStreak,
  computeXp,
  activityCounts,
  computeUnlocks,
  getRankInfo,
  progressPercent,
  reconcileStreak,
  getNextWin,

  /**
   * Reconcile persisted freeze state against history + current time. Returns
   * the freeze-aware streak, remaining/earned tokens, and the StoredProgression
   * to persist. Call this from the state owner (App) to advance + persist.
   */
  reconcile(
    history: ProgressionHistoryItem[],
    stored: StoredProgression = {},
    now: Date = new Date(),
  ): StreakReconciliation {
    return reconcileStreak(history, stored, now);
  },

  /**
   * Aggregate the full progression snapshot from reward history (+ optional
   * persisted freeze state). Streak/rank are freeze-aware. This is the stable
   * entry point screens should prefer for display; it does not persist.
   */
  state(
    history: ProgressionHistoryItem[],
    stored: StoredProgression = {},
    now: Date = new Date(),
  ): ProgressionState {
    const rec = reconcileStreak(history, stored, now);
    const streak = rec.streak;
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
      freezes: rec.freezes,
    };
  },
};

/** Screen-facing progression snapshot owned by the app composition root. */
export type ProgressionViewModel = {
  stored: StoredProgression;
  state: ProgressionState;
  getNextWin: (todayCount: number, now?: Date) => NextWin;
};

/**
 * Build the single progression view-model path screens should consume.
 * Prefer this over calling ProgressionAgent from feature screens.
 */
export function buildProgressionViewModel(
  history: ProgressionHistoryItem[],
  stored: StoredProgression = {},
  now: Date = new Date(),
): ProgressionViewModel {
  const state = ProgressionAgent.state(history, stored, now);
  return {
    stored,
    state,
    getNextWin: (todayCount: number, at: Date = new Date()) =>
      ProgressionAgent.getNextWin(history, stored, at, todayCount),
  };
}
