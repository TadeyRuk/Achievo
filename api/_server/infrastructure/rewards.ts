import {
  DAILY_RECIPIENT_CAP_XLM,
  DAILY_TREASURY_CAP_XLM,
  utcDayKey,
} from '@achievo/shared';
import {
  claimOnce,
  getJson,
  releaseClaim,
  reserveBudget,
  setJson,
} from './store';
import { getIdentityByWallet } from './identity';

const RATE_LIMIT_TTL_SECONDS = 24 * 60 * 60;
const BUDGET_TTL_SECONDS = 48 * 60 * 60;
const PENDING_KEY = 'payouts:pending_reconcile';

export type RateClaimSet = {
  walletKey: string;
  ipKey: string | null;
  identityKey: string | null;
};

export type BudgetReservation = {
  treasuryKey: string;
  recipientKey: string;
  units: number;
};

export type PendingPayout = {
  txHash: string;
  wallet: string;
  rewardXlm: number;
  activity: string;
  createdAt: string;
};

export async function claimRewardRates(
  clientIp: string,
  wallet: string,
): Promise<
  | { ok: true; claims: RateClaimSet }
  | { ok: false; status: 429; error: string; claims: Partial<RateClaimSet> }
> {
  const walletKey = `rate:wallet:${wallet}`;
  if (!(await claimOnce(walletKey, RATE_LIMIT_TTL_SECONDS))) {
    return {
      ok: false,
      status: 429,
      error: 'Rate limit: 1 reward per day. Try again tomorrow.',
      claims: {},
    };
  }

  let ipKey: string | null = null;
  if (clientIp !== 'unknown') {
    ipKey = `rate:ip:${clientIp}`;
    if (!(await claimOnce(ipKey, RATE_LIMIT_TTL_SECONDS))) {
      await releaseClaim(walletKey);
      return {
        ok: false,
        status: 429,
        error: 'Rate limit reached for your IP. Try again tomorrow.',
        claims: {},
      };
    }
  }

  let identityKey: string | null = null;
  try {
    const identity = await getIdentityByWallet(wallet);
    if (identity) {
      identityKey = `rate:identity:${identity.id}`;
      if (!(await claimOnce(identityKey, RATE_LIMIT_TTL_SECONDS))) {
        await releaseClaim(walletKey);
        if (ipKey) await releaseClaim(ipKey);
        return {
          ok: false,
          status: 429,
          error: 'Rate limit: 1 reward per identity per day. Try again tomorrow.',
          claims: {},
        };
      }
    }
  } catch {
    identityKey = null;
  }
  return { ok: true, claims: { walletKey, ipKey, identityKey } };
}

export async function releaseRateClaims(claims: Partial<RateClaimSet> | null): Promise<void> {
  if (!claims) return;
  if (claims.walletKey) await releaseClaim(claims.walletKey).catch(() => undefined);
  if (claims.ipKey) await releaseClaim(claims.ipKey).catch(() => undefined);
  if (claims.identityKey) await releaseClaim(claims.identityKey).catch(() => undefined);
}

export async function reserveDailyBudgets(
  wallet: string,
  rewardXlm: number,
): Promise<{ ok: true; reservation: BudgetReservation } | { ok: false; error: string }> {
  const day = utcDayKey();
  const units = Math.round(rewardXlm * 10);
  const treasuryKey = `budget:treasury:day:${day}`;
  const recipientKey = `budget:recipient:day:${day}:${wallet}`;
  const treasuryCap = DAILY_TREASURY_CAP_XLM * 10;
  const recipientCap = DAILY_RECIPIENT_CAP_XLM * 10;
  if (!(await reserveBudget(treasuryKey, units, treasuryCap, BUDGET_TTL_SECONDS))) {
    return {
      ok: false,
      error: `Daily treasury budget (${DAILY_TREASURY_CAP_XLM} XLM) exceeded. Try again tomorrow.`,
    };
  }
  if (!(await reserveBudget(recipientKey, units, recipientCap, BUDGET_TTL_SECONDS))) {
    await reserveBudget(treasuryKey, -units, treasuryCap, BUDGET_TTL_SECONDS);
    return {
      ok: false,
      error: `Daily recipient budget (${DAILY_RECIPIENT_CAP_XLM} XLM) exceeded. Try again tomorrow.`,
    };
  }
  return { ok: true, reservation: { treasuryKey, recipientKey, units } };
}

export async function releaseDailyBudgets(reservation: BudgetReservation | null): Promise<void> {
  if (!reservation?.units) return;
  await reserveBudget(
    reservation.treasuryKey,
    -reservation.units,
    DAILY_TREASURY_CAP_XLM * 10,
    BUDGET_TTL_SECONDS,
  ).catch(() => undefined);
  await reserveBudget(
    reservation.recipientKey,
    -reservation.units,
    DAILY_RECIPIENT_CAP_XLM * 10,
    BUDGET_TTL_SECONDS,
  ).catch(() => undefined);
}

export async function markPendingReconcile(entry: PendingPayout): Promise<void> {
  const list = (await getJson<PendingPayout[]>(PENDING_KEY)) ?? [];
  list.push(entry);
  await setJson(PENDING_KEY, list.slice(-200), 7 * 24 * 60 * 60);
}

export async function listPendingReconcile(): Promise<PendingPayout[]> {
  return (await getJson<PendingPayout[]>(PENDING_KEY)) ?? [];
}

export async function removePendingReconcile(txHash: string): Promise<void> {
  const list = (await getJson<PendingPayout[]>(PENDING_KEY)) ?? [];
  await setJson(
    PENDING_KEY,
    list.filter((entry) => entry.txHash !== txHash),
    7 * 24 * 60 * 60,
  );
}
