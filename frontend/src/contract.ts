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

// Deployed Split Bill Contract ID (Testnet)
export const CONTRACT_ID = "CDJN47RNDWOUCOTMGFDDNNT226QWRTKCX5WRTXTDXXQIIMIBMA4MM4X4";

// Stellar Testnet Native XLM Token Contract ID
export const XLM_TOKEN_CONTRACT_ID = "CAS3J7CYCJ34TRCB4YEX6ADYZ37CTAMCCMI43GAPK4R4SUK2VJYZATJQ";

export interface ParticipantInfo {
  address: string;
  hasPaid: boolean;
}

export interface BillStateData {
  organizer: string;
  token: string;
  description: string;
  totalAmount: number; // in XLM
  sharePerPerson: number; // in XLM
  participants: ParticipantInfo[];
}

/**
 * Fetch the current state of the split bill contract.
 */
export async function getBillState(contractId: string = CONTRACT_ID): Promise<BillStateData> {
  const contract = new Contract(contractId);
  const callOp = contract.call("get_state");

  // Build a dummy transaction for simulation/view call
  const sourceAccount = await horizonServer.loadAccount(
    "GDV3VGB2J2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2" // arbitrary valid pubkey
  );
  
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

  if (!simResponse.result || !simResponse.result.retval) {
    throw new Error("No return value in simulation response");
  }

  // Parse result state
  const rawState: any = scValToNative(simResponse.result.retval);
  
  // Convert participant map to array of ParticipantInfo
  const participantsList: ParticipantInfo[] = [];
  if (rawState.participants) {
    if (rawState.participants instanceof Map) {
      for (const [address, hasPaid] of rawState.participants.entries()) {
        participantsList.push({ address, hasPaid: !!hasPaid });
      }
    } else {
      for (const [address, hasPaid] of Object.entries(rawState.participants)) {
        participantsList.push({ address, hasPaid: !!hasPaid });
      }
    }
  }

  // Stroops to XLM converter (Soroban SDK represents numbers as i128 stroops, divided by 10,000,000)
  const STROOP_FACTOR = 10_000_000;

  return {
    organizer: rawState.organizer,
    token: rawState.token,
    description: rawState.description,
    totalAmount: Number(rawState.total_amount) / STROOP_FACTOR,
    sharePerPerson: Number(rawState.share_per_person) / STROOP_FACTOR,
    participants: participantsList,
  };
}

/**
 * Helper to build, simulate, assemble, sign, and submit a Soroban transaction.
 */
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
  // Sign using StellarWalletsKit static method
  const signedTxResult = await StellarWalletsKit.signTransaction(preparedTx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedTxResult.signedTxXdr, Networks.TESTNET) as Transaction;

  onStatusUpdate?.("Submitting transaction to network...");
  const sendResponse = await rpcServer.sendTransaction(signedTx);
  
  if (sendResponse.status === "ERROR") {
    throw new Error(`Transaction failed to send: ${JSON.stringify(sendResponse.errorResult)}`);
  }

  const txHash = sendResponse.hash;
  onStatusUpdate?.(`Transaction submitted. Hash: ${txHash}. Waiting for ledger settlement...`);

  // Poll for result
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

/**
 * Initialize a new bill split request on-chain.
 * @param organizer The organizer's address
 * @param token The token to use (usually XLM_TOKEN_CONTRACT_ID)
 * @param description Description of the bill
 * @param totalAmount Total amount (in XLM)
 * @param participants List of participant addresses
 */
export async function createBillOnChain(
  organizer: string,
  token: string,
  description: string,
  totalAmount: number,
  participants: string[],
  onStatusUpdate?: (status: string) => void,
  contractId: string = CONTRACT_ID
): Promise<string> {
  const totalStroops = BigInt(Math.round(totalAmount * 10_000_000));
  
  const scOrganizer = nativeToScVal(organizer, { type: "address" });
  const scToken = nativeToScVal(token, { type: "address" });
  const scDescription = nativeToScVal(description, { type: "symbol" });
  const scTotal = nativeToScVal(totalStroops, { type: "i128" });
  
  const scParticipantsVec = nativeToScVal(
    participants.map(p => nativeToScVal(p, { type: "address" })),
    { type: "vec" }
  );

  return sendContractTransaction(
    organizer,
    contractId,
    "init",
    [scOrganizer, scToken, scDescription, scTotal, scParticipantsVec],
    onStatusUpdate
  );
}

/**
 * Pay the share for a participant.
 */
export async function payShareOnChain(
  payer: string,
  onStatusUpdate?: (status: string) => void,
  contractId: string = CONTRACT_ID
): Promise<string> {
  const scPayer = nativeToScVal(payer, { type: "address" });
  return sendContractTransaction(
    payer,
    contractId,
    "pay_share",
    [scPayer],
    onStatusUpdate
  );
}

/**
 * Claim collected escrow funds (Organizer only).
 */
export async function claimFundsOnChain(
  organizer: string,
  onStatusUpdate?: (status: string) => void,
  contractId: string = CONTRACT_ID
): Promise<string> {
  return sendContractTransaction(
    organizer,
    contractId,
    "claim",
    [],
    onStatusUpdate
  );
}
