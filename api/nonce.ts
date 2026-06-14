import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  TransactionBuilder,
  Networks,
  Operation,
  Account,
  Horizon,
  StrKey,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { createHmac, randomBytes } from 'crypto';

const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = req.query.wallet as string;
  if (!wallet || !StrKey.isValidEd25519PublicKey(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address.' });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const nonce = randomBytes(16).toString('hex');
  const expiry = Date.now() + 5 * 60 * 1000; // 5 min

  // HMAC proves this nonce+expiry was server-issued — no storage needed
  const mac = createHmac('sha256', adminSecret)
    .update(`${nonce}:${expiry}`)
    .digest('hex');

  // Fetch student's sequence so Freighter accepts the tx without complaint
  let seqNum = "0";
  try {
    const acct = await horizonServer.loadAccount(wallet);
    seqNum = acct.sequenceNumber();
  } catch {
    // Unfunded account — sequence 0 is fine, challenge tx is never submitted
  }

  const account = new Account(wallet, seqNum);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.manageData({
      name: 'achievo-challenge',
      value: Buffer.from(nonce, 'hex'), // 16 bytes
    }))
    .addTimebounds(Math.floor(Date.now() / 1000), Math.floor(expiry / 1000))
    .build();

  return res.status(200).json({
    nonce,
    expiry,
    mac,
    challengeXdr: tx.toXDR(),
  });
}
