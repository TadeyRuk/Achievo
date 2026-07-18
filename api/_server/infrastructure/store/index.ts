import { Redis } from '@upstash/redis';

let redisClient: Redis | null | undefined;
let warnedFallback = false;

const memTimestamps = new Map<string, number>();
const memClaimed = new Set<string>();
const memLists = new Map<string, string[]>();
const memJson = new Map<string, string>();
const memCounters = new Map<string, number>();
const memPayouts: string[] = [];

const PAYOUTS_KEY = 'payouts:ledger';
const PAYOUTS_MAX = 1000;
const PAYOUTS_TTL_SECONDS = 365 * 24 * 60 * 60;

export class StoreUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreUnavailableError';
  }
}

export function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.VERCEL_ENV !== 'production' && !warnedFallback) {
      console.warn(
        '[store] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — ' +
          'falling back to in-memory store. Rate limits and nonce replay protection ' +
          'are NOT durable in this mode. Fine for local/CI only.',
      );
      warnedFallback = true;
    }
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

export function requireStore(): void {
  if (process.env.VERCEL_ENV === 'production' && !getRedis()) {
    throw new StoreUnavailableError(
      'Durable store unavailable. Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.',
    );
  }
}

export async function getTimestamp(key: string): Promise<number | null> {
  requireStore();
  const redis = getRedis();
  if (!redis) return memTimestamps.get(key) ?? null;
  return (await redis.get<number>(key)) ?? null;
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
  return (await redis.set(key, '1', { nx: true, ex: ttl })) === 'OK';
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

export async function appendPayout(value: string): Promise<void> {
  requireStore();
  const redis = getRedis();
  if (!redis) {
    memPayouts.unshift(value);
    memPayouts.splice(PAYOUTS_MAX);
    return;
  }
  await redis.lpush(PAYOUTS_KEY, value);
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

export async function getJson<T>(key: string): Promise<T | null> {
  requireStore();
  const redis = getRedis();
  if (!redis) {
    const raw = memJson.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
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
