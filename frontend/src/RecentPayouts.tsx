import { ExternalLink, Wallet, AlertCircle, Zap } from "lucide-react";
import { motion } from "motion/react";
import { CustomTrophy } from "./customIcons";
import type { PayoutItem } from "./contract";

interface RecentPayoutsProps {
  payouts: PayoutItem[];
  loading: boolean;
  error: string | null;
  walletConnected: boolean;
}

// Truncate a transaction hash for compact display (e.g. "a1b2c3d4…e5f6g7h8").
function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="space-y-4"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[22px] font-display font-extrabold tracking-[-0.02em] text-[var(--dah-primary)]">
          Recent Payouts
        </h2>
        {walletConnected && payouts.length > 0 && (
          <span className="text-[12px] font-display font-semibold text-[var(--dah-primary)] bg-[var(--dah-secondary-container)]/30 px-2.5 py-1 rounded-full">
            Live
          </span>
        )}
      </div>

      {/* Non-destructive error banner — rendered ABOVE the retained list (Req 6.1) */}
      {error && (
        <div className="bg-[var(--dah-surface-low)] border border-[var(--dah-outline-variant)]/60 rounded-[20px] px-4 py-3 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-[var(--dah-outline)] shrink-0" />
          <p className="text-[12px] font-medium text-[var(--dah-on-surface-variant)] leading-snug">
            {error}
          </p>
        </div>
      )}

      {!walletConnected ? (
        /* Not connected — purely presentational empty state, no RPC (Req 2.2) */
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
        /* Initial loading indicator (Req 5.4) */
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
              <div className="h-4 w-16 bg-[var(--dah-surface-low)] rounded-full" />
            </div>
          ))}
        </div>
      ) : payouts.length > 0 ? (
        /* Populated payout list (Req 5.2) */
        <div className="space-y-2.5">
          {payouts.map((item, index) => (
            <motion.div
              key={item.txHash}
              variants={itemVariants}
              initial="hidden"
              animate="show"
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-[24px] border border-[var(--dah-outline-variant)]/60 p-4 flex items-center justify-between hover:border-[var(--dah-primary)] transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-[var(--dah-surface-low)] flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-[var(--dah-primary)]" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-[14px] font-display font-bold text-[var(--dah-on-surface)] capitalize truncate">
                    {item.activity}
                  </p>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${item.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-[var(--dah-primary)] hover:underline flex items-center gap-1 font-mono"
                  >
                    {truncateHash(item.txHash)}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-1 justify-end font-display shrink-0">
                <span className="text-[16px] font-extrabold text-[var(--dah-secondary)]">
                  +{item.amount}
                </span>
                <span className="text-[11px] font-bold text-[var(--dah-outline)]">XLM</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : !error ? (
        /* Empty state after a successful query (Req 5.3, 6.3) */
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
