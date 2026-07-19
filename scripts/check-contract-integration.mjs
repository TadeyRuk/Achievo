import { readFile } from 'node:fs/promises';

const contractPath = 'contract/src/lib.rs';
const stellarViewsPath = 'packages/stellar/src/views.ts';
const walletPath = 'frontend/src/features/wallet/wallet.ts';
const submitRewardPath = 'api/_server/infrastructure/stellar.ts';
const evaluatePath = 'api/_server/infrastructure/evaluator.ts';
const budgetsPath = 'api/_server/infrastructure/rewards.ts';
const rewardRoutePath = 'api/_server/features/rewards/routes.ts';

const [rust, stellarViews, wallet, submitReward, evaluate, budgets, rewardRoute] = await Promise.all([
  readFile(contractPath, 'utf8'),
  readFile(stellarViewsPath, 'utf8'),
  readFile(walletPath, 'utf8'),
  readFile(submitRewardPath, 'utf8'),
  readFile(evaluatePath, 'utf8'),
  readFile(budgetsPath, 'utf8'),
  readFile(rewardRoutePath, 'utf8'),
]);

const bindings = {
  claim_reward: ['submit'],
  get_balance: ['stellar'],
  get_admin: ['stellar'],
  get_disbursed: ['stellar'],
  get_history: ['stellar'],
  get_daily_disbursed: ['stellar'],
  get_recipient_daily: ['stellar'],
  get_day: ['stellar'],
};

const sources = { stellar: stellarViews, submit: submitReward };
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
if (!wallet.includes('signChallengeXdr')) {
  errors.push(`${walletPath} must export signChallengeXdr`);
}
if (!evaluate.includes('HeuristicScoringAgent')) {
  errors.push(`${evaluatePath} must use heuristic fallback`);
}
if (!evaluate.includes('ScoringAgent.evaluate')) {
  errors.push(`${evaluatePath} must attempt primary scoring before fallback`);
}
if (!budgets.includes('reserveBudget')) {
  errors.push(`${budgetsPath} must reserve daily budgets`);
}
if (!budgets.includes('releaseDailyBudgets')) {
  errors.push(`${budgetsPath} must support daily budget cleanup`);
}
if (!budgets.includes('budget:treasury:day:') || !budgets.includes('budget:recipient:day:')) {
  errors.push(`${budgetsPath} must preserve treasury and recipient budget keys`);
}
if (!rewardRoute.includes('claimRates(request.clientIp, wallet)')) {
  errors.push(`${rewardRoutePath} must pass normalized clientIp into reward rate claims`);
}
if (!submitReward.includes('prepareTransaction') || !submitReward.includes('sendTransaction')) {
  errors.push(`${submitRewardPath} must prepare and submit Stellar reward transactions`);
}

if (errors.length > 0) {
  console.error('Contract/frontend integration check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Contract integration verified: ${Object.keys(bindings).join(', ')}`);
