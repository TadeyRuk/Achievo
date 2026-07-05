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
import type { RewardHistoryItem } from "./RewardHistory";

// Soroban RPC Server for Testnet
export const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org");

// Stellar Testnet Native XLM Token (SAC — Stellar Asset Contract)
export const XLM_TOKEN_CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// Deployed Reward Treasury Contract ID (Testnet)
export const CONTRACT_ID = "CDLRRHTNRQ2BGA7ESIXAMIQ2YNL3IF5PP5K6GPH2WR3IEYL7INMSCSNM";

const STROOP_FACTOR = 10_000_000;

// Number of recent ledgers to look back when querying reward events.
// Testnet retains a bounded window; ~17280 ledgers ≈ 24h at ~5s/ledger.
// Kept conservative to stay within the served Ledger_Window.
const REWARD_EVENT_LEDGER_WINDOW = 17_280;

// Default activity label for on-chain reward events with no matching local history entry.
export const DEFAULT_ACTIVITY_LABEL = "Reward payout";

export interface TreasuryInfo {
  admin: string;
  balance: number;       // in XLM
  totalDisbursed: number; // in XLM
}

// A single decoded on-chain reward event (topics ("reward","sent")).
export interface RewardEvent {
  txHash: string;      // transaction hash that emitted the event (dedup key)
  recipient: string;   // Stellar public key (decoded via scValToNative)
  amount: number;      // reward in XLM (stroops / STROOP_FACTOR)
  timestamp: number;   // ms epoch derived from event ledgerClosedAt
  ledger?: number;     // ledger sequence the event was emitted in — joins to RewardLedgerRecord.
                       // Optional: always set by decodeRewardEvent; existing tests construct
                       // RewardEvent literals directly and predate this field.
}

// A single durable reward record read from contract storage via get_history.
// This is the read-only, on-chain ledger — it survives past the bounded
// RPC event-retention window (unlike RewardEvent). It has no txHash on its
// own (a contract cannot observe its own transaction hash); attachTxHashes
// fills that in by joining against RewardEvent on (ledger, recipient, amount).
export interface RewardLedgerRecord {
  recipient: string;
  amount: number;      // XLM
  activity: string;
  ledger: number;
  timestamp: number;   // ms epoch (contract stores seconds)
  txHash?: string;      // present only if a matching event was found in-window
}

// A merged feed entry combining chain truth with a local activity label.
export interface PayoutItem {
  txHash: string;
  recipient: string;
  amount: number;      // XLM — authoritative from chain
  activity: string;    // label — from matching local history, else DEFAULT_ACTIVITY_LABEL
  timestamp: number;
}

// ─── Reward event helpers ─────────────────────────────────────────────────────

// Clamp a look-back start ledger into the valid [1, latestLedger] range.
// Validates Requirement 1.2.
export function computeStartLedger(latestLedger: number, window: number): number {
  const candidate = latestLedger - window;
  return Math.max(1, Math.min(candidate, latestLedger));
}

// Convert an i128 stroop amount (number | bigint) to XLM.
// Validates Requirement 1.4.
export function stroopsToXlm(stroops: number | bigint): number {
  return Number(stroops) / STROOP_FACTOR;
}

// Map a single raw RPC event into a typed RewardEvent.
// The contract emits topics ("reward","sent") with data (recipient: Address,
// amount: i128); the event's `value` ScVal decodes via scValToNative into the
// 2-tuple [recipientAddress, amountStroops]. This decodes one event; batch-level
// robustness (skipping malformed events) is handled in getRewardEvents.
// Validates Requirements 1.3, 1.4.
export function decodeRewardEvent(event: rpc.Api.EventResponse): RewardEvent {
  const decoded = scValToNative(event.value) as unknown;
  const tuple = Array.isArray(decoded) ? decoded : [];
  const recipient = tuple.length > 0 ? String(tuple[0]) : "";
  const amountStroops = (tuple.length > 1 ? tuple[1] : 0) as number | bigint;

  return {
    txHash: event.txHash,
    recipient,
    amount: stroopsToXlm(amountStroops),
    timestamp: new Date(event.ledgerClosedAt).getTime(),
    ledger: event.ledger,
  };
}

// Keep only events addressed to the connected wallet.
// Validates Requirement 2.1.
export function filterByRecipient(events: RewardEvent[], walletAddress: string): RewardEvent[] {
  return events.filter((e) => e.recipient === walletAddress);
}

// Merge chain events with local history, deduped by txHash, sorted newest-first.
// The chain is authoritative for recipient/amount/txHash/timestamp; local history
// only contributes the human-readable `activity` label by matching txHash. Only
// chain events are surfaced, so the output has one PayoutItem per chain txHash.
// Validates Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6.
export function mergePayouts(
  chainEvents: RewardEvent[],
  history: RewardHistoryItem[]
): PayoutItem[] {
  // 1. Build a txHash → history entry map (last write wins).
  const historyByTxHash = new Map<string, RewardHistoryItem>();
  for (const item of history) {
    historyByTxHash.set(item.txHash, item);
  }

  // 2. Emit one PayoutItem per chain event, using the chain values as
  //    authoritative and the matching history label when present.
  const payouts: PayoutItem[] = chainEvents.map((event) => {
    const match = historyByTxHash.get(event.txHash);
    return {
      txHash: event.txHash,
      recipient: event.recipient,
      amount: event.amount,
      activity: match ? match.activity : DEFAULT_ACTIVITY_LABEL,
      timestamp: event.timestamp,
    };
  });

  // 3. Sort by timestamp descending (most recent first).
  return payouts.sort((a, b) => b.timestamp - a.timestamp);
}

