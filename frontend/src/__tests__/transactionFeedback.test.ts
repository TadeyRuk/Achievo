import { describe, it, expect } from 'vitest';
import { isValidRating, feedbackStorageKey } from '../features/feedback/transactionFeedback';

describe('transactionFeedback', () => {
  it('validates star ratings 1–5', () => {
    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(5)).toBe(true);
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating(3.5)).toBe(false);
  });

  it('builds a per-tx localStorage key', () => {
    const hash = 'a'.repeat(64);
    expect(feedbackStorageKey(hash)).toBe(`achievo_feedback_submitted:${hash}`);
  });
});
