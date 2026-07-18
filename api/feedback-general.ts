import type { VercelRequest, VercelResponse } from '@vercel/node';
import { notifyGeneralFeedbackTelegram } from './_lib/telegram';

const MAX_COMMENT = 500;
const MAX_NAME = 40;

type GeneralFeedbackRecord = {
  rating: number;
  comment: string | null;
  name: string | null;
};

function parseRating(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

function parseBody(req: VercelRequest): GeneralFeedbackRecord | { error: string } {
  const body = req.body ?? {};

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

  let name: string | null = null;
  if (body.name !== undefined && body.name !== null && body.name !== '') {
    if (typeof body.name !== 'string') return { error: 'name must be a string.' };
    const trimmed = body.name.trim();
    if (trimmed.length > MAX_NAME) {
      return { error: `name must be at most ${MAX_NAME} characters.` };
    }
    name = trimmed || null;
  }

  return { rating, comment, name };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseBody(req);
  if ('error' in parsed) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    await notifyGeneralFeedbackTelegram(parsed);
  } catch { /* best-effort; never fail the HTTP response */ }

  return res.status(201).json({ ok: true });
}
