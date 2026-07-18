import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_lib/store', () => ({
  claimOnce: vi.fn().mockResolvedValue(true),
  releaseClaim: vi.fn().mockResolvedValue(undefined),
  StoreUnavailableError: class StoreUnavailableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'StoreUnavailableError';
    }
  },
}));

vi.mock('../_lib/notify/googleForms', () => ({
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

import handler from '../feedback';
import { claimOnce } from '../_lib/store';
import {
  GoogleFormsConfigError,
  submitFeedbackForm,
} from '../_lib/notify/googleForms';

const TX = 'a'.repeat(64);

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

function makeReqRes(method: string, body?: unknown) {
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

describe('/api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimOnce).mockResolvedValue(true);
    vi.mocked(submitFeedbackForm).mockResolvedValue(undefined);
  });

  it('GET points operators at Google Forms', async () => {
    const { req, res } = makeReqRes('GET');
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ source: 'google_forms' });
  });

  it('rejects invalid txHash', async () => {
    const { req, res } = makeReqRes('POST', { txHash: 'nope', rating: 5 });
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(400);
  });

  it('rejects duplicate submissions with 409', async () => {
    vi.mocked(claimOnce).mockResolvedValueOnce(false);
    const { req, res } = makeReqRes('POST', { txHash: TX, rating: 5 });
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(409);
    expect(submitFeedbackForm).not.toHaveBeenCalled();
  });

  it('posts a valid payload to Google Forms', async () => {
    const { req, res } = makeReqRes('POST', {
      txHash: TX,
      rating: 4,
      comment: 'Solid',
      wallet: 'GABC',
      reward: 5,
      activity: 'Tutoring',
    });
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(submitFeedbackForm).toHaveBeenCalledWith({
      type: 'transaction',
      txHash: TX,
      rating: 4,
      comment: 'Solid',
      wallet: 'GABC',
      reward: 5,
      activity: 'Tutoring',
    });
  });

  it('returns 503 when Google Forms is not configured', async () => {
    vi.mocked(submitFeedbackForm).mockRejectedValueOnce(
      new GoogleFormsConfigError('missing GOOGLE_FORM_ID'),
    );
    const { req, res } = makeReqRes('POST', { txHash: TX, rating: 3 });
    await handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
    );
    expect(res.statusCode).toBe(503);
  });
});
