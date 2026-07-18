/** Local / merged reward history entry shown in the UI. */
export interface RewardHistoryItem {
  id: string;
  activity: string;
  reward: number;
  txHash: string;
  timestamp: number;
}
