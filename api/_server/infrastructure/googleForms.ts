export class GoogleFormsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleFormsConfigError';
  }
}

export class GoogleFormsSubmitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleFormsSubmitError';
  }
}

export type FeedbackFormPayload = {
  type: 'general' | 'transaction';
  rating: number;
  comment: string | null;
  name?: string | null;
  wallet?: string | null;
  reward?: number | null;
  activity?: string | null;
  txHash?: string | null;
};

export function normalizeEntryId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith('entry.') ? trimmed : `entry.${trimmed}`;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new GoogleFormsConfigError(
      `Google Forms is not configured (missing ${name}). See docs/GOOGLE_FORMS_SETUP.md.`,
    );
  }
  return value;
}

export async function submitFeedbackForm(payload: FeedbackFormPayload): Promise<void> {
  const formId = requireEnv('GOOGLE_FORM_ID');
  const entries = {
    [normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_TYPE'))]: payload.type,
    [normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_RATING'))]: String(payload.rating),
    [normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_COMMENT'))]: payload.comment ?? '',
    [normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_NAME'))]: payload.name ?? '',
    [normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_WALLET'))]: payload.wallet ?? '',
    [normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_REWARD'))]:
      payload.reward !== undefined && payload.reward !== null ? String(payload.reward) : '',
    [normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_ACTIVITY'))]: payload.activity ?? '',
    [normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_TXHASH'))]: payload.txHash ?? '',
  };

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) body.set(key, value);

  let response: Response;
  try {
    response = await fetch(`https://docs.google.com/forms/d/e/${formId}/formResponse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'follow',
    });
  } catch (cause) {
    throw new GoogleFormsSubmitError(
      `Google Forms network error: ${(cause as Error).message ?? String(cause)}`,
    );
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new GoogleFormsSubmitError(
      `Google Forms submit failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }
}
