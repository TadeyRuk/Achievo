/** Client + API helpers for per-transaction user feedback. */

export type TransactionFeedbackPayload = {
  txHash: string;
  rating: number;
  comment?: string;
  wallet?: string | null;
  reward?: number;
  activity?: string;
};

export type FeedbackPrompt = {
  txHash: string;
  reward: number;
  activity: string;
};

const STORAGE_KEY = 'achievo_feedback_submitted';
const DISMISSED_KEY = 'achievo_feedback_dismissed';

export function feedbackStorageKey(txHash: string): string {
  return `${STORAGE_KEY}:${txHash}`;
}

function dismissedStorageKey(txHash: string): string {
  return `${DISMISSED_KEY}:${txHash}`;
}

/** True if this device already handled feedback for the tx (submit or skip). */
export function hasSubmittedFeedback(txHash: string): boolean {
  try {
    return (
      localStorage.getItem(feedbackStorageKey(txHash)) === '1' ||
      localStorage.getItem(dismissedStorageKey(txHash)) === '1'
    );
  } catch {
    return false;
  }
}

export function markFeedbackSubmitted(txHash: string): void {
  try {
    localStorage.setItem(feedbackStorageKey(txHash), '1');
  } catch { /* ignore */ }
}

export function markFeedbackDismissed(txHash: string): void {
  try {
    localStorage.setItem(dismissedStorageKey(txHash), '1');
  } catch { /* ignore */ }
}

export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export async function submitTransactionFeedback(
  payload: TransactionFeedbackPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let data: { error?: string };
  try {
    data = JSON.parse(raw) as { error?: string };
  } catch {
    return { ok: false, error: `Feedback API error ${res.status}` };
  }

  if (!res.ok) {
    return { ok: false, error: data.error ?? `Feedback API error ${res.status}` };
  }

  markFeedbackSubmitted(payload.txHash);
  return { ok: true };
}
