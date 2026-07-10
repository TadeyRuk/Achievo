import { describe, it, expect } from 'vitest';
import { buildFeedbackSummary } from '../../../api/_lib/feedbackSummary';

describe('buildFeedbackSummary', () => {
  it('returns empty-state copy when no entries', () => {
    const s = buildFeedbackSummary([]);
    expect(s.count).toBe(0);
    expect(s.averageRating).toBeNull();
    expect(s.highlights[0]).toMatch(/No feedback/);
  });

  it('computes distribution and markdown for entries', () => {
    const s = buildFeedbackSummary([
      {
        txHash: 'a'.repeat(64),
        rating: 5,
        comment: 'Fast payout!',
        wallet: null,
        reward: 5,
        activity: 'tutoring',
        createdAt: '2026-07-10T00:00:00.000Z',
      },
      {
        txHash: 'b'.repeat(64),
        rating: 4,
        comment: null,
        wallet: null,
        reward: 3,
        activity: 'workshop',
        createdAt: '2026-07-10T01:00:00.000Z',
      },
    ]);
    expect(s.count).toBe(2);
    expect(s.averageRating).toBe(4.5);
    expect(s.distribution['5']).toBe(1);
    expect(s.distribution['4']).toBe(1);
    expect(s.summaryMarkdown).toContain('2 responses');
    expect(s.recentComments).toHaveLength(1);
  });
});
