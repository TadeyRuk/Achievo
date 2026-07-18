import { getRedis, requireStore } from './storeRedis';

const memCounters = new Map<string, number>();

export async function incrBy(key: string, delta: number, ttlSeconds: number): Promise<number> {
  requireStore();
  const redis = getRedis();
  const ttl = Math.max(1, Math.ceil(ttlSeconds));
  if (!redis) {
    const next = (memCounters.get(key) ?? 0) + delta;
    memCounters.set(key, next);
    setTimeout(() => memCounters.delete(key), ttl * 1000).unref?.();
    return next;
  }
  const next = await redis.incrby(key, delta);
  await redis.expire(key, ttl);
  return typeof next === 'number' ? next : Number(next);
}

export async function reserveBudget(
  key: string,
  units: number,
  capUnits: number,
  ttlSeconds: number,
): Promise<boolean> {
  if (units === 0) return true;
  if (units < 0) {
    // A release/rollback: always applies, never subject to the cap check below.
    await incrBy(key, units, ttlSeconds);
    return true;
  }
  const next = await incrBy(key, units, ttlSeconds);
  if (next > capUnits) {
    await incrBy(key, -units, ttlSeconds);
    return false;
  }
  return true;
}
