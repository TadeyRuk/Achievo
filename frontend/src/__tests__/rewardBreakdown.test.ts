import { describe, it, expect } from "vitest";
import { formatRewardBreakdown } from '../features/earn/rewardBreakdown';

describe("formatRewardBreakdown", () => {
  it("produces a full breakdown when base + bonus present", () => {
    const r = formatRewardBreakdown({ reward: 8.5, base: 5, bonus: 3.5, effortScore: 0.7, reason: "Detailed account." });
    expect(r.hasBreakdown).toBe(true);
    expect(r.base).toBe(5);
    expect(r.bonus).toBe(3.5);
    expect(r.formula).toBe("Base 5 + Bonus 3.5");
    expect(r.effortPct).toBe(70);
    expect(r.reason).toBe("Detailed account.");
    expect(r.flagged).toBe(false);
  });

  it("handles zero bonus", () => {
    const r = formatRewardBreakdown({ reward: 5, base: 5, bonus: 0, effortScore: 0 });
    expect(r.hasBreakdown).toBe(true);
    expect(r.formula).toBe("Base 5 + Bonus 0");
    expect(r.effortPct).toBe(0);
  });

  it("degrades gracefully when breakdown fields are missing", () => {
    const r = formatRewardBreakdown({ reward: 10 });
    expect(r.hasBreakdown).toBe(false);
    expect(r.base).toBeNull();
    expect(r.bonus).toBeNull();
    expect(r.formula).toBeNull();
    expect(r.effortPct).toBeNull();
    expect(r.reason).toBeNull();
  });

  it("clamps effort score into 0–100%", () => {
    expect(formatRewardBreakdown({ reward: 1, effortScore: 1.5 }).effortPct).toBe(100);
    expect(formatRewardBreakdown({ reward: 1, effortScore: -0.5 }).effortPct).toBe(0);
  });

  it("ignores NaN numeric fields", () => {
    const r = formatRewardBreakdown({ reward: 5, base: NaN, bonus: NaN, effortScore: NaN });
    expect(r.hasBreakdown).toBe(false);
    expect(r.effortPct).toBeNull();
  });

  it("rounds base/bonus to one decimal", () => {
    const r = formatRewardBreakdown({ reward: 7, base: 4.999, bonus: 2.049 });
    expect(r.base).toBe(5);
    expect(r.bonus).toBe(2);
  });

  it("surfaces integrity flag + reason, trimming whitespace", () => {
    const r = formatRewardBreakdown({ reward: 5, flagged: true, flagReason: "  Similar submission.  " });
    expect(r.flagged).toBe(true);
    expect(r.flagReason).toBe("Similar submission.");
  });

  it("treats empty/whitespace reason as null", () => {
    expect(formatRewardBreakdown({ reward: 5, reason: "   " }).reason).toBeNull();
  });
});
