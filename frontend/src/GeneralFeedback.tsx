import { useState } from "react";
import { motion } from "motion/react";
import { Star, X } from "lucide-react";
import { submitGeneralFeedback } from "./generalFeedback";

interface GeneralFeedbackProps {
  userName: string;
  onClose: () => void;
}

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"] as const;

export function GeneralFeedback({ userName, onClose }: GeneralFeedbackProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const displayRating = hoverRating || rating;

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
    setTimeout(onClose, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-[#00162b]/45 backdrop-blur-sm z-[60] flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="w-full bg-white rounded-t-[28px] px-6 pt-5 pb-8 space-y-5 max-h-[85%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--dah-on-surface-variant)]">
              Feedback
            </p>
            <h2 className="text-[20px] font-extrabold text-[var(--dah-primary)] font-display tracking-tight">
              How's Achievo working for you?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[var(--dah-surface-highest)] hover:bg-[#e8eaf0] transition-colors"
          >
            <X className="w-4 h-4 text-[var(--dah-on-surface-variant)]" />
          </button>
        </div>

        {submitted ? (
          <p className="text-center text-[14px] font-extrabold text-[var(--dah-primary)] py-6">
            Thanks for the feedback!
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform active:scale-95"
                    aria-label={`Rate ${value} out of 5`}
                  >
                    <Star
                      className={`w-9 h-9 transition-colors ${
                        value <= displayRating
                          ? "fill-[var(--dah-secondary)] text-[var(--dah-secondary)]"
                          : "text-[#d5d9e2]"
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-[13px] font-extrabold text-[var(--dah-primary)] font-display min-h-[20px]">
                {displayRating > 0 ? RATING_LABELS[displayRating] : "Tap a star to rate"}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="general-feedback-comment"
                className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--dah-on-surface-variant)]"
              >
                Optional comment
              </label>
              <textarea
                id="general-feedback-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Bugs, ideas, anything on your mind…"
                className="w-full resize-none rounded-2xl border border-[#e1e3e8] bg-[#faf9ff] px-4 py-3 text-[14px] text-[var(--dah-primary)] placeholder:text-[#9aa3b2] focus:outline-none focus:ring-2 focus:ring-[var(--dah-secondary)]/40"
              />
              <p className="text-[10px] text-right text-[var(--dah-on-surface-variant)] font-semibold">
                {comment.length}/500
              </p>
            </div>

            {error && (
              <p className="text-[12px] font-semibold text-[var(--dah-error)] text-center">{error}</p>
            )}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="w-full py-4 rounded-full bg-[var(--dah-primary)] text-white font-extrabold text-[14px] font-display uppercase tracking-wider shadow-md shadow-[var(--dah-primary)]/15 disabled:opacity-60 active:scale-[0.98] transition-all"
            >
              {submitting ? "Sending…" : "Submit feedback"}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
