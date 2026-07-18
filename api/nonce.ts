import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  TransactionBuilder,
  Networks,
  Operation,
  Account,
  StrKey,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { createHmac, randomBytes } from 'crypto';
import { challengeMacPayload } from './_lib/payout/intent';
import { claimOnce, StoreUnavailableError } from './_lib/store';
import { horizonServer } from './_lib/payout/stellarServers';

const NONCE_IP_TTL = 60; // 1 challenge / IP / minute

function getClientIp(req: VercelRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    'unknown'
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const wallet = req.query.wallet as string;
    const intentHash = (req.query.intentHash as string | undefined)?.trim() ?? '';

    if (!wallet || !StrKey.isValidEd25519PublicKey(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address.' });
    }
    if (!/^[a-f0-9]{64}$/i.test(intentHash)) {
      return res.status(400).json({ error: 'intentHash must be a 64-character hex SHA-256 digest.' });
    }

    const ip = getClientIp(req);
    if (ip !== 'unknown') {
      const allowed = await claimOnce(`rate:nonce:ip:${ip}`, NONCE_IP_TTL);
      if (!allowed) {
        return res.status(429).json({ error: 'Too many challenge requests. Wait a moment and retry.' });
      }
    }

    const nonceSecret = process.env.NONCE_HMAC_SECRET;
    if (!nonceSecret) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    const nonce = randomBytes(16).toString('hex');
    const expiry = Date.now() + 5 * 60 * 1000;

    const mac = createHmac('sha256', nonceSecret)
      .update(challengeMacPayload(nonce, expiry, intentHash.toLowerCase()))
      .digest('hex');

    let seqNum = '0';
    try {
      const acct = await horizonServer.loadAccount(wallet);
      seqNum = acct.sequenceNumber();
    } catch {
      // Unfunded account — sequence 0 is fine; challenge tx is never submitted.
    }

    const account = new Account(wallet, seqNum);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.manageData({
        name: 'achievo-challenge',
        value: Buffer.from(nonce, 'hex'),
      }))
      .setTimebounds(0, Math.floor(expiry / 1000))
      .build();

    return res.status(200).json({
      nonce,
      expiry,
      mac,
      intentHash: intentHash.toLowerCase(),
      challengeXdr: tx.toXDR(),
    });
  } catch (err) {
    if (err instanceof StoreUnavailableError) {
      return res.status(503).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to issue challenge.' });
  }
}
