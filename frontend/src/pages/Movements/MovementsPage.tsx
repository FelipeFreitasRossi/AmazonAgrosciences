import { useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState.tsx';
import PageHeader from '@/components/ui/PageHeader.tsx';
import { ApiError } from '@/services/api.ts';
import { movementService } from '@/services/inventoryService.ts';
import type { Movement, MovementType } from '@/types/inventory.ts';
import { MOVEMENT_META, formatDateTime, formatLiters } from '@/utils/format.ts';
import styles from './MovementsPage.module.css';

const PAGE_SIZE = 30;
const FILTERS: { value: MovementType | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'entrada', label: 'Entradas' },
  { value: 'saida', label: 'Saídas' },
  { value: 'transferencia', label: 'Transferências' },
  { value: 'remocao', label: 'Remoções' },
];

export default function MovementsPage() {
  const [type, setType] = useState<MovementType | ''>('');
  const [items, setItems] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(skip: number, signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const page = await movementService.list({ type: type || undefined, limit: PAGE_SIZE, skip }, signal);
      setItems((current) => (skip === 0 ? page.items : [...current, ...page.items]));
      setTotal(page.total);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar o histórico.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(0, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <>
      <PageHeader
        eyebrow="Estoque"
        icon={ArrowLeftRight}
        title="Movimentações"
        description="Histórico de tudo o que entrou, saiu ou mudou de lugar, com o responsável, a data e a hora. Nada aqui pode ser apagado."
      />

      <div className={styles.types}>
        {(Object.keys(MOVEMENT_META) as MovementType[]).map((key) => (
          <div key={key} className={styles.type}>
            <span className={`badge ${MOVEMENT_META[key].tone === 'neutral' ? '' : `badge-${MOVEMENT_META[key].tone}`}`}>
              {MOVEMENT_META[key].label}
            </span>
            <span>{MOVEMENT_META[key].description}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }} role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={type === f.value}
            className={`btn btn-sm ${type === f.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setType(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        {error && <div className="alert alert-error" style={{ margin: 16 }}>{error}</div>}
        {!loading && !error && items.length === 0 && (
          <EmptyState icon={ArrowLeftRight} title="Nenhuma movimentação" description="As operações feitas no mapa aparecem aqui." />
        )}
        {items.length > 0 && (
          <div className="table-wrap">
            <table className="table table-responsive">
              <thead>
                <tr>
                  <th>Produto / recipiente</th>
                  <th>Tipo</th>
                  <th className="num">Quantidade</th>
                  <th>Origem → destino</th>
                  <th>Responsável</th>
                  <th>Data e hora</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => {
                  const meta = MOVEMENT_META[m.type];
                  return (
                    <tr key={m.id}>
                      <td className="primary">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>{m.product_name}</strong>
                          <span className="mono muted" style={{ fontSize: 12 }}>
                            {m.container_code}
                          </span>
                        </div>
                      </td>
                      <td data-label="Tipo">
                        <span className={`badge ${meta.tone === 'neutral' ? '' : `badge-${meta.tone}`}`}>{meta.label}</span>
                      </td>
                      <td data-label="Quantidade" className="num">
                        {formatLiters(m.volume_l)}
                      </td>
                      <td data-label="Local" className="mono">
                        {m.from_location ?? '—'} → {m.to_location ?? '—'}
                      </td>
                      <td data-label="Responsável">{m.performed_by}</td>
                      <td data-label="Data">{formatDateTime(m.created_at)}</td>
                      <td data-label="Observação" className="muted">
                        {m.notes ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {loading && <div className="skeleton" style={{ height: 48, margin: 16 }} />}
        {!loading && items.length < total && (
          <div style={{ padding: 14, textAlign: 'center', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => load(items.length)}>
              Carregar mais ({total - items.length} restantes)
            </button>
          </div>
        )}
      </div>
    </>
  );
}
