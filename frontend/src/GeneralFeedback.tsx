import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { submitGeneralFeedback } from "./generalFeedback";
import { FeedbackRatingRow } from "./FeedbackRatingRow";
import { FeedbackThankYou } from "./FeedbackThankYou";
import { IOSSheet } from "./IOSSheet";
import { LiquidGlassPill } from "./liquidGlass";
import { reducedMotionTransition } from "./sheetMotion";

interface GeneralFeedbackProps {
  userName: string;
  onClose: () => void;
}

export function GeneralFeedback({ userName, onClose }: GeneralFeedbackProps) {
  const reduceMotion = useReducedMotion();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Please select a star rating before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await submitGeneralFeedback({
      rating,
      comment: comment.trim() || undefined,
      name: userName || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSubmitted(true);
    setTimeout(onClose, 900);
  };

  return (
    <IOSSheet onDismiss={onClose} aria-label="Feedback" variant="glass">
      <AnimatePresence mode="wait" initial={false}>
        {submitted ? (
          <FeedbackThankYou key="success" />
        ) : (
          <motion.div
            key="form"
            initial={false}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={reducedMotionTransition}
            className="space-y-6"
          >
            <div className="flex items-start justify-between gap-3 pt-1">
              <h2 className="text-[22px] font-semibold text-[var(--dah-primary)] tracking-tight leading-snug pr-2">
                How&apos;s Achievo working for you?
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 pt-1 text-[17px] font-normal text-[var(--dah-outline)] active:opacity-60"
              >
                Cancel
              </button>
            </div>

            <FeedbackRatingRow
              rating={rating}
              hoverRating={hoverRating}
              onRate={setRating}
              onHover={setHoverRating}
              onHoverEnd={() => setHoverRating(0)}
            />

            <div className="space-y-2">
              <label
                htmlFor="general-feedback-comment"
                className="text-[13px] font-normal text-[var(--dah-on-surface-variant)]"
              >
                Comment
              </label>
              <textarea
                id="general-feedback-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Bugs, ideas, anything on your mind…"
                className="w-full resize-none rounded-[12px] border-0 bg-[var(--dah-surface-low)] px-4 py-3 text-[16px] text-[var(--dah-on-surface)] placeholder:text-[var(--dah-outline)] focus:outline-none focus:ring-2 focus:ring-[var(--dah-secondary)]/30"
              />
              <p className="text-[12px] text-right text-[var(--dah-outline)]">
                {comment.length}/500
              </p>
            </div>

            {error && (
              <p className="text-[13px] font-medium text-[var(--dah-error)] text-center">{error}</p>
            )}

            <LiquidGlassPill className="w-full">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="w-full flex items-center justify-center py-3.5 rounded-full text-[var(--dah-primary)] text-[17px] font-semibold disabled:opacity-50 active:opacity-80 transition-opacity"
              >
                {submitting ? "Sending…" : "Submit"}
              </button>
            </LiquidGlassPill>
          </motion.div>
        )}
      </AnimatePresence>
    </IOSSheet>
  );
}
