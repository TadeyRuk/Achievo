import { Send, AlertCircle, Zap } from "lucide-react";
import { motion } from "motion/react";
import { CustomUserHeart, CustomBookUser, CustomBookOpen, CustomMedal } from "./customIcons";

interface ActivityFormProps {
  text: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  isWalletConnected: boolean;
  isSubmitting: boolean;
}

const ACTIVITIES = [
  { icon: CustomUserHeart, label: "Volunteering",  xlm: 10, hint: "I volunteered at…" },
  { icon: CustomBookUser,  label: "Tutoring",       xlm: 5,  hint: "I tutored a classmate in…" },
  { icon: CustomBookOpen,  label: "Workshop",       xlm: 2,  hint: "I attended a workshop on…" },
  { icon: CustomMedal,     label: "Event / Participation", xlm: 3,  hint: "I participated in…" },
];

export function ActivityForm({ text, onChange, onSubmit, isWalletConnected, isSubmitting }: ActivityFormProps) {
  const isDisabled = !isWalletConnected || !text.trim() || isSubmitting;

  const fillHint = (hint: string) => {
    if (!isSubmitting && isWalletConnected) onChange(hint);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-5 space-y-5"
    >
      {/* Hero Card - 28px/32px corner radius, no borders, Level 1 elevation */}
      <div className="bg-[var(--dah-primary-container)] rounded-[28px] p-6 text-white relative overflow-hidden shadow-lg shadow-[var(--dah-primary-container)]/15">
        {/* Decorative circle accents */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-[var(--dah-secondary-container)]/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--dah-secondary-container)]" strokeWidth={2.5} />
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--dah-on-primary-container)]">
              AI Verification Pipeline
            </span>
          </div>
          
          <div>
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-white font-display">
              Submit Activity
            </h2>
            <p className="text-[13px] text-white/70 leading-relaxed mt-1">
              Describe your academic contribution — our agents process and reward you on-chain instantly.
            </p>
          </div>

          <textarea
            value={text}
            onChange={e => onChange(e.target.value)}
            disabled={isSubmitting || !isWalletConnected}
            placeholder={
              isWalletConnected
                ? "e.g. I volunteered at the local animal shelter for 3 hours yesterday."
                : "Connect your wallet first — go to the Profile tab."
            }
            rows={4}
            className="w-full px-5 py-4 rounded-[20px] bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--dah-secondary-container)] focus:ring-2 focus:ring-[var(--dah-secondary-container)]/25 focus:bg-white/15 transition-all resize-none disabled:opacity-40 disabled:cursor-not-allowed text-[14px] leading-relaxed backdrop-blur-md"
          />
        </div>
      </div>

      {/* Activity type chips — pill-shaped buttons */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--dah-outline)] px-1 font-display">
          Quick-Fill Activity Types
        </p>
        <div className="flex flex-col gap-2">
          {ACTIVITIES.map(({ icon: Icon, label, xlm, hint }) => (
            <button
              key={label}
              onClick={() => fillHint(hint)}
              disabled={isSubmitting || !isWalletConnected}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-full bg-white border border-[var(--dah-outline-variant)] hover:border-[var(--dah-primary)] hover:bg-[var(--dah-surface-low)] active:scale-[0.98] transition-all disabled:opacity-45 disabled:cursor-not-allowed text-left shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[var(--dah-surface-low)] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[var(--dah-primary)]" />
                </div>
                <span className="text-[13px] font-bold text-[var(--dah-on-surface)] truncate">{label}</span>
              </div>
              <span className="text-[11px] font-extrabold text-[var(--dah-secondary)] bg-[var(--dah-secondary-container)]/20 px-2.5 py-1 rounded-full shrink-0">
                +{xlm} XLM
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Wallet warning */}
      {!isWalletConnected && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3.5 p-4 rounded-[20px] bg-[var(--dah-surface-low)] border border-[var(--dah-outline-variant)] text-[var(--dah-on-surface-variant)]"
        >
          <AlertCircle className="w-4.5 h-4.5 shrink-0 text-[var(--dah-outline)] mt-0.5" />
          <p className="text-[13px] font-semibold leading-snug">
            Please link your Stellar testnet wallet on the Profile tab to enable submissions.
          </p>
        </motion.div>
      )}

      {/* Submit CTA — Pill-shaped and secondary expressive (golden) */}
      <button
        onClick={onSubmit}
        disabled={isDisabled}
        className="w-full flex items-center justify-center gap-2.5 bg-[var(--dah-secondary-container)] hover:brightness-105 disabled:bg-[var(--dah-surface-container)] disabled:text-[var(--dah-outline)] text-[var(--dah-on-secondary-container)] px-6 py-4 rounded-full font-extrabold text-[15px] tracking-tight transition-all active:scale-[0.98] disabled:active:scale-100 disabled:cursor-not-allowed shadow-md shadow-[var(--dah-secondary-container)]/20 disabled:shadow-none font-display uppercase"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-[var(--dah-on-secondary-container)]/30 border-t-[var(--dah-on-secondary-container)] rounded-full animate-spin" />
            <span>Verifying Submission…</span>
          </>
        ) : (
          <>
            <span>Submit Activity</span>
            <Send className="w-4 h-4" />
          </>
        )}
      </button>
    </motion.div>
  );
}
