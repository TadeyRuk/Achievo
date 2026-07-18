import { rpc, scValToNative } from "@stellar/stellar-sdk";
import {
  DEFAULT_ACTIVITY_LABEL,
  stroopsToXlm,
  type RewardHistoryItem,
} from "@achievo/shared";

export interface RewardEvent {
  txHash: string;
  recipient: string;
  amount: number;
  timestamp: number;
  ledger?: number;
  /** Present when contract emits activity in reward.sent (newer builds). */
  activity?: string;
}

export interface RewardLedgerRecord {
  recipient: string;
  amount: number;
  activity: string;
  ledger: number;
  timestamp: number;
  txHash?: string;
}

export interface PayoutItem {
  txHash: string;
  recipient: string;
  amount: number;
  activity: string;
  timestamp: number;
}

export function computeStartLedger(latestLedger: number, window: number): number {
  const candidate = latestLedger - window;
  return Math.max(1, Math.min(candidate, latestLedger));
}

export function decodeRewardEvent(event: rpc.Api.EventResponse): RewardEvent {
  const decoded = scValToNative(event.value) as unknown;
  const tuple = Array.isArray(decoded) ? decoded : [];
  const recipient = tuple.length > 0 ? String(tuple[0]) : "";
  const amountStroops = (tuple.length > 1 ? tuple[1] : 0) as number | bigint;
  const activity =
    tuple.length > 2 && tuple[2] != null ? String(tuple[2]) : undefined;

  return {
    txHash: event.txHash,
    recipient,
    amount: stroopsToXlm(amountStroops),
    timestamp: new Date(event.ledgerClosedAt).getTime(),
    ledger: event.ledger,
    activity,
  };
}

export function filterByRecipient(
  events: RewardEvent[],
  walletAddress: string,
): RewardEvent[] {
  return events.filter((e) => e.recipient === walletAddress);
}

export function mergePayouts(
  chainEvents: RewardEvent[],
  history: RewardHistoryItem[],
): PayoutItem[] {
  const historyByTxHash = new Map<string, RewardHistoryItem>();
  for (const item of history) {
    historyByTxHash.set(item.txHash, item);
  }

  const payouts: PayoutItem[] = chainEvents.map((event) => {
    const match = historyByTxHash.get(event.txHash);
    return {
      txHash: event.txHash,
      recipient: event.recipient,
      amount: event.amount,
      activity: match ? match.activity : DEFAULT_ACTIVITY_LABEL,
      timestamp: event.timestamp,
    };
  });

  return payouts.sort((a, b) => b.timestamp - a.timestamp);
}

export function decodeLedgerRecord(raw: unknown): RewardLedgerRecord {
  const r = raw as {
    recipient: unknown;
    amount: number | bigint;
    activity: unknown;
    ledger: number;
    timestamp: number | bigint;
  };
  return {
    recipient: String(r.recipient),
    amount: stroopsToXlm(r.amount),
    activity: String(r.activity),
    ledger: Number(r.ledger),
    timestamp: Number(r.timestamp) * 1000,
  };
}

export function attachTxHashes(
  records: RewardLedgerRecord[],
  events: RewardEvent[],
): RewardLedgerRecord[] {
  const eventsByKey = new Map<string, RewardEvent>();
  for (const event of events) {
    eventsByKey.set(`${event.ledger}:${event.recipient}:${event.amount}`, event);
  }
  return records.map((record) => {
    const match = eventsByKey.get(
      `${record.ledger}:${record.recipient}:${record.amount}`,
    );
    return match ? { ...record, txHash: match.txHash } : record;
  });
}
