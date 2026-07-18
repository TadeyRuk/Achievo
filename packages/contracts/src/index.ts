export interface ApiErrorResponse {
  error: string;
}

export interface NonceApiRequest {
  wallet: string;
  intentHash: string;
}

export interface NonceApiSuccess {
  nonce: string;
  expiry: number;
  mac: string;
  intentHash: string;
  challengeXdr: string;
}

export type NonceApiError = ApiErrorResponse;

export type RewardActivity =
  | 'tutoring'
  | 'workshop'
  | 'volunteering'
  | 'event'
  | 'participation';

export type ScoringMode = 'groq' | 'heuristic';

export interface ScoreCriterion {
  key: string;
  label: string;
  score: number;
  weight: number;
}

export interface RewardApiRequest {
  activityText: string;
  wallet: string;
  nonce: string;
  expiry: number;
  mac: string;
  signedXdr: string;
  intentHash: string;
}

export interface RewardApiSuccess {
  txHash: string;
  reward: number;
  base: number;
  bonus: number;
  effortScore: number;
  activity: RewardActivity;
  reason: string;
  criteria: ScoreCriterion[];
  flagged: boolean;
  flagReason: string | null;
  integrityReasons: string[];
  scoringMode: ScoringMode;
  identityId: string | null;
  sessionToken: string | null;
}

export interface RewardApiPending {
  pending: true;
  txHash: string;
  reward: number;
  activity: RewardActivity;
  error: string;
  scoringMode: ScoringMode;
}

export interface RewardApiError extends ApiErrorResponse {
  activity?: string;
  scoringMode?: ScoringMode;
}

export type RewardApiResponse = RewardApiSuccess | RewardApiPending;

export type HealthCheckStatus = 'ok' | 'degraded' | 'down';

export interface HealthApiSuccess {
  ok: boolean;
  rewardsPaused: boolean;
  checks: {
    contractId: HealthCheckStatus;
    redis: HealthCheckStatus;
    rpc: HealthCheckStatus;
  };
  network: 'testnet';
}

export type HealthApiError = HealthApiSuccess | ApiErrorResponse;

export interface IdentityApiGetRequest {
  wallet: string;
}

export interface IdentityApiPublicSuccess {
  id: string;
  wallet: string;
  createdAt: string;
  hasDisplayNameHash: boolean;
}

export interface IdentityApiUpdateRequest {
  wallet: string;
  sessionToken: string;
  displayName?: string;
}

export interface IdentityApiUpdateSuccess {
  id: string;
  wallet: string;
  createdAt: string;
  sessionToken: string;
  expiresAt: number;
}

export type IdentityApiError = ApiErrorResponse;

export interface PublicPayoutEntry {
  txHash: string;
  wallet: string;
  identityId: string | null;
  amount: number;
  activity: string;
  effortScore?: number | null;
  scoringMode: string | null;
  createdAt: string;
}

export interface PublicPayoutTableRow {
  n: number;
  date: string;
  wallet: string;
  identityId: string | null;
  amount: number;
  activity: string;
  txUrl: string;
  txHash: string;
}

export interface PayoutsApiSuccess {
  count: number;
  uniqueWallets: number;
  uniqueIdentities: number;
  totalXlm: number;
  entries: PublicPayoutEntry[];
  tableRows: PublicPayoutTableRow[];
}

export type PayoutsApiError = ApiErrorResponse;

export interface TransactionFeedbackApiRequest {
  txHash: string;
  rating: number;
  comment?: string | null;
  wallet?: string | null;
  reward?: number | null;
  activity?: string | null;
}

export interface TransactionFeedbackApiInfoSuccess {
  source: 'google_forms';
  message: string;
}

export interface FeedbackApiSuccess {
  ok: true;
}

export type TransactionFeedbackApiError = ApiErrorResponse;

export interface GeneralFeedbackApiRequest {
  rating: number;
  comment?: string | null;
  name?: string | null;
}

export type GeneralFeedbackApiSuccess = FeedbackApiSuccess;
export type GeneralFeedbackApiError = ApiErrorResponse;

export interface ReconcileApiSuccess {
  ok: true;
  pending: number;
  settled: number;
  failed: number;
  ledgerSample: number;
  capAlert: string | null;
}

export type ReconcileApiError = ApiErrorResponse;
