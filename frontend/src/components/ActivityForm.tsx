import { Send, AlertCircle, Zap, Users, BookOpen, Tent, Presentation } from "lucide-react";
import { motion } from "motion/react";

interface ActivityFormProps {
  text: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  isWalletConnected: boolean;
  isSubmitting: boolean;
}

const ACTIVITIES = [
  { icon: Tent,         label: "Volunteering",  xlm: 10, hint: "I volunteered at…" },
  { icon: Users,        label: "Tutoring",       xlm: 5,  hint: "I tutored a classmate in…" },
  { icon: BookOpen,     label: "Workshop",       xlm: 2,  hint: "I attended a workshop on…" },
  { icon: Presentation, label: "Event",          xlm: 3,  hint: "I participated in…" },
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
      className="p-4 sm:p-5 space-y-4"
    >
      {/* Hero — navy gradient card */}
      <div className="bg-[var(--dah-primary-container)] rounded-[12px] p-5 text-white relative overflow-hidden">
        {/* Decorative accent */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-[var(--dah-secondary-container)]/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[var(--dah-secondary-container)]" strokeWidth={2.5} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--dah-on-primary-container)]">
              AI-Powered Rewards
            </span>
          </div>
          <h2 className="text-[22px] font-extrabold tracking-[-0.02em] mb-1 text-white">
            Submit Activity
          </h2>
          <p className="text-[13px] text-white/60 leading-relaxed mb-4">
            Describe what you did — the pipeline verifies and sends XLM in seconds.
          </p>

          <textarea
            value={text}
            onChange={e => onChange(e.target.value)}
            disabled={isSubmitting || !isWalletConnected}
            placeholder={
              isWalletConnected
                ? "e.g. I volunteered at the local animal shelter for 3 hours yesterday."
                : "Connect your wallet first — tap Profile below."
            }
            rows={4}
            className="w-full px-4 py-3 rounded-[8px] bg-white/8 border border-white/15 text-white placeholder:text-white/35 focus:outline-none focus:border-[var(--dah-secondary-container)]/60 focus:bg-white/12 transition-all resize-none disabled:opacity-40 disabled:cursor-not-allowed text-[14px] leading-relaxed backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Activity type chips — tap to prefill */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--dah-outline)] mb-2.5 px-0.5">
          Quick-fill activity type
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ACTIVITIES.map(({ icon: Icon, label, xlm, hint }) => (
            <button
              key={label}
              onClick={() => fillHint(hint)}
              disabled={isSubmitting || !isWalletConnected}
              className="flex items-center justify-between gap-2 px-3.5 py-3 rounded-[8px] bg-white border border-[var(--dah-outline-variant)] hover:border-[var(--dah-primary)] hover:bg-[var(--dah-surface-low)] active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-[6px] bg-[var(--dah-surface-container)] shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[var(--dah-primary)]" />
                </div>
                <span className="text-[13px] font-semibold text-[var(--dah-on-surface)] truncate">{label}</span>
              </div>
              <span className="text-[11px] font-bold text-[var(--dah-secondary)] shrink-0 bg-[var(--dah-secondary-container)]/20 px-1.5 py-0.5 rounded-[4px]">
                +{xlm}
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
          className="flex items-start gap-3 p-4 rounded-[8px] bg-[var(--dah-surface-container)] border border-[var(--dah-outline-variant)] text-[var(--dah-on-surface-variant)]"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--dah-outline)]" />
          <p className="text-[13px] font-medium leading-snug">
            Connect your Stellar wallet in Profile before submitting.
          </p>
        </motion.div>
      )}

      {/* Submit CTA */}
      <button
        onClick={onSubmit}
        disabled={isDisabled}
        className="w-full flex items-center justify-center gap-2.5 bg-[var(--dah-secondary-container)] hover:brightness-105 disabled:bg-[var(--dah-surface-high)] disabled:text-[var(--dah-outline)] text-[var(--dah-on-secondary-container)] px-6 py-4 rounded-[8px] font-bold text-[15px] tracking-[-0.01em] transition-all active:scale-[0.98] disabled:active:scale-100 disabled:cursor-not-allowed shadow-lg shadow-[var(--dah-secondary-container)]/30 disabled:shadow-none"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-[var(--dah-on-secondary-container)]/30 border-t-[var(--dah-on-secondary-container)] rounded-full animate-spin" />
            <span>Running pipeline…</span>
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
