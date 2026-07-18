import { redactWallet } from '@achievo/identity';
import { createPayoutsRoute } from '../features/rewards/routes';
import type { PayoutsPorts } from '../features/rewards/ports';
import { listPayouts } from '../infrastructure/store';
import { stellarExpertTxUrl } from '../infrastructure/stellarExpert';

const payoutsPorts: PayoutsPorts = {
  listPayouts,
  redactWallet,
  transactionUrl: stellarExpertTxUrl,
};

export const payoutsRoute = createPayoutsRoute(payoutsPorts);
