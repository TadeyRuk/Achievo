import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rpc } from '@stellar/stellar-sdk';
import {
  DAILY_TREASURY_CAP_XLM,
  DAILY_RECIPIENT_CAP_XLM,
} from '@achievo/shared';
import { listPayouts, appendPayout } from './_lib/store';
import { listPendingReconcile, removePendingReconcile } from './_lib/payout/pendingReconcile';
import { rpcServer } from './_lib/payout/stellarServers';
import { getDailyDisbursed } from '@achievo/stellar';
import { notifyOpsAlert } from './_lib/notify/telegram';

/**
 * Cron / ops reconcile: settle pending submits + alert on cap pressure / drift.
 * Protect with CRON_SECRET header: Authorization: Bearer <secret>
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.authorization ?? '';
  if (secret && auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pending = await listPendingReconcile();
  const settled: string[] = [];
  const failed: string[] = [];
  const stillPending: string[] = [];

  for (const entry of pending) {
    try {
      const tx = await rpcServer.getTransaction(entry.txHash);
      if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        await appendPayout(
          JSON.stringify({
            txHash: entry.txHash,
            wallet: entry.wallet,
            amount: entry.rewardXlm,
            activity: entry.activity,
            createdAt: entry.createdAt,
            reconciled: true,
          }),
        ).catch(() => undefined);
        await removePendingReconcile(entry.txHash);
        settled.push(entry.txHash);
      } else if (tx.status === rpc.Api.GetTransactionStatus.FAILED) {
        await removePendingReconcile(entry.txHash);
        failed.push(entry.txHash);
        void notifyOpsAlert(
          `❌ Pending tx failed on-chain\n<code>${entry.txHash}</code>\nManual budget review may be needed.`,
        );
      } else {
        stillPending.push(entry.txHash);
        const ageMs = Date.now() - Date.parse(entry.createdAt);
        if (ageMs > 15 * 60 * 1000) {
          void notifyOpsAlert(
            `⏰ Pending >15m\n<code>${entry.txHash}</code>\n${entry.rewardXlm} XLM → ${entry.wallet}`,
          );
        }
      }
    } catch {
      stillPending.push(entry.txHash);
    }
  }

  let capAlert: string | null = null;
  try {
    const daily = await getDailyDisbursed();
    if (daily >= DAILY_TREASURY_CAP_XLM * 0.8) {
      capAlert = `Treasury daily ${daily}/${DAILY_TREASURY_CAP_XLM} XLM (≥80%)`;
      void notifyOpsAlert(`⚠️ ${capAlert}`);
    }
    void DAILY_RECIPIENT_CAP_XLM; // referenced for docs/sync
  } catch {
    /* ignore */
  }

  let ledgerCount = 0;
  try {
    const rows = await listPayouts(50);
    ledgerCount = rows.length;
  } catch {
    /* ignore */
  }

  return res.status(200).json({
    ok: true,
    pending: stillPending.length,
    settled: settled.length,
    failed: failed.length,
    ledgerSample: ledgerCount,
    capAlert,
  });
}
