import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CONTRACT_ID, SOROBAN_RPC_URL } from '@achievo/shared';
import { getRedis, StoreUnavailableError } from './_lib/store';

/**
 * Lightweight readiness probe for staging smoke + ops.
 * Never returns secrets.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const checks: Record<string, 'ok' | 'degraded' | 'down'> = {
    contractId: CONTRACT_ID && !String(CONTRACT_ID).includes('PLACEHOLDER') ? 'ok' : 'down',
    redis: 'down',
    rpc: 'down',
  };

  try {
    const redis = getRedis();
    if (redis) {
      await redis.ping();
      checks.redis = 'ok';
    } else if (process.env.VERCEL_ENV === 'production') {
      checks.redis = 'down';
    } else {
      checks.redis = 'degraded'; // in-memory ok for local/CI
    }
  } catch (err) {
    if (err instanceof StoreUnavailableError) checks.redis = 'down';
    else checks.redis = 'down';
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5_000);
    const rpcRes = await fetch(SOROBAN_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    checks.rpc = rpcRes.ok ? 'ok' : 'degraded';
  } catch {
    checks.rpc = 'down';
  }

  const rewardsPaused =
    checks.redis === 'down' || checks.rpc === 'down' || checks.contractId === 'down';

  return res.status(rewardsPaused && process.env.VERCEL_ENV === 'production' ? 503 : 200).json({
    ok: !rewardsPaused,
    rewardsPaused,
    checks,
    network: 'testnet',
  });
}
