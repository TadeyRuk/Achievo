export type FeedbackEntry = {
  txHash: string;
  rating: number;
  comment: string | null;
  wallet: string | null;
  reward: number | null;
  activity: string | null;
  createdAt: string;
};

export type FeedbackSummary = {
  count: number;
  averageRating: number | null;
  withComments: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  /** Short bullets suitable for README / Level 4 submission. */
  highlights: string[];
  /** One-line rolling stat for Telegram after each new rating. */
  summaryLine: string;
  /** Markdown block to paste into README. */
  summaryMarkdown: string;
  recentComments: Array<{
    rating: number;
    comment: string;
    activity: string | null;
    createdAt: string;
  }>;
};

const EMPTY_DIST: FeedbackSummary['distribution'] = {
  '1': 0,
  '2': 0,
  '3': 0,
  '4': 0,
  '5': 0,
};

export function buildFeedbackSummary(entries: FeedbackEntry[]): FeedbackSummary {
  if (entries.length === 0) {
    return {
      count: 0,
      averageRating: null,
      withComments: 0,
      distribution: { ...EMPTY_DIST },
      highlights: ['No feedback collected yet — testers see the post-payout rating sheet after each reward.'],
      summaryLine: 'No feedback yet',
      summaryMarkdown:
        '_No feedback submissions yet. After each payout, students rate 1–5 stars in the app._',
      recentComments: [],
    };
  }

  const distribution = { ...EMPTY_DIST };
  let sum = 0;
  let withComments = 0;
  for (const e of entries) {
    const key = String(e.rating) as keyof FeedbackSummary['distribution'];
    if (key in distribution) distribution[key] += 1;
    sum += e.rating;
    if (e.comment) withComments += 1;
  }

  const averageRating = Math.round((sum / entries.length) * 10) / 10;
  const pctFive = Math.round((distribution['5'] / entries.length) * 100);
  const pctFourPlus = Math.round(
    ((distribution['4'] + distribution['5']) / entries.length) * 100,
  );

  const recentComments = entries
    .filter((e): e is FeedbackEntry & { comment: string } => Boolean(e.comment))
    .slice(0, 5)
    .map((e) => ({
      rating: e.rating,
      comment: e.comment!,
      activity: e.activity,
      createdAt: e.createdAt,
    }));

  const highlights: string[] = [
    `${entries.length} rating${entries.length === 1 ? '' : 's'} collected (avg **${averageRating}/5**).`,
    `${pctFourPlus}% rated 4★ or higher; ${pctFive}% gave 5★.`,
    `${withComments} response${withComments === 1 ? '' : 's'} included a written comment.`,
  ];

  if (distribution['1'] + distribution['2'] > 0) {
    highlights.push(
      `${distribution['1'] + distribution['2']} lower rating(s) — review comments for UX friction.`,
    );
  }

  const summaryLine = `${entries.length} ratings · avg ${averageRating}/5 · ${withComments} with comments`;

  const quoteLines = recentComments
    .slice(0, 3)
    .map((c) => `- **${c.rating}★** — “${c.comment.replace(/"/g, "'")}”`)
    .join('\n');

  const summaryMarkdown = [
    `**${entries.length} responses** · average **${averageRating}/5** · ${withComments} with comments`,
    '',
    '| Stars | Count |',
    '|-------|-------|',
    ...(['5', '4', '3', '2', '1'] as const).map((s) => `| ${s}★ | ${distribution[s]} |`),
    '',
    quoteLines ? `**Sample feedback**\n${quoteLines}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    count: entries.length,
    averageRating,
    withComments,
    distribution,
    highlights,
    summaryLine,
    summaryMarkdown,
    recentComments,
  };
}
