export const DUPLICATE_EFFORT_MULTIPLIER = 0.5;
export const SIMILARITY_THRESHOLD = 0.8;
export const SHINGLE_SIZE = 3;

export interface IntegritySignal {
  flagged: boolean;
  riskScore: number;
  reasons: string[];
  effortMultiplier: number;
}

export function normalizeText(text: string): string {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fingerprint(text: string): string {
  return normalizeText(text);
}

export function shingles(normalized: string, size = SHINGLE_SIZE): Set<string> {
  const words = normalized.length ? normalized.split(' ') : [];
  const result = new Set<string>();
  if (words.length === 0) return result;
  if (words.length < size) {
    result.add(words.join(' '));
    return result;
  }
  for (let index = 0; index + size <= words.length; index++) {
    result.add(words.slice(index, index + size).join(' '));
  }
  return result;
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

export function textSimilarity(a: string, b: string): number {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;
  return jaccardSimilarity(shingles(normalizedA), shingles(normalizedB));
}

export const IntegrityAgent = {
  fingerprint,
  assess(submission: string, context: { recent?: string[] } = {}): IntegritySignal {
    let maximumSimilarity = 0;
    for (const prior of context.recent ?? []) {
      maximumSimilarity = Math.max(maximumSimilarity, textSimilarity(submission, prior));
    }
    const reasons =
      maximumSimilarity >= SIMILARITY_THRESHOLD
        ? [
            `Similar to a recent submission (${Math.round(maximumSimilarity * 100)}% match) — bonus reduced.`,
          ]
        : [];
    return {
      flagged: reasons.length > 0,
      riskScore: reasons.length ? maximumSimilarity : 0,
      reasons,
      effortMultiplier: reasons.length ? DUPLICATE_EFFORT_MULTIPLIER : 1,
    };
  },
};
