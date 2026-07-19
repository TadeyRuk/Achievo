import { createHash, randomBytes } from 'crypto';
import { Address, Keypair, nativeToScVal } from '@stellar/stellar-sdk';
import { CONTRACT_ID, xlmToStroops } from '@achievo/shared';
import type { RewardActivity } from '@achievo/contracts';

const VOUCHER_PREFIX = Buffer.from('achievo-voucher-v1|');
const PIPE = Buffer.from('|');
const VOUCHER_TTL_SECONDS = 10 * 60;

export type RewardVoucher = {
  claimId: Buffer;
  claimIdHex: string;
  expiry: number;
  signature: Buffer;
  signatureHex: string;
  attestorPublicKey: Buffer;
};

function i128ToBeBytes(value: bigint): Buffer {
  if (value < 0n) throw new Error('Voucher amount must be non-negative.');
  const buf = Buffer.alloc(16);
  let n = value;
  for (let i = 15; i >= 0; i--) {
    buf[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return buf;
}

function u64ToBeBytes(value: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(value));
  return buf;
}

/**
 * Canonical voucher payload — must match `voucher_message` in contract/src/lib.rs.
 */
export function buildVoucherMessage(params: {
  contractId?: string;
  wallet: string;
  rewardXlm: number;
  activity: string;
  claimId: Buffer;
  expiry: number;
}): Buffer {
  if (params.claimId.length !== 32) {
    throw new Error('claimId must be 32 bytes.');
  }
  const contractId = params.contractId ?? CONTRACT_ID;
  const amountStroops = xlmToStroops(params.rewardXlm);
  return Buffer.concat([
    VOUCHER_PREFIX,
    Address.fromString(contractId).toScVal().toXDR(),
    PIPE,
    Address.fromString(params.wallet).toScVal().toXDR(),
    PIPE,
    i128ToBeBytes(amountStroops),
    PIPE,
    nativeToScVal(params.activity, { type: 'symbol' }).toXDR(),
    PIPE,
    params.claimId,
    PIPE,
    u64ToBeBytes(params.expiry),
  ]);
}

export function attestorConfigured(): boolean {
  return Boolean(process.env.ATTESTOR_SECRET?.trim());
}

export function mintRewardVoucher(input: {
  wallet: string;
  rewardXlm: number;
  activity: RewardActivity;
  claimId?: Buffer;
  expiry?: number;
}): RewardVoucher {
  const secret = process.env.ATTESTOR_SECRET?.trim();
  if (!secret) {
    throw new Error('ATTESTOR_SECRET is not configured.');
  }
  const attestor = Keypair.fromSecret(secret);
  const claimId = input.claimId ?? randomBytes(32);
  const expiry = input.expiry ?? Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS;
  const message = buildVoucherMessage({
    wallet: input.wallet,
    rewardXlm: input.rewardXlm,
    activity: input.activity,
    claimId,
    expiry,
  });
  const signature = attestor.sign(message);
  return {
    claimId,
    claimIdHex: claimId.toString('hex'),
    expiry,
    signature,
    signatureHex: signature.toString('hex'),
    attestorPublicKey: Buffer.from(attestor.rawPublicKey()),
  };
}

/** Test helper: digest of the voucher message (not used on-chain). */
export function voucherMessageDigest(message: Buffer): string {
  return createHash('sha256').update(message).digest('hex');
}