// ─── On-chain ledger (get_history) ────────────────────────────────────────────

// Decode one raw RewardRecord struct (from the contract's get_history view) into
// a typed RewardLedgerRecord. The contract stores { recipient, amount, activity,
// ledger, timestamp } where amount is i128 stroops, activity is a Symbol, and
// timestamp is Unix seconds (converted to ms here to match RewardEvent).
export function decodeLedgerRecord(raw: unknown): RewardLedgerRecord {
  const r = raw as {
    recipient: unknown;
    amount: number | bigint;
    activity: unknown;
    ledger: number;
    timestamp: number | bigint;
  };
  return {
    recipient: String(r.recipient),
    amount: stroopsToXlm(r.amount),
    activity: String(r.activity),
    ledger: Number(r.ledger),
    timestamp: Number(r.timestamp) * 1000,
  };
}

// Attach a txHash to each ledger record by matching (ledger, recipient, amount)
// against the decoded event log. Records with no matching event (i.e. older than
// the RPC event-retention window) are left with txHash undefined — the UI falls
// back to a ledger-sequence explorer link in that case.
export function attachTxHashes(
  records: RewardLedgerRecord[],
  events: RewardEvent[]
): RewardLedgerRecord[] {
  const eventsByKey = new Map<string, RewardEvent>();
  for (const event of events) {
    eventsByKey.set(`${event.ledger}:${event.recipient}:${event.amount}`, event);
  }
  return records.map((record) => {
    const match = eventsByKey.get(`${record.ledger}:${record.recipient}:${record.amount}`);
    return match ? { ...record, txHash: match.txHash } : record;
  });
}

// ─── RPC retrieval — getRewardEvents ──────────────────────────────────────────

// Fetch recent on-chain reward events ("reward","sent") addressed to a wallet.
// Read-only: uses only getLatestLedger/getEvents — no signed transaction, no XLM
// cost (Requirements 1.5, 7.1). Looks back over REWARD_EVENT_LEDGER_WINDOW ledgers,
// decodes each event (skipping any that fail to decode for batch robustness), and
// keeps only events addressed to walletAddress.
// Validates Requirements 1.1, 1.3, 1.4, 1.5, 2.1, 7.1.
export async function getRewardEvents(
  walletAddress: string,
  contractId: string = CONTRACT_ID
): Promise<RewardEvent[]> {
  const { sequence: latestLedger } = await rpcServer.getLatestLedger();

  // Topic encoding (confirmed against installed @stellar/stellar-sdk v13):
  // Api.EventFilter.topics is typed `string[][]`, where each segment is the
  // base64-encoded XDR of the topic ScVal. The contract emits the symbol topics
  // ("reward","sent"), so each segment is scvSymbol(...).toXDR("base64").
  // Structured as a buildRequest helper so the out-of-window retry (task 9.2)
  // can reuse it with a different startLedger.
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
  const response = await rpcServer.getEvents(buildRequest(startLedger));

  // Decode each event defensively: a single malformed event must not drop the
  // whole batch (Requirement 1.3). Failures are skipped.
  const decoded: RewardEvent[] = [];
  for (const event of response.events) {
    try {
      decoded.push(decodeRewardEvent(event));
    } catch {
      // Skip events that fail to decode.
    }
  }

  return filterByRecipient(decoded, walletAddress);
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

// Read-only on-chain ledger: every reward this treasury has ever paid out,
// straight from contract storage (get_history) — no signature, no XLM cost,
// and (unlike getRewardEvents) not bounded by RPC event retention.
export async function getRewardLedger(contractId: string = CONTRACT_ID): Promise<RewardLedgerRecord[]> {
  const raw = await simulateViewCall(contractId, "get_history");
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map(decodeLedgerRecord);
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
 * @param activity  Activity label recorded on-chain (get_history); e.g. "tutoring"
 */
export async function sendRewardOnChain(
  admin: string,
  recipient: string,
  rewardXlm: number,
  activity: string,
  onStatusUpdate?: (status: string) => void,
  contractId: string = CONTRACT_ID
): Promise<string> {
  const rewardStroops = BigInt(Math.round(rewardXlm * STROOP_FACTOR));
  const scRecipient = nativeToScVal(recipient, { type: "address" });
  const scAmount = nativeToScVal(rewardStroops, { type: "i128" });
  const scActivity = nativeToScVal(activity, { type: "symbol" });

  return sendContractTransaction(
    admin,
    contractId,
    "send_reward",
    [scRecipient, scAmount, scActivity],
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
