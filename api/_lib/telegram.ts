/** Best-effort Telegram Bot API notifications (payouts + feedback). */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function truncateWallet(wallet: string): string {
  if (wallet.length <= 11) return wallet;
  return `${wallet.slice(0, 5)}…${wallet.slice(-5)}`;
}

export function stellarExpertTxUrl(txHash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

export function stellarExpertAccountUrl(wallet: string): string {
  return `https://stellar.expert/explorer/testnet/account/${wallet}`;
}

/** Send HTML message; no-op when env vars are unset. Never throws. */
export async function sendTelegramMessage(html: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[telegram] sendMessage failed (${res.status}): ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn('[telegram] sendMessage error:', (err as Error).message ?? err);
  }
}

export type PayoutTelegramPayload = {
  txHash: string;
  wallet: string;
  amount: number;
  activity: string;
  effortScore?: number;
};

export async function notifyPayoutTelegram(payload: PayoutTelegramPayload): Promise<void> {
  const { txHash, wallet, amount, activity, effortScore } = payload;
  const txUrl = stellarExpertTxUrl(txHash);
  const acctUrl = stellarExpertAccountUrl(wallet);
  const effort =
    effortScore !== undefined ? `\n📊 Effort score: <b>${effortScore}</b>` : '';

  await sendTelegramMessage(
    `💸 <b>Achievo payout</b>\n` +
      `Amount: <b>${amount} XLM</b>\n` +
      `Activity: ${escapeHtml(activity)}${effort}\n` +
      `Wallet: <a href="${acctUrl}">${truncateWallet(wallet)}</a>\n` +
      `<a href="${txUrl}">View on StellarExpert</a>`,
  );
}

export type FeedbackTelegramPayload = {
  rating: number;
  comment: string | null;
  activity: string | null;
  reward: number | null;
  txHash: string;
  summaryLine: string;
};

export async function notifyFeedbackTelegram(payload: FeedbackTelegramPayload): Promise<void> {
  const stars = '★'.repeat(payload.rating) + '☆'.repeat(5 - payload.rating);
  const commentBlock = payload.comment
    ? `\n💬 “${escapeHtml(payload.comment.slice(0, 280))}”`
    : '';
  const activity = payload.activity ? escapeHtml(payload.activity) : 'activity';
  const reward =
    payload.reward !== null ? ` · ${payload.reward} XLM` : '';
  const txUrl = stellarExpertTxUrl(payload.txHash);

  await sendTelegramMessage(
    `⭐ <b>User feedback</b> ${stars}\n` +
      `${activity}${reward}${commentBlock}\n` +
      `<i>${escapeHtml(payload.summaryLine)}</i>\n` +
      `<a href="${txUrl}">Tx</a>`,
  );
}
