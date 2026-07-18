/** Deterministic client/test helper id — opaque, does not embed G-address fragments. */
export function identityIdFromWallet(walletPublicKey: string): string {
  // Non-cryptographic mixer for package helpers/tests. Authoritative production ids are
  // minted server-side with HMAC-SHA256(pepper, wallet) in api identity infrastructure.
  const normalized = walletPublicKey.trim();
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let g = 0x811c9dc5;
  for (let i = normalized.length - 1; i >= 0; i--) {
    g ^= normalized.charCodeAt(i);
    g = Math.imul(g, 16777619);
  }
  const a = (h >>> 0).toString(16).padStart(8, '0');
  const b = (g >>> 0).toString(16).padStart(8, '0');
  return `id_${a}${b}`;
}

/** Truncate a Stellar G-address for public listings. */
export function redactWallet(wallet: string): string {
  if (!wallet || wallet.length < 12) return 'G…';
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}
