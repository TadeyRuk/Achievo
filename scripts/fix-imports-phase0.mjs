#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, readdirSync, renameSync, mkdirSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';

const root = process.cwd();

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function move(src, dest) {
  if (!existsSync(src) || existsSync(dest)) return;
  mkdirSync(dirname(dest), { recursive: true });
  renameSync(src, dest);
}

// leftovers
move('frontend/src/AppShell.tsx', 'frontend/src/app/AppShell.tsx');
move('frontend/src/BadgeCollection.tsx', 'frontend/src/features/profile/BadgeCollection.tsx');
if (existsSync('frontend/src/wallet')) {
  for (const name of readdirSync('frontend/src/wallet')) {
    move(join('frontend/src/wallet', name), join('frontend/src/features/wallet', name));
  }
}

const destByBase = {
  main: 'app/main', App: 'app/App', AppShell: 'app/AppShell', SplashScreen: 'app/SplashScreen', Login: 'app/Login',
  ActivityForm: 'features/earn/ActivityForm', PipelineVisualizer: 'features/earn/PipelineVisualizer',
  agents: 'features/earn/agents', rewardBreakdown: 'features/earn/rewardBreakdown', progression: 'features/earn/progression',
  RewardHistory: 'features/history/RewardHistory', RewardCard: 'features/history/RewardCard',
  WalletProfile: 'features/wallet/WalletProfile', wallet: 'features/wallet/wallet',
  WeeklyEarningsTrendChart: 'features/wallet/WeeklyEarningsTrendChart',
  WalletConnectSection: 'features/wallet/WalletConnectSection', WalletBalanceHero: 'features/wallet/WalletBalanceHero',
  WalletWeeklyTrend: 'features/wallet/WalletWeeklyTrend', WalletFundPrompt: 'features/wallet/WalletFundPrompt',
  WalletPerformanceSection: 'features/wallet/WalletPerformanceSection', TreasuryStatsBlock: 'features/wallet/TreasuryStatsBlock',
  walletMeta: 'features/wallet/walletMeta',
  StudentProfile: 'features/profile/StudentProfile', BadgeCollection: 'features/profile/BadgeCollection',
  avatarOptions: 'features/profile/avatarOptions', AvatarPickerModal: 'features/profile/AvatarPickerModal',
  userIdentity: 'features/profile/userIdentity', ReferFriend: 'features/profile/ReferFriend',
  TransactionFeedback: 'features/feedback/TransactionFeedback', transactionFeedback: 'features/feedback/transactionFeedback',
  GeneralFeedback: 'features/feedback/GeneralFeedback', generalFeedback: 'features/feedback/generalFeedback',
  FeedbackRatingRow: 'features/feedback/FeedbackRatingRow', FeedbackThankYou: 'features/feedback/FeedbackThankYou',
  Dashboard: 'features/dashboard/Dashboard',
  Navbar: 'shared/ui/Navbar', BottomNav: 'shared/ui/BottomNav', IOSSheet: 'shared/ui/IOSSheet',
  liquidGlass: 'shared/ui/liquidGlass', InfoSheet: 'shared/ui/InfoSheet', customIcons: 'shared/ui/customIcons',
  sheetMotion: 'shared/lib/sheetMotion', sessionIdentity: 'shared/lib/sessionIdentity', contract: 'shared/lib/contract',
  useOnboarding: 'features/onboarding/useOnboarding', OnboardingWelcome: 'features/onboarding/OnboardingWelcome',
  OnboardingTour: 'features/onboarding/OnboardingTour', tourSteps: 'features/onboarding/tourSteps', storage: 'features/onboarding/storage',
};

let changed = 0;
for (const file of walk('frontend/src')) {
  let src = readFileSync(file, 'utf8');
  const orig = src;
  const fileDir = dirname(file);
  src = src.replace(/from\s+['"](\.[^'"]+)['"]/g, (match, importPath) => {
    const clean = importPath.replace(/\\/g, '/');
    if (clean.includes('agents/progression')) {
      const target = join('frontend/src', destByBase.progression);
      let rel = relative(fileDir, target).replace(/\\/g, '/');
      if (!rel.startsWith('.')) rel = `./${rel}`;
      return `from '${rel}'`;
    }
    const base = basename(clean).replace(/\.(ts|tsx)$/, '');
    if (!destByBase[base] || !clean.startsWith('.')) return match;
    const target = join('frontend/src', destByBase[base]);
    let rel = relative(fileDir, target).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return `from '${rel}'`;
  });
  if (src !== orig) {
    writeFileSync(file, src);
    changed++;
  }
}

