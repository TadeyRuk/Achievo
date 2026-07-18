import { describe, it, expect } from "vitest";
import {
  IntegrityAgent,
  normalizeText,
  textSimilarity,
  jaccardSimilarity,
  shingles,
  DUPLICATE_EFFORT_MULTIPLIER,
} from "../_agents/integrity";

describe("IntegrityAgent — text helpers", () => {
  it("normalizes case, punctuation, and whitespace", () => {
    expect(normalizeText("  Tutored   Math!!  ")).toBe("tutored math");
    expect(normalizeText("Hello, World.")).toBe("hello world");
  });

  it("treats identical text as fully similar", () => {
    expect(textSimilarity("I tutored math for 2 hours", "I tutored math for 2 hours")).toBe(1);
  });

  it("treats trivial whitespace/punctuation variants as identical", () => {
    expect(
      textSimilarity("I tutored math for 2 hours.", "i  tutored math   for 2 hours"),
    ).toBe(1);
  });

  it("scores genuinely different text as low similarity", () => {
    const sim = textSimilarity(
      "I tutored calculus to three freshmen after school",
      "I volunteered at the animal shelter cleaning kennels",
    );
    expect(sim).toBeLessThan(0.2);
  });

  it("jaccard of disjoint sets is 0, identical sets is 1", () => {
    expect(jaccardSimilarity(new Set(["a"]), new Set(["b"]))).toBe(0);
    expect(jaccardSimilarity(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });

  it("shingles short text into a single gram", () => {
    expect([...shingles("hello world")]).toEqual(["hello world"]);
  });
});

describe("IntegrityAgent.assess", () => {
  it("does not flag when there is no recent history", () => {
    const s = IntegrityAgent.assess("I ran a coding workshop for 20 students", { recent: [] });
    expect(s.flagged).toBe(false);
    expect(s.effortMultiplier).toBe(1);
    expect(s.reasons).toHaveLength(0);
  });

  it("does not flag a genuinely new submission against priors", () => {
    const s = IntegrityAgent.assess("I organized a campus blood drive event", {
      recent: [normalizeText("I tutored algebra to two students")],
    });
    expect(s.flagged).toBe(false);
    expect(s.effortMultiplier).toBe(1);
  });

  it("flags a near-duplicate and reduces the effort multiplier", () => {
    const prior = IntegrityAgent.fingerprint("I tutored math for two hours to five students today");
    const s = IntegrityAgent.assess("i tutored math for two hours to five students today!", {
      recent: [prior],
    });
    expect(s.flagged).toBe(true);
    expect(s.effortMultiplier).toBe(DUPLICATE_EFFORT_MULTIPLIER);
    expect(s.riskScore).toBeGreaterThanOrEqual(0.8);
    expect(s.reasons[0]).toMatch(/similar/i);
  });

  it("uses the max similarity across multiple priors", () => {
    const s = IntegrityAgent.assess("I hosted a robotics workshop for beginners", {
      recent: [
        normalizeText("completely unrelated volunteering at the shelter"),
        IntegrityAgent.fingerprint("I hosted a robotics workshop for beginners"),
      ],
    });
    expect(s.flagged).toBe(true);
    expect(s.riskScore).toBe(1);
  });
});
