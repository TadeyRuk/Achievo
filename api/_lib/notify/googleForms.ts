/** Server-side Google Forms formResponse submit helpers (single shared form). */

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

export type FeedbackFormType = 'general' | 'transaction';

/** Normalize `123` or `entry.123` → `entry.123`. */
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

export type FeedbackFormConfig = {
  formId: string;
  entryType: string;
  entryRating: string;
  entryComment: string;
  entryName: string;
  entryWallet: string;
  entryReward: string;
  entryActivity: string;
  entryTxHash: string;
};

export function requireFeedbackFormConfig(): FeedbackFormConfig {
  return {
    formId: requireEnv('GOOGLE_FORM_ID'),
    entryType: normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_TYPE')),
    entryRating: normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_RATING')),
    entryComment: normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_COMMENT')),
    entryName: normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_NAME')),
    entryWallet: normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_WALLET')),
    entryReward: normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_REWARD')),
    entryActivity: normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_ACTIVITY')),
    entryTxHash: normalizeEntryId(requireEnv('GOOGLE_FORM_ENTRY_TXHASH')),
  };
}

/**
 * POST entry.* fields to Google's formResponse endpoint.
 * Google often returns HTML / redirects; any 2xx is treated as success.
 */
export async function submitGoogleForm(
  formId: string,
  entries: Record<string, string>,
): Promise<void> {
  const id = formId.trim();
  if (!id) {
    throw new GoogleFormsConfigError('Google Forms form id is empty.');
  }

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === null) continue;
    body.set(normalizeEntryId(key), String(value));
  }

  let res: Response;
  try {
    res = await fetch(`https://docs.google.com/forms/d/e/${id}/formResponse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'follow',
    });
  } catch (err) {
    throw new GoogleFormsSubmitError(
      `Google Forms network error: ${(err as Error).message ?? String(err)}`,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new GoogleFormsSubmitError(
      `Google Forms submit failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }
}

export type FeedbackFormPayload = {
  type: FeedbackFormType;
  rating: number;
  comment: string | null;
  name?: string | null;
  wallet?: string | null;
  reward?: number | null;
  activity?: string | null;
  txHash?: string | null;
};

/** Submit general or transaction feedback into the single shared Google Form. */
export async function submitFeedbackForm(payload: FeedbackFormPayload): Promise<void> {
  const cfg = requireFeedbackFormConfig();
  await submitGoogleForm(cfg.formId, {
    [cfg.entryType]: payload.type,
    [cfg.entryRating]: String(payload.rating),
    [cfg.entryComment]: payload.comment ?? '',
    [cfg.entryName]: payload.name ?? '',
    [cfg.entryWallet]: payload.wallet ?? '',
    [cfg.entryReward]:
      payload.reward !== undefined && payload.reward !== null ? String(payload.reward) : '',
    [cfg.entryActivity]: payload.activity ?? '',
    [cfg.entryTxHash]: payload.txHash ?? '',
  });
}
