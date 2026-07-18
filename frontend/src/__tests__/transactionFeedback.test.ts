import { ApiError } from '@achievo/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  feedbackStorageKey,
  isValidRating,
  submitTransactionFeedback,
} from '../features/feedback/transactionFeedback';

const mocks = vi.hoisted(() => ({
  submitTransactionFeedback: vi.fn(),
}));

vi.mock('../shared/api/achievoClient', () => ({
  achievoClient: {
    submitTransactionFeedback: mocks.submitTransactionFeedback,
  },
}));

describe('transactionFeedback', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.submitTransactionFeedback.mockReset();
  });

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

  it('marks feedback submitted only after SDK success', async () => {
    const txHash = 'a'.repeat(64);
    mocks.submitTransactionFeedback.mockResolvedValue({ ok: true });

    await expect(
      submitTransactionFeedback({ txHash, rating: 5, comment: 'Great' }),
    ).resolves.toEqual({ ok: true });

    expect(mocks.submitTransactionFeedback).toHaveBeenCalledWith({
      txHash,
      rating: 5,
      comment: 'Great',
    });
    expect(localStorage.getItem(feedbackStorageKey(txHash))).toBe('1');
  });

  it('retains API errors without marking feedback submitted', async () => {
    const txHash = 'b'.repeat(64);
    mocks.submitTransactionFeedback.mockRejectedValue(
      new ApiError('Feedback unavailable', 503, { error: 'Feedback unavailable' }),
    );

    await expect(
      submitTransactionFeedback({ txHash, rating: 2 }),
    ).resolves.toEqual({ ok: false, error: 'Feedback unavailable' });
    expect(localStorage.getItem(feedbackStorageKey(txHash))).toBeNull();
  });
});
