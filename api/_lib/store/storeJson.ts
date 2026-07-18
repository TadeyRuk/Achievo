import { getRedis, requireStore } from './storeRedis';

const memJson = new Map<string, string>();

export async function getJson<T>(key: string): Promise<T | null> {
  requireStore();
  const redis = getRedis();
  if (!redis) {
    const raw = memJson.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }
  return (await redis.get<T>(key)) ?? null;
}

export async function setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  requireStore();
  const redis = getRedis();
  if (!redis) {
    memJson.set(key, JSON.stringify(value));
    return;
  }
  if (ttlSeconds && ttlSeconds > 0) {
    await redis.set(key, value, { ex: Math.ceil(ttlSeconds) });
  } else {
    await redis.set(key, value);
  }
}
