export type ServiceStatus = 'ok' | 'error';

export interface DatabaseHealth {
  status: ServiceStatus;
  latency_ms: number | null;
  detail?: string | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  app: string;
  version: string;
  environment: string;
  database: DatabaseHealth;
  timestamp: string;
}
