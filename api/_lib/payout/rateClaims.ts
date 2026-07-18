import type { VercelRequest } from '@vercel/node';
import { claimOnce, releaseClaim } from '../store';
import { getIdentityByWallet } from '../identity';
import { getClientIp } from '../http';

export { getClientIp };

export const RATE_LIMIT_TTL_SECONDS = 24 * 60 * 60;

export type RateClaimSet = {
  walletKey: string;
  ipKey: string | null;
  identityKey: string | null;
};

/**
 * Hybrid rate claims: always wallet (+ IP when known).
 * If an identity is already bound to the wallet, also claim rate:identity:{id}.
 */
export async function claimRewardRates(
  req: VercelRequest,
  wallet: string,
): Promise<
  | { ok: true; claims: RateClaimSet }
  | { ok: false; status: 429; error: string; claims: Partial<RateClaimSet> }
> {
  const walletKey = `rate:wallet:${wallet}`;
  const walletClaimed = await claimOnce(walletKey, RATE_LIMIT_TTL_SECONDS);
  if (!walletClaimed) {
    return {
      ok: false,
      status: 429,
      error: 'Rate limit: 1 reward per day. Try again tomorrow.',
      claims: {},
    };
  }

  let ipKey: string | null = null;
  const ip = getClientIp(req);
  if (ip !== 'unknown') {
    ipKey = `rate:ip:${ip}`;
    const ipClaimed = await claimOnce(ipKey, RATE_LIMIT_TTL_SECONDS);
    if (!ipClaimed) {
      await releaseClaim(walletKey);
      return {
        ok: false,
        status: 429,
        error: 'Rate limit reached for your IP. Try again tomorrow.',
        claims: {},
      };
    }
  }

  let identityKey: string | null = null;
  try {
    const existing = await getIdentityByWallet(wallet);
    if (existing) {
      identityKey = `rate:identity:${existing.id}`;
      const identityClaimed = await claimOnce(identityKey, RATE_LIMIT_TTL_SECONDS);
      if (!identityClaimed) {
        await releaseClaim(walletKey);
        if (ipKey) await releaseClaim(ipKey);
        return {
          ok: false,
          status: 429,
          error: 'Rate limit: 1 reward per identity per day. Try again tomorrow.',
          claims: {},
        };
      }
    }
  } catch {
    // Identity lookup failure must not block first-time payouts.
    identityKey = null;
  }

  return { ok: true, claims: { walletKey, ipKey, identityKey } };
}

export async function releaseRateClaims(claims: Partial<RateClaimSet> | null): Promise<void> {
  if (!claims) return;
  if (claims.walletKey) await releaseClaim(claims.walletKey).catch(() => undefined);
  if (claims.ipKey) await releaseClaim(claims.ipKey).catch(() => undefined);
  if (claims.identityKey) await releaseClaim(claims.identityKey).catch(() => undefined);
}
