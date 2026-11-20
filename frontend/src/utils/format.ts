import type { MovementType } from '@/types/inventory.ts';

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export const formatNumber = (value: number) => numberFormat.format(value);

export const formatLiters = (value: number) => `${numberFormat.format(value)} L`;

export const formatPercent = (value: number) => `${numberFormat.format(value)}%`;

/** Datas sem horário ("2027-01-31") são tratadas como data local para não voltar um dia. */
function parseDate(value: string): Date {
  return new Date(value.length === 10 ? `${value}T00:00:00` : value);
}

export function formatDate(value: string | null | undefined): string {
  return value ? parseDate(value).toLocaleDateString('pt-BR') : '—';
}

export function formatDateTime(value: string): string {
  return parseDate(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(value: string): string {
  const diff = Date.now() - parseDate(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} d`;
  return formatDate(value);
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDate(value).getTime() - today.getTime()) / 86_400_000);
}

export type ExpiryTone = 'danger' | 'warning' | 'success' | 'neutral';

export function expiryStatus(value: string | null | undefined): { label: string; tone: ExpiryTone } {
  const days = daysUntil(value);
  if (days === null) return { label: 'Sem validade', tone: 'neutral' };
  if (days < 0) return { label: `Vencido há ${-days} d`, tone: 'danger' };
  if (days === 0) return { label: 'Vence hoje', tone: 'danger' };
  if (days <= 60) return { label: `Vence em ${days} d`, tone: 'warning' };
  return { label: 'Dentro da validade', tone: 'success' };
}

export const MOVEMENT_META: Record<
  MovementType,
  { label: string; tone: 'success' | 'danger' | 'info' | 'neutral'; description: string }
> = {
  entrada: { label: 'Entrada', tone: 'success', description: 'Produto chegou: recipiente novo ou litros adicionados.' },
  saida: { label: 'Saída', tone: 'danger', description: 'Litros retirados de um recipiente.' },
  transferencia: { label: 'Transferência', tone: 'info', description: 'Recipiente mudou de posição ou de galpão.' },
  remocao: { label: 'Remoção', tone: 'neutral', description: 'Recipiente saiu do galpão; a posição ficou livre.' },
};

/** Converte o texto de um input numérico (aceita vírgula) em número. */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim();
  // "1.250,5" (padrão BR) ou "1250.5": se houver vírgula, ela é o separador decimal
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
