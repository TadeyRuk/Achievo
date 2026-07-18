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

export function stellarExpertTxUrl(txHash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

async function sendTelegramMessage(html: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      console.warn(`[telegram] sendMessage failed (${response.status}): ${bodyText.slice(0, 200)}`);
    }
  } catch (cause) {
    console.warn('[telegram] sendMessage error:', (cause as Error).message ?? cause);
  }
}

export async function notifyOpsAlert(html: string): Promise<void> {
  await sendTelegramMessage(`🛠 <b>Achievo ops</b>\n${html}`);
}

export async function notifyPayoutTelegram(payload: {
  txHash: string;
  wallet: string;
  amount: number;
  activity: string;
  effortScore?: number;
}): Promise<void> {
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const wallet = payload.wallet.length <= 11
    ? payload.wallet
    : `${payload.wallet.slice(0, 5)}…${payload.wallet.slice(-5)}`;
  const effort =
    payload.effortScore !== undefined ? `\n📊 Effort score: <b>${payload.effortScore}</b>` : '';
  await sendTelegramMessage(
    `💸 <b>Achievo payout</b>\n` +
      `Amount: <b>${payload.amount} XLM</b>\n` +
      `Activity: ${escape(payload.activity)}${effort}\n` +
      `Wallet: <a href="https://stellar.expert/explorer/testnet/account/${payload.wallet}">${wallet}</a>\n` +
      `<a href="${stellarExpertTxUrl(payload.txHash)}">View on StellarExpert</a>`,
  );
}
