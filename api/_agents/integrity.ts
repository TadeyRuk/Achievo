/**
 * IntegrityAgent — trust & anti-abuse (persistent, broad domain agent)
 * ────────────────────────────────────────────────────────────────────────
 * Owns the ENTIRE "should we trust this submission" domain. Its stable public
 * surface is `assess()`, which returns a structured IntegritySignal combining
 * one or more risk signals into a single { flagged, riskScore, reasons[],
 * effortMultiplier } verdict.
 *
 * Today it ships one signal — near-duplicate detection — but the design is
 * broad on purpose: future signals (submission velocity/anomaly, mutual-reward
 * loops, sybil clusters, spam heuristics) each contribute a reason + a risk
 * contribution and fold into the same verdict without changing callers.
 *
 * The agent is intentionally PURE: it receives prior submissions via `ctx`
 * rather than reaching into storage itself. The caller (api/reward.ts) performs
 * the durable I/O (store.listRecent / store.addRecent) at the edge. This keeps
 * the agent deterministic, unit-testable, and free of infrastructure coupling.
 */

// ─── Tunables ──────────────────────────────────────────────────────────────

/** Effort bonus is multiplied by this when a submission is flagged as duplicate. */
export const DUPLICATE_EFFORT_MULTIPLIER = 0.5;
/** Jaccard similarity (0–1) at/above which two submissions are "near-duplicate". */
export const SIMILARITY_THRESHOLD = 0.8;
/** Word-shingle size used for similarity. */
export const SHINGLE_SIZE = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IntegritySignal {
  /** True when at least one risk signal fired strongly enough to act on. */
  flagged: boolean;
  /** Aggregate risk 0.0–1.0 (currently == max similarity; max of signals later). */
  riskScore: number;
  /** Human-readable explanations, one per firing signal. */
  reasons: string[];
  /** Multiplier to apply to the effort score/bonus (1 = no penalty). */
  effortMultiplier: number;
}

export interface AssessContext {
  /**
   * Fingerprints of the wallet's recent prior submissions, most-recent-first.
   * Produce these with `fingerprint()` so comparison is apples-to-apples.
   */
  recent?: string[];
}

// ─── Pure text helpers ───────────────────────────────────────────────────────

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeText(text: string): string {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Stable fingerprint for storage + comparison. Currently the normalized text
 * itself (kept compact by normalization); comparison uses shingle similarity.
 */
export function fingerprint(text: string): string {
  return normalizeText(text);
}

/** Build the set of k-word shingles for a normalized string. */
export function shingles(normalized: string, k: number = SHINGLE_SIZE): Set<string> {
  const words = normalized.length ? normalized.split(' ') : [];
  const out = new Set<string>();
  if (words.length === 0) return out;
  if (words.length < k) {
    out.add(words.join(' '));
    return out;
  }
  for (let i = 0; i + k <= words.length; i++) {
    out.add(words.slice(i, i + k).join(' '));
  }
  return out;
}

/** Jaccard similarity between two shingle sets: |∩| / |∪| (empty∧empty = 0). */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const s of a) if (b.has(s)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Similarity of two raw texts (0–1). Exact normalized matches short-circuit
 * to 1 so identical resubmissions are always caught regardless of length.
 */
export function textSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na.length === 0 || nb.length === 0) return 0;
  if (na === nb) return 1;
  return jaccardSimilarity(shingles(na), shingles(nb));
}

// ─── Public agent surface ──────────────────────────────────────────────────

export const IntegrityAgent = {
  fingerprint,

  /**
   * Assess a submission against context (prior submissions, etc.) and return a
   * verdict. Pure and synchronous — the caller supplies `ctx.recent` and does
   * the durable storage I/O.
   */
  assess(submission: string, ctx: AssessContext = {}): IntegritySignal {
    const reasons: string[] = [];
    let riskScore = 0;
    let effortMultiplier = 1;

    // ── Signal 1: near-duplicate of a recent submission ──────────────────────
    const recent = ctx.recent ?? [];
    let maxSim = 0;
    for (const prior of recent) {
      const sim = textSimilarity(submission, prior);
      if (sim > maxSim) maxSim = sim;
    }
    if (maxSim >= SIMILARITY_THRESHOLD) {
      riskScore = Math.max(riskScore, maxSim);
      effortMultiplier = Math.min(effortMultiplier, DUPLICATE_EFFORT_MULTIPLIER);
      reasons.push(
        `Similar to a recent submission (${Math.round(maxSim * 100)}% match) — bonus reduced.`,
      );
    }

    // Future signals (velocity, mutual loops, sybil, spam) fold in here,
    // each contributing to reasons[]/riskScore/effortMultiplier.

    return {
      flagged: reasons.length > 0,
      riskScore,
      reasons,
      effortMultiplier,
    };
  },
};
