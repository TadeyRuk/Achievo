import {
  DAILY_RECIPIENT_CAP_XLM,
  DAILY_TREASURY_CAP_XLM,
  utcDayKey,
} from '@achievo/shared';
import { reserveBudget } from '../store';

const BUDGET_TTL = 48 * 60 * 60;

export type BudgetReservation = {
  treasuryKey: string;
  recipientKey: string;
  units: number;
};

export async function reserveDailyBudgets(
  wallet: string,
  rewardXlm: number,
): Promise<{ ok: true; reservation: BudgetReservation } | { ok: false; error: string }> {
  const day = utcDayKey();
  const units = Math.round(rewardXlm * 10);
  const treasuryKey = `budget:treasury:day:${day}`;
  const recipientKey = `budget:recipient:day:${day}:${wallet}`;

  const treasuryOk = await reserveBudget(
    treasuryKey,
    units,
    DAILY_TREASURY_CAP_XLM * 10,
    BUDGET_TTL,
  );
  if (!treasuryOk) {
    return {
      ok: false,
      error: `Daily treasury budget (${DAILY_TREASURY_CAP_XLM} XLM) exceeded. Try again tomorrow.`,
    };
  }

  const recipientOk = await reserveBudget(
    recipientKey,
    units,
    DAILY_RECIPIENT_CAP_XLM * 10,
    BUDGET_TTL,
  );
  if (!recipientOk) {
    await reserveBudget(treasuryKey, -units, DAILY_TREASURY_CAP_XLM * 10, BUDGET_TTL);
    return {
      ok: false,
      error: `Daily recipient budget (${DAILY_RECIPIENT_CAP_XLM} XLM) exceeded. Try again tomorrow.`,
    };
  }

  return { ok: true, reservation: { treasuryKey, recipientKey, units } };
}

export async function releaseDailyBudgets(
  reservation: BudgetReservation | null,
): Promise<void> {
  if (!reservation || !reservation.units) return;
  const { treasuryKey, recipientKey, units } = reservation;
  await reserveBudget(treasuryKey, -units, DAILY_TREASURY_CAP_XLM * 10, BUDGET_TTL).catch(
    () => undefined,
  );
  await reserveBudget(recipientKey, -units, DAILY_RECIPIENT_CAP_XLM * 10, BUDGET_TTL).catch(
    () => undefined,
  );
}
