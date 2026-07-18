import { afterEach, describe, expect, it } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { normalizeVercelRequest } from '../_server/http';

describe('Vercel HTTP adapter', () => {
  afterEach(() => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
  });

  it('normalizes method, headers, query, body, and trusted client IP', () => {
    process.env.VERCEL = '1';
    const body = { rating: 5 };
    const request = normalizeVercelRequest({
      method: 'POST',
      headers: {
        authorization: 'Bearer secret',
        'x-vercel-forwarded-for': '203.0.113.4, 10.0.0.1',
      },
      query: { wallet: 'GABC' },
      body,
      socket: { remoteAddress: '127.0.0.1' },
    } as VercelRequest);

    expect(request).toMatchObject({
      method: 'POST',
      headers: { authorization: 'Bearer secret' },
      query: { wallet: 'GABC' },
      body,
      clientIp: '203.0.113.4',
    });
  });
});
