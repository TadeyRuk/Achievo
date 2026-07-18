/** Deployed Reward Treasury Contract ID (Stellar Testnet). */
export const CONTRACT_ID =
  "CCQVKUU2AYYWLKEUNZ47NXYLUB4SLN5YEB3EHQ76TCI5X4K5VEIW5PDS";

/** Stellar Testnet native XLM SAC. */
export const XLM_TOKEN_CONTRACT_ID =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export const STROOP_FACTOR = 10_000_000;

export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** ~17280 ledgers ≈ 24h at ~5s/ledger on testnet. */
export const REWARD_EVENT_LEDGER_WINDOW = 17_280;

export const DEFAULT_ACTIVITY_LABEL = "Reward payout";

/** Max activity submission length for API + UI. */
export const MAX_ACTIVITY_TEXT_LENGTH = 2000;
