import { StrKey } from '@stellar/stellar-sdk';
import { redactWallet } from '@achievo/identity';
import { createIdentityRoute } from '../features/identity/routes';
import {
  bindIdentity,
  getIdentityByWallet,
  issueSessionToken,
  verifySessionToken,
} from '../infrastructure/identity';
import { StoreUnavailableError } from '../infrastructure/store';

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
