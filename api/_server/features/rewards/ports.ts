import type {
  RewardActivity,
  ScoreCriterion,
  ScoringMode,
} from '@achievo/contracts';

export interface Evaluation {
  activity: string;
  valid: boolean;
  score: number;
  criteria: ScoreCriterion[];
  rationale: string;
}

export interface RateClaims {
  walletKey?: string;
  ipKey?: string | null;
  identityKey?: string | null;
}

export interface BudgetReservation {
  treasuryKey: string;
  recipientKey: string;
  units: number;
}

export interface PendingPayout {
  txHash: string;
  wallet: string;
  rewardXlm: number;
  activity: string;
  createdAt: string;
}

export interface PayoutRecord {
  txHash: string;
  wallet: string;
  identityId?: string | null;
  amount: number;
  activity: string;
  effortScore?: number | null;
  scoringMode?: string | null;
  createdAt: string;
}

export interface RewardIdentity {
  id: string;
  walletPublicKey: string;
  createdAt: string;
  displayNameHash?: string;
}

interface StoreErrorPort {
  isStoreUnavailable(error: unknown): boolean;
}

export interface NoncePorts extends StoreErrorPort {
  nonceSecret?: string;
  isValidWallet(wallet: string): boolean;
  claimOnce(key: string, ttlSeconds: number): Promise<boolean>;
  issueChallenge(
    wallet: string,
    intentHash: string,
  ): Promise<{ nonce: string; expiry: number; mac: string; intentHash: string; challengeXdr: string }>;
}

export interface RewardPorts extends StoreErrorPort {
  adminSecret?: string;
  nonceSecret?: string;
  isValidWallet(wallet: string): boolean;
  hashIntent(activityText: string): string;
  verifyChallenge(input: {
    wallet: string;
    nonce: string;
    expiry: number;
    mac: string;
    signedXdr: string;
    intentHash: string;
  }): { ok: boolean; error?: string };
  claimOnce(key: string, ttlSeconds: number): Promise<boolean>;
  claimRates(
    clientIp: string,
    wallet: string,
  ): Promise<
    | { ok: true; claims: RateClaims }
    | { ok: false; status: 429; error: string; claims: RateClaims }
  >;
  releaseRates(claims: RateClaims | null): Promise<void>;
  evaluate(
    text: string,
  ): Promise<{ evaluation: Evaluation; scoringMode: ScoringMode }>;
  assessIntegrity(text: string, recent: string[]): {
    effortMultiplier: number;
    flagged: boolean;
    reasons: string[];
  };
  fingerprint(text: string): string;
  listRecent(key: string): Promise<string[]>;
  addRecent(key: string, value: string, maxLen: number, ttlSeconds: number): Promise<void>;
  reserveBudgets(
    wallet: string,
    reward: number,
  ): Promise<{ ok: true; reservation: BudgetReservation } | { ok: false; error: string }>;
  releaseBudgets(reservation: BudgetReservation | null): Promise<void>;
  submitReward(input: {
    adminSecret: string;
    wallet: string;
    rewardXlm: number;
    activity: RewardActivity;
  }): Promise<
    | { ok: true; txHash: string }
    | { ok: false; status: number; error: string }
    | { ok: false; pending: true; txHash: string; error: string }
  >;
  markPending(entry: PendingPayout): Promise<void>;
  bindIdentity(wallet: string): Promise<RewardIdentity>;
  issueSession(identity: RewardIdentity): { token: string };
  appendPayout(value: string): Promise<void>;
  notifyPayout(input: {
    txHash: string;
    wallet: string;
    amount: number;
    activity: string;
    effortScore: number;
  }): Promise<void>;
  notifyOps(message: string): Promise<void>;
  now(): Date;
}

export interface PayoutsPorts {
  listPayouts(limit: number): Promise<string[]>;
  redactWallet(wallet: string): string;
  transactionUrl(txHash: string): string;
}

export interface ReconcilePorts {
  cronSecret?: string;
  listPending(): Promise<PendingPayout[]>;
  removePending(txHash: string): Promise<void>;
  transactionStatus(txHash: string): Promise<'success' | 'failed' | 'pending'>;
  appendPayout(value: string): Promise<void>;
  listPayouts(limit: number): Promise<string[]>;
  notifyOps(message: string): Promise<void>;
  getDailyDisbursed(): Promise<number>;
  treasuryDailyCap: number;
  now(): Date;
}
