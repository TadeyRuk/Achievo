import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  rpc,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  Address,
  Networks,
  BASE_FEE,
  Keypair,
  Transaction,
  Horizon,
  StrKey,
} from '@stellar/stellar-sdk';
import { createHmac } from 'crypto';
import { getTimestamp, setTimestamp, claimOnce, listRecent, addRecent, appendPayout } from './_lib/store';
import { ScoringAgent, type Evaluation } from './_agents/scoring';
import { IntegrityAgent } from './_agents/integrity';
import { notifyPayoutTelegram } from './_lib/telegram';

const CONTRACT_ID = "CCQVKUU2AYYWLKEUNZ47NXYLUB4SLN5YEB3EHQ76TCI5X4K5VEIW5PDS";
const STROOP_FACTOR = 10_000_000;

const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org");
const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");

const RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

const BASE_REWARD: Record<string, number> = {
  tutoring:      5,
  workshop:      2,
  volunteering:  10,
  event:         3,
  participation: 3,
};

const MAX_BONUS: Record<string, number> = {
  tutoring:      5,
  workshop:      3,
  volunteering:  5,
  event:         2,
  participation: 2,
};

function getClientIp(req: VercelRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    'unknown'
  );
}

function verifyChallenge(
  nonceSecret: string,
  wallet: string,
  nonce: string,
  expiry: number,
  mac: string,
  signedXdr: string,
): { ok: boolean; error?: string } {
  const expectedMac = createHmac('sha256', nonceSecret)
    .update(`${nonce}:${expiry}`)
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
  
  // 1. Verify against Testnet hash
  const txHashTestnet = tx.hash();
  let signed = tx.signatures.some(sig => {
    try { return keypair.verify(txHashTestnet, sig.signature()); } catch { return false; }
  });

  // 2. Verify against Public hash (some wallets like LOBSTR or mainnet profiles sign on public network)
  if (!signed) {
    try {
      const txPublic = TransactionBuilder.fromXDR(signedXdr, Networks.PUBLIC) as Transaction;
      const txHashPublic = txPublic.hash();
      signed = txPublic.signatures.some(sig => {
        try { return keypair.verify(txHashPublic, sig.signature()); } catch { return false; }
      });
    } catch { /* ignore */ }
  }

  if (!signed) return { ok: false, error: 'Wallet ownership could not be verified.' };

  return { ok: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { activityText, wallet, nonce, expiry, mac, signedXdr } = req.body as {
    activityText?: string;
    wallet?: string;
    nonce?: string;
    expiry?: number;
    mac?: string;
    signedXdr?: string;
  };

  if (!wallet || !StrKey.isValidEd25519PublicKey(wallet)) {
    return res.status(400).json({ error: 'Invalid Stellar wallet address.' });
  }

  if (!activityText || activityText.trim().length < 5) {
    return res.status(400).json({ error: 'Activity description too short.' });
  }

  if (!nonce || !expiry || !mac || !signedXdr) {
    return res.status(400).json({ error: 'Missing wallet ownership proof. Please retry.' });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const nonceSecret = process.env.NONCE_HMAC_SECRET;
  if (!adminSecret || !nonceSecret) return res.status(500).json({ error: 'Server configuration error.' });

  const proof = verifyChallenge(nonceSecret, wallet, nonce, expiry, mac, signedXdr);
  if (!proof.ok) return res.status(401).json({ error: proof.error });

  // 1. Single-use nonce check (prevent replay attacks)
  const nonceKey = `nonce:${nonce}`;
  const claimed = await claimOnce(nonceKey, 300); // 5 min TTL matching nonce expiry
  if (!claimed) {
    return res.status(401).json({ error: 'Challenge nonce has already been used.' });
  }

  // 2. Rate limit check
  const ip = getClientIp(req);
  const now = Date.now();
  const walletLimitKey = `rate:wallet:${wallet}`;
  const ipLimitKey = `rate:ip:${ip}`;

  const walletTs = await getTimestamp(walletLimitKey);
  if (walletTs && now - walletTs < RATE_LIMIT_MS) {
    const hoursLeft = Math.ceil((RATE_LIMIT_MS - (now - walletTs)) / 3_600_000);
    return res.status(429).json({ error: `Rate limit: 1 reward per day. Try again in ${hoursLeft}h.` });
  }
  if (ip !== 'unknown') {
    const ipTs = await getTimestamp(ipLimitKey);
    if (ipTs && now - ipTs < RATE_LIMIT_MS) {
      const hoursLeft = Math.ceil((RATE_LIMIT_MS - (now - ipTs)) / 3_600_000);
      return res.status(429).json({ error: `Rate limit reached for your IP. Try again in ${hoursLeft}h.` });
    }
  }

  // ScoringAgent — explainable, authoritative evaluation
  let evaluation: Evaluation;
  try {
    evaluation = await ScoringAgent.evaluate(activityText.trim());
  } catch (err) {
    return res.status(502).json({ error: `AI evaluation failed: ${(err as Error).message}` });
  }

  if (!evaluation.valid || !(evaluation.activity in BASE_REWARD)) {
    return res.status(422).json({
      error: `Activity not eligible for reward. ${evaluation.rationale}`,
      activity: evaluation.activity,
    });
  }

  // IntegrityAgent — trust & anti-abuse (near-duplicate soft-flag today)
  const recentKey = `recent:wallet:${wallet}`;
  let recent: string[] = [];
  try {
    recent = await listRecent(recentKey);
  } catch {
    recent = []; // integrity is best-effort; never block a payout on store errors
  }
  const integrity = IntegrityAgent.assess(activityText.trim(), { recent });

  const effortScore = Math.round(evaluation.score * integrity.effortMultiplier * 1000) / 1000;
  const base = BASE_REWARD[evaluation.activity];
  const bonus = Math.round(effortScore * MAX_BONUS[evaluation.activity] * 10) / 10;
  // Belt-and-suspenders: mirrors the contract's on-chain MAX_REWARD_PER_TX (20 XLM)
  // so a legitimately-computed reward is never rejected on-chain in normal operation.
  const MAX_REWARD_XLM = 20;
  const reward = Math.min(Math.round((base + bonus) * 10) / 10, MAX_REWARD_XLM);

  try {
    const adminKeypair = Keypair.fromSecret(adminSecret);
    const adminAddress = adminKeypair.publicKey();
    const rewardStroops = BigInt(Math.round(reward * STROOP_FACTOR));

    const sourceAccount = await horizonServer.loadAccount(adminAddress);
    const contract = new Contract(CONTRACT_ID);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call(
        'send_reward',
        new Address(wallet).toScVal(),
        nativeToScVal(rewardStroops, { type: 'i128' }),
        nativeToScVal(evaluation.activity, { type: 'symbol' }),
      ))
      .setTimeout(30)
      .build();

    const preparedTx = await rpcServer.prepareTransaction(tx);
    (preparedTx as Transaction).sign(adminKeypair);

    const sendResponse = await rpcServer.sendTransaction(preparedTx as Transaction);

    if (sendResponse.status === 'ERROR') {
      const errStr = JSON.stringify(sendResponse.errorResult);
      if (errStr.includes('opNOACCOUNT') || errStr.includes('not found')) {
        return res.status(404).json({ error: 'Contract or account not found on Stellar testnet.' });
      }
      throw new Error(`Transaction rejected: ${errStr}`);
    }

    const txHash = sendResponse.hash;

    // Poll for transaction settlement on-chain
    let attempts = 0;
    let txResponse = null;
    while (attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      txResponse = await rpcServer.getTransaction(txHash);

      if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        break;
      } else if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction execution failed on-chain: ${JSON.stringify(txResponse)}`);
      }
      attempts++;
    }

    if (!txResponse || txResponse.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error("Transaction polling timed out. The payout may still succeed later.");
    }

    // Record rate limits durably now that the transaction has settled successfully
    const ttlSeconds = RATE_LIMIT_MS / 1000;
    await setTimestamp(walletLimitKey, now, ttlSeconds);
    if (ip !== 'unknown') {
      await setTimestamp(ipLimitKey, now, ttlSeconds);
    }

    // Record this submission's fingerprint for IntegrityAgent duplicate detection
    // (bounded, 30-day retention). Best-effort — never fail the response on this.
    try {
      await addRecent(recentKey, IntegrityAgent.fingerprint(activityText.trim()), 20, 30 * 24 * 60 * 60);
    } catch { /* ignore */ }

    // Server-side payout ledger + Telegram feed (best-effort).
    const payoutRecord = {
      txHash,
      wallet,
      amount: reward,
      activity: evaluation.activity,
      effortScore,
      createdAt: new Date().toISOString(),
    };
    try {
      await appendPayout(JSON.stringify(payoutRecord));
    } catch { /* ignore */ }
    void notifyPayoutTelegram({
      txHash,
      wallet,
      amount: reward,
      activity: evaluation.activity,
      effortScore,
    });

    return res.status(200).json({
      txHash,
      reward,
      base,
      bonus,
      effortScore,
      activity: evaluation.activity,
      reason: evaluation.rationale,
      criteria: evaluation.criteria,
      flagged: integrity.flagged,
      flagReason: integrity.reasons[0] ?? null,
      integrityReasons: integrity.reasons,
    });

  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
      return res.status(402).json({ error: 'Insufficient treasury balance to cover this reward.' });
    }
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      return res.status(404).json({ error: 'Contract or account not found on Stellar testnet.' });
    }
    return res.status(500).json({ error: `Transaction failed: ${msg}` });
  }
}
