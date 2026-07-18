import { getRedis, requireStore } from './storeRedis';

const memTimestamps = new Map<string, number>();
const memClaimed = new Set<string>();

export async function getTimestamp(key: string): Promise<number | null> {
  requireStore();
  const redis = getRedis();
  if (!redis) return memTimestamps.get(key) ?? null;
  const val = await redis.get<number>(key);
  return val ?? null;
}

export async function setTimestamp(key: string, ts: number, ttlSeconds: number): Promise<void> {
  requireStore();
  const redis = getRedis();
  if (!redis) {
    memTimestamps.set(key, ts);
    setTimeout(() => memTimestamps.delete(key), ttlSeconds * 1000).unref?.();
    return;
  }
  await redis.set(key, ts, { ex: Math.max(1, Math.ceil(ttlSeconds)) });
}

export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  requireStore();
  const redis = getRedis();
  const ttl = Math.max(1, Math.ceil(ttlSeconds));
  if (!redis) {
    if (memClaimed.has(key)) return false;
    memClaimed.add(key);
    setTimeout(() => memClaimed.delete(key), ttl * 1000).unref?.();
    return true;
  }
  const result = await redis.set(key, '1', { nx: true, ex: ttl });
  return result === 'OK';
}

export async function releaseClaim(key: string): Promise<void> {
  requireStore();
  const redis = getRedis();
  if (!redis) {
    memClaimed.delete(key);
    memTimestamps.delete(key);
    return;
  }
  await redis.del(key);
}

export async function exists(key: string): Promise<boolean> {
  requireStore();
  const redis = getRedis();
  if (!redis) return memClaimed.has(key) || memTimestamps.has(key);
  return (await redis.exists(key)) === 1;
}
