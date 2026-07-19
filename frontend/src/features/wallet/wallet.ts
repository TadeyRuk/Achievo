import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { Horizon } from "@stellar/stellar-sdk";
import {
  FRIENDBOT_ENABLED,
  HORIZON_URL,
  NETWORK_PASSPHRASE,
  STELLAR_NETWORK,
} from "@achievo/shared";
import { clearIdentitySession } from "../../shared/lib/sessionIdentity";

/** Cached SEP-10 JWT for reward submissions (session-scoped). */
const SEP10_TOKEN_KEY = "achievo_sep10_token";

export function getSep10Token(): string | undefined {
  try {
    return sessionStorage.getItem(SEP10_TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function setSep10Token(token: string): void {
  try {
    sessionStorage.setItem(SEP10_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearSep10Token(): void {
  try {
    sessionStorage.removeItem(SEP10_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export const horizonServer = new Horizon.Server(HORIZON_URL);

const kitNetwork =
  STELLAR_NETWORK === "public" ? Networks.PUBLIC : Networks.TESTNET;

// Initialize the static Stellar Wallets Kit
StellarWalletsKit.init({
  modules: defaultModules(),
  network: kitNetwork,
});

/** Re-request Freighter/site access and confirm the configured network before signing. */
export async function ensureWalletSession(walletId: string): Promise<string> {
  StellarWalletsKit.setWallet(walletId);
  const { address } = await StellarWalletsKit.fetchAddress();
  const network = await StellarWalletsKit.getNetwork();
  if (network.networkPassphrase !== NETWORK_PASSPHRASE) {
    const label = STELLAR_NETWORK === "public" ? "Mainnet (Public)" : "Testnet";
    throw new Error(
      `Freighter must be on Stellar ${label}. Open Freighter → Settings → Network → ${label}, then reconnect.`,
    );
  }
  return address;
}

export async function clearWalletSession(): Promise<void> {
  try {
    await StellarWalletsKit.disconnect();
  } catch {
    /* ignore */
  }
  localStorage.removeItem('achievo_wallet_id');
  clearSep10Token();
  clearIdentitySession();
}

export { StellarWalletsKit, Networks };

/**
 * Fetches the native XLM balance for a public key.
 * If the account does not exist (404), returns "0" and indicates unfunded.
 */
export async function getXlmBalance(publicKey: string): Promise<{ balance: string; isFunded: boolean }> {
  try {
    const account = await horizonServer.loadAccount(publicKey);
    const nativeBalance = account.balances.find((b) => b.asset_type === "native");
    return {
      balance: nativeBalance ? nativeBalance.balance : "0.0000000",
      isFunded: true
    };
  } catch (error) {
    // 404 indicates the account has not been funded yet
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 404) {
      return { balance: "0.0000000", isFunded: false };
    }
    throw error;
  }
}

/**
 * Funds a public key using the Stellar Testnet Friendbot faucet.
 * No-op / throws on public network.
 */
export async function fundWithFriendbot(publicKey: string): Promise<void> {
  if (!FRIENDBOT_ENABLED) {
    throw new Error('Friendbot is only available on Stellar Testnet.');
  }
  const response = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Friendbot funding failed");
  }
}

/** Sign a SEP-10 challenge XDR on the configured network. */
export async function signChallengeXdr(walletId: string, challengeXdr: string): Promise<string> {
  const signingAddress = await ensureWalletSession(walletId);
  const signResult = await StellarWalletsKit.signTransaction(challengeXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: signingAddress,
  });
  return signResult.signedTxXdr;
}
