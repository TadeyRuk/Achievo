/** Deterministic identity id from wallet (browser + server safe). */
export function identityIdFromWallet(walletPublicKey: string): string {
  // Stable, non-secret label — not a cryptographic commitment by itself.
  // Server bind stores the same id keyed under the wallet index.
  return `id_${walletPublicKey.slice(0, 8)}_${walletPublicKey.slice(-6)}`.toLowerCase();
}

/** Truncate a Stellar G-address for public listings. */
export function redactWallet(wallet: string): string {
  if (!wallet || wallet.length < 12) return 'G…';
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}
