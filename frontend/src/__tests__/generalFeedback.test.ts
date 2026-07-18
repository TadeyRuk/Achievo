import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { submitGeneralFeedback } from '../generalFeedback';

describe('submitGeneralFeedback', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts to /api/feedback-general and returns ok on success', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    });

    const result = await submitGeneralFeedback({ rating: 5, comment: 'Nice', name: 'Xander' });

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith('/api/feedback-general', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5, comment: 'Nice', name: 'Xander' }),
    });
  });

  it('returns the server error message on failure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: 'rating must be an integer from 1 to 5.' }),
    });

    const result = await submitGeneralFeedback({ rating: 0 as unknown as number });

    expect(result).toEqual({ ok: false, error: 'rating must be an integer from 1 to 5.' });
  });
});
