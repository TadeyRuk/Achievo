/**
 * Reward breakdown formatting — pure, UI-agnostic helpers that turn the
 * ScoringAgent's server response (base / bonus / effortScore / reason) into
 * display-ready values for RewardCard. Kept separate from the component so it
 * is unit-testable without pulling in React / Motion.
 */

export interface RewardBreakdownInput {
  reward: number;
  base?: number | null;
  bonus?: number | null;
  effortScore?: number | null; // 0.0–1.0
  reason?: string | null;
  /** IntegrityAgent soft-flag (Task 2). */
  flagged?: boolean;
  flagReason?: string | null;
}

export interface FormattedBreakdown {
  /** True when we have enough data to show a base/bonus breakdown. */
  hasBreakdown: boolean;
  base: number | null;
  bonus: number | null;
  /** Effort as an integer percentage 0–100, or null if unknown. */
  effortPct: number | null;
  /** "Base 5 + Bonus 3.5" or null. */
  formula: string | null;
  /** Trimmed rationale sentence, or null if empty. */
  reason: string | null;
  flagged: boolean;
  flagReason: string | null;
}

/** Round to one decimal place, matching the server's reward math. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Normalize a (possibly partial) reward response into display values.
 * Missing or malformed fields degrade gracefully to `null` so the card can
 * fall back to just showing the reward number.
 */
export function formatRewardBreakdown(input: RewardBreakdownInput): FormattedBreakdown {
  const hasBase = typeof input.base === 'number' && !Number.isNaN(input.base);
  const hasBonus = typeof input.bonus === 'number' && !Number.isNaN(input.bonus);

  const base = hasBase ? round1(input.base as number) : null;
  const bonus = hasBonus ? round1(input.bonus as number) : null;

  let effortPct: number | null = null;
  if (typeof input.effortScore === 'number' && !Number.isNaN(input.effortScore)) {
    const clamped = Math.min(1, Math.max(0, input.effortScore));
    effortPct = Math.round(clamped * 100);
  }

  const hasBreakdown = base !== null && bonus !== null;
  const formula = hasBreakdown ? `Base ${base} + Bonus ${bonus}` : null;

  const trimmedReason = (input.reason ?? '').trim();
  const reason = trimmedReason.length > 0 ? trimmedReason : null;

  const flagReasonTrimmed = (input.flagReason ?? '').trim();

  return {
    hasBreakdown,
    base,
    bonus,
    effortPct,
    formula,
    reason,
    flagged: Boolean(input.flagged),
    flagReason: flagReasonTrimmed.length > 0 ? flagReasonTrimmed : null,
  };
}
