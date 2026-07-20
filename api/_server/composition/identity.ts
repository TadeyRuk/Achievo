import { StrKey } from '@stellar/stellar-sdk';
import { redactWallet } from '@achievo/identity';
import { createIdentityRoute } from '../features/identity/routes.js';
import {
  bindIdentity,
  getIdentityByWallet,
  issueSessionToken,
  verifySessionToken,
} from '../infrastructure/identity.js';
import { StoreUnavailableError } from '../infrastructure/store/index.js';

export const identityRoute = createIdentityRoute({
  isValidWallet: StrKey.isValidEd25519PublicKey,
  redactWallet,
  findByWallet: getIdentityByWallet,
  bind: bindIdentity,
  verifySession: verifySessionToken,
  issueSession: issueSessionToken,
  isStoreUnavailable(cause) {
    return cause instanceof StoreUnavailableError;
  },
});
