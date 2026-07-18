import { STROOP_FACTOR } from "./constants.js";

export function stroopsToXlm(stroops: number | bigint): number {
  return Number(stroops) / STROOP_FACTOR;
}

export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.round(xlm * STROOP_FACTOR));
}
