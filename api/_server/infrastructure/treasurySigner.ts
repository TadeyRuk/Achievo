import type { RewardActivity } from '@achievo/contracts';
import { createHmac, randomBytes } from 'crypto';
import { submitSendReward, type SubmitRewardResult } from './stellar';

export type SignRewardInput = {
  wallet: string;
  rewardXlm: number;
  activity: RewardActivity;
};

function remoteSignerConfigured(): boolean {
  return Boolean(process.env.SIGNER_URL?.trim() && process.env.SIGNER_HMAC_SECRET?.trim());
}

export function treasurySignerConfigured(): boolean {
  if (remoteSignerConfigured()) return true;
  return Boolean(process.env.ADMIN_SECRET?.trim());
}

function signServiceRequest(body: string, timestamp: string, nonce: string): string {
  const secret = process.env.SIGNER_HMAC_SECRET!.trim();
  const bodyHash = createHmac('sha256', secret).update(body).digest('hex');
  return createHmac('sha256', secret)
    .update(`${timestamp}.${nonce}.${bodyHash}`)
    .digest('hex');
}

async function submitViaRemoteSigner(input: SignRewardInput): Promise<SubmitRewardResult> {
  const base = process.env.SIGNER_URL!.trim().replace(/\/$/, '');
  const timestamp = String(Date.now());
  const nonce = randomBytes(12).toString('hex');
  const body = JSON.stringify({
    wallet: input.wallet,
    rewardXlm: input.rewardXlm,
    activity: input.activity,
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

async function submitViaLocalAdmin(input: SignRewardInput): Promise<SubmitRewardResult> {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (!adminSecret) {
    return { ok: false, status: 503, error: 'ADMIN_SECRET is not configured.' };
  }
  return submitSendReward({
    adminSecret,
    wallet: input.wallet,
    rewardXlm: input.rewardXlm,
    activity: input.activity,
  });
}

/** Phase 1 local / Phase 2 remote TreasurySigner adapter. */
export async function signAndSubmitReward(input: SignRewardInput): Promise<SubmitRewardResult> {
  if (remoteSignerConfigured()) return submitViaRemoteSigner(input);
  return submitViaLocalAdmin(input);
}
