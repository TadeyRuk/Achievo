import { createHmac, timingSafeEqual } from 'crypto';

const MAX_SKEW_MS = 60_000;

export function verifySignerRequest(input: {
  secret: string;
  body: string;
  timestamp: string;
  nonce: string;
  signature: string;
  now?: number;
}): { ok: true } | { ok: false; error: string } {
  const now = input.now ?? Date.now();
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_MS) {
    return { ok: false, error: 'Request timestamp out of window.' };
  }
  if (!input.nonce || input.nonce.length < 8) {
    return { ok: false, error: 'Invalid nonce.' };
  }
  const bodyHash = createHmac('sha256', input.secret).update(input.body).digest('hex');
  const expected = createHmac('sha256', input.secret)
    .update(`${input.timestamp}.${input.nonce}.${bodyHash}`)
    .digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(input.signature, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: 'Invalid signature.' };
    }
  } catch {
    return { ok: false, error: 'Invalid signature.' };
  }
  return { ok: true };
}
