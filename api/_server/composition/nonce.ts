import { createNonceRoute } from '../features/rewards/routes';
import type { NoncePorts } from '../features/rewards/ports';
import { claimOnce, StoreUnavailableError } from '../infrastructure/store';
import {
  issueChallenge,
  StrKey,
} from '../infrastructure/stellar';

const noncePorts: NoncePorts = {
  get nonceSecret() {
    return process.env.NONCE_HMAC_SECRET;
  },
  isValidWallet: StrKey.isValidEd25519PublicKey,
  claimOnce,
  issueChallenge(wallet, intentHash) {
    if (!process.env.NONCE_HMAC_SECRET) throw new Error('Server configuration error.');
    return issueChallenge(wallet, intentHash, process.env.NONCE_HMAC_SECRET);
  },
  isStoreUnavailable(cause) {
    return cause instanceof StoreUnavailableError;
  },
};

export const nonceRoute = createNonceRoute(noncePorts);
