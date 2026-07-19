import { createHash, createHmac, randomBytes } from 'crypto';
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Horizon,
  Keypair,
  Networks,
  Operation,
  rpc,
  StrKey,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import {
  CONTRACT_ID,
  HORIZON_URL,
  SOROBAN_RPC_URL,
  xlmToStroops,
} from '@achievo/shared';

export const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
export const horizonServer = new Horizon.Server(HORIZON_URL);
export { StrKey };

export function hashActivityIntent(activityText: string): string {
  return createHash('sha256').update(activityText.trim()).digest('hex');
}

export function challengeMacPayload(nonce: string, expiry: number, intentHash: string): string {
  return `${nonce}:${expiry}:${intentHash}`;
}

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

  let transaction: Transaction;
  try {
    transaction = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET) as Transaction;
  } catch {
    return { ok: false, error: 'Invalid signed challenge XDR.' };
  }
  if (transaction.source !== wallet) {
    return { ok: false, error: 'Challenge was not built for this wallet.' };
  }
  const operation = transaction.operations[0] as { type: string; name?: string; value?: Buffer };
  if (operation?.type !== 'manageData' || operation?.name !== 'achievo-challenge') {
    return { ok: false, error: 'Challenge structure invalid.' };
  }
  if (!operation.value || operation.value.toString('hex') !== nonce) {
    return { ok: false, error: 'Challenge nonce mismatch.' };
  }

  const keypair = Keypair.fromPublicKey(wallet);
  let signed = transaction.signatures.some((signature) => {
    try {
      return keypair.verify(transaction.hash(), signature.signature());
    } catch {
      return false;
    }
  });
  if (!signed) {
    try {
      const publicTransaction = TransactionBuilder.fromXDR(signedXdr, Networks.PUBLIC) as Transaction;
      signed = publicTransaction.signatures.some((signature) => {
        try {
          return keypair.verify(publicTransaction.hash(), signature.signature());
        } catch {
          return false;
        }
      });
    } catch {
      // Ignore alternate-network parse failures.
    }
  }
  return signed ? { ok: true } : { ok: false, error: 'Wallet ownership could not be verified.' };
}

export async function issueChallenge(
  wallet: string,
  intentHash: string,
  nonceSecret: string,
): Promise<{ nonce: string; expiry: number; mac: string; intentHash: string; challengeXdr: string }> {
  const normalizedIntent = intentHash.toLowerCase();
  const nonce = randomBytes(16).toString('hex');
  const expiry = Date.now() + 5 * 60 * 1000;
  const mac = createHmac('sha256', nonceSecret)
    .update(challengeMacPayload(nonce, expiry, normalizedIntent))
    .digest('hex');
  let sequenceNumber = '0';
  try {
    sequenceNumber = (await horizonServer.loadAccount(wallet)).sequenceNumber();
  } catch {
    // Unfunded account — sequence zero is valid because this transaction is never submitted.
  }
  const transaction = new TransactionBuilder(new Account(wallet, sequenceNumber), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.manageData({ name: 'achievo-challenge', value: Buffer.from(nonce, 'hex') }),
    )
    .setTimebounds(0, Math.floor(expiry / 1000))
    .build();
  return { nonce, expiry, mac, intentHash: normalizedIntent, challengeXdr: transaction.toXDR() };
}

export type SubmitRewardResult =
  | { ok: true; txHash: string }
  | { ok: false; status: number; error: string }
  | { ok: false; pending: true; txHash: string; error: string };

