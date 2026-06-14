import {
  rpc,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  BASE_FEE,
  Networks,
  Transaction
} from "@stellar/stellar-sdk";
import { StellarWalletsKit, horizonServer } from "./wallet";

// Soroban RPC Server for Testnet
export const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org");

// Stellar Testnet Native XLM Token (SAC — Stellar Asset Contract)
export const XLM_TOKEN_CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// Deployed Reward Treasury Contract ID (Testnet)
export const CONTRACT_ID = "CDLRRHTNRQ2BGA7ESIXAMIQ2YNL3IF5PP5K6GPH2WR3IEYL7INMSCSNM";

const STROOP_FACTOR = 10_000_000;

export interface TreasuryInfo {
  admin: string;
  balance: number;       // in XLM
  totalDisbursed: number; // in XLM
}

// ─── Simulation helper ────────────────────────────────────────────────────────
// Used for read-only view calls that don't need a signature.

async function simulateViewCall(contractId: string, functionName: string, args: xdr.ScVal[] = []) {
  const contract = new Contract(contractId);
  const callOp = contract.call(functionName, ...args);

  // Funded testnet account used as simulation source (read-only, no signing)
  const dummySource = "GBPW3ETOM3525MXSQUH3QYHPQIFNM6QGOF474H4FJQQS7NCPC3FUMCOF";
  const sourceAccount = await horizonServer.loadAccount(dummySource);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(callOp)
    .setTimeout(30)
    .build();

  const simResponse = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Simulation failed: ${simResponse.error}`);
  }
  if (!simResponse.result?.retval) {
    throw new Error("No return value in simulation response");
  }
  return scValToNative(simResponse.result.retval);
}

// ─── View calls ───────────────────────────────────────────────────────────────

export async function getTreasuryBalance(contractId: string = CONTRACT_ID): Promise<number> {
  const raw = await simulateViewCall(contractId, "get_balance");
  return Number(raw) / STROOP_FACTOR;
}

export async function getTreasuryAdmin(contractId: string = CONTRACT_ID): Promise<string> {
  const raw = await simulateViewCall(contractId, "get_admin");
  return String(raw);
}

export async function getTreasuryInfo(contractId: string = CONTRACT_ID): Promise<TreasuryInfo> {
  const [balance, admin, disbursed] = await Promise.all([
    simulateViewCall(contractId, "get_balance"),
    simulateViewCall(contractId, "get_admin"),
    simulateViewCall(contractId, "get_disbursed"),
  ]);
  return {
    admin: String(admin),
    balance: Number(balance) / STROOP_FACTOR,
    totalDisbursed: Number(disbursed) / STROOP_FACTOR,
  };
}

// ─── Transaction: send reward ─────────────────────────────────────────────────

/**
 * Admin-only: send XLM reward from the treasury contract to a student wallet.
 * @param admin     Connected admin wallet address (must match contract admin)
 * @param recipient Student's Stellar public key
 * @param rewardXlm Reward amount in XLM (not stroops)
 */
export async function sendRewardOnChain(
  admin: string,
  recipient: string,
  rewardXlm: number,
  onStatusUpdate?: (status: string) => void,
  contractId: string = CONTRACT_ID
): Promise<string> {
  const rewardStroops = BigInt(Math.round(rewardXlm * STROOP_FACTOR));
  const scRecipient = nativeToScVal(recipient, { type: "address" });
  const scAmount = nativeToScVal(rewardStroops, { type: "i128" });

  return sendContractTransaction(
    admin,
    contractId,
    "send_reward",
    [scRecipient, scAmount],
    onStatusUpdate
  );
}

// ─── Core transaction helper ──────────────────────────────────────────────────
// Build → simulate/prepare → sign (via StellarWalletsKit) → submit → poll.

async function sendContractTransaction(
  sourceAddress: string,
  contractId: string,
  functionName: string,
  args: xdr.ScVal[],
  onStatusUpdate?: (status: string) => void
): Promise<string> {
  onStatusUpdate?.("Fetching account sequence...");
  const sourceAccount = await horizonServer.loadAccount(sourceAddress);

  onStatusUpdate?.("Building transaction...");
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  onStatusUpdate?.("Simulating & preparing transaction...");
  const preparedTx = await rpcServer.prepareTransaction(tx);

  onStatusUpdate?.("Requesting signature from wallet...");
  const signedTxResult = await StellarWalletsKit.signTransaction(preparedTx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedTxResult.signedTxXdr, Networks.TESTNET) as Transaction;

  onStatusUpdate?.("Submitting transaction to network...");
  const sendResponse = await rpcServer.sendTransaction(signedTx);

  if (sendResponse.status === "ERROR") {
    throw new Error(`Transaction failed to send: ${JSON.stringify(sendResponse.errorResult)}`);
  }

  const txHash = sendResponse.hash;
  onStatusUpdate?.(`Transaction submitted (${txHash.slice(0, 8)}...). Waiting for ledger...`);

  // Poll for settlement
  let attempts = 0;
  while (attempts < 10) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const txResponse = await rpcServer.getTransaction(txHash);

    if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      onStatusUpdate?.("Transaction settled successfully!");
      return txHash;
    } else if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction execution failed on-chain: ${JSON.stringify(txResponse)}`);
    }
    attempts++;
  }

  throw new Error("Transaction polling timed out. It may still succeed later.");
}
