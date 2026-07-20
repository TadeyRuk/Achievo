import type { HealthApiSuccess } from '@achievo/contracts';
import { json, methodNotAllowed, type HttpRoute } from '../../http/index.js';
import type { HealthPorts } from './ports.js';

export function createHealthRoute(ports: HealthPorts): HttpRoute {
  return async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed();
    const [redis, rpc] = await Promise.all([ports.checkRedis(), ports.checkRpc()]);
    const checks: HealthApiSuccess['checks'] = {
      contractId: ports.contractConfigured ? 'ok' : 'down',
      redis,
      rpc,
    };
    const rewardsPaused = Object.values(checks).includes('down');
    return json<HealthApiSuccess>(rewardsPaused && ports.production ? 503 : 200, {
      ok: !rewardsPaused,
      rewardsPaused,
      checks,
      network: ports.network,
    });
  };
}
