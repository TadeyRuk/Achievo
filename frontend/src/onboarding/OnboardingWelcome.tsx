import { motion, useReducedMotion } from "motion/react";
import { reducedMotionTransition } from "../sheetMotion";

interface OnboardingWelcomeProps {
  onStart: () => void;
  onSkip: () => void;
}

export function OnboardingWelcome({ onStart, onSkip }: OnboardingWelcomeProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduceMotion ? reducedMotionTransition : { duration: 0.28, ease: "easeOut" }}
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{ background: "rgba(0, 22, 43, 0.55)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Achievo"
    >
      <div className="w-full max-w-[320px] bg-white rounded-[32px] p-7 text-center shadow-2xl border border-slate-100 space-y-5">
        <img
          src="/only_logo.png"
          alt=""
          className="w-16 h-16 mx-auto"
        />

        <div className="space-y-1.5">
          <h2 className="text-[22px] font-extrabold text-[var(--dah-primary)] font-display tracking-tight">
            Welcome to Achievo
          </h2>
          <p className="text-[13px] text-[var(--dah-on-surface-variant)] font-semibold leading-relaxed">
            Submit real activities. Earn XLM rewards. Here’s a quick look around.
          </p>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onStart}
            className="w-full py-3.5 rounded-full bg-[#ffbf21] text-[#00162b] font-extrabold text-[14px] font-display uppercase tracking-wider shadow-md shadow-[#ffbf21]/20 active:scale-[0.98] transition-transform cursor-pointer"
          >
            Show me
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="w-full py-3 rounded-full text-[13px] font-bold text-[var(--dah-on-surface-variant)] hover:bg-[var(--dah-surface-low)] transition-colors cursor-pointer"
          >
            Skip
          </button>
        </div>
      </div>
    </motion.div>
  );
}
