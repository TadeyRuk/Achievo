import { afterEach, describe, expect, it } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { getClientIp } from '../_server/http';

function req(headers: Record<string, string>, remoteAddress?: string): VercelRequest {
  return {
    headers,
    socket: remoteAddress ? ({ remoteAddress } as VercelRequest['socket']) : undefined,
  } as VercelRequest;
}

describe('getClientIp', () => {
  const prev = {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
  };

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('prefers x-vercel-forwarded-for over x-forwarded-for', () => {
    expect(
      getClientIp(
        req({
          'x-vercel-forwarded-for': '1.1.1.1',
          'x-forwarded-for': '9.9.9.9',
        }),
      ),
    ).toBe('1.1.1.1');
  });

  it('uses x-real-ip when vercel header is absent', () => {
    expect(getClientIp(req({ 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '9.9.9.9' }))).toBe(
      '2.2.2.2',
    );
  });

  it('trusts x-forwarded-for outside production (tests/local)', () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'test';
    expect(getClientIp(req({ 'x-forwarded-for': '3.3.3.3, 4.4.4.4' }))).toBe('3.3.3.3');
  });

  it('ignores spoofed x-forwarded-for in production off-Vercel', () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'production';
    expect(getClientIp(req({ 'x-forwarded-for': '8.8.8.8' }, '10.0.0.5'))).toBe('10.0.0.5');
  });

  it('trusts x-forwarded-for on Vercel in production', () => {
    process.env.VERCEL = '1';
    process.env.NODE_ENV = 'production';
    expect(getClientIp(req({ 'x-forwarded-for': '5.5.5.5' }, '10.0.0.5'))).toBe('5.5.5.5');
  });
});
