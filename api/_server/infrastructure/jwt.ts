import { createHmac, timingSafeEqual } from 'crypto';

export interface Sep10JwtClaims {
  sub: string;
  iss: string;
  iat: number;
  exp: number;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function b64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function signSep10Jwt(
  claims: Omit<Sep10JwtClaims, 'iat' | 'exp'> & { ttlSeconds: number },
  secret: string,
): string {
  const iat = nowSeconds();
  const payload: Sep10JwtClaims = {
    sub: claims.sub,
    iss: claims.iss,
    iat,
    exp: iat + claims.ttlSeconds,
  };
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const body = b64urlJson(payload);
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifySep10Jwt(
  token: string,
  secret: string,
  expectedIss?: string,
): { ok: true; claims: Sep10JwtClaims } | { ok: false; error: string } {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, error: 'Invalid auth token.' };
  const [header, body, signature] = parts;
  if (!header || !body || !signature) return { ok: false, error: 'Invalid auth token.' };

  const expected = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (!timingSafeEqualString(signature, expected)) {
    return { ok: false, error: 'Invalid auth token.' };
  }

  let claims: Sep10JwtClaims;
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Sep10JwtClaims;
  } catch {
    return { ok: false, error: 'Invalid auth token.' };
  }

  if (typeof claims.sub !== 'string' || !claims.sub) {
    return { ok: false, error: 'Invalid auth token subject.' };
  }
  if (typeof claims.exp !== 'number' || nowSeconds() >= claims.exp) {
    return { ok: false, error: 'Auth token expired. Please reconnect.' };
  }
  if (expectedIss && claims.iss !== expectedIss) {
    return { ok: false, error: 'Auth token issuer mismatch.' };
  }
  return { ok: true, claims };
}

export function bearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}
