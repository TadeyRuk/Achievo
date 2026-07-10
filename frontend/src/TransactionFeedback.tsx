import { useState } from "react";
import { motion } from "motion/react";
import { Star, X } from "lucide-react";
import { isValidRating, markFeedbackDismissed, submitTransactionFeedback, type FeedbackPrompt } from "./transactionFeedback";

interface TransactionFeedbackProps {
  prompt: FeedbackPrompt;
  walletAddress: string | null;
  onDone: (submitted: boolean, rating?: number, hasComment?: boolean) => void;
}

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"] as const;

export function TransactionFeedback({ prompt, walletAddress, onDone }: TransactionFeedbackProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayRating = hoverRating || rating;

  const handleSubmit = async () => {
    if (!isValidRating(rating)) {
      setError("Please select a star rating before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await submitTransactionFeedback({
      txHash: prompt.txHash,
      rating,
      comment: comment.trim() || undefined,
      wallet: walletAddress,
      reward: prompt.reward,
      activity: prompt.activity,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone(true, rating, Boolean(comment.trim()));
  };

  const skip = () => {
    markFeedbackDismissed(prompt.txHash);
    onDone(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-[#00162b]/45 backdrop-blur-sm z-[60] flex items-end"
      onClick={skip}
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
              Quick feedback
            </p>
            <h2 className="text-[20px] font-extrabold text-[var(--dah-primary)] font-display tracking-tight">
              How was this payout?
            </h2>
            <p className="text-[12px] text-[var(--dah-on-surface-variant)] font-semibold leading-relaxed">
              {prompt.reward} XLM for {prompt.activity} · helps us improve Achievo
            </p>
          </div>
          <button
            type="button"
            onClick={skip}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[var(--dah-surface-highest)] hover:bg-[#e8eaf0] transition-colors"
            aria-label="Skip feedback"
          >
            <X className="w-4 h-4 text-[var(--dah-on-surface-variant)]" />
          </button>
        </div>

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
            htmlFor="tx-feedback-comment"
            className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--dah-on-surface-variant)]"
          >
            Optional comment
          </label>
          <textarea
            id="tx-feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="What felt smooth? What could be better?"
            className="w-full resize-none rounded-2xl border border-[#e1e3e8] bg-[#faf9ff] px-4 py-3 text-[14px] text-[var(--dah-primary)] placeholder:text-[#9aa3b2] focus:outline-none focus:ring-2 focus:ring-[var(--dah-secondary)]/40"
          />
          <p className="text-[10px] text-right text-[var(--dah-on-surface-variant)] font-semibold">
            {comment.length}/500
          </p>
        </div>

        {error && (
          <p className="text-[12px] font-semibold text-[var(--dah-error)] text-center">{error}</p>
        )}

        <div className="flex flex-col gap-3 pt-1">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full py-4 rounded-full bg-[var(--dah-primary)] text-white font-extrabold text-[14px] font-display uppercase tracking-wider shadow-md shadow-[var(--dah-primary)]/15 disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            {submitting ? "Sending…" : "Submit feedback"}
          </button>
          <button
            type="button"
            onClick={skip}
            disabled={submitting}
            className="w-full py-3 rounded-full text-[13px] font-bold text-[var(--dah-on-surface-variant)] hover:bg-[#f3f5fa] transition-colors"
          >
            Skip for now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
