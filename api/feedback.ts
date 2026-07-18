import type { VercelRequest, VercelResponse } from '@vercel/node';
import { claimOnce, releaseClaim, StoreUnavailableError } from './_lib/store';
import {
  GoogleFormsConfigError,
  GoogleFormsSubmitError,
  submitFeedbackForm,
} from './_lib/googleForms';

const TX_HASH_RE = /^[a-f0-9]{64}$/i;
const MAX_COMMENT = 500;

type FeedbackRecord = {
  txHash: string;
  rating: number;
  comment: string | null;
  wallet: string | null;
  reward: number | null;
  activity: string | null;
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
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({
      source: 'google_forms',
      message:
        'Transaction feedback is collected via Google Forms. See the linked response Sheet and docs/GOOGLE_FORMS_SETUP.md.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseBody(req);
  if ('error' in parsed) {
    return res.status(400).json({ error: parsed.error });
  }

  const claimKey = `feedback:tx:${parsed.txHash}`;
  let claimed = false;

  try {
    claimed = await claimOnce(claimKey, 365 * 24 * 60 * 60);
    if (!claimed) {
      return res.status(409).json({ error: 'Feedback already submitted for this transaction.' });
    }

    await submitFeedbackForm({ type: 'transaction', ...parsed });
  } catch (err) {
    if (claimed) {
      await releaseClaim(claimKey).catch(() => undefined);
    }
    if (err instanceof StoreUnavailableError) {
      return res.status(503).json({ error: err.message });
    }
    if (err instanceof GoogleFormsConfigError) {
      return res.status(503).json({ error: err.message });
    }
    if (err instanceof GoogleFormsSubmitError) {
      return res.status(502).json({ error: err.message });
    }
    return res.status(502).json({
      error: `Failed to submit feedback: ${(err as Error).message ?? String(err)}`,
    });
  }

  return res.status(201).json({ ok: true });
}
