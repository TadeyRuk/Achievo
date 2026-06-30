import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import fc from "fast-check";
import { RecentPayouts } from "../RecentPayouts";
import type { PayoutItem } from "../contract";

// ─── Generators ───────────────────────────────────────────────────────────────

// Transaction hashes are hex strings; constraining the charset keeps them safe to
// use inside an href attribute selector and guarantees deterministic rendering.
const hexChar = fc.constantFrom(..."0123456789abcdef".split(""));
const txHashArb = fc
  .array(hexChar, { minLength: 16, maxLength: 64 })
  .map((chars) => chars.join(""));

// Non-empty, visible activity labels (CSS `capitalize`/`truncate` are purely
// presentational and do not alter textContent, so we can match the raw string).
const activityArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0);

// Amounts as clean decimals (stroops/100). JS renders these with a stable,
// shortest string representation, so `String(amount)` matches what the row shows.
const amountArb = fc.integer({ min: 1, max: 1_000_000 }).map((n) => n / 100);

const payoutItemArb: fc.Arbitrary<PayoutItem> = fc.record({
  txHash: txHashArb,
  recipient: fc.string({ minLength: 1, maxLength: 56 }),
  amount: amountArb,
  activity: activityArb,
  timestamp: fc.integer({ min: 0, max: 2_000_000_000_000 }),
});

// Unique txHash per item — the component keys rows by txHash, and the feed dedupes
// on it, so a realistic generated list never repeats a hash.
const payoutsArb = fc.uniqueArray(payoutItemArb, {
  selector: (p) => p.txHash,
  minLength: 1,
  maxLength: 8,
});

// ─── Property 8 ─────────────────────────────────────────────────────────────--

describe("RecentPayouts row content", () => {
  // **Validates: Requirements 5.2**
  it("Feature: live-rewards-feed, Property 8: Rendered payout exposes amount, activity, and tx hash", () => {
    fc.assert(
      fc.property(payoutsArb, (payouts) => {
        const { container } = render(
          <RecentPayouts
            payouts={payouts}
            loading={false}
            error={null}
            walletConnected={true}
          />
        );

        try {
          for (const item of payouts) {
            // Locate the row via the full txHash in the stellar.expert anchor href.
            // The href carries the *full* hash even though the visible label is
            // truncated, making this assertion robust to display truncation.
            const link = container.querySelector(
              `a[href="https://stellar.expert/explorer/testnet/tx/${item.txHash}"]`
            );
            expect(link, `expected anchor for txHash ${item.txHash}`).not.toBeNull();

            const row = link!.closest("div.bg-white");
            expect(row, `expected row container for txHash ${item.txHash}`).not.toBeNull();

            const rowText = row!.textContent ?? "";

            // Amount in XLM.
            expect(rowText).toContain(String(item.amount));
            expect(rowText).toContain("XLM");

            // Activity label.
            expect(rowText).toContain(item.activity);
          }
        } finally {
          // Many renders occur within a single property run; unmount between
          // iterations so subsequent renders start from a clean DOM.
          cleanup();
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
