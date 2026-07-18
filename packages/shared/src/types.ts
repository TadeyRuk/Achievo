/** Local / merged reward history entry shown in the UI. */
export interface RewardHistoryItem {
  id: string;
  activity: string;
  reward: number;
  txHash: string;
  timestamp: number;
}

/** Successful `/api/reward` response body. */
export interface RewardApiSuccess {
  txHash: string;
  reward: number;
  base: number;
  bonus: number;
  effortScore: number;
  activity: string;
  reason?: string;
  flagged?: boolean;
  flagReason?: string;
}

export interface RewardApiError {
  error: string;
}
