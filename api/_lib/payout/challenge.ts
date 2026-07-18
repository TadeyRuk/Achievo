import {
  TransactionBuilder,
  Networks,
  Keypair,
  Transaction,
} from '@stellar/stellar-sdk';
import { createHmac } from 'crypto';
import { challengeMacPayload } from './intent';

export function verifyChallenge(
  nonceSecret: string,
  wallet: string,
  nonce: string,
  expiry: number,
  mac: string,
  signedXdr: string,
  intentHash: string,
): { ok: boolean; error?: string } {
  const expectedMac = createHmac('sha256', nonceSecret)
    .update(challengeMacPayload(nonce, expiry, intentHash))
    .digest('hex');
  if (expectedMac !== mac) return { ok: false, error: 'Invalid challenge token.' };

  if (Date.now() > expiry) return { ok: false, error: 'Challenge expired. Please try again.' };

  let tx: Transaction;
  try {
    tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET) as Transaction;
  } catch {
    return { ok: false, error: 'Invalid signed challenge XDR.' };
  }

  if (tx.source !== wallet) return { ok: false, error: 'Challenge was not built for this wallet.' };

  const op = tx.operations[0] as { type: string; name?: string; value?: Buffer };
  if (op?.type !== 'manageData' || op?.name !== 'achievo-challenge') {
    return { ok: false, error: 'Challenge structure invalid.' };
  }
  if (!op.value || op.value.toString('hex') !== nonce) {
    return { ok: false, error: 'Challenge nonce mismatch.' };
  }

  const keypair = Keypair.fromPublicKey(wallet);

  const txHashTestnet = tx.hash();
  let signed = tx.signatures.some((sig) => {
    try { return keypair.verify(txHashTestnet, sig.signature()); } catch { return false; }
  });

  if (!signed) {
    try {
      const txPublic = TransactionBuilder.fromXDR(signedXdr, Networks.PUBLIC) as Transaction;
      const txHashPublic = txPublic.hash();
      signed = txPublic.signatures.some((sig) => {
        try { return keypair.verify(txHashPublic, sig.signature()); } catch { return false; }
      });
    } catch { /* ignore */ }
  }

  if (!signed) return { ok: false, error: 'Wallet ownership could not be verified.' };

  return { ok: true };
}
