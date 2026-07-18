import { readFile } from 'node:fs/promises';

const contractPath = 'contract/src/lib.rs';
const stellarViewsPath = 'packages/stellar/src/views.ts';
const walletPath = 'frontend/src/wallet.ts';
const rewardApiPath = 'api/reward.ts';

const [rust, stellarViews, wallet, rewardApi] = await Promise.all([
  readFile(contractPath, 'utf8'),
  readFile(stellarViewsPath, 'utf8'),
  readFile(walletPath, 'utf8'),
  readFile(rewardApiPath, 'utf8'),
]);

const bindings = {
  send_reward: ['api'],
  get_balance: ['stellar'],
  get_admin: ['stellar'],
  get_disbursed: ['stellar'],
  get_history: ['stellar'],
};

// Daily-cap views are contract-authoritative; API enforces Redis budgets separately.
const rustOnlyExports = ['get_daily_disbursed', 'get_recipient_daily', 'get_day'];

const sources = { stellar: stellarViews, api: rewardApi };
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

if (!stellarViews.includes('@stellar/stellar-sdk')) {
  errors.push(`${stellarViewsPath} must use @stellar/stellar-sdk`);
}
if (!wallet.includes('@creit.tech/stellar-wallets-kit')) {
  errors.push(`${walletPath} must configure StellarWalletsKit`);
}
if (!wallet.includes('Networks.TESTNET')) {
  errors.push(`${walletPath} must explicitly select Stellar Testnet`);
}
if (!rewardApi.includes("'send_reward'") && !rewardApi.includes('"send_reward"')) {
  errors.push(`${rewardApiPath} must call send_reward`);
}
if (!rewardApi.includes('HeuristicScoringAgent') || !rewardApi.includes('reserveBudget')) {
  errors.push(`${rewardApiPath} must use heuristic fallback and daily budget reservation`);
}
for (const fn of rustOnlyExports) {
  const rustExport = new RegExp(`pub\\s+fn\\s+${fn}\\s*\\(`);
  if (!rustExport.test(rust)) {
    errors.push(`${contractPath} does not export ${fn}()`);
  }
}

if (errors.length > 0) {
  console.error('Contract/frontend integration check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Contract integration verified: ${Object.keys(bindings).join(', ')}`,
);
