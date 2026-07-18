import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Star } from "lucide-react";
import { iosSpring } from "./sheetMotion";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"] as const;

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

const FILLED_STAR_CLASS =
  "fill-[var(--dah-secondary)] text-[var(--dah-secondary)]";
const EMPTY_STAR_CLASS = "text-[#d5d9e2]";

interface FeedbackRatingRowProps {
  rating: number;
  hoverRating: number;
  onRate: (value: number) => void;
  onHover: (value: number) => void;
  onHoverEnd: () => void;
}

export function FeedbackRatingRow({
  rating,
  hoverRating,
  onRate,
  onHover,
  onHoverEnd,
}: FeedbackRatingRowProps) {
  const reduceMotion = useReducedMotion();
  const displayRating = hoverRating || rating;
  const label = displayRating > 0 ? RATING_LABELS[displayRating] : "Tap a star to rate";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-1.5 py-1">
        {STAR_VALUES.map((value) => {
          const filled = value <= displayRating;
          const starScale =
            !reduceMotion && rating === value ? { scale: [1, 1.08, 1] } : { scale: 1 };

          return (
            <motion.button
              key={value}
              type="button"
              onClick={() => onRate(value)}
              onMouseEnter={() => onHover(value)}
              onMouseLeave={onHoverEnd}
              aria-label={`Rate ${value} out of 5`}
              className="p-1.5"
              whileTap={reduceMotion ? undefined : { scale: 0.92 }}
              animate={reduceMotion ? undefined : starScale}
              transition={iosSpring}
            >
              <Star
                className={`w-10 h-10 transition-colors duration-150 ${
                  filled ? FILLED_STAR_CLASS : EMPTY_STAR_CLASS
                }`}
                strokeWidth={1.5}
              />
            </motion.button>
          );
        })}
      </div>
      <div className="min-h-[20px] flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={label}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-center text-[15px] font-semibold text-[var(--dah-primary)]"
          >
            {label}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
