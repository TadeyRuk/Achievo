// Durable key/value helpers backing rate limits, single-use nonces, and
// duplicate-submission detection in api/reward.ts.
//
// Backed by Upstash Redis (via UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN,
// auto-injected by the Vercel Marketplace integration) when configured. Vercel
// functions are ephemeral and run across multiple instances, so an in-process
// Map cannot enforce a durable limit — it resets on cold start and isn't shared.
//
// Falls back to an in-memory Map when the Upstash env vars are absent, so local
// dev and CI don't require a Redis account. The fallback is best-effort only
// (per-instance, resets on restart) — never rely on it in production.
import { Redis } from '@upstash/redis';

let redisClient: Redis | null | undefined;
let warnedFallback = false;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!warnedFallback) {
      console.warn(
        '[store] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — ' +
        'falling back to in-memory store. Rate limits and nonce replay protection ' +
        'are NOT durable in this mode (per-instance, resets on cold start). ' +
        'Fine for local dev/CI; add the Upstash integration for production.'
      );
      warnedFallback = true;
    }
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

// ── In-memory fallback state (dev/CI only — see warning above) ────────────────

const memTimestamps = new Map<string, number>();
const memClaimed = new Set<string>();

/** Milliseconds-since-epoch a key was last marked, or null if never set. */
export async function getTimestamp(key: string): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return memTimestamps.get(key) ?? null;
  const val = await redis.get<number>(key);
  return val ?? null;
}

/** Marks `key` with `ts`, expiring after `ttlSeconds`. */
export async function setTimestamp(key: string, ts: number, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memTimestamps.set(key, ts);
    setTimeout(() => memTimestamps.delete(key), ttlSeconds * 1000).unref?.();
    return;
  }
  await redis.set(key, ts, { ex: Math.max(1, Math.ceil(ttlSeconds)) });
}

/**
 * Atomically claims a one-time-use key (SET NX). Returns true iff this call
 * won the claim — i.e. the key did not already exist. Used to make nonce
 * replay impossible even under concurrent requests racing the same signed
 * challenge, which a plain check-then-set can't guarantee.
 */
export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
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

/** Whether `key` has been marked (used for the duplicate-submission check). */
export async function exists(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return memClaimed.has(key) || memTimestamps.has(key);
  return (await redis.exists(key)) === 1;
}

// ── Recent-list helpers (bounded per-key history) ─────────────────────────────
// Back the IntegrityAgent's near-duplicate detection: a small, most-recent-first
// list of submission fingerprints per wallet.

const memLists = new Map<string, string[]>();

/**
 * Push `value` to the front of the bounded list at `key`, trimming to `maxLen`
 * most-recent entries and refreshing the TTL. Best-effort in fallback mode.
 */
export async function addRecent(
  key: string,
  value: string,
  maxLen: number,
  ttlSeconds: number,
): Promise<void> {
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

/** Return the bounded list at `key`, most-recent-first (empty if none). */
export async function listRecent(key: string): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return memLists.get(key) ?? [];
  return (await redis.lrange<string>(key, 0, -1)) ?? [];
}

// ── Feedback entries (per-transaction user ratings) ─────────────────────────

const FEEDBACK_KEY = 'feedback:entries';
const FEEDBACK_MAX = 500;
const FEEDBACK_TTL_SECONDS = 365 * 24 * 60 * 60;

const memFeedback: string[] = [];

/** Append a JSON feedback record (newest-first, bounded). */
export async function appendFeedback(json: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memFeedback.unshift(json);
    memFeedback.splice(FEEDBACK_MAX);
    return;
  }
  await redis.lpush(FEEDBACK_KEY, json);
  await redis.ltrim(FEEDBACK_KEY, 0, FEEDBACK_MAX - 1);
  await redis.expire(FEEDBACK_KEY, FEEDBACK_TTL_SECONDS);
}

/** Return stored feedback entries, newest-first (capped). */
export async function listFeedback(limit = 100): Promise<string[]> {
  const cap = Math.max(1, Math.min(FEEDBACK_MAX, Math.floor(limit)));
  const redis = getRedis();
  if (!redis) return memFeedback.slice(0, cap);
  return (await redis.lrange<string>(FEEDBACK_KEY, 0, cap - 1)) ?? [];
}
