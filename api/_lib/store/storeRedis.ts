import { Redis } from '@upstash/redis';

let redisClient: Redis | null | undefined;
let warnedFallback = false;

export class StoreUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreUnavailableError';
  }
}

function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === 'production';
}

export function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (isProductionRuntime()) {
      redisClient = null;
      return null;
    }
    if (!warnedFallback) {
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

/** Throws StoreUnavailableError when production lacks Redis. */
export function requireStore(): void {
  if (isProductionRuntime() && !getRedis()) {
    throw new StoreUnavailableError(
      'Durable store unavailable. Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.',
    );
  }
}
