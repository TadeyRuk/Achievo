import { ApiError } from '@achievo/sdk';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { submitGeneralFeedback } from '../features/feedback/generalFeedback';

const mocks = vi.hoisted(() => ({
  submitGeneralFeedback: vi.fn(),
}));

vi.mock('../shared/api/achievoClient', () => ({
  achievoClient: {
    submitGeneralFeedback: mocks.submitGeneralFeedback,
  },
}));

describe('submitGeneralFeedback', () => {
  beforeEach(() => {
    mocks.submitGeneralFeedback.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts to /api/feedback-general and returns ok on success', async () => {
    mocks.submitGeneralFeedback.mockResolvedValue({ ok: true });

    const result = await submitGeneralFeedback({ rating: 5, comment: 'Nice', name: 'Xander' });

    expect(result).toEqual({ ok: true });
    expect(mocks.submitGeneralFeedback).toHaveBeenCalledWith({
      rating: 5,
      comment: 'Nice',
      name: 'Xander',
    });
  });

  it('returns the server error message on failure', async () => {
    mocks.submitGeneralFeedback.mockRejectedValue(
      new ApiError('rating must be an integer from 1 to 5.', 400, {
        error: 'rating must be an integer from 1 to 5.',
      }),
    );

    const result = await submitGeneralFeedback({ rating: 0 as unknown as number });

    expect(result).toEqual({ ok: false, error: 'rating must be an integer from 1 to 5.' });
  });

  it('retains the previous non-JSON feedback error message', async () => {
    mocks.submitGeneralFeedback.mockRejectedValue(
      new ApiError('Feedback API error 502: server returned non-JSON', 502),
    );

    await expect(submitGeneralFeedback({ rating: 3 })).resolves.toEqual({
      ok: false,
      error: 'Feedback API error 502',
    });
  });

  it('still rejects transport failures', async () => {
    mocks.submitGeneralFeedback.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(submitGeneralFeedback({ rating: 3 })).rejects.toThrow('Failed to fetch');
  });
});
