import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { RecentPayouts } from "../RecentPayouts";
import type { PayoutItem } from "../contract";

// Example-based render-state tests for RecentPayouts. These complement the
// property test in RecentPayouts.rowContent.test.tsx (task 12.2) by pinning down
// the discrete UI states the component can present.

afterEach(() => {
  cleanup();
});

// A small, fixed payout used by the states that need a populated list.
const samplePayout: PayoutItem = {
  txHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  recipient: "GRECIPIENTADDRESS000000000000000000000000000000000000000",
  amount: 12.5,
  activity: "Workout completed",
  timestamp: 1_700_000_000_000,
};

describe("RecentPayouts render states", () => {
  // ── Not connected (Req 2.2) ──────────────────────────────────────────────
  it("renders the connect-wallet empty state and no payout rows when the wallet is not connected", () => {
    render(
      <RecentPayouts
        payouts={[]}
        loading={false}
        error={null}
        walletConnected={false}
      />
    );

    // The connect-wallet prompt copy is shown.
    expect(screen.getByText("Connect your wallet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Connect a Stellar wallet to see your recent on-chain payouts here."
      )
    ).toBeInTheDocument();

    // The success/empty copy is NOT shown.
    expect(screen.queryByText("No payouts found yet")).not.toBeInTheDocument();

    // No payout rows render — there is no link to the block explorer.
    expect(
      document.querySelector('a[href^="https://stellar.expert/"]')
    ).toBeNull();
  });

  // ── Loading with no items (Req 5.4) ──────────────────────────────────────
  it("renders the loading skeleton when loading with no payouts", () => {
    const { container } = render(
      <RecentPayouts
        payouts={[]}
        loading={true}
        error={null}
        walletConnected={true}
      />
    );

    // The skeleton uses animate-pulse placeholders (three rows).
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);

    // Neither the empty-state nor the connect prompt should appear while loading.
    expect(screen.queryByText("No payouts found yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Connect your wallet")).not.toBeInTheDocument();
  });

  // ── Empty after a successful query (Req 5.3) ─────────────────────────────
  it("renders the no-payouts empty state after a successful empty query", () => {
    render(
      <RecentPayouts
        payouts={[]}
        loading={false}
        error={null}
        walletConnected={true}
      />
    );

    expect(screen.getByText("No payouts found yet")).toBeInTheDocument();

    // It must not show the loading skeleton or the connect prompt.
    expect(document.querySelector(".animate-pulse")).toBeNull();
    expect(screen.queryByText("Connect your wallet")).not.toBeInTheDocument();
  });

  // ── Error with retained items (Req 6.1) ──────────────────────────────────
  it("shows the error banner while retaining previously displayed payout rows", () => {
    const errorMessage = "Could not reach the network. Showing the last results.";

    render(
      <RecentPayouts
        payouts={[samplePayout]}
        loading={false}
        error={errorMessage}
        walletConnected={true}
      />
    );

    // The error banner text is visible.
    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // The retained payout row remains visible: its explorer link and activity.
    const link = document.querySelector(
      `a[href="https://stellar.expert/explorer/testnet/tx/${samplePayout.txHash}"]`
    );
    expect(link).not.toBeNull();

    const row = link!.closest("div.bg-white") as HTMLElement | null;
    expect(row).not.toBeNull();
    expect(within(row!).getByText(samplePayout.activity)).toBeInTheDocument();
    expect(row!.textContent ?? "").toContain("XLM");

    // The empty state must not appear while items are retained.
    expect(screen.queryByText("No payouts found yet")).not.toBeInTheDocument();
  });
});
