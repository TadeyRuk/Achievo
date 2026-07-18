import type { RewardHistoryItem } from '@achievo/shared';
import { getWalletRewardHistory } from '@achievo/stellar';

/** Merge on-chain ledger rows with local optimistic cache (chain wins on txHash). */
export function mergeChainIntoLocal(
  local: RewardHistoryItem[],
  chain: Awaited<ReturnType<typeof getWalletRewardHistory>>,
): RewardHistoryItem[] {
  const byHash = new Map<string, RewardHistoryItem>();

  for (const row of chain) {
    const txHash = row.txHash ?? `ledger:${row.ledger}:${row.recipient}`;
    byHash.set(txHash, {
      id: txHash,
      activity: row.activity,
      reward: row.amount,
      txHash,
      timestamp: row.timestamp,
    });
  }

  for (const item of local) {
    if (!byHash.has(item.txHash)) {
      byHash.set(item.txHash, item);
    }
  }

  return [...byHash.values()].sort((a, b) => b.timestamp - a.timestamp);
}
