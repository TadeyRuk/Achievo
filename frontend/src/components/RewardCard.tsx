import { CheckCircle2, ExternalLink, Trophy } from "lucide-react";
import { motion } from "motion/react";

interface RewardCardProps {
  reward: number;
  txHash: string;
}

export function RewardCard({ reward, txHash }: RewardCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="rounded-[12px] overflow-hidden mt-6 shadow-xl shadow-[var(--dah-secondary-container)]/25"
    >
      {/* Gold shimmer hero */}
      <div className="gold-shimmer p-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/15 rounded-full pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-[var(--dah-primary)]/10 rounded-full pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 320 }}
            >
              <CheckCircle2 className="w-5 h-5 text-[var(--dah-primary)]" />
            </motion.div>
            <span className="text-[13px] font-bold text-[var(--dah-primary)] uppercase tracking-[0.06em]">
              Reward Distributed
            </span>
          </div>

          <div className="flex items-end gap-2">
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-[52px] font-extrabold leading-none tracking-[-0.025em] text-[var(--dah-primary)]"
            >
              {reward}
            </motion.span>
            <span className="text-[20px] font-bold text-[var(--dah-secondary)] pb-1.5">XLM</span>
          </div>

          <p className="text-[12px] text-[var(--dah-primary)]/70 font-medium mt-1.5">
            Sent directly to your wallet
          </p>
        </div>
      </div>

      {/* Transaction details — navy */}
      <div className="bg-[var(--dah-primary)] p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy className="w-3.5 h-3.5 text-[var(--dah-on-primary-container)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-white/50">
            Transaction Hash
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <code className="text-[12px] font-mono text-white/80 truncate">
            {txHash.slice(0, 24)}…
          </code>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[var(--dah-secondary-container)] text-[var(--dah-on-secondary-container)] text-[11px] font-bold hover:brightness-105 transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            View
          </a>
        </div>
      </div>
    </motion.div>
  );
}
