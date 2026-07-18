export interface IdentityRecord {
  id: string;
  walletPublicKey: string;
  createdAt: string;
  displayNameHash?: string;
}

export interface IdentityPorts {
  isValidWallet(wallet: string): boolean;
  redactWallet(wallet: string): string;
  findByWallet(wallet: string): Promise<IdentityRecord | null>;
  bind(wallet: string, options?: { displayName?: string }): Promise<IdentityRecord>;
  verifySession(
    token: string,
    wallet: string,
  ): { ok: true } | { ok: false; error: string };
  issueSession(identity: IdentityRecord): { token: string; expiresAt: number };
  isStoreUnavailable(error: unknown): boolean;
}
