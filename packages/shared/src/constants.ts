function readEnv(key: string): string | undefined {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env?.[key];
}

/** First truthy env value among aliases (server + Vite). */
function readEnvAny(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readEnv(key);
    if (value) return value;
  }
  return undefined;
}

/** Stellar network selector: `testnet` (default) or `public` (mainnet). */
export type StellarNetworkName = "testnet" | "public";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const PUBLIC_PASSPHRASE = "Public Global Stellar Network ; September 2015";

function parseNetworkName(raw: string | undefined): StellarNetworkName {
  const value = (raw ?? "testnet").trim().toLowerCase();
  if (value === "public" || value === "mainnet" || value === "pubnet") return "public";
  return "testnet";
}

export const STELLAR_NETWORK: StellarNetworkName = parseNetworkName(
  readEnvAny("STELLAR_NETWORK", "VITE_STELLAR_NETWORK"),
);

export const NETWORK_PASSPHRASE =
  readEnvAny("NETWORK_PASSPHRASE", "VITE_NETWORK_PASSPHRASE") ||
  (STELLAR_NETWORK === "public" ? PUBLIC_PASSPHRASE : TESTNET_PASSPHRASE);

export const FRIENDBOT_ENABLED = STELLAR_NETWORK === "testnet";

/** Deployed Reward Treasury Contract ID. Override via CONTRACT_ID / VITE_CONTRACT_ID. */
export const CONTRACT_ID =
  readEnvAny("CONTRACT_ID", "VITE_CONTRACT_ID") ||
  (STELLAR_NETWORK === "testnet"
    ? "CCQVKUU2AYYWLKEUNZ47NXYLUB4SLN5YEB3EHQ76TCI5X4K5VEIW5PDS"
    : "");

/** Native XLM SAC for the active network. */
export const XLM_TOKEN_CONTRACT_ID =
  readEnvAny("XLM_TOKEN_CONTRACT_ID") ||
  (STELLAR_NETWORK === "public"
    ? "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA"
    : "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");

export const STROOP_FACTOR = 10_000_000;

export const SOROBAN_RPC_URL =
  readEnvAny("SOROBAN_RPC_URL", "VITE_SOROBAN_RPC_URL") ||
  (STELLAR_NETWORK === "public" ? "" : "https://soroban-testnet.stellar.org");

export const HORIZON_URL =
  readEnvAny("HORIZON_URL", "VITE_HORIZON_URL") ||
  (STELLAR_NETWORK === "public"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org");

/** ~17280 ledgers ≈ 24h at ~5s/ledger on testnet. */
export const REWARD_EVENT_LEDGER_WINDOW = 17_280;

export const DEFAULT_ACTIVITY_LABEL = "Reward payout";

/** Max activity submission length for API + UI. */
export const MAX_ACTIVITY_TEXT_LENGTH = 2000;
