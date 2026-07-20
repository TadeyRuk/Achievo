import {
  CONTRACT_ID,
  SOROBAN_RPC_URL,
  STELLAR_NETWORK,
} from '@achievo/shared';
import { createHealthRoute } from '../features/health/routes.js';
import type { HealthPorts } from '../features/health/ports.js';
import { getRedis } from '../infrastructure/store/index.js';

const healthPorts: HealthPorts = {
  get contractConfigured() {
    return Boolean(CONTRACT_ID && !String(CONTRACT_ID).includes('PLACEHOLDER'));
  },
  get production() {
    return process.env.VERCEL_ENV === 'production';
  },
  get network() {
    return STELLAR_NETWORK;
  },
  async checkRedis() {
    try {
      const redis = getRedis();
      if (!redis) return process.env.VERCEL_ENV === 'production' ? 'down' : 'degraded';
      await redis.ping();
      return 'ok';
    } catch {
      return 'down';
    }
  },
  async checkRpc() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(SOROBAN_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
        signal: controller.signal,
      });
      return response.ok ? 'ok' : 'degraded';
    } catch {
      return 'down';
    } finally {
      clearTimeout(timer);
    }
  },
};

export const healthRoute = createHealthRoute(healthPorts);
