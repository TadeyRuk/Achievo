import { STROOP_FACTOR } from "./constants.js";

export function stroopsToXlm(stroops: number | bigint): number {
  return Number(stroops) / STROOP_FACTOR;
}

/** Convert XLM to stroops using integer tenths (avoids float edge cases at 0.1 XLM). */
export function xlmToStroops(xlm: number): bigint {
  const tenths = Math.round(xlm * 10);
  return BigInt(tenths) * BigInt(STROOP_FACTOR / 10);
}
