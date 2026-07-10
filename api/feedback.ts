import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appendFeedback, claimOnce, listFeedback } from './_lib/store';

const TX_HASH_RE = /^[a-f0-9]{64}$/i;
const MAX_COMMENT = 500;

export type FeedbackRecord = {
  txHash: string;
  rating: number;
  comment: string | null;
  wallet: string | null;
  reward: number | null;
  activity: string | null;
  createdAt: string;
};

function parseRating(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

function parseBody(req: VercelRequest): FeedbackRecord | { error: string } {
  const body = req.body ?? {};
  const txHash = typeof body.txHash === 'string' ? body.txHash.trim() : '';
  if (!TX_HASH_RE.test(txHash)) {
    return { error: 'txHash must be a 64-character hex Stellar transaction hash.' };
  }

  const rating = parseRating(body.rating);
  if (rating === null) {
    return { error: 'rating must be an integer from 1 to 5.' };
  }

  let comment: string | null = null;
  if (body.comment !== undefined && body.comment !== null && body.comment !== '') {
    if (typeof body.comment !== 'string') return { error: 'comment must be a string.' };
    const trimmed = body.comment.trim();
    if (trimmed.length > MAX_COMMENT) {
      return { error: `comment must be at most ${MAX_COMMENT} characters.` };
    }
    comment = trimmed || null;
  }

  const wallet = typeof body.wallet === 'string' && body.wallet.trim()
    ? body.wallet.trim()
    : null;

  let reward: number | null = null;
  if (body.reward !== undefined && body.reward !== null && body.reward !== '') {
    const r = Number(body.reward);
    if (!Number.isFinite(r) || r < 0) return { error: 'reward must be a non-negative number.' };
    reward = r;
  }

  const activity = typeof body.activity === 'string' && body.activity.trim()
    ? body.activity.trim().slice(0, 80)
    : null;

  return {
    txHash,
    rating,
    comment,
    wallet,
    reward,
    activity,
    createdAt: new Date().toISOString(),
  };
}

function summarize(entries: FeedbackRecord[]) {
  if (entries.length === 0) {
    return { count: 0, averageRating: null, withComments: 0 };
  }
  const sum = entries.reduce((acc, e) => acc + e.rating, 0);
  const withComments = entries.filter((e) => e.comment).length;
  return {
    count: entries.length,
    averageRating: Math.round((sum / entries.length) * 10) / 10,
    withComments,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const raw = await listFeedback(200);
    const entries: FeedbackRecord[] = [];
    for (const line of raw) {
      try {
        entries.push(JSON.parse(line) as FeedbackRecord);
      } catch { /* skip corrupt rows */ }
    }
    return res.status(200).json({ ...summarize(entries), entries });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseBody(req);
  if ('error' in parsed) {
    return res.status(400).json({ error: parsed.error });
  }

  const claimed = await claimOnce(`feedback:tx:${parsed.txHash}`, 365 * 24 * 60 * 60);
  if (!claimed) {
    return res.status(409).json({ error: 'Feedback already submitted for this transaction.' });
  }

  try {
    await appendFeedback(JSON.stringify(parsed));
  } catch (err) {
    return res.status(500).json({
      error: `Failed to store feedback: ${(err as Error).message ?? String(err)}`,
    });
  }

  return res.status(201).json({ ok: true });
}
