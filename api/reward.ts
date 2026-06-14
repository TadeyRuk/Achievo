import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  rpc,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  Networks,
  BASE_FEE,
  Keypair,
  Transaction,
  Horizon,
  StrKey,
} from '@stellar/stellar-sdk';

const CONTRACT_ID = "CAIYYR6UKRUVAYY56CKLNQDEPUR3PGZL3CUXWKH3TJKJ4MIDZYO4WJAJ";
const STROOP_FACTOR = 10_000_000;

const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org");
const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");

// In-memory rate limit keyed on both wallet AND IP (resets on cold start)
const walletLastReward = new Map<string, number>();
const ipLastReward = new Map<string, number>();
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

// Reward table — strict enum, mirrors frontend/src/agents.ts
const REWARD_TABLE: Record<string, number> = {
  tutoring: 5,
  workshop: 2,
  volunteering: 10,
  event: 3,
  participation: 3,
};
const WHITELIST = Object.keys(REWARD_TABLE);

function getClientIp(req: VercelRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    'unknown'
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { activityType, wallet } = req.body as { activityType?: string; wallet?: string };

  // Error type 1: invalid/missing wallet — use proper StrKey validation
  if (!wallet || !StrKey.isValidEd25519PublicKey(wallet)) {
    return res.status(400).json({ error: 'Invalid Stellar wallet address.' });
  }

  // Strict equality check — no free-text parsing on the server
  if (!activityType || !WHITELIST.includes(activityType)) {
    return res.status(400).json({
      error: `Invalid activity type. Must be one of: ${WHITELIST.join(', ')}.`,
    });
  }

  const reward = REWARD_TABLE[activityType];
  const ip = getClientIp(req);

  // Rate limit: check both wallet and IP
  const walletTs = walletLastReward.get(wallet);
  const ipTs = ipLastReward.get(ip);
  const now = Date.now();

  if (walletTs && now - walletTs < RATE_LIMIT_MS) {
    const hoursLeft = Math.ceil((RATE_LIMIT_MS - (now - walletTs)) / 3_600_000);
    return res.status(429).json({ error: `Rate limit: 1 reward per day. Try again in ${hoursLeft}h.` });
  }
  if (ip !== 'unknown' && ipTs && now - ipTs < RATE_LIMIT_MS) {
    const hoursLeft = Math.ceil((RATE_LIMIT_MS - (now - ipTs)) / 3_600_000);
    return res.status(429).json({ error: `Rate limit reached for your IP. Try again in ${hoursLeft}h.` });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

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
        "send_reward",
        nativeToScVal(wallet, { type: "address" }),
        nativeToScVal(rewardStroops, { type: "i128" }),
      ))
      .setTimeout(30)
      .build();

    const preparedTx = await rpcServer.prepareTransaction(tx);
    (preparedTx as Transaction).sign(adminKeypair);

    const sendResponse = await rpcServer.sendTransaction(preparedTx as Transaction);

    // Error type 2: contract/account not found
    if (sendResponse.status === "ERROR") {
      const errStr = JSON.stringify(sendResponse.errorResult);
      if (errStr.includes('opNOACCOUNT') || errStr.includes('not found')) {
        return res.status(404).json({ error: 'Contract or account not found on Stellar testnet.' });
      }
      throw new Error(`Transaction rejected: ${errStr}`);
    }

    // Lock rate limit on successful submission
    walletLastReward.set(wallet, now);
    if (ip !== 'unknown') ipLastReward.set(ip, now);

    return res.status(200).json({
      txHash: sendResponse.hash,
      reward,
      activity: activityType,
    });

  } catch (err) {
    const msg = (err as Error).message ?? String(err);

    // Error type 3: insufficient treasury balance
    if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
      return res.status(402).json({ error: 'Insufficient treasury balance to cover this reward.' });
    }
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      return res.status(404).json({ error: 'Contract or account not found on Stellar testnet.' });
    }
    return res.status(500).json({ error: `Transaction failed: ${msg}` });
  }
}
