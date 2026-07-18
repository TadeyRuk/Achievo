import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { isValidRating, markFeedbackDismissed, submitTransactionFeedback, type FeedbackPrompt } from './transactionFeedback';
import { FeedbackRatingRow } from './FeedbackRatingRow';
import { FeedbackThankYou } from './FeedbackThankYou';
import { IOSSheet } from '../../shared/ui/IOSSheet';
import { reducedMotionTransition } from '../../shared/lib/sheetMotion';

interface TransactionFeedbackProps {
  prompt: FeedbackPrompt;
  walletAddress: string | null;
  onDone: (submitted: boolean, rating?: number, hasComment?: boolean) => void;
}

export function TransactionFeedback({ prompt, walletAddress, onDone }: TransactionFeedbackProps) {
  const reduceMotion = useReducedMotion();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
    setSubmitted(true);
    setTimeout(() => onDone(true, rating, Boolean(comment.trim())), 900);
  };

  function skip() {
    markFeedbackDismissed(prompt.txHash);
    onDone(false);
  }

  return (
    <IOSSheet onDismiss={skip} aria-label="Quick feedback">
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
              <div className="space-y-1 pr-2 min-w-0">
                <h2 className="text-[22px] font-semibold text-[var(--dah-primary)] tracking-tight leading-snug">
                  How was this payout?
                </h2>
                <p className="text-[13px] text-[var(--dah-on-surface-variant)] leading-relaxed">
                  {prompt.reward} XLM for {prompt.activity}
                </p>
              </div>
              <button
                type="button"
                onClick={skip}
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
                htmlFor="tx-feedback-comment"
                className="text-[13px] font-normal text-[var(--dah-on-surface-variant)]"
              >
                Comment
              </label>
              <textarea
                id="tx-feedback-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="What felt smooth? What could be better?"
                className="w-full resize-none rounded-[12px] border-0 bg-[var(--dah-surface-low)] px-4 py-3 text-[16px] text-[var(--dah-on-surface)] placeholder:text-[var(--dah-outline)] focus:outline-none focus:ring-2 focus:ring-[var(--dah-secondary)]/30"
              />
              <p className="text-[12px] text-right text-[var(--dah-outline)]">
                {comment.length}/500
              </p>
            </div>

            {error && (
              <p className="text-[13px] font-medium text-[var(--dah-error)] text-center">{error}</p>
            )}

            <div className="flex flex-col gap-1 pt-1">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="w-full py-3.5 rounded-full bg-[var(--dah-primary)] text-white text-[17px] font-semibold disabled:opacity-50 active:opacity-80 transition-opacity"
              >
                {submitting ? "Sending…" : "Submit"}
              </button>
              <button
                type="button"
                onClick={skip}
                disabled={submitting}
                className="w-full py-3 text-[17px] font-normal text-[var(--dah-outline)] active:opacity-60 disabled:opacity-50"
              >
                Not Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </IOSSheet>
  );
}
