import { readFile } from 'node:fs/promises';

const contractPath = 'contract/src/lib.rs';
const frontendContractPath = 'frontend/src/contract.ts';
const walletPath = 'frontend/src/wallet.ts';
const rewardApiPath = 'api/reward.ts';

const [rust, frontend, wallet, rewardApi] = await Promise.all([
  readFile(contractPath, 'utf8'),
  readFile(frontendContractPath, 'utf8'),
  readFile(walletPath, 'utf8'),
  readFile(rewardApiPath, 'utf8'),
]);

// These are the contract methods intentionally bound by the application. Keeping
// the mapping here makes a Rust rename fail CI instead of failing after deploy.
const bindings = {
  send_reward: ['frontend', 'api'],
  get_balance: ['frontend'],
  get_admin: ['frontend'],
  get_disbursed: ['frontend'],
  get_history: ['frontend'],
};

const sources = { frontend, api: rewardApi };
const errors = [];

for (const [functionName, consumers] of Object.entries(bindings)) {
  const rustExport = new RegExp(`pub\\s+fn\\s+${functionName}\\s*\\(`);
  if (!rustExport.test(rust)) {
    errors.push(`${contractPath} does not export ${functionName}()`);
  }

  for (const consumer of consumers) {
    const quotedName = new RegExp(`["']${functionName}["']`);
    if (!quotedName.test(sources[consumer])) {
      errors.push(`${consumer} integration does not call ${functionName}()`);
    }
  }
}

if (!frontend.includes('@stellar/stellar-sdk')) {
  errors.push(`${frontendContractPath} must use @stellar/stellar-sdk`);
}
if (!frontend.includes('StellarWalletsKit.signTransaction')) {
  errors.push(`${frontendContractPath} must sign contract transactions through StellarWalletsKit`);
}
if (!wallet.includes('@creit.tech/stellar-wallets-kit')) {
  errors.push(`${walletPath} must configure StellarWalletsKit`);
}
if (!wallet.includes('Networks.TESTNET')) {
  errors.push(`${walletPath} must explicitly select Stellar Testnet`);
}

if (errors.length > 0) {
  console.error('Contract/frontend integration check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Contract/frontend integration verified: ${Object.keys(bindings).join(', ')}`,
);
