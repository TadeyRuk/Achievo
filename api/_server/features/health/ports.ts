import type { StellarNetworkName } from '@achievo/shared';

export interface HealthPorts {
  contractConfigured: boolean;
  production: boolean;
  network: StellarNetworkName;
  checkRedis(): Promise<'ok' | 'degraded' | 'down'>;
  checkRpc(): Promise<'ok' | 'degraded' | 'down'>;
}
