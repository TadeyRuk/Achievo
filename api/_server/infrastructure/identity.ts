import { createHash, createHmac, randomBytes } from 'crypto';
import type { Identity } from '@achievo/identity';
import { getJson, setJson, StoreUnavailableError } from './store';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function walletIndexKey(wallet: string): string {
  return `identity:wallet:${wallet}`;
}

function identityKey(id: string): string {
  return `identity:id:${id}`;
}

/** Opaque HMAC identity id — does not embed G-address fragments. */
export function mintIdentityId(wallet: string): string {
  const pepper =
    process.env.IDENTITY_ID_PEPPER?.trim() ||
    process.env.IDENTITY_SESSION_SECRET?.trim() ||
    process.env.NONCE_HMAC_SECRET?.trim() ||
    'achievo-dev-identity-pepper';
  const digest = createHmac('sha256', pepper).update(wallet.trim()).digest('hex');
  return `id_${digest.slice(0, 24)}`;
}

export function hashDisplayName(name: string): string {
  return createHash('sha256').update(name.trim().toLowerCase()).digest('hex');
}

export async function getIdentityByWallet(wallet: string): Promise<Identity | null> {
  const id = await getJson<string>(walletIndexKey(wallet));
  return id ? getJson<Identity>(identityKey(id)) : null;
}

export async function getIdentityById(id: string): Promise<Identity | null> {
  return getJson<Identity>(identityKey(id));
}

export async function bindIdentity(
  wallet: string,
  opts?: { displayName?: string },
): Promise<Identity> {
  const existing = await getIdentityByWallet(wallet);
  if (existing) {
    if (!opts?.displayName) return existing;
    const next = { ...existing, displayNameHash: hashDisplayName(opts.displayName) };
    await setJson(identityKey(existing.id), next);
    return next;
  }

  // Existing wallet→id index wins for already-bound testnet users (legacy fragment ids).
  const id = mintIdentityId(wallet);
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
  const secret = process.env.IDENTITY_SESSION_SECRET ?? process.env.NONCE_HMAC_SECRET;
  if (!secret) throw new StoreUnavailableError('Session secret not configured.');
  return secret;
}

export function issueSessionToken(identity: Identity): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const nonce = randomBytes(8).toString('hex');
  const payload = `${identity.id}:${identity.walletPublicKey}:${expiresAt}:${nonce}`;
  const mac = createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  return { token: `${payload}:${mac}`, expiresAt };
}

export function verifySessionToken(
  token: string,
  expectedWallet?: string,
): { ok: true; identityId: string; wallet: string } | { ok: false; error: string } {
  const parts = token.split(':');
  if (parts.length !== 5) return { ok: false, error: 'Malformed session token.' };
  const [identityId, wallet, expStr, nonce, mac] = parts;
  const expiry = Number(expStr);
  if (!identityId || !wallet || !nonce || !mac || !Number.isFinite(expiry)) {
    return { ok: false, error: 'Malformed session token.' };
  }
  if (Date.now() > expiry) return { ok: false, error: 'Session expired.' };
  if (expectedWallet && expectedWallet !== wallet) {
    return { ok: false, error: 'Session wallet mismatch.' };
  }
  const payload = `${identityId}:${wallet}:${expiry}:${nonce}`;
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  if (expected !== mac) return { ok: false, error: 'Invalid session token.' };
  return { ok: true, identityId, wallet };
}
