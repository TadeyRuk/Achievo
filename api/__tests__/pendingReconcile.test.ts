import { describe, it, expect } from "vitest";
import {
  markPendingReconcile,
  listPendingReconcile,
  removePendingReconcile,
  type PendingPayout,
} from "../_lib/payout/pendingReconcile";

// Exercises the real getJson/setJson in-memory fallback — the pending-reconcile
// ledger is a single shared key, so each test uses a unique txHash to stay
// independent of ordering/leakage from other tests in this run.

function makeEntry(overrides: Partial<PendingPayout> = {}): PendingPayout {
  return {
    txHash: `tx_${Math.random()}`,
    wallet: "GTESTWALLET",
    rewardXlm: 5,
    activity: "tutoring",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("pendingReconcile", () => {
  it("markPendingReconcile then listPendingReconcile includes the entry", async () => {
    const entry = makeEntry();
    await markPendingReconcile(entry);
    const list = await listPendingReconcile();
    expect(list.some((p) => p.txHash === entry.txHash)).toBe(true);
  });

  it("removePendingReconcile removes only the matching txHash", async () => {
    const keep = makeEntry();
    const remove = makeEntry();
    await markPendingReconcile(keep);
    await markPendingReconcile(remove);

    await removePendingReconcile(remove.txHash);

    const list = await listPendingReconcile();
    expect(list.some((p) => p.txHash === remove.txHash)).toBe(false);
    expect(list.some((p) => p.txHash === keep.txHash)).toBe(true);
  });

  it("removePendingReconcile on an unknown txHash leaves the list unchanged", async () => {
    const entry = makeEntry();
    await markPendingReconcile(entry);
    const before = await listPendingReconcile();

    await removePendingReconcile(`nonexistent_${Math.random()}`);

    const after = await listPendingReconcile();
    expect(after.length).toBe(before.length);
  });
});
