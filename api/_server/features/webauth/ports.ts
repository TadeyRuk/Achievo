interface StoreErrorPort {
  isStoreUnavailable(error: unknown): boolean;
}

export interface WebAuthPorts extends StoreErrorPort {
  configured(): boolean;
  isValidWallet(wallet: string): boolean;
  claimOnce(key: string, ttlSeconds: number): Promise<boolean>;
  buildChallenge(account: string): { transaction: string; networkPassphrase: string };
  verifyAndIssue(signedTransaction: string): {
    token: string;
    wallet: string;
    expiresAt: number;
    challengeId: string;
  };
}
