import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { RefreshCw } from "lucide-react";

type Props = {
  variants: Variants;
  onFund: () => void;
};

export function WalletFundPrompt({ variants, onFund }: Props) {
  return (
    <motion.button
      variants={variants}
      onClick={onFund}
      className="w-full flex items-center justify-center gap-2.5 py-4 rounded-full bg-[var(--dah-secondary-container)] text-[var(--dah-on-secondary-container)] font-extrabold text-[14px] hover:brightness-105 transition-colors duration-200 shadow-md shadow-[var(--dah-secondary-container)]/25 font-display uppercase tracking-[0.02em]"
    >
      <RefreshCw className="w-4 h-4" />
      Claim Friendbot Testnet XLM
    </motion.button>
  );
}
