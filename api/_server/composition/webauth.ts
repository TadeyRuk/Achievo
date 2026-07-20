import { createWebAuthRoute } from '../features/webauth/routes.js';
import type { WebAuthPorts } from '../features/webauth/ports.js';
import { claimOnce, StoreUnavailableError } from '../infrastructure/store/index.js';
import {
  buildWebAuthChallenge,
  sep10Configured,
  verifyWebAuthAndIssueToken,
} from '../infrastructure/sep10.js';
import { StrKey } from '../infrastructure/stellar.js';

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
