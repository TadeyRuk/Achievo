import { stellarExpertTxUrl } from './stellarExpert';

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
