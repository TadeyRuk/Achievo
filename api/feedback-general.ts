import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  GoogleFormsConfigError,
  GoogleFormsSubmitError,
  submitFeedbackForm,
} from './_lib/googleForms';
import { claimOnce, StoreUnavailableError } from './_lib/store';

const MAX_COMMENT = 500;
const MAX_NAME = 40;
const GENERAL_FEEDBACK_IP_TTL = 60;

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

function getClientIp(req: VercelRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    'unknown'
  );
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
    const ip = getClientIp(req);
    if (ip !== 'unknown') {
      const allowed = await claimOnce(`rate:feedback-general:ip:${ip}`, GENERAL_FEEDBACK_IP_TTL);
      if (!allowed) {
        return res.status(429).json({ error: 'Too many feedback submissions. Wait a moment and retry.' });
      }
    }

    await submitFeedbackForm({ type: 'general', ...parsed });
  } catch (err) {
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