let html = readFileSync('frontend/index.html', 'utf8');
html = html.replace('/src/main.tsx', '/src/app/main.tsx');
writeFileSync('frontend/index.html', html);

for (const f of ['frontend/src/app/App.tsx', 'frontend/src/app/AppShell.tsx']) {
  if (!existsSync(f)) continue;
  let s = readFileSync(f, 'utf8');
  s = s.replace(/from '\.\/hooks\//g, "from '../hooks/");
  writeFileSync(f, s);
}
if (existsSync('frontend/src/app/main.tsx')) {
  let s = readFileSync('frontend/src/app/main.tsx', 'utf8');
  s = s.replace("import './index.css'", "import '../index.css'");
  writeFileSync('frontend/src/app/main.tsx', s);
}

const rewrites = [
  ['api/reward.ts', [
    ['./_lib/intent', './_lib/payout/intent'],
    ['./_lib/telegram', './_lib/notify/telegram'],
    ['./_lib/challenge', './_lib/payout/challenge'],
    ['./_lib/evaluateSubmission', './_lib/payout/evaluateSubmission'],
    ['./_lib/dailyBudgets', './_lib/payout/dailyBudgets'],
    ['./_lib/rateClaims', './_lib/payout/rateClaims'],
    ['./_lib/submitReward', './_lib/payout/submitReward'],
  ]],
  ['api/nonce.ts', [
    ['./_lib/intent', './_lib/payout/intent'],
    ['./_lib/stellarServers', './_lib/payout/stellarServers'],
  ]],
  ['api/payouts.ts', [['./_lib/telegram', './_lib/notify/telegram']]],
  ['api/feedback.ts', [['./_lib/googleForms', './_lib/notify/googleForms']]],
  ['api/feedback-general.ts', [['./_lib/googleForms', './_lib/notify/googleForms']]],
];
for (const [file, pairs] of rewrites) {
  if (!existsSync(file)) continue;
  let s = readFileSync(file, 'utf8');
  for (const [a, b] of pairs) s = s.split(`'${a}'`).join(`'${b}'`);
  writeFileSync(file, s);
}

for (const [file, from, to] of [
  ['api/_lib/payout/rateClaims.ts', "'./store'", "'../store'"],
  ['api/_lib/payout/rateClaims.ts', "'./identity'", "'../identity'"],
  ['api/_lib/payout/dailyBudgets.ts', "'./store'", "'../store'"],
  ['api/_lib/identity/identity.ts', "'./store'", "'../store'"],
  ['api/_lib/payout/evaluateSubmission.ts', "'../_agents/", "'../../_agents/"],
]) {
  if (!existsSync(file)) continue;
  let s = readFileSync(file, 'utf8');
  writeFileSync(file, s.split(from).join(to));
}

if (existsSync('api/__tests__')) {
  for (const f of readdirSync('api/__tests__')) {
    const p = join('api/__tests__', f);
    let s = readFileSync(p, 'utf8');
    writeFileSync(p, s.replaceAll('../_lib/googleForms', '../_lib/notify/googleForms'));
  }
}

// update check-contract paths
if (existsSync('scripts/check-contract-integration.mjs')) {
  let s = readFileSync('scripts/check-contract-integration.mjs', 'utf8');
  s = s
    .replaceAll('frontend/src/wallet.ts', 'frontend/src/features/wallet/wallet.ts')
    .replaceAll('api/_lib/submitReward.ts', 'api/_lib/payout/submitReward.ts')
    .replaceAll('api/_lib/evaluateSubmission.ts', 'api/_lib/payout/evaluateSubmission.ts')
    .replaceAll('api/_lib/dailyBudgets.ts', 'api/_lib/payout/dailyBudgets.ts');
  writeFileSync('scripts/check-contract-integration.mjs', s);
}

console.log('import fix done; frontend files touched:', changed);
