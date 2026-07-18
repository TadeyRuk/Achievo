import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { Database } from "lucide-react";
import type { TreasuryInfo } from "@achievo/stellar";

type Props = {
  variants: Variants;
  treasuryInfo: TreasuryInfo | null;
};

export function TreasuryStatsBlock({ variants, treasuryInfo }: Props) {
  return (
    <motion.div
      variants={variants}
      className="bg-[var(--dah-primary)] rounded-[24px] p-5 text-white shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-[var(--dah-on-primary-container)]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/60 font-display">
          Smart Contract Treasury
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Available", value: treasuryInfo ? `${treasuryInfo.balance.toFixed(0)} XLM` : "—" },
          { label: "Disbursed", value: treasuryInfo ? `${treasuryInfo.totalDisbursed.toFixed(0)} XLM` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/10 rounded-t-[20px] rounded-b-[8px] p-3.5 border border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50 mb-1">{label}</p>
            <p className="text-[16px] font-extrabold text-[var(--dah-secondary-container)] font-display">{value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
