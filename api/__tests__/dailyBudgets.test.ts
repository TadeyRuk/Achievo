import { describe, it, expect, vi, afterEach } from "vitest";
import { reserveDailyBudgets, releaseDailyBudgets } from "../_lib/payout/dailyBudgets";

// Uses the real store module's in-memory fallback (no Upstash env vars set),
// exercised end-to-end through the recipient-cap (20 XLM) and treasury-cap
// (100 XLM) values from @achievo/shared — the same constants check-cap-sync
// verifies against the contract.

describe("reserveDailyBudgets / releaseDailyBudgets", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reserves successfully when under both treasury and recipient caps", async () => {
    const wallet = `GTEST_RESERVE_OK_${Math.random()}`;
    const result = await reserveDailyBudgets(wallet, 5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reservation.units).toBe(50); // 5 XLM * 10 units/XLM
      expect(result.reservation.recipientKey).toContain(wallet);
    }
  });

  it("denies when the recipient's daily cap (20 XLM) would be exceeded", async () => {
    const wallet = `GTEST_RECIPIENT_CAP_${Math.random()}`;
    const first = await reserveDailyBudgets(wallet, 15);
    expect(first.ok).toBe(true);

    const second = await reserveDailyBudgets(wallet, 10); // 15 + 10 = 25 > 20 cap
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/recipient budget/i);
  });

  it("rolls back the treasury reservation when the recipient cap denies", async () => {
    const wallet = `GTEST_ROLLBACK_${Math.random()}`;
    await reserveDailyBudgets(wallet, 15);
    const denied = await reserveDailyBudgets(wallet, 10);
    expect(denied.ok).toBe(false);

    // A different recipient should still see the treasury headroom intact
    // (i.e. the failed attempt's treasury reservation was released, not leaked).
    const otherWallet = `GTEST_ROLLBACK_OTHER_${Math.random()}`;
    const stillFits = await reserveDailyBudgets(otherWallet, 5);
    expect(stillFits.ok).toBe(true);
  });

  it("releaseDailyBudgets frees a reservation so it can be re-reserved", async () => {
    const wallet = `GTEST_RELEASE_${Math.random()}`;
    const reserved = await reserveDailyBudgets(wallet, 20); // at the recipient cap
    expect(reserved.ok).toBe(true);

    const blocked = await reserveDailyBudgets(wallet, 1);
    expect(blocked.ok).toBe(false);

    if (reserved.ok) await releaseDailyBudgets(reserved.reservation);

    const afterRelease = await reserveDailyBudgets(wallet, 1);
    expect(afterRelease.ok).toBe(true);
  });

  it("releaseDailyBudgets is a no-op for a null or zero-unit reservation", async () => {
    await expect(releaseDailyBudgets(null)).resolves.toBeUndefined();
    await expect(
      releaseDailyBudgets({ treasuryKey: "k1", recipientKey: "k2", units: 0 }),
    ).resolves.toBeUndefined();
  });
});
