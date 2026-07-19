/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { signSep10Jwt, verifySep10Jwt } from '../_server/infrastructure/jwt';

describe('SEP-10 JWT helpers', () => {
  const secret = 'unit-test-jwt-secret';

  it('signs and verifies a token for the expected issuer', () => {
    const token = signSep10Jwt(
      { sub: 'GTESTWALLET', iss: 'achievo.test', ttlSeconds: 60 },
      secret,
    );
    const verified = verifySep10Jwt(token, secret, 'achievo.test');
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.claims.sub).toBe('GTESTWALLET');
      expect(verified.claims.iss).toBe('achievo.test');
    }
  });

  it('rejects wrong issuer, bad signature, and expired tokens', () => {
    const token = signSep10Jwt(
      { sub: 'GTESTWALLET', iss: 'achievo.test', ttlSeconds: 60 },
      secret,
    );
    expect(verifySep10Jwt(token, secret, 'other.domain').ok).toBe(false);
    expect(verifySep10Jwt(`${token}x`, secret, 'achievo.test').ok).toBe(false);

    const expired = signSep10Jwt(
      { sub: 'GTESTWALLET', iss: 'achievo.test', ttlSeconds: -10 },
      secret,
    );
    expect(verifySep10Jwt(expired, secret, 'achievo.test').ok).toBe(false);
  });
});
