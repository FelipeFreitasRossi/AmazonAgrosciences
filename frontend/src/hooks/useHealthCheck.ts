import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/services/api.ts';
import { healthService } from '@/services/healthService.ts';
import type { HealthResponse } from '@/types/health.ts';

export function useHealthCheck() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const check = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await healthService.check(controller.signal);
      setData(response);
    } catch (err) {
      if (controller.signal.aborted) return;
      setData(null);
      setError(err instanceof ApiError ? err.message : 'Erro inesperado ao verificar a API.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLastChecked(new Date());
      }
    }
  }, []);

  useEffect(() => {
    void check();
    return () => controllerRef.current?.abort();
  }, [check]);

  return { data, error, loading, lastChecked, refresh: check };
}
