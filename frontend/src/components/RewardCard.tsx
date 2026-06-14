import { CheckCircle2, ExternalLink, Trophy } from "lucide-react";
import { motion } from "motion/react";

interface RewardCardProps {
  reward: number;
  txHash: string;
}

export function RewardCard({ reward, txHash }: RewardCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.93, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="rounded-[24px] overflow-hidden mt-6 shadow-lg shadow-[var(--dah-secondary-container)]/25"
    >
      {/* Gold shimmer hero card */}
      <div className="gold-shimmer p-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/20 rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[var(--dah-primary)]/10 rounded-full pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 350 }}
            >
              <CheckCircle2 className="w-5.5 h-5.5 text-[var(--dah-primary)]" />
            </motion.div>
            <span className="text-[12px] font-extrabold text-[var(--dah-primary)] uppercase tracking-[0.08em] font-display">
              Reward Distributed
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-[54px] font-extrabold leading-none tracking-tight text-[var(--dah-primary)] font-display"
            >
              {reward}
            </motion.span>
            <span className="text-[20px] font-extrabold text-[var(--dah-secondary)] font-display">XLM</span>
          </div>

          <p className="text-[12px] text-[var(--dah-primary)]/75 font-semibold mt-1">
            Transferred directly to your connected wallet
          </p>
        </div>
      </div>

      {/* Transaction details card section */}
      <div className="bg-[var(--dah-primary)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[var(--dah-on-primary-container)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50 font-display">
            On-Chain Transaction
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <code className="text-[12px] font-mono text-white/90 truncate font-semibold">
            {txHash.slice(0, 26)}…
          </code>
          
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--dah-secondary-container)] text-[var(--dah-on-secondary-container)] text-[12px] font-extrabold hover:brightness-105 transition-all shadow-sm font-display uppercase tracking-wider"
          >
            <span>View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
