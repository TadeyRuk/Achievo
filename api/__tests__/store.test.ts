import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getJson,
  setJson,
  getTimestamp,
  setTimestamp,
  claimOnce,
  releaseClaim,
  exists,
  addRecent,
  listRecent,
  appendPayout,
  listPayouts,
  incrBy,
  reserveBudget,
  getRedis,
  requireStore,
  StoreUnavailableError,
} from "../_lib/store";

// No UPSTASH_REDIS_REST_URL/TOKEN are set in this test env, so every store
// module below exercises its in-memory fallback path — the same code path
// CI and local dev run under. VERCEL_ENV is also unset, so requireStore()
// never throws (that branch is production-only, covered separately below).

describe("store — in-memory fallback (no Redis configured)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe("storeRedis", () => {
    it("getRedis returns null when Upstash env vars are absent", () => {
      expect(getRedis()).toBeNull();
    });

    it("requireStore does not throw outside production", () => {
      expect(() => requireStore()).not.toThrow();
    });

    it("requireStore throws StoreUnavailableError in production without Redis", () => {
      vi.stubEnv("VERCEL_ENV", "production");
      expect(() => requireStore()).toThrow(StoreUnavailableError);
      vi.unstubAllEnvs();
    });
  });

  describe("storeJson", () => {
    it("round-trips a JSON value through set/get", async () => {
      const key = `test:json:${Math.random()}`;
      await setJson(key, { a: 1, b: "two" });
      expect(await getJson<{ a: number; b: string }>(key)).toEqual({ a: 1, b: "two" });
    });

    it("returns null for a key that was never set", async () => {
      expect(await getJson(`test:json:missing:${Math.random()}`)).toBeNull();
    });

    it("accepts an optional ttlSeconds without throwing", async () => {
      const key = `test:json:ttl:${Math.random()}`;
      await expect(setJson(key, { ok: true }, 60)).resolves.toBeUndefined();
      expect(await getJson(key)).toEqual({ ok: true });
    });
  });

  describe("storeClaims", () => {
    it("getTimestamp is null until set, then reflects the stored value", async () => {
      const key = `test:ts:${Math.random()}`;
      expect(await getTimestamp(key)).toBeNull();
      await setTimestamp(key, 1234, 60);
      expect(await getTimestamp(key)).toBe(1234);
    });

    it("claimOnce succeeds the first time and fails on replay", async () => {
      const key = `test:claim:${Math.random()}`;
      expect(await claimOnce(key, 60)).toBe(true);
      expect(await claimOnce(key, 60)).toBe(false);
    });

    it("releaseClaim clears both the claim and its timestamp", async () => {
      const key = `test:claim-release:${Math.random()}`;
      await claimOnce(key, 60);
      await setTimestamp(key, 999, 60);
      expect(await exists(key)).toBe(true);
      await releaseClaim(key);
      expect(await exists(key)).toBe(false);
      expect(await claimOnce(key, 60)).toBe(true); // free to claim again
    });

    it("exists reflects claims and timestamps independently", async () => {
      const claimKey = `test:exists-claim:${Math.random()}`;
      const tsKey = `test:exists-ts:${Math.random()}`;
      expect(await exists(claimKey)).toBe(false);
      await claimOnce(claimKey, 60);
      expect(await exists(claimKey)).toBe(true);

      expect(await exists(tsKey)).toBe(false);
      await setTimestamp(tsKey, 1, 60);
      expect(await exists(tsKey)).toBe(true);
    });
  });

  describe("storeLists — recent list", () => {
    it("addRecent prepends and listRecent returns newest-first", async () => {
      const key = `test:list:${Math.random()}`;
      await addRecent(key, "first", 10, 60);
      await addRecent(key, "second", 10, 60);
      expect(await listRecent(key)).toEqual(["second", "first"]);
    });

    it("addRecent caps the list at maxLen", async () => {
      const key = `test:list-cap:${Math.random()}`;
      await addRecent(key, "a", 2, 60);
      await addRecent(key, "b", 2, 60);
      await addRecent(key, "c", 2, 60);
      expect(await listRecent(key)).toEqual(["c", "b"]);
    });

    it("listRecent on an unknown key returns an empty array", async () => {
      expect(await listRecent(`test:list-missing:${Math.random()}`)).toEqual([]);
    });
  });

  describe("storeLists — payouts ledger", () => {
    it("appendPayout then listPayouts returns newest-first", async () => {
      await appendPayout(JSON.stringify({ tx: "a" }));
      await appendPayout(JSON.stringify({ tx: "b" }));
      const rows = await listPayouts(2);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(JSON.parse(rows[0]!)).toEqual({ tx: "b" });
    });

    it("listPayouts respects the limit argument", async () => {
      const rows = await listPayouts(1);
      expect(rows.length).toBe(1);
    });
  });

  describe("storeBudgets", () => {
    it("incrBy accumulates and returns the running total", async () => {
      const key = `test:incr:${Math.random()}`;
      expect(await incrBy(key, 5, 60)).toBe(5);
      expect(await incrBy(key, 3, 60)).toBe(8);
    });

    it("reserveBudget allows spend under the cap and denies over it", async () => {
      const key = `test:budget:${Math.random()}`;
      expect(await reserveBudget(key, 40, 100, 60)).toBe(true);
      expect(await reserveBudget(key, 40, 100, 60)).toBe(true);
      // 80 reserved so far; 40 more would exceed the 100 cap.
      expect(await reserveBudget(key, 40, 100, 60)).toBe(false);
    });

    it("reserveBudget rolls back its own reservation when it denies", async () => {
      const key = `test:budget-rollback:${Math.random()}`;
      await reserveBudget(key, 90, 100, 60);
      const denied = await reserveBudget(key, 20, 100, 60);
      expect(denied).toBe(false);
      // Rolled back, so a request that fits the remaining headroom succeeds.
      expect(await reserveBudget(key, 10, 100, 60)).toBe(true);
    });

    it("reserveBudget treats zero units as a no-op that always allows", async () => {
      const key = `test:budget-zero:${Math.random()}`;
      expect(await reserveBudget(key, 0, 1, 60)).toBe(true);
      expect(await incrBy(key, 0, 60)).toBe(0); // untouched
    });

    it("reserveBudget with negative units always allows AND actually decrements the counter", async () => {
      // Regression test: reserveBudget used to `return true` immediately for
      // units<=0 without calling incrBy, so releases (negative deltas) never
      // freed reserved capacity — budget reservations leaked until TTL expiry.
      const key = `test:budget-release:${Math.random()}`;
      await incrBy(key, 50, 60);
      expect(await reserveBudget(key, -50, 100, 60)).toBe(true);
      expect(await incrBy(key, 0, 60)).toBe(0); // fully released back to zero
    });

    it("a full reserve/deny/release/re-reserve cycle frees capacity correctly", async () => {
      const key = `test:budget-cycle:${Math.random()}`;
      expect(await reserveBudget(key, 20, 20, 60)).toBe(true); // at cap
      expect(await reserveBudget(key, 1, 20, 60)).toBe(false); // denied, over cap
      expect(await reserveBudget(key, -20, 20, 60)).toBe(true); // release
      expect(await reserveBudget(key, 1, 20, 60)).toBe(true); // capacity freed
    });
  });
});
