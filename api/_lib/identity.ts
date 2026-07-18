import { createHash, createHmac, randomBytes } from 'crypto';
import { identityIdFromWallet, type Identity } from '@achievo/identity';
import { getJson, setJson, StoreUnavailableError } from './store';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function walletIndexKey(wallet: string): string {
  return `identity:wallet:${wallet}`;
}

function identityKey(id: string): string {
  return `identity:id:${id}`;
}

export function hashDisplayName(name: string): string {
  return createHash('sha256').update(name.trim().toLowerCase()).digest('hex');
}

export async function getIdentityByWallet(wallet: string): Promise<Identity | null> {
  const id = await getJson<string>(walletIndexKey(wallet));
  if (!id) return null;
  return getJson<Identity>(identityKey(id));
}

export async function getIdentityById(id: string): Promise<Identity | null> {
  return getJson<Identity>(identityKey(id));
}

/** Create or return existing identity bound to this wallet. */
export async function bindIdentity(
  wallet: string,
  opts?: { displayName?: string },
): Promise<Identity> {
  const existing = await getIdentityByWallet(wallet);
  if (existing) {
    if (opts?.displayName) {
      const next: Identity = {
        ...existing,
        displayNameHash: hashDisplayName(opts.displayName),
      };
      await setJson(identityKey(existing.id), next);
      return next;
    }
    return existing;
  }

  const id = identityIdFromWallet(wallet);
  const identity: Identity = {
    id,
    walletPublicKey: wallet,
    createdAt: new Date().toISOString(),
    displayNameHash: opts?.displayName ? hashDisplayName(opts.displayName) : undefined,
  };
  await setJson(identityKey(id), identity);
  await setJson(walletIndexKey(wallet), id);
  return identity;
}

function sessionSecret(): string {
  const secret = process.env.NONCE_HMAC_SECRET ?? process.env.IDENTITY_SESSION_SECRET;
  if (!secret) throw new StoreUnavailableError('Session secret not configured.');
  return secret;
}

/** Short-lived HMAC session token: identityId.wallet.expiry.mac */
export function issueSessionToken(identity: Identity): { token: string; expiresAt: number } {
  const exp = Date.now() + SESSION_TTL_MS;
  const nonce = randomBytes(8).toString('hex');
  const payload = `${identity.id}:${identity.walletPublicKey}:${exp}:${nonce}`;
  const mac = createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  return { token: `${payload}:${mac}`, expiresAt: exp };
}

export function verifySessionToken(
  token: string,
  expectedWallet?: string,
): { ok: true; identityId: string; wallet: string } | { ok: false; error: string } {
  const parts = token.split(':');
  if (parts.length !== 5) return { ok: false, error: 'Malformed session token.' };
  const [identityId, wallet, expStr, nonce, mac] = parts;
  const exp = Number(expStr);
  if (!identityId || !wallet || !nonce || !mac || !Number.isFinite(exp)) {
    return { ok: false, error: 'Malformed session token.' };
  }
  if (Date.now() > exp) return { ok: false, error: 'Session expired.' };
  if (expectedWallet && expectedWallet !== wallet) {
    return { ok: false, error: 'Session wallet mismatch.' };
  }
  const payload = `${identityId}:${wallet}:${exp}:${nonce}`;
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  if (expected !== mac) return { ok: false, error: 'Invalid session token.' };
  return { ok: true, identityId, wallet };
}
