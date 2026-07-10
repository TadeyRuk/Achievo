import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listPayouts } from './_lib/store';
import { truncateWallet, stellarExpertTxUrl } from './_lib/telegram';

export type PayoutRecord = {
  txHash: string;
  wallet: string;
  amount: number;
  activity: string;
  effortScore: number | null;
  createdAt: string;
};

function parsePayouts(raw: string[]): PayoutRecord[] {
  const out: PayoutRecord[] = [];
  for (const line of raw) {
    try {
      out.push(JSON.parse(line) as PayoutRecord);
    } catch { /* skip */ }
  }
  return out;
}

function summarizePayouts(entries: PayoutRecord[]) {
  const uniqueWallets = new Set(entries.map((e) => e.wallet)).size;
  const totalXlm = Math.round(entries.reduce((s, e) => s + e.amount, 0) * 10) / 10;
  return { count: entries.length, uniqueWallets, totalXlm };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const entries = parsePayouts(await listPayouts(200));
  const stats = summarizePayouts(entries);

  const tableRows = entries.slice(0, 50).map((e, i) => ({
    n: i + 1,
    date: e.createdAt.slice(0, 16).replace('T', ' '),
    wallet: truncateWallet(e.wallet),
    walletFull: e.wallet,
    amount: e.amount,
    activity: e.activity,
    txUrl: stellarExpertTxUrl(e.txHash),
    txHash: e.txHash,
  }));

  return res.status(200).json({
    ...stats,
    entries,
    tableRows,
    telegramConfigured: Boolean(
      process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim(),
    ),
  });
}