function mapSubmitError(message: string): SubmitRewardResult | null {
  const dailyCap =
    message.includes('DailyTreasuryCap') ||
    message.includes('Daily treasury cap') ||
    message.includes('DailyRecipientCap') ||
    message.includes('Daily recipient cap');
  if (dailyCap) {
    return { ok: false, status: 429, error: 'On-chain daily payout cap exceeded. Try again tomorrow.' };
  }
  if (message.includes('ClaimAlreadyUsed')) {
    return { ok: false, status: 409, error: 'Reward claim was already used.' };
  }
  if (message.includes('VoucherExpired')) {
    return { ok: false, status: 401, error: 'Reward voucher expired. Please retry.' };
  }
  if (message.includes('opNOACCOUNT') || message.includes('not found')) {
    return { ok: false, status: 404, error: 'Contract or account not found on Stellar testnet.' };
  }
  return null;
}

function rewardTxBuilder(sourceAccount: Account): TransactionBuilder {
  return new TransactionBuilder(sourceAccount, {
    fee: String(Math.max(Number(BASE_FEE), 10_000)),
    networkPassphrase: Networks.TESTNET,
  });
}

async function signSendAndPoll(
  keypair: Keypair,
  transaction: Transaction,
): Promise<SubmitRewardResult> {
  const prepared = await rpcServer.prepareTransaction(transaction);
  (prepared as Transaction).sign(keypair);
  const sent = await rpcServer.sendTransaction(prepared as Transaction);
  if (sent.status === 'ERROR') {
    const message = JSON.stringify(sent.errorResult);
    const mapped = mapSubmitError(message);
    if (mapped) return mapped;
    throw new Error(`Transaction rejected: ${message}`);
  }
  return pollSubmittedTx(sent.hash);
}

async function pollSubmittedTx(txHash: string): Promise<SubmitRewardResult> {
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const response = await rpcServer.getTransaction(txHash);
    if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) return { ok: true, txHash };
    if (response.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction execution failed on-chain: ${JSON.stringify(response)}`);
    }
  }
  return {
    ok: false,
    pending: true,
    txHash,
    error: 'Transaction submitted; confirmation pending reconciliation.',
  };
}

/** Ops-only admin path (not used by product reward flow). */
export async function submitSendReward(params: {
  adminSecret: string;
  wallet: string;
  rewardXlm: number;
  activity: string;
}): Promise<SubmitRewardResult> {
  const adminKeypair = Keypair.fromSecret(params.adminSecret);
  const sourceAccount = await horizonServer.loadAccount(adminKeypair.publicKey());
  const transaction = rewardTxBuilder(sourceAccount)
    .addOperation(
      new Contract(CONTRACT_ID).call(
        'send_reward',
        new Address(params.wallet).toScVal(),
        nativeToScVal(xlmToStroops(params.rewardXlm), { type: 'i128' }),
        nativeToScVal(params.activity, { type: 'symbol' }),
      ),
    )
    .setTimeout(30)
    .build();
  return signSendAndPoll(adminKeypair, transaction);
}

/** Product path: relay an attestor-signed claim_reward voucher. */
export async function submitClaimReward(params: {
  relayerSecret: string;
  wallet: string;
  rewardXlm: number;
  activity: string;
  claimId: Buffer;
  expiry: number;
  signature: Buffer;
}): Promise<SubmitRewardResult> {
  if (params.claimId.length !== 32 || params.signature.length !== 64) {
    return { ok: false, status: 400, error: 'Invalid voucher encoding.' };
  }
  const relayerKeypair = Keypair.fromSecret(params.relayerSecret);
  const sourceAccount = await horizonServer.loadAccount(relayerKeypair.publicKey());
  const transaction = rewardTxBuilder(sourceAccount)
    .addOperation(
      new Contract(CONTRACT_ID).call(
        'claim_reward',
        new Address(params.wallet).toScVal(),
        nativeToScVal(xlmToStroops(params.rewardXlm), { type: 'i128' }),
        nativeToScVal(params.activity, { type: 'symbol' }),
        nativeToScVal(params.claimId),
        nativeToScVal(params.expiry, { type: 'u64' }),
        nativeToScVal(params.signature),
      ),
    )
    .setTimeout(30)
    .build();
  return signSendAndPoll(relayerKeypair, transaction);
}
