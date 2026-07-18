/**
 * Compatibility barrel — prefer `@achievo/stellar` / `@achievo/shared` in new code.
 */
export {
  CONTRACT_ID,
  XLM_TOKEN_CONTRACT_ID,
  DEFAULT_ACTIVITY_LABEL,
  stroopsToXlm,
  type RewardHistoryItem,
} from '@achievo/shared';

export {
  rpcServer,
  horizonServer,
  computeStartLedger,
  decodeRewardEvent,
  filterByRecipient,
  mergePayouts,
  decodeLedgerRecord,
  attachTxHashes,
  getRewardEvents,
  getTreasuryBalance,
  getTreasuryAdmin,
  getRewardLedger,
  getTreasuryInfo,
  getWalletRewardHistory,
  type TreasuryInfo,
  type RewardEvent,
  type RewardLedgerRecord,
  type PayoutItem,
} from '@achievo/stellar';
