#!/usr/bin/env node
/**
 * Mechanical Phase 0 layout move. Idempotent where possible.
 */
import { mkdirSync, renameSync, existsSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';

const root = process.cwd();

function move(src, dest) {
  const from = join(root, src);
  const to = join(root, dest);
  if (!existsSync(from)) {
    console.log('skip', src);
    return;
  }
  if (existsSync(to)) {
    console.log('exists', dest);
    return;
  }
  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);
  console.log('moved', src, '->', dest);
}

function moveDirContents(srcDir, destDir) {
  const from = join(root, srcDir);
  if (!existsSync(from)) return;
  mkdirSync(join(root, destDir), { recursive: true });
  for (const name of readdirSync(from)) {
    move(join(srcDir, name), join(destDir, name));
  }
  try {
    rmSync(from, { recursive: true });
  } catch {
    /* ignore */
  }
}

// --- frontend ---
const fe = [
  ['frontend/src/main.tsx', 'frontend/src/app/main.tsx'],
  ['frontend/src/App.tsx', 'frontend/src/app/App.tsx'],
  ['frontend/src/AppShell.tsx', 'frontend/src/app/AppShell.tsx'],
  ['frontend/src/App.css', 'frontend/src/app/App.css'],
  ['frontend/src/SplashScreen.tsx', 'frontend/src/app/SplashScreen.tsx'],
  ['frontend/src/Login.tsx', 'frontend/src/app/Login.tsx'],
  ['frontend/src/ActivityForm.tsx', 'frontend/src/features/earn/ActivityForm.tsx'],
  ['frontend/src/PipelineVisualizer.tsx', 'frontend/src/features/earn/PipelineVisualizer.tsx'],
  ['frontend/src/agents.ts', 'frontend/src/features/earn/agents.ts'],
  ['frontend/src/rewardBreakdown.ts', 'frontend/src/features/earn/rewardBreakdown.ts'],
  ['frontend/src/agents/progression.ts', 'frontend/src/features/earn/progression.ts'],
  ['frontend/src/RewardHistory.tsx', 'frontend/src/features/history/RewardHistory.tsx'],
  ['frontend/src/RewardCard.tsx', 'frontend/src/features/history/RewardCard.tsx'],
  ['frontend/src/WalletProfile.tsx', 'frontend/src/features/wallet/WalletProfile.tsx'],
  ['frontend/src/wallet.ts', 'frontend/src/features/wallet/wallet.ts'],
  ['frontend/src/WeeklyEarningsTrendChart.tsx', 'frontend/src/features/wallet/WeeklyEarningsTrendChart.tsx'],
  ['frontend/src/StudentProfile.tsx', 'frontend/src/features/profile/StudentProfile.tsx'],
  ['frontend/src/BadgeCollection.tsx', 'frontend/src/features/profile/BadgeCollection.tsx'],
  ['frontend/src/avatarOptions.ts', 'frontend/src/features/profile/avatarOptions.ts'],
  ['frontend/src/AvatarPickerModal.tsx', 'frontend/src/features/profile/AvatarPickerModal.tsx'],
  ['frontend/src/userIdentity.ts', 'frontend/src/features/profile/userIdentity.ts'],
  ['frontend/src/ReferFriend.tsx', 'frontend/src/features/profile/ReferFriend.tsx'],
  ['frontend/src/TransactionFeedback.tsx', 'frontend/src/features/feedback/TransactionFeedback.tsx'],
  ['frontend/src/transactionFeedback.ts', 'frontend/src/features/feedback/transactionFeedback.ts'],
  ['frontend/src/GeneralFeedback.tsx', 'frontend/src/features/feedback/GeneralFeedback.tsx'],
  ['frontend/src/generalFeedback.ts', 'frontend/src/features/feedback/generalFeedback.ts'],
  ['frontend/src/FeedbackRatingRow.tsx', 'frontend/src/features/feedback/FeedbackRatingRow.tsx'],
  ['frontend/src/FeedbackThankYou.tsx', 'frontend/src/features/feedback/FeedbackThankYou.tsx'],
  ['frontend/src/Dashboard.tsx', 'frontend/src/features/dashboard/Dashboard.tsx'],
  ['frontend/src/Navbar.tsx', 'frontend/src/shared/ui/Navbar.tsx'],
  ['frontend/src/BottomNav.tsx', 'frontend/src/shared/ui/BottomNav.tsx'],
  ['frontend/src/IOSSheet.tsx', 'frontend/src/shared/ui/IOSSheet.tsx'],
  ['frontend/src/liquidGlass.tsx', 'frontend/src/shared/ui/liquidGlass.tsx'],
  ['frontend/src/InfoSheet.tsx', 'frontend/src/shared/ui/InfoSheet.tsx'],
  ['frontend/src/customIcons.tsx', 'frontend/src/shared/ui/customIcons.tsx'],
  ['frontend/src/sheetMotion.ts', 'frontend/src/shared/lib/sheetMotion.ts'],
  ['frontend/src/sessionIdentity.ts', 'frontend/src/shared/lib/sessionIdentity.ts'],
  ['frontend/src/contract.ts', 'frontend/src/shared/lib/contract.ts'],
];

for (const [a, b] of fe) move(a, b);
moveDirContents('frontend/src/wallet', 'frontend/src/features/wallet');
moveDirContents('frontend/src/onboarding', 'frontend/src/features/onboarding');
try {
  rmSync(join(root, 'frontend/src/agents'), { recursive: true });
} catch {
  /* ignore */
}

// --- api/_lib ---
const storeFiles = ['storeRedis', 'storeClaims', 'storeLists', 'storeBudgets', 'storeJson'];
for (const f of storeFiles) move(`api/_lib/${f}.ts`, `api/_lib/store/${f}.ts`);
if (existsSync(join(root, 'api/_lib/store.ts')) && !existsSync(join(root, 'api/_lib/store/index.ts'))) {
  writeFileSync(
    join(root, 'api/_lib/store/index.ts'),
    `export { StoreUnavailableError, requireStore, getRedis } from './storeRedis';
export { getTimestamp, setTimestamp, claimOnce, releaseClaim, exists } from './storeClaims';
export { addRecent, listRecent, appendPayout, listPayouts } from './storeLists';
export { incrBy, reserveBudget } from './storeBudgets';
export { getJson, setJson } from './storeJson';
`,
  );
  rmSync(join(root, 'api/_lib/store.ts'));
}

const payoutFiles = [
  'submitReward',
  'dailyBudgets',
  'rateClaims',
  'evaluateSubmission',
  'challenge',
  'intent',
  'stellarServers',
];
for (const f of payoutFiles) move(`api/_lib/${f}.ts`, `api/_lib/payout/${f}.ts`);
writeFileSync(
  join(root, 'api/_lib/payout/index.ts'),
  payoutFiles.map((f) => `export * from './${f}';\n`).join(''),
);

move('api/_lib/identity.ts', 'api/_lib/identity/identity.ts');
writeFileSync(join(root, 'api/_lib/identity/index.ts'), `export * from './identity';\n`);

move('api/_lib/telegram.ts', 'api/_lib/notify/telegram.ts');
move('api/_lib/googleForms.ts', 'api/_lib/notify/googleForms.ts');
writeFileSync(
  join(root, 'api/_lib/notify/index.ts'),
  `export * from './telegram';\nexport * from './googleForms';\n`,
);

console.log('phase0 moves done');
