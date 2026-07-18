/**
 * Pseudonymous principal bound to a Stellar wallet.
 * Display name / avatar stay client-local; only an optional hash is persisted.
 */
export interface Identity {
  id: string;
  walletPublicKey: string;
  createdAt: string;
  displayNameHash?: string;
}

export interface IdentitySessionClaims {
  identityId: string;
  wallet: string;
  exp: number;
}
