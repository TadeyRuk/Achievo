import { rpc } from '@stellar/stellar-sdk';
import { getDailyDisbursed } from '@achievo/stellar';
import { DAILY_TREASURY_CAP_XLM } from '@achievo/shared';
import { createReconcileRoute } from '../features/rewards/routes';
import type { ReconcilePorts } from '../features/rewards/ports';
import { notifyOpsAlert } from '../infrastructure/telegram';
import {
  appendPayout,
  listPayouts,
} from '../infrastructure/store';
import {
  listPendingReconcile,
  removePendingReconcile,
} from '../infrastructure/rewards';
import { rpcServer } from '../infrastructure/stellar';

const reconcilePorts: ReconcilePorts = {
  get cronSecret() {
    return process.env.CRON_SECRET;
  },
  listPending: listPendingReconcile,
  removePending: removePendingReconcile,
  async transactionStatus(txHash) {
    const transaction = await rpcServer.getTransaction(txHash);
    if (transaction.status === rpc.Api.GetTransactionStatus.SUCCESS) return 'success';
    if (transaction.status === rpc.Api.GetTransactionStatus.FAILED) return 'failed';
    return 'pending';
  },
  appendPayout,
  listPayouts,
  notifyOps: notifyOpsAlert,
  getDailyDisbursed,
  treasuryDailyCap: DAILY_TREASURY_CAP_XLM,
  now() {
    return new Date();
  },
};

export const reconcileRoute = createReconcileRoute(reconcilePorts);
