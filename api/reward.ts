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
  StrKey,
} from '@stellar/stellar-sdk';
import { createHmac } from 'crypto';
import {
  BASE_REWARD,
  CONTRACT_ID,
  DAILY_RECIPIENT_CAP_XLM,
  DAILY_TREASURY_CAP_XLM,
  MAX_ACTIVITY_TEXT_LENGTH,
  MAX_BONUS,
  MAX_REWARD_PER_TX_XLM,
  STROOP_FACTOR,
  isKnownActivity,
  utcDayKey,
} from '@achievo/shared';
import {
  claimOnce,
  releaseClaim,
  listRecent,
  addRecent,
  appendPayout,
  reserveBudget,
  StoreUnavailableError,
} from './_lib/store';
import { challengeMacPayload, hashActivityIntent } from './_lib/intent';
import { ScoringAgent, type Evaluation } from './_agents/scoring';
import { HeuristicScoringAgent } from './_agents/heuristic';
import { IntegrityAgent } from './_agents/integrity';
import { notifyPayoutTelegram } from './_lib/telegram';
import { horizonServer, rpcServer } from './_lib/stellarServers';
import { bindIdentity, issueSessionToken } from './_lib/identity';

const RATE_LIMIT_TTL_SECONDS = 24 * 60 * 60;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { activityText, wallet, nonce, expiry, mac, signedXdr, intentHash: bodyIntent } = req.body as {
    activityText?: string;
    wallet?: string;
    nonce?: string;
    expiry?: number;
    mac?: string;
    signedXdr?: string;
    intentHash?: string;
  };

  let walletRateKey: string | null = null;
  let ipRateKey: string | null = null;
  let treasuryBudgetKey: string | null = null;
  let recipientBudgetKey: string | null = null;
  let budgetUnits = 0;

  const releaseBudgets = async () => {
    if (treasuryBudgetKey && budgetUnits) {
      await reserveBudget(
        treasuryBudgetKey,
        -budgetUnits,
        DAILY_TREASURY_CAP_XLM * 10,
        48 * 60 * 60,
      ).catch(() => undefined);
      treasuryBudgetKey = null;
    }
    if (recipientBudgetKey && budgetUnits) {
      await reserveBudget(
        recipientBudgetKey,
        -budgetUnits,
        DAILY_RECIPIENT_CAP_XLM * 10,
        48 * 60 * 60,
      ).catch(() => undefined);
      recipientBudgetKey = null;
    }
  };

  try {
    if (!wallet || !StrKey.isValidEd25519PublicKey(wallet)) {
      return res.status(400).json({ error: 'Invalid Stellar wallet address.' });
    }

    const trimmed = typeof activityText === 'string' ? activityText.trim() : '';
    if (trimmed.length < 5) {
      return res.status(400).json({ error: 'Activity description too short.' });
    }
    if (trimmed.length > MAX_ACTIVITY_TEXT_LENGTH) {
      return res.status(400).json({
        error: `Activity description must be at most ${MAX_ACTIVITY_TEXT_LENGTH} characters.`,
      });
    }

    if (!nonce || !expiry || !mac || !signedXdr) {
      return res.status(400).json({ error: 'Missing wallet ownership proof. Please retry.' });
    }

    const intentHash = hashActivityIntent(trimmed);
    if (bodyIntent && bodyIntent.toLowerCase() !== intentHash) {
      return res.status(400).json({ error: 'Activity text does not match challenge intent.' });
    }

    const adminSecret = process.env.ADMIN_SECRET;
    const nonceSecret = process.env.NONCE_HMAC_SECRET;
    if (!adminSecret || !nonceSecret) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    const proof = verifyChallenge(
      nonceSecret, wallet, nonce, expiry, mac, signedXdr, intentHash,
    );
    if (!proof.ok) return res.status(401).json({ error: proof.error });

    const nonceKey = `nonce:${nonce}`;
    const claimed = await claimOnce(nonceKey, 300);
    if (!claimed) {
      return res.status(401).json({ error: 'Challenge nonce has already been used.' });
    }

    // Atomic rate-limit claims (release on failure so failed txs don't burn the day).
    const ip = getClientIp(req);
    walletRateKey = `rate:wallet:${wallet}`;
    const walletClaimed = await claimOnce(walletRateKey, RATE_LIMIT_TTL_SECONDS);
    if (!walletClaimed) {
      return res.status(429).json({ error: 'Rate limit: 1 reward per day. Try again tomorrow.' });
    }
    if (ip !== 'unknown') {
      ipRateKey = `rate:ip:${ip}`;
      const ipClaimed = await claimOnce(ipRateKey, RATE_LIMIT_TTL_SECONDS);
      if (!ipClaimed) {
        await releaseClaim(walletRateKey);
        walletRateKey = null;
        return res.status(429).json({ error: 'Rate limit reached for your IP. Try again tomorrow.' });
      }
    }

    let evaluation: Evaluation;
    let scoringMode: 'groq' | 'heuristic' = 'groq';
    try {
      evaluation = await ScoringAgent.evaluate(trimmed);
    } catch {
      // Groq timeout / 5xx / parse — fall back to base-only heuristic (never skip integrity).
      evaluation = HeuristicScoringAgent.evaluate(trimmed);
      scoringMode = 'heuristic';
    }

    if (!evaluation.valid || !isKnownActivity(evaluation.activity)) {
      await releaseClaim(walletRateKey);
      if (ipRateKey) await releaseClaim(ipRateKey);
      return res.status(422).json({
        error: `Activity not eligible for reward. ${evaluation.rationale}`,
        activity: evaluation.activity,
        scoringMode,
      });
    }

    const recentKey = `recent:wallet:${wallet}`;
    let recent: string[] = [];
    try {
      recent = await listRecent(recentKey);
    } catch {
      recent = [];
    }
    const integrity = IntegrityAgent.assess(trimmed, { recent });

    // Heuristic path: base reward only (score forced to 0 by HeuristicScoringAgent).
    const effortScore = Math.round(evaluation.score * integrity.effortMultiplier * 1000) / 1000;
    const base = BASE_REWARD[evaluation.activity];
    const bonus = Math.round(effortScore * MAX_BONUS[evaluation.activity] * 10) / 10;
    const reward = Math.min(Math.round((base + bonus) * 10) / 10, MAX_REWARD_PER_TX_XLM);

    // API-side daily budgets (0.1 XLM units) — fail closed before signing.
    const day = utcDayKey();
    budgetUnits = Math.round(reward * 10);
    const budgetTtl = 48 * 60 * 60;
    treasuryBudgetKey = `budget:treasury:day:${day}`;
    const treasuryOk = await reserveBudget(
      treasuryBudgetKey,
      budgetUnits,
      DAILY_TREASURY_CAP_XLM * 10,
      budgetTtl,
    );
    if (!treasuryOk) {
      treasuryBudgetKey = null;
      await releaseClaim(walletRateKey);
      if (ipRateKey) await releaseClaim(ipRateKey);
      return res.status(429).json({
        error: `Daily treasury budget (${DAILY_TREASURY_CAP_XLM} XLM) exceeded. Try again tomorrow.`,
      });
    }
    recipientBudgetKey = `budget:recipient:day:${day}:${wallet}`;
    const recipientOk = await reserveBudget(
      recipientBudgetKey,
      budgetUnits,
      DAILY_RECIPIENT_CAP_XLM * 10,
      budgetTtl,
    );
    if (!recipientOk) {
      await releaseBudgets();
      await releaseClaim(walletRateKey);
      if (ipRateKey) await releaseClaim(ipRateKey);
      return res.status(429).json({
        error: `Daily recipient budget (${DAILY_RECIPIENT_CAP_XLM} XLM) exceeded. Try again tomorrow.`,
      });
    }

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
      await releaseBudgets();
      await releaseClaim(walletRateKey);
      if (ipRateKey) await releaseClaim(ipRateKey);
      if (errStr.includes('Daily treasury cap') || errStr.includes('Daily recipient cap')) {
        return res.status(429).json({ error: 'On-chain daily payout cap exceeded. Try again tomorrow.' });
      }
      if (errStr.includes('opNOACCOUNT') || errStr.includes('not found')) {
        return res.status(404).json({ error: 'Contract or account not found on Stellar testnet.' });
      }
      throw new Error(`Transaction rejected: ${errStr}`);
    }

    const txHash = sendResponse.hash;

    let attempts = 0;
    let txResponse = null;
    while (attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      txResponse = await rpcServer.getTransaction(txHash);

      if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        break;
      } else if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
        await releaseBudgets();
        await releaseClaim(walletRateKey);
        if (ipRateKey) await releaseClaim(ipRateKey);
        throw new Error(`Transaction execution failed on-chain: ${JSON.stringify(txResponse)}`);
      }
      attempts++;
    }

    if (!txResponse || txResponse.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      await releaseBudgets();
      await releaseClaim(walletRateKey);
      if (ipRateKey) await releaseClaim(ipRateKey);
      throw new Error('Transaction polling timed out. The payout may still succeed later.');
    }

    // Rate slots + budgets already claimed — keep them on success.
    walletRateKey = null;
    ipRateKey = null;
    treasuryBudgetKey = null;
    recipientBudgetKey = null;

    try {
      await addRecent(recentKey, IntegrityAgent.fingerprint(trimmed), 20, 30 * 24 * 60 * 60);
    } catch { /* ignore */ }

    let identityId: string | null = null;
    let sessionToken: string | null = null;
    try {
      const identity = await bindIdentity(wallet);
      identityId = identity.id;
      sessionToken = issueSessionToken(identity).token;
    } catch { /* identity bind is best-effort after payout */ }

    const payoutRecord = {
      txHash,
      wallet,
      identityId,
      amount: reward,
      activity: evaluation.activity,
      effortScore,
      scoringMode,
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
      scoringMode,
      identityId,
      sessionToken,
    });
  } catch (err) {
    if (err instanceof StoreUnavailableError) {
      return res.status(503).json({ error: err.message });
    }
    await releaseBudgets();
    if (walletRateKey) await releaseClaim(walletRateKey).catch(() => undefined);
    if (ipRateKey) await releaseClaim(ipRateKey).catch(() => undefined);

    const msg = (err as Error).message ?? String(err);
    if (msg.includes('Daily treasury') || msg.includes('Daily recipient')) {
      return res.status(429).json({ error: 'On-chain daily payout cap exceeded. Try again tomorrow.' });
    }
    if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
      return res.status(402).json({ error: 'Insufficient treasury balance to cover this reward.' });
    }
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      return res.status(404).json({ error: 'Contract or account not found on Stellar testnet.' });
    }
    return res.status(500).json({ error: `Transaction failed: ${msg}` });
  }
}
