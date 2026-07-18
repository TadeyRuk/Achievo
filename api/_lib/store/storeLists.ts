import { getRedis, requireStore } from './storeRedis';

const memLists = new Map<string, string[]>();

export async function addRecent(
  key: string,
  value: string,
  maxLen: number,
  ttlSeconds: number,
): Promise<void> {
  requireStore();
  const cap = Math.max(1, Math.floor(maxLen));
  const ttl = Math.max(1, Math.ceil(ttlSeconds));
  const redis = getRedis();
  if (!redis) {
    const list = memLists.get(key) ?? [];
    list.unshift(value);
    memLists.set(key, list.slice(0, cap));
    setTimeout(() => memLists.delete(key), ttl * 1000).unref?.();
    return;
  }
  await redis.lpush(key, value);
  await redis.ltrim(key, 0, cap - 1);
  await redis.expire(key, ttl);
}

export async function listRecent(key: string): Promise<string[]> {
  requireStore();
  const redis = getRedis();
  if (!redis) return memLists.get(key) ?? [];
  return (await redis.lrange<string>(key, 0, -1)) ?? [];
}

const PAYOUTS_KEY = 'payouts:ledger';
const PAYOUTS_MAX = 1000;
const PAYOUTS_TTL_SECONDS = 365 * 24 * 60 * 60;
const memPayouts: string[] = [];

export async function appendPayout(json: string): Promise<void> {
  requireStore();
  const redis = getRedis();
  if (!redis) {
    memPayouts.unshift(json);
    memPayouts.splice(PAYOUTS_MAX);
    return;
  }
  await redis.lpush(PAYOUTS_KEY, json);
  await redis.ltrim(PAYOUTS_KEY, 0, PAYOUTS_MAX - 1);
  await redis.expire(PAYOUTS_KEY, PAYOUTS_TTL_SECONDS);
}

export async function listPayouts(limit = 200): Promise<string[]> {
  requireStore();
  const cap = Math.max(1, Math.min(PAYOUTS_MAX, Math.floor(limit)));
  const redis = getRedis();
  if (!redis) return memPayouts.slice(0, cap);
  return (await redis.lrange<string>(PAYOUTS_KEY, 0, cap - 1)) ?? [];
}
