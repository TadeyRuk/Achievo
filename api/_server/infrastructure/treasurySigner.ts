import type { RewardActivity } from '@achievo/contracts';
import { createHmac, randomBytes } from 'crypto';
import { submitClaimReward, type SubmitRewardResult } from './stellar';
import {
  attestorConfigured,
  mintRewardVoucher,
  type RewardVoucher,
} from './voucher';

export type SignRewardInput = {
  wallet: string;
  rewardXlm: number;
  activity: RewardActivity;
};

function remoteSignerConfigured(): boolean {
  return Boolean(process.env.SIGNER_URL?.trim() && process.env.SIGNER_HMAC_SECRET?.trim());
}

export function treasurySignerConfigured(): boolean {
  return (
    attestorConfigured() &&
    (remoteSignerConfigured() || Boolean(process.env.ADMIN_SECRET?.trim()))
  );
}

function signServiceRequest(body: string, timestamp: string, nonce: string): string {
  const secret = process.env.SIGNER_HMAC_SECRET!.trim();
  const bodyHash = createHmac('sha256', secret).update(body).digest('hex');
  return createHmac('sha256', secret)
    .update(`${timestamp}.${nonce}.${bodyHash}`)
    .digest('hex');
}

async function submitViaRemoteSigner(
  input: SignRewardInput,
  voucher: Pick<RewardVoucher, 'claimIdHex' | 'expiry' | 'signatureHex'>,
): Promise<SubmitRewardResult> {
  const base = process.env.SIGNER_URL!.trim().replace(/\/$/, '');
  const timestamp = String(Date.now());
  const nonce = randomBytes(12).toString('hex');
  const body = JSON.stringify({
    wallet: input.wallet,
    rewardXlm: input.rewardXlm,
    activity: input.activity,
    claimIdHex: voucher.claimIdHex,
    expiry: voucher.expiry,
    signatureHex: voucher.signatureHex,
  });
  const signature = signServiceRequest(body, timestamp, nonce);
  const response = await fetch(`${base}/api/sign-reward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Achievo-Timestamp': timestamp,
      'X-Achievo-Nonce': nonce,
      'X-Achievo-Signature': signature,
    },
    body,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    txHash?: string;
    pending?: boolean;
    error?: string;
    status?: number;
  };
  if (response.status === 202 || payload.pending) {
    return {
      ok: false,
      pending: true,
      txHash: payload.txHash ?? '',
      error: payload.error ?? 'Transaction submitted; confirmation pending reconciliation.',
    };
  }
  if (!response.ok || !payload.ok || !payload.txHash) {
    return {
      ok: false,
      status: payload.status ?? response.status,
      error: payload.error ?? 'Signer service rejected the payout.',
    };
  }
  return { ok: true, txHash: payload.txHash };
}

async function submitViaLocalRelayer(
  input: SignRewardInput,
  voucher: Pick<RewardVoucher, 'claimId' | 'expiry' | 'signature'>,
): Promise<SubmitRewardResult> {
  const relayerSecret = process.env.ADMIN_SECRET?.trim();
  if (!relayerSecret) {
    return { ok: false, status: 503, error: 'ADMIN_SECRET (relayer) is not configured.' };
  }
  return submitClaimReward({
    relayerSecret,
    wallet: input.wallet,
    rewardXlm: input.rewardXlm,
    activity: input.activity,
    claimId: voucher.claimId,
    expiry: voucher.expiry,
    signature: voucher.signature,
  });
}

/**
 * Mint an attestor voucher, then submit claim_reward via local relayer or remote signer.
 * ADMIN_SECRET is the fee-paying relayer key — not sufficient alone to invent payouts.
 */
export async function signAndSubmitReward(input: SignRewardInput): Promise<SubmitRewardResult> {
  if (!attestorConfigured()) {
    return { ok: false, status: 503, error: 'ATTESTOR_SECRET is not configured.' };
  }

  let voucher: RewardVoucher;
  try {
    voucher = mintRewardVoucher(input);
  } catch (cause) {
    return {
      ok: false,
      status: 503,
      error: cause instanceof Error ? cause.message : 'Failed to mint reward voucher.',
    };
  }

  if (remoteSignerConfigured()) {
    return submitViaRemoteSigner(input, voucher);
  }
  return submitViaLocalRelayer(input, voucher);
}
