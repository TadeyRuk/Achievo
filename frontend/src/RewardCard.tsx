import { useMemo } from "react";
import { ExternalLink, X } from "lucide-react";
import { motion } from "motion/react";

interface RewardCardProps {
  reward: number;
  txHash: string;
  onClose: () => void;
}

const MESSAGES = [
  { headline: "You crushed it!", sub: "Your effort was recognized and rewarded on-chain." },
  { headline: "Achievement unlocked!", sub: "Keep showing up — every action counts." },
  { headline: "That's what we're talking about!", sub: "Your contribution just hit the Stellar network." },
  { headline: "Legend behavior.", sub: "XLM sent straight to your wallet. No middleman." },
  { headline: "You're on a roll!", sub: "Your dedication is literally paying off." },
];

export function RewardCard({ reward, txHash, onClose }: RewardCardProps) {
  // Pick a random message once per mount — stable across re-renders
  // eslint-disable-next-line react-hooks/purity
  const msg = useMemo(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)], []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center p-6"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "rgba(0,22,43,0.55)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Close — card level so overflow-hidden can't clip it */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/15 hover:bg-black/25 transition-colors"
        >
          <X className="w-4 h-4 text-[var(--dah-primary)]" />
        </button>

        {/* Gold hero */}
        <div className="gold-shimmer p-7 relative overflow-hidden text-center">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[var(--dah-primary)]/10 rounded-full pointer-events-none" />

          <div className="relative space-y-3">
            {/* Big XLM number */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 18 }}
              className="flex items-baseline justify-center gap-1"
            >
              <span className="text-[64px] font-extrabold leading-none tracking-tight text-[var(--dah-primary)] font-display">
                {reward}
              </span>
              <span className="text-[22px] font-extrabold text-[var(--dah-secondary)] font-display">XLM</span>
            </motion.div>

            {/* Encouraging message */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="space-y-1"
            >
              <p className="text-[18px] font-extrabold text-[var(--dah-primary)] tracking-tight font-display">
                {msg.headline}
              </p>
              <p className="text-[12px] text-[var(--dah-primary)]/70 font-semibold leading-relaxed">
                {msg.sub}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Dark footer with View button only */}
        <div className="bg-[var(--dah-primary)] px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-[11px] text-white/45 font-semibold uppercase tracking-[0.06em]">On-chain · Stellar Testnet</p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--dah-secondary-container)] text-[var(--dah-on-secondary-container)] text-[12px] font-extrabold hover:brightness-105 transition-all shadow-sm font-display uppercase tracking-wider"
          >
            <span>View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
