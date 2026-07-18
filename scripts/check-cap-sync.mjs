import { readFile } from 'node:fs/promises';

const rustPath = 'contract/src/lib.rs';
const capsPath = 'packages/shared/src/caps.ts';
const constantsPath = 'packages/shared/src/constants.ts';

const [rust, caps, constants] = await Promise.all([
  readFile(rustPath, 'utf8'),
  readFile(capsPath, 'utf8'),
  readFile(constantsPath, 'utf8'),
]);

function rustConst(name) {
  const m = rust.match(new RegExp(`const\\s+${name}\\s*:\\s*i128\\s*=\\s*([0-9_]+)`));
  if (!m) throw new Error(`${rustPath}: missing ${name}`);
  return Number(m[1].replaceAll('_', ''));
}

function tsExportNumber(src, name) {
  const m = src.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*([0-9_]+)`));
  if (!m) throw new Error(`missing ${name}`);
  return Number(m[1].replaceAll('_', ''));
}

const stroopFactor = tsExportNumber(constants, 'STROOP_FACTOR');
const maxTxXlm = tsExportNumber(caps, 'MAX_REWARD_PER_TX_XLM');
const treasuryXlm = tsExportNumber(caps, 'DAILY_TREASURY_CAP_XLM');
const recipientXlm = tsExportNumber(caps, 'DAILY_RECIPIENT_CAP_XLM');

const pairs = [
  ['MAX_REWARD_PER_TX', maxTxXlm * stroopFactor],
  ['MAX_DAILY_TREASURY', treasuryXlm * stroopFactor],
  ['MAX_DAILY_PER_RECIPIENT', recipientXlm * stroopFactor],
];

const errors = [];
for (const [rustName, expected] of pairs) {
  const actual = rustConst(rustName);
  if (actual !== expected) {
    errors.push(`${rustName}: contract=${actual} shared=${expected}`);
  }
}

if (errors.length) {
  console.error('Cap sync check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(
  `Cap sync OK: per-tx ${maxTxXlm} XLM, treasury/day ${treasuryXlm} XLM, recipient/day ${recipientXlm} XLM`,
);
