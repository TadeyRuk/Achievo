import { createHash } from 'crypto';
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Horizon,
  Keypair,
  rpc,
  StrKey,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import {
  CONTRACT_ID,
  HORIZON_URL,
  NETWORK_PASSPHRASE,
  SOROBAN_RPC_URL,
  xlmToStroops,
} from '@achievo/shared';

export const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
export const horizonServer = new Horizon.Server(HORIZON_URL);
export { StrKey };

export function hashActivityIntent(activityText: string): string {
  return createHash('sha256').update(activityText.trim()).digest('hex');
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
    networkPassphrase: NETWORK_PASSPHRASE,
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
