import { redactWallet } from '@achievo/identity';
import { createPayoutsRoute } from '../features/rewards/routes.js';
import type { PayoutsPorts } from '../features/rewards/ports.js';
import { listPayouts } from '../infrastructure/store/index.js';
import { stellarExpertTxUrl } from '../infrastructure/stellarExpert.js';

const payoutsPorts: PayoutsPorts = {
  listPayouts,
  redactWallet,
  transactionUrl: stellarExpertTxUrl,
};

export const payoutsRoute = createPayoutsRoute(payoutsPorts);
