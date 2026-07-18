import { createHmac, randomBytes } from 'crypto';
import { describe, expect, it } from 'vitest';
import { verifySignerRequest } from '../../services/signer/lib/auth';

function sign(secret: string, body: string, timestamp: string, nonce: string): string {
  const bodyHash = createHmac('sha256', secret).update(body).digest('hex');
  return createHmac('sha256', secret).update(`${timestamp}.${nonce}.${bodyHash}`).digest('hex');
}

describe('signer HMAC auth', () => {
  const secret = 'signer-test-secret';
  const body = JSON.stringify({ wallet: 'GTEST', rewardXlm: 1, activity: 'tutoring' });

  it('accepts a fresh valid signature', () => {
    const timestamp = String(Date.now());
    const nonce = randomBytes(12).toString('hex');
    const signature = sign(secret, body, timestamp, nonce);
    expect(verifySignerRequest({ secret, body, timestamp, nonce, signature })).toEqual({
      ok: true,
    });
  });

  it('rejects bad signatures and stale timestamps', () => {
    const timestamp = String(Date.now());
    const nonce = randomBytes(12).toString('hex');
    expect(
      verifySignerRequest({
        secret,
        body,
        timestamp,
        nonce,
        signature: '00'.repeat(32),
      }).ok,
    ).toBe(false);
    const stale = String(Date.now() - 120_000);
    expect(
      verifySignerRequest({
        secret,
        body,
        timestamp: stale,
        nonce,
        signature: sign(secret, body, stale, nonce),
      }).ok,
    ).toBe(false);
  });
});
