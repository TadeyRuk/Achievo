import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redactWallet } from '@achievo/identity';
import { listPayouts } from './_lib/store';
import { stellarExpertTxUrl } from './_lib/telegram';

export type PayoutRecord = {
  txHash: string;
  wallet: string;
  identityId?: string | null;
  amount: number;
  activity: string;
  effortScore: number | null;
  scoringMode?: string | null;
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
  const uniqueIdentities = new Set(
    entries.map((e) => e.identityId).filter((id): id is string => Boolean(id)),
  ).size;
  const totalXlm = Math.round(entries.reduce((s, e) => s + e.amount, 0) * 10) / 10;
  return { count: entries.length, uniqueWallets, uniqueIdentities, totalXlm };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const entries = parsePayouts(await listPayouts(200));
  const stats = summarizePayouts(entries);

  // Public feed: never expose full wallet addresses.
  const publicEntries = entries.map((e) => ({
    txHash: e.txHash,
    wallet: redactWallet(e.wallet),
    identityId: e.identityId ?? null,
    amount: e.amount,
    activity: e.activity,
    effortScore: e.effortScore,
    scoringMode: e.scoringMode ?? null,
    createdAt: e.createdAt,
  }));

  const tableRows = publicEntries.slice(0, 50).map((e, i) => ({
    n: i + 1,
    date: e.createdAt.slice(0, 16).replace('T', ' '),
    wallet: e.wallet,
    identityId: e.identityId,
    amount: e.amount,
    activity: e.activity,
    txUrl: stellarExpertTxUrl(e.txHash),
    txHash: e.txHash,
  }));

  return res.status(200).json({
    ...stats,
    entries: publicEntries,
    tableRows,
  });
}
