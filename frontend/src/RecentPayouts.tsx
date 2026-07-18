import { useState } from "react";
import { ExternalLink, Wallet, AlertCircle, Zap, Copy, Check, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import {
  CustomTrophy,
  CustomUserHeart,
  CustomBookUser,
  CustomBookOpen,
  CustomMedal,
} from "./customIcons";
import type { RewardLedgerRecord } from "./contract";

interface RecentPayoutsProps {
  payouts: RewardLedgerRecord[];
  loading: boolean;
  error: string | null;
  walletConnected: boolean;
}

// Explorer link for a ledger record: a tx-hash link when one has been joined
// in (see attachTxHashes), else a ledger-sequence link — the durable ledger
// (get_history) holds records the RPC event log has already aged out.
function explorerHref(item: RewardLedgerRecord): string {
  return item.txHash
    ? `https://stellar.expert/explorer/testnet/tx/${item.txHash}`
    : `https://stellar.expert/explorer/testnet/ledger/${item.ledger}`;
}

// Truncate a transaction hash for compact display (e.g. "a1b2c3d4…e5f6g7h8").
function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

// Relative time formatter for transaction items
function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const getIcon = (act: string) => {
  const normalized = act.toLowerCase();
  if (normalized.includes("volunteer")) return CustomUserHeart;
  if (normalized.includes("tutor") || normalized.includes("math")) return CustomBookUser;
  if (normalized.includes("workshop")) return CustomBookOpen;
  if (normalized.includes("event") || normalized.includes("participation")) return CustomMedal;
  return Zap;
};

const itemVariants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: 20,
  },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 110,
      damping: 19,
      mass: 0.9,
    },
  },
};

export function RecentPayouts({ payouts, loading, error, walletConnected }: RecentPayoutsProps) {
  // Tracks which row's hash was just copied, for a brief "Copied" affirmation.
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyHash = async (e: React.MouseEvent, txHash: string, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(txHash);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <motion.div
      data-tour="rewards-history"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="px-5 pt-5 pb-0 space-y-4"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[22px] font-display font-extrabold tracking-[-0.02em] text-[var(--dah-primary)]">
          Recent Payouts
        </h2>
        {walletConnected && payouts.length > 0 && (
          <span className="flex items-center gap-1.5 text-[12px] font-display font-semibold text-[var(--dah-primary)] bg-[var(--dah-secondary-container)]/30 px-2.5 py-1 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--dah-secondary)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--dah-secondary)]"></span>
            </span>
            <span>LIVE FEED</span>
          </span>
        )}
      </div>

      {/* Non-destructive error banner — rendered ABOVE the retained list */}
      {error && (
        <div className="bg-[var(--dah-error-container)]/30 border border-[var(--dah-error)]/25 rounded-[20px] px-4 py-3 flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-[var(--dah-error)] shrink-0" />
          <p className="text-[12px] font-semibold text-[var(--dah-error)] leading-snug">
            {error}
          </p>
        </div>
      )}

      {!walletConnected ? (
        /* Not connected — purely presentational empty state, no RPC */
        <div className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)]/60 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-[var(--dah-surface-low)] rounded-full flex items-center justify-center mx-auto text-[var(--dah-outline)]">
            <Wallet className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="text-[16px] font-display font-bold text-[var(--dah-on-surface)]">
              Connect your wallet
            </p>
            <p className="text-[13px] text-[var(--dah-on-surface-variant)] leading-relaxed max-w-[220px] mx-auto font-medium">
              Connect a Stellar wallet to see your recent on-chain payouts here.
            </p>
          </div>
        </div>
      ) : loading && payouts.length === 0 ? (
        /* Initial loading indicator */
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)]/60 p-4 flex items-center justify-between animate-pulse"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-[var(--dah-surface-low)] shrink-0" />
                <div className="space-y-2">
                  <div className="h-3.5 w-24 bg-[var(--dah-surface-low)] rounded-full" />
                  <div className="h-2.5 w-32 bg-[var(--dah-surface-low)] rounded-full" />
                </div>
              </div>
              <div className="h-5 w-16 bg-[var(--dah-surface-low)] rounded-full" />
            </div>
          ))}
        </div>
      ) : payouts.length > 0 ? (
        /* Populated payout list */
        <div className="space-y-2.5">
          {payouts.map((item, index) => {
            const IconComponent = getIcon(item.activity);
            const rowKey = item.txHash ?? `ledger-${item.ledger}`;

            return (
              <motion.div
                key={rowKey}
                variants={itemVariants}
                initial="hidden"
                animate="show"
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)]/60 p-4 flex items-center justify-between hover:border-[var(--dah-primary)] transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-full bg-[var(--dah-surface-low)] flex items-center justify-center shrink-0">
                    <IconComponent className="w-5 h-5 text-[var(--dah-primary)]" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[14px] font-display font-bold text-[var(--dah-on-surface)] capitalize truncate">
                      {item.activity}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-[var(--dah-on-surface-variant)] font-medium truncate">
                        {item.txHash ? truncateHash(item.txHash) : `Ledger #${item.ledger}`}
                      </span>
                      {item.txHash && (
                        <button
                          type="button"
                          title="Copy full transaction hash"
                          onClick={(e) => handleCopyHash(e, item.txHash!, rowKey)}
                          className="text-[var(--dah-outline)] hover:text-[var(--dah-primary)] transition-colors cursor-pointer"
                        >
                          {copiedKey === rowKey ? (
                            <Check className="w-3 h-3 text-[var(--dah-secondary)]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      <span className="text-[11px] font-medium text-[var(--dah-outline)]">
                        · {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end font-display">
                      <span className="text-[16px] font-extrabold text-[var(--dah-secondary)]">
                        +{item.amount}
                      </span>
                      <span className="text-[11px] font-bold text-[var(--dah-outline)]">
                        XLM
                      </span>
                    </div>
                    <a
                      href={explorerHref(item)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-semibold text-[var(--dah-primary)] hover:underline flex items-center gap-0.5 justify-end"
                    >
                      Explorer
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[var(--dah-secondary-container)]/25 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-[var(--dah-secondary)]" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : !error ? (
        /* Empty state after a successful query */
        <div className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)]/60 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-[var(--dah-surface-low)] rounded-full flex items-center justify-center mx-auto text-[var(--dah-outline)]">
            <CustomTrophy className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="text-[16px] font-display font-bold text-[var(--dah-on-surface)]">
              No payouts found yet
            </p>
            <p className="text-[13px] text-[var(--dah-on-surface-variant)] leading-relaxed max-w-[220px] mx-auto font-medium">
              Payouts sent to your wallet on the Stellar testnet will appear here automatically.
            </p>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
