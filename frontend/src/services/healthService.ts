import { api } from './api.ts';
import type { HealthResponse } from '@/types/health.ts';

export const healthService = {
  check: (signal?: AbortSignal) => api.get<HealthResponse>('/health', { signal, timeoutMs: 8000 }),
};
