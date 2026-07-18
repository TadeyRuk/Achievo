import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

vi.mock('../../../api/_lib/telegram', () => ({
  notifyGeneralFeedbackTelegram: vi.fn().mockResolvedValue(undefined),
}));

import handler from '../../../api/feedback-general';
import { notifyGeneralFeedbackTelegram } from '../../../api/_lib/telegram';

type MockResponse = VercelResponse & {
  statusCode: number;
  body: unknown;
};

function makeReqRes(method: string, body: unknown) {
  const req = { method, body } as VercelRequest;
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  } as MockResponse;
  return { req, res };
}

describe('POST /api/feedback-general', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-POST methods', async () => {
    const { req, res } = makeReqRes('GET', {});
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('rejects a missing rating', async () => {
    const { req, res } = makeReqRes('POST', { comment: 'hi' });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects an out-of-range rating', async () => {
    const { req, res } = makeReqRes('POST', { rating: 6 });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects a comment over 500 chars', async () => {
    const { req, res } = makeReqRes('POST', { rating: 3, comment: 'x'.repeat(501) });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('accepts a valid rating-only submission and notifies Telegram', async () => {
    const { req, res } = makeReqRes('POST', { rating: 4 });
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(notifyGeneralFeedbackTelegram).toHaveBeenCalledWith({
      rating: 4,
      comment: null,
      name: null,
    });
  });

  it('accepts rating + comment + name', async () => {
    const { req, res } = makeReqRes('POST', { rating: 5, comment: 'Great app!', name: 'Xander' });
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(notifyGeneralFeedbackTelegram).toHaveBeenCalledWith({
      rating: 5,
      comment: 'Great app!',
      name: 'Xander',
    });
  });
});
