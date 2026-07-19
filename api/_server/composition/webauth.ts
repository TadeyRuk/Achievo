import { createWebAuthRoute } from '../features/webauth/routes';
import type { WebAuthPorts } from '../features/webauth/ports';
import { claimOnce, StoreUnavailableError } from '../infrastructure/store';
import {
  buildWebAuthChallenge,
  sep10Configured,
  verifyWebAuthAndIssueToken,
} from '../infrastructure/sep10';
import { StrKey } from '../infrastructure/stellar';

const webAuthPorts: WebAuthPorts = {
  configured: sep10Configured,
  isValidWallet: StrKey.isValidEd25519PublicKey,
  claimOnce,
  buildChallenge: buildWebAuthChallenge,
  verifyAndIssue: verifyWebAuthAndIssueToken,
  isStoreUnavailable(cause) {
    return cause instanceof StoreUnavailableError;
  },
};

export const webAuthRoute = createWebAuthRoute(webAuthPorts);
