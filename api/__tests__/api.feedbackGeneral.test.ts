import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_server/infrastructure/store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/store')>()),
  claimOnce: vi.fn().mockResolvedValue(true),
  releaseClaim: vi.fn().mockResolvedValue(undefined),
  StoreUnavailableError: class StoreUnavailableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'StoreUnavailableError';
    }
  },
}));

vi.mock('../_server/infrastructure/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_server/infrastructure/notifications')>()),
  GoogleFormsConfigError: class GoogleFormsConfigError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'GoogleFormsConfigError';
    }
  },
  GoogleFormsSubmitError: class GoogleFormsSubmitError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'GoogleFormsSubmitError';
    }
  },
  submitFeedbackForm: vi.fn().mockResolvedValue(undefined),
}));

import handler from '../feedback-general';
import { claimOnce } from '../_server/infrastructure/store';
import {
  GoogleFormsConfigError,
  submitFeedbackForm,
} from '../_server/infrastructure/notifications';

interface MockRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  socket?: { remoteAddress?: string };
}

interface MockResponse {
  statusCode: number;
  body: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function makeReqRes(method: string, body: unknown, ip = '127.0.0.1') {
  const req: MockRequest = {
    method,
    body,
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
  };
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
    vi.mocked(claimOnce).mockResolvedValue(true);
    vi.mocked(submitFeedbackForm).mockResolvedValue(undefined);
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

  it('accepts a valid rating-only submission and posts to Google Forms', async () => {
    const { req, res } = makeReqRes('POST', { rating: 4 });
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(201);
    expect(submitFeedbackForm).toHaveBeenCalled();
  });

  it('returns 429 when IP rate limit is claimed', async () => {
    vi.mocked(claimOnce).mockResolvedValue(false);
    const { req, res } = makeReqRes('POST', { rating: 5 });
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(429);
  });

  it('returns 503 when Google Forms is not configured', async () => {
    vi.mocked(submitFeedbackForm).mockRejectedValue(
      new GoogleFormsConfigError('missing form id'),
    );
    const { req, res } = makeReqRes('POST', { rating: 3, comment: 'ok' });
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(503);
  });
});
