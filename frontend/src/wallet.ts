import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { Horizon } from "@stellar/stellar-sdk";

// Initialize the Horizon server for Testnet
export const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");

// Initialize the static Stellar Wallets Kit
StellarWalletsKit.init({
  modules: defaultModules(),
  network: Networks.TESTNET,
});

export { StellarWalletsKit, Networks };

/**
 * Fetches the native XLM balance for a public key on the testnet.
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
  } catch (error: any) {
    // 404 indicates the account has not been funded yet
    if (error.response && error.response.status === 404) {
      return { balance: "0.0000000", isFunded: false };
    }
    throw error;
  }
}

/**
 * Funds a public key using the Stellar Testnet Friendbot faucet.
 */
export async function fundWithFriendbot(publicKey: string): Promise<void> {
  const response = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Friendbot funding failed");
  }
}
