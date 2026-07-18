import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { iosSpring, reducedMotionTransition } from '../../shared/lib/sheetMotion';

export function FeedbackThankYou() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={reduceMotion ? reducedMotionTransition : iosSpring}
      className="flex flex-col items-center justify-center py-14 space-y-3"
    >
      <div className="w-14 h-14 rounded-full bg-[var(--dah-secondary-container)]/35 flex items-center justify-center">
        <Check className="w-7 h-7 text-[var(--dah-secondary)]" strokeWidth={2.5} />
      </div>
      <p className="text-[20px] font-semibold text-[var(--dah-primary)] tracking-tight">
        Thank You
      </p>
    </motion.div>
  );
}
