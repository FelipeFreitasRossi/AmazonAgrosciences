/**
 * Cliente HTTP central da aplicação. Todos os serviços passam por aqui,
 * o que facilita adicionar o token de autenticação na próxima etapa.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/+$/, '');
const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('detail' in data)) return null;
  const { detail, errors } = data as { detail: unknown; errors?: { msg?: string; loc?: unknown[] }[] };

  // Erros de validação (422): mostra o primeiro motivo de forma legível
  const first = Array.isArray(errors) ? errors[0] : undefined;
  if (first?.msg) {
    const field = Array.isArray(first.loc) ? first.loc.filter((part) => part !== 'body').join('.') : '';
    const message = first.msg.replace(/^Value error, /, '');
    return field ? `${field}: ${message}` : message;
  }
  return typeof detail === 'string' ? detail : null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, timeoutMs = DEFAULT_TIMEOUT_MS, headers, signal, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');
  if (body !== undefined) finalHeaders.set('Content-Type', 'application/json');

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? parseJson(text) : null;

    if (!response.ok) {
      throw new ApiError(extractMessage(data) ?? `Erro ${response.status} ao acessar a API.`, response.status, data);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw error; // cancelado por quem chamou (ex.: componente desmontado)
    if (controller.signal.aborted) {
      throw new ApiError('O servidor demorou demais para responder.', 0);
    }
    throw new ApiError('Não foi possível conectar ao servidor.', 0);
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};
