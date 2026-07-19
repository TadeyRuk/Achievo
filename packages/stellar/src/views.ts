import {
  Address,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import {
  CONTRACT_ID,
  NETWORK_PASSPHRASE,
  REWARD_EVENT_LEDGER_WINDOW,
  STROOP_FACTOR,
} from "@achievo/shared";
import { horizonServer, rpcServer } from "./clients.js";
import {
  attachTxHashes,
  computeStartLedger,
  decodeLedgerRecord,
  decodeRewardEvent,
  filterByRecipient,
  type RewardEvent,
  type RewardLedgerRecord,
} from "./decode.js";

export interface TreasuryInfo {
  admin: string;
  balance: number;
  totalDisbursed: number;
}

async function simulateViewCall(
  contractId: string,
  functionName: string,
  args: xdr.ScVal[] = [],
) {
  const contract = new Contract(contractId);
  const callOp = contract.call(functionName, ...args);

  const dummySource =
    "GBPW3ETOM3525MXSQUH3QYHPQIFNM6QGOF474H4FJQQS7NCPC3FUMCOF";
  const sourceAccount = await horizonServer.loadAccount(dummySource);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
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

export async function getTreasuryBalance(
  contractId: string = CONTRACT_ID,
): Promise<number> {
  const raw = await simulateViewCall(contractId, "get_balance");
  return Number(raw) / STROOP_FACTOR;
}

export async function getTreasuryAdmin(
  contractId: string = CONTRACT_ID,
): Promise<string> {
  const raw = await simulateViewCall(contractId, "get_admin");
  return String(raw);
}

export async function getRewardLedger(
  contractId: string = CONTRACT_ID,
): Promise<RewardLedgerRecord[]> {
  const raw = await simulateViewCall(contractId, "get_history");
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map(decodeLedgerRecord);
}

export async function getTreasuryInfo(
  contractId: string = CONTRACT_ID,
): Promise<TreasuryInfo> {
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

export async function getRewardEvents(
  walletAddress: string,
  contractId: string = CONTRACT_ID,
): Promise<RewardEvent[]> {
  const { sequence: latestLedger } = await rpcServer.getLatestLedger();

  const buildRequest = (startLedger: number): rpc.Server.GetEventsRequest => ({
    startLedger,
    filters: [
      {
        type: "contract",
        contractIds: [contractId],
        topics: [
          [
            xdr.ScVal.scvSymbol("reward").toXDR("base64"),
            xdr.ScVal.scvSymbol("sent").toXDR("base64"),
          ],
        ],
      },
    ],
  });

  const startLedger = computeStartLedger(latestLedger, REWARD_EVENT_LEDGER_WINDOW);
  const decoded: RewardEvent[] = [];
  // First page by startLedger; further pages by cursor (mutually exclusive in RPC API).
  let response = await rpcServer.getEvents(buildRequest(startLedger));
  for (let page = 0; page < 20; page++) {
    for (const event of response.events) {
      try {
        decoded.push(decodeRewardEvent(event));
      } catch {
        // Skip malformed events.
      }
    }
    const next = (response as { cursor?: string }).cursor;
    if (!next || response.events.length === 0) break;
    response = await rpcServer.getEvents({
      filters: buildRequest(startLedger).filters,
      cursor: next,
    } as rpc.Server.GetEventsRequest);
  }

  return filterByRecipient(decoded, walletAddress);
}

/** Ledger rows for a wallet with tx hashes attached when events are in-window. */
export async function getWalletRewardHistory(
  walletAddress: string,
  contractId: string = CONTRACT_ID,
): Promise<RewardLedgerRecord[]> {
  const [ledger, events] = await Promise.all([
    getRewardLedger(contractId),
    getRewardEvents(walletAddress, contractId),
  ]);
  const mine = ledger.filter((r) => r.recipient === walletAddress);
  return attachTxHashes(mine, events);
}

/** UTC day index used by on-chain daily caps. */
export async function getDay(contractId: string = CONTRACT_ID): Promise<number> {
  const raw = await simulateViewCall(contractId, "get_day");
  return Number(raw);
}

/** Treasury disbursed today in XLM (after day-bucket reset). */
export async function getDailyDisbursed(
  contractId: string = CONTRACT_ID,
): Promise<number> {
  const raw = await simulateViewCall(contractId, "get_daily_disbursed");
  return Number(raw) / STROOP_FACTOR;
}

/** Amount paid to a recipient today in XLM. */
export async function getRecipientDaily(
  walletAddress: string,
  contractId: string = CONTRACT_ID,
): Promise<number> {
  const raw = await simulateViewCall(contractId, "get_recipient_daily", [
    new Address(walletAddress).toScVal(),
  ]);
  return Number(raw) / STROOP_FACTOR;
}
