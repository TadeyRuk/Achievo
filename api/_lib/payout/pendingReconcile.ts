import { getJson, setJson } from '../store';

export type PendingPayout = {
  txHash: string;
  wallet: string;
  rewardXlm: number;
  activity: string;
  createdAt: string;
};

const KEY = 'payouts:pending_reconcile';

export async function markPendingReconcile(entry: PendingPayout): Promise<void> {
  const list = (await getJson<PendingPayout[]>(KEY)) ?? [];
  list.push(entry);
  // keep last 200
  await setJson(KEY, list.slice(-200), 7 * 24 * 60 * 60);
}

export async function listPendingReconcile(): Promise<PendingPayout[]> {
  return (await getJson<PendingPayout[]>(KEY)) ?? [];
}

export async function removePendingReconcile(txHash: string): Promise<void> {
  const list = (await getJson<PendingPayout[]>(KEY)) ?? [];
  await setJson(
    KEY,
    list.filter((p) => p.txHash !== txHash),
    7 * 24 * 60 * 60,
  );
}
