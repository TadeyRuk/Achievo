import { redactWallet } from '@achievo/identity';
import { stellarExpertTxUrl } from './stellarExpert.js';

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
        disable_web_page_preview: true,
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
  await sendTelegramMessage('<b>Achievo ops</b>\n' + html);
}

/** Privacy-safe payout alert: category + redacted wallet + tx link only. */
export async function notifyPayoutTelegram(payload: {
  txHash: string;
  wallet: string;
  amount: number;
  activity: string;
  effortScore?: number;
}): Promise<void> {
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const category = escape(payload.activity.replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'activity');
  const walletLabel = escape(redactWallet(payload.wallet));
  const effort =
    payload.effortScore !== undefined ? `\nEffort score: <b>${payload.effortScore}</b>` : '';
  await sendTelegramMessage(
    `<b>Achievo payout</b>\n` +
      `Amount: <b>${payload.amount} XLM</b>\n` +
      `Category: <code>${category}</code>${effort}\n` +
      `Wallet: <code>${walletLabel}</code>\n` +
      `<a href="${stellarExpertTxUrl(payload.txHash)}">View on StellarExpert</a>`,
  );
}
