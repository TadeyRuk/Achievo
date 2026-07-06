import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  ProgressionAgent,
  computeStreak,
  computeXp,
  activityCounts,
  getRankInfo,
  reconcileStreak,
  FREEZE_MILESTONE,
  type ProgressionHistoryItem,
} from "../agents/progression";

// ── Reference implementations (verbatim copies of the pre-refactor inline
//    logic) so the property tests prove the agent preserves behaviour. ───────

function refStreak(history: ProgressionHistoryItem[], now: Date): number {
  if (history.length === 0) return 0;
  const daySet = new Set(history.map((item) => new Date(item.timestamp).toLocaleDateString("en-CA")));
  let count = 0;
  const today = new Date(now);
  const startOffset = daySet.has(today.toLocaleDateString("en-CA")) ? 0 : 1;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (daySet.has(d.toLocaleDateString("en-CA"))) count++;
    else break;
  }
  return count;
}

function refXp(history: ProgressionHistoryItem[]): number {
  return Math.round(history.reduce((s, i) => s + i.reward, 0) * 100);
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-07-07T12:00:00Z");

const itemArb = fc.record({
  activity: fc.constantFrom("tutoring", "workshop", "volunteering", "science", "math", "event"),
  reward: fc.double({ min: 0, max: 20, noNaN: true }),
  timestamp: fc.integer({ min: 0, max: 400 }).map((d) => NOW.getTime() - d * DAY),
});
const historyArb = fc.array(itemArb, { maxLength: 40 });

describe("ProgressionAgent — parity with legacy inline logic", () => {
  it("computeStreak matches the reference for all histories", () => {
    fc.assert(
      fc.property(historyArb, (history) => {
        expect(computeStreak(history, NOW)).toBe(refStreak(history, NOW));
      }),
    );
  });

  it("computeXp matches the reference", () => {
    fc.assert(
      fc.property(historyArb, (history) => {
        expect(computeXp(history)).toBe(refXp(history));
      }),
    );
  });
});

describe("ProgressionAgent — streak edge cases", () => {
  it("empty history has zero streak", () => {
    expect(computeStreak([], NOW)).toBe(0);
  });

  it("today-not-yet-logged grace: yesterday-only still counts", () => {
    const yesterday = [{ activity: "tutoring", reward: 5, timestamp: NOW.getTime() - DAY }];
    expect(computeStreak(yesterday, NOW)).toBe(1);
  });

  it("multiple entries the same day count once", () => {
    const sameDay = [
      { activity: "tutoring", reward: 5, timestamp: NOW.getTime() },
      { activity: "workshop", reward: 2, timestamp: NOW.getTime() - 60 * 1000 },
    ];
    expect(computeStreak(sameDay, NOW)).toBe(1);
  });

  it("a gap breaks the streak", () => {
    const gapped = [
      { activity: "tutoring", reward: 5, timestamp: NOW.getTime() },
      { activity: "tutoring", reward: 5, timestamp: NOW.getTime() - 2 * DAY },
    ];
    expect(computeStreak(gapped, NOW)).toBe(1);
  });
});

describe("ProgressionAgent — rank gates", () => {
  const counts = activityCounts;

  it("starts at Bronze with empty history", () => {
    const r = getRankInfo(0, 0, counts([]));
    expect(r.name).toBe("Bronze Scholar");
  });

  it("Silver needs 1000 XP + a volunteering activity", () => {
    const hist = [{ activity: "volunteering", reward: 10, timestamp: NOW.getTime() }];
    // 10 XLM = 1000 XP, one volunteering
    const r = getRankInfo(1000, 1, counts(hist));
    expect(r.name).toBe("Silver Scholar");
  });

  it("Diamond needs 10000 XP + science + 5-day streak", () => {
    const r = getRankInfo(10000, 5, { volunteering: 1, tutoring: 1, tutoringOrMath: 1, workshop: 1, science: 1 });
    expect(r.name).toBe("Diamond Scholar");
    expect(r.reqMsg).toMatch(/highest/i);
  });

  it("state() aggregates consistently", () => {
    const hist = [{ activity: "volunteering", reward: 10, timestamp: NOW.getTime() }];
    const s = ProgressionAgent.state(hist, {}, NOW);
    expect(s.xp).toBe(1000);
    expect(s.streak).toBe(1);
    expect(s.unlocks.silver).toBe(true);
    expect(s.freezes).toBe(0);
  });
});

describe("ProgressionAgent — streak freeze", () => {
  // Build a run of consecutive daily rewards ending `endOffset` days before NOW.
  const consecutive = (days: number, endOffset = 0): ProgressionHistoryItem[] =>
    Array.from({ length: days }, (_, k) => ({
      activity: "tutoring",
      reward: 5,
      timestamp: NOW.getTime() - (endOffset + k) * DAY,
    }));

  it("awards one freeze at the 7-day milestone", () => {
    const rec = reconcileStreak(consecutive(FREEZE_MILESTONE), {}, NOW);
    expect(rec.streak).toBe(7);
    expect(rec.freezes).toBe(1);
    expect(rec.freezesEarned).toBe(1);
    expect(rec.storedNext.lastAwardedStreakMilestone).toBe(7);
  });

  it("does not award before the milestone", () => {
    const rec = reconcileStreak(consecutive(6), {}, NOW);
    expect(rec.streak).toBe(6);
    expect(rec.freezes).toBe(0);
    expect(rec.freezesEarned).toBe(0);
  });

  it("bridges a single missed day and decrements a freeze", () => {
    // active today, gap yesterday, active 2 days ago
    const history = [
      { activity: "tutoring", reward: 5, timestamp: NOW.getTime() },
      { activity: "tutoring", reward: 5, timestamp: NOW.getTime() - 2 * DAY },
    ];
    const rec = reconcileStreak(history, { freezes: 1 }, NOW);
    expect(rec.streak).toBe(2);
    expect(rec.freezes).toBe(0);
    expect(rec.storedNext.freezeConsumedDays.length).toBe(1);
  });

  it("does NOT bridge a two-day gap even with freezes available", () => {
    // active today, gap for two days, active 3 days ago
    const history = [
      { activity: "tutoring", reward: 5, timestamp: NOW.getTime() },
      { activity: "tutoring", reward: 5, timestamp: NOW.getTime() - 3 * DAY },
    ];
    const rec = reconcileStreak(history, { freezes: 5 }, NOW);
    expect(rec.streak).toBe(1);
    expect(rec.freezes).toBe(5); // untouched
  });

  it("does not double-award once a milestone was already granted", () => {
    const rec = reconcileStreak(consecutive(FREEZE_MILESTONE), {
      freezes: 1,
      lastAwardedStreakMilestone: 7,
    }, NOW);
    expect(rec.streak).toBe(7);
    expect(rec.freezesEarned).toBe(0);
    expect(rec.freezes).toBe(1); // unchanged
  });

  it("is idempotent: reconciling the result again is stable", () => {
    const history = [
      { activity: "tutoring", reward: 5, timestamp: NOW.getTime() },
      { activity: "tutoring", reward: 5, timestamp: NOW.getTime() - 2 * DAY },
    ];
    const first = reconcileStreak(history, { freezes: 1 }, NOW);
    const second = reconcileStreak(history, first.storedNext, NOW);
    expect(second.streak).toBe(first.streak);
    expect(second.freezes).toBe(first.freezes);
    expect(second.freezesEarned).toBe(0);
  });

  it("no freeze available: single gap still breaks the streak", () => {
    const history = [
      { activity: "tutoring", reward: 5, timestamp: NOW.getTime() },
      { activity: "tutoring", reward: 5, timestamp: NOW.getTime() - 2 * DAY },
    ];
    const rec = reconcileStreak(history, { freezes: 0 }, NOW);
    expect(rec.streak).toBe(1);
  });
});
