import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../api/_lib/telegram', () => ({
  notifyGeneralFeedbackTelegram: vi.fn().mockResolvedValue(undefined),
}));

import handler from '../../../api/feedback-general';
import { notifyGeneralFeedbackTelegram } from '../../../api/_lib/telegram';

interface MockRequest {
  method?: string;
  body?: unknown;
}

interface MockResponse {
  statusCode: number;
  body: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function makeReqRes(method: string, body: unknown) {
  const req: MockRequest = { method, body };
  const res: MockResponse = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return { req, res };
}

describe('POST /api/feedback-general', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-POST methods', async () => {
    const { req, res } = makeReqRes('GET', {});
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(405);
  });

  it('rejects a missing rating', async () => {
    const { req, res } = makeReqRes('POST', { comment: 'hi' });
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(400);
  });

  it('rejects an out-of-range rating', async () => {
    const { req, res } = makeReqRes('POST', { rating: 6 });
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(400);
  });

  it('rejects a comment over 500 chars', async () => {
    const { req, res } = makeReqRes('POST', { rating: 3, comment: 'x'.repeat(501) });
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(400);
  });

  it('accepts a valid rating-only submission and notifies Telegram', async () => {
    const { req, res } = makeReqRes('POST', { rating: 4 });
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
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
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(201);
    expect(notifyGeneralFeedbackTelegram).toHaveBeenCalledWith({
      rating: 5,
      comment: 'Great app!',
      name: 'Xander',
    });
  });
});
