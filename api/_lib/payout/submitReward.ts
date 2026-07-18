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
} from '@stellar/stellar-sdk';
import { CONTRACT_ID, xlmToStroops } from '@achievo/shared';
import { horizonServer, rpcServer } from './stellarServers';

export type SubmitRewardResult =
  | { ok: true; txHash: string }
  | { ok: false; status: number; error: string }
  | { ok: false; pending: true; txHash: string; error: string };

export async function submitSendReward(params: {
  adminSecret: string;
  wallet: string;
  rewardXlm: number;
  activity: string;
}): Promise<SubmitRewardResult> {
  const { adminSecret, wallet, rewardXlm, activity } = params;
  const adminKeypair = Keypair.fromSecret(adminSecret);
  const adminAddress = adminKeypair.publicKey();
  const rewardStroops = xlmToStroops(rewardXlm);

  const sourceAccount = await horizonServer.loadAccount(adminAddress);
  const contract = new Contract(CONTRACT_ID);

  // Slightly above BASE_FEE to reduce congestion stalls (fee-bump later).
  const fee = String(Math.max(Number(BASE_FEE), 10_000));

  const tx = new TransactionBuilder(sourceAccount, {
    fee,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        'send_reward',
        new Address(wallet).toScVal(),
        nativeToScVal(rewardStroops, { type: 'i128' }),
        nativeToScVal(activity, { type: 'symbol' }),
      ),
    )
    .setTimeout(30)
    .build();

  const preparedTx = await rpcServer.prepareTransaction(tx);
  (preparedTx as Transaction).sign(adminKeypair);

  const sendResponse = await rpcServer.sendTransaction(preparedTx as Transaction);

  if (sendResponse.status === 'ERROR') {
    const errStr = JSON.stringify(sendResponse.errorResult);
    if (errStr.includes('DailyTreasuryCap') || errStr.includes('Daily treasury cap') ||
        errStr.includes('DailyRecipientCap') || errStr.includes('Daily recipient cap')) {
      return {
        ok: false,
        status: 429,
        error: 'On-chain daily payout cap exceeded. Try again tomorrow.',
      };
    }
    if (errStr.includes('opNOACCOUNT') || errStr.includes('not found')) {
      return {
        ok: false,
        status: 404,
        error: 'Contract or account not found on Stellar testnet.',
      };
    }
    throw new Error(`Transaction rejected: ${errStr}`);
  }

  const txHash = sendResponse.hash;
  let attempts = 0;
  while (attempts < 10) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const txResponse = await rpcServer.getTransaction(txHash);

    if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { ok: true, txHash };
    }
    if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction execution failed on-chain: ${JSON.stringify(txResponse)}`);
    }
    attempts++;
  }

  // Ambiguous: submitted but not confirmed — do NOT treat as failure for budget release.
  return {
    ok: false,
    pending: true,
    txHash,
    error: 'Transaction submitted; confirmation pending reconciliation.',
  };
}
