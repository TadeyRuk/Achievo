/** Client helper for the always-available general feedback channel. */

export type GeneralFeedbackPayload = {
  rating: number;
  comment?: string;
  name?: string;
};

export async function submitGeneralFeedback(
  payload: GeneralFeedbackPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch('/api/feedback-general', {
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

  return { ok: true };
}
