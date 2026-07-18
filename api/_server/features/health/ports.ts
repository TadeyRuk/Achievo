export interface HealthPorts {
  contractConfigured: boolean;
  production: boolean;
  checkRedis(): Promise<'ok' | 'degraded' | 'down'>;
  checkRpc(): Promise<'ok' | 'degraded' | 'down'>;
}
