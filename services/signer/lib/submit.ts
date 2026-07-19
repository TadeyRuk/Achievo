import {
  Address,
  BASE_FEE,
  Contract,
  Horizon,
  Keypair,
  Networks,
  rpc,
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

const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
const horizonServer = new Horizon.Server(HORIZON_URL);

export type SignerSubmitResult =
  | { ok: true; txHash: string }
  | { ok: false; status: number; error: string }
  | { ok: false; pending: true; txHash: string; error: string };

function mapSubmitError(message: string): SignerSubmitResult | null {
  if (message.includes('DailyTreasuryCap') || message.includes('DailyRecipientCap')) {
    return { ok: false, status: 429, error: 'On-chain daily payout cap exceeded. Try again tomorrow.' };
  }
  if (message.includes('ClaimAlreadyUsed')) {
    return { ok: false, status: 409, error: 'Reward claim was already used.' };
  }
  if (message.includes('VoucherExpired')) {
    return { ok: false, status: 401, error: 'Reward voucher expired. Please retry.' };
  }
  return null;
}

async function pollSubmittedTx(txHash: string): Promise<SignerSubmitResult> {
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const response = await rpcServer.getTransaction(txHash);
    if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) return { ok: true, txHash };
    if (response.status === rpc.Api.GetTransactionStatus.FAILED) {
      return { ok: false, status: 502, error: 'Transaction execution failed on-chain.' };
    }
  }
  return {
    ok: false,
    pending: true,
    txHash,
    error: 'Transaction submitted; confirmation pending reconciliation.',
  };
}

async function signSendAndConfirm(
  keypair: Keypair,
  transaction: Transaction,
): Promise<SignerSubmitResult> {
  const prepared = await rpcServer.prepareTransaction(transaction);
  (prepared as Transaction).sign(keypair);
  const sent = await rpcServer.sendTransaction(prepared as Transaction);
  if (sent.status === 'ERROR') {
    const message = JSON.stringify(sent.errorResult);
    return (
      mapSubmitError(message) ?? {
        ok: false,
        status: 502,
        error: `Transaction rejected: ${message}`,
      }
    );
  }
  return pollSubmittedTx(sent.hash);
}

/** Relayer submits an API-minted claim_reward voucher (does not mint vouchers). */
export async function signAndSubmitReward(params: {
  adminSecret: string;
  wallet: string;
  rewardXlm: number;
  activity: string;
  claimIdHex: string;
  expiry: number;
  signatureHex: string;
}): Promise<SignerSubmitResult> {
  if (params.rewardXlm <= 0) {
    return { ok: false, status: 400, error: 'Invalid reward amount.' };
  }
  const claimId = Buffer.from(params.claimIdHex, 'hex');
  const signature = Buffer.from(params.signatureHex, 'hex');
  if (claimId.length !== 32 || signature.length !== 64) {
    return { ok: false, status: 400, error: 'Invalid voucher encoding.' };
  }
  if (!Number.isFinite(params.expiry) || params.expiry <= 0) {
    return { ok: false, status: 400, error: 'Invalid voucher expiry.' };
  }

  const relayerKeypair = Keypair.fromSecret(params.adminSecret);
  const sourceAccount = await horizonServer.loadAccount(relayerKeypair.publicKey());
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: String(Math.max(Number(BASE_FEE), 10_000)),
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      new Contract(CONTRACT_ID).call(
        'claim_reward',
        new Address(params.wallet).toScVal(),
        nativeToScVal(xlmToStroops(params.rewardXlm), { type: 'i128' }),
        nativeToScVal(params.activity, { type: 'symbol' }),
        nativeToScVal(claimId),
        nativeToScVal(params.expiry, { type: 'u64' }),
        nativeToScVal(signature),
      ),
    )
    .setTimeout(30)
    .build();

  return signSendAndConfirm(relayerKeypair, transaction);
}
