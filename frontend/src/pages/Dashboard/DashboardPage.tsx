import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  CalendarClock,
  Droplets,
  Grid3x3,
  Package,
  PackagePlus,
  Plus,
  RefreshCw,
  Sparkles,
  Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState.tsx';
import PageHeader from '@/components/ui/PageHeader.tsx';
import { useToast } from '@/contexts/ToastContext.tsx';
import { useFetch } from '@/hooks/useFetch.ts';
import { ApiError } from '@/services/api.ts';
import { dashboardService, setupService } from '@/services/inventoryService.ts';
import { MOVEMENT_META, formatDate, formatLiters, formatNumber, formatPercent, formatRelative } from '@/utils/format.ts';
import styles from './DashboardPage.module.css';

interface KpiProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: ReactNode;
  tone?: 'brand' | 'warning' | 'info' | 'danger';
  to?: string;
}

function Kpi({ icon: Icon, label, value, detail, tone = 'brand', to }: KpiProps) {
  const content = (
    <>
      <span className={`${styles.kpiIcon} ${styles[`tone_${tone}`]}`}>
        <Icon size={20} aria-hidden />
      </span>
      <div className={styles.kpiText}>
        <span className={styles.kpiLabel}>{label}</span>
        <strong className={styles.kpiValue}>{value}</strong>
        {detail && <span className={styles.kpiDetail}>{detail}</span>}
      </div>
    </>
  );
  return to ? (
    <Link to={to} className={`card ${styles.kpi} ${styles.kpiLink}`}>
      {content}
    </Link>
  ) : (
    <div className={`card ${styles.kpi}`}>{content}</div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useFetch((signal) => dashboardService.get(signal), []);
  const [seeding, setSeeding] = useState(false);

  async function createDemo() {
    setSeeding(true);
    try {
      const result = await setupService.createDemo();
      toast.success('Dados de exemplo criados', `${result.warehouses} galpões, ${result.products} produtos e ${result.containers} recipientes.`);
      reload();
    } catch (err) {
      toast.error('Não foi possível gerar os dados', err instanceof ApiError ? err.message : undefined);
    } finally {
      setSeeding(false);
    }
  }

  const actions = (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => navigate('/produtos?novo=1')}>
        <Plus size={17} /> Novo produto
      </button>
      <button type="button" className="btn btn-primary" onClick={() => navigate('/mapa?novo=1')}>
        <PackagePlus size={17} /> Nova entrada
      </button>
    </>
  );

  if (error && !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="card">
          <EmptyState
            icon={AlertTriangle}
            title="Não foi possível carregar o dashboard"
            description={error}
            action={
              <button type="button" className="btn btn-secondary" onClick={reload}>
                <RefreshCw size={16} /> Tentar novamente
              </button>
            }
          />
        </div>
      </>
    );
  }

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Dashboard" description="Carregando visão geral do estoque..." />
        <div className={styles.kpis}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 96 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 280, marginTop: 16 }} />
      </>
    );
  }

  if (!data) return null;
  const { totals } = data;

  if (totals.warehouses === 0 && totals.products === 0) {
    return (
      <>
        <PageHeader title="Dashboard" description="Visão geral do estoque da Amazon Agrosciences." />
        <div className="card">
          <EmptyState
            icon={Sparkles}
            title="Vamos começar"
            description="Cadastre seus galpões (com setores e posições) e os fertilizantes. Para conhecer o sistema antes, gere dados de exemplo com 5 galpões."
            action={
              <>
                <button type="button" className="btn btn-primary" onClick={() => navigate('/galpoes')}>
                  <Warehouse size={16} /> Cadastrar galpões
                </button>
                <button type="button" className="btn btn-secondary" onClick={createDemo} disabled={seeding}>
                  {seeding ? <span className="spinner" aria-hidden /> : <Sparkles size={16} />}
                  Gerar dados de exemplo
                </button>
              </>
            }
          />
        </div>
      </>
    );
  }

  const capacityPct = totals.total_capacity_l ? (totals.total_volume_l / totals.total_capacity_l) * 100 : 0;
  const maxVolume = Math.max(1, ...data.volume_by_product.map((p) => p.volume_l));
  const alerts = totals.low_stock_count + totals.expiring_count;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Atualizado ${formatRelative(data.generated_at)} · visão geral do estoque`}
        actions={actions}
      />

      <div className={styles.kpis}>
        <Kpi icon={Package} label="Produtos cadastrados" value={formatNumber(totals.products)} to="/produtos" />
        <Kpi
          icon={Boxes}
          label="Recipientes armazenados"
          value={formatNumber(totals.containers)}
          detail="IBCs, barris e bombonas"
          to="/mapa"
        />
        <Kpi
          icon={Droplets}
          label="Volume em estoque"
          value={formatLiters(totals.total_volume_l)}
          detail={`${formatPercent(capacityPct)} da capacidade dos recipientes`}
          tone="info"
        />
        <Kpi
          icon={Warehouse}
          label="Galpões"
          value={formatNumber(totals.warehouses)}
          detail={`${totals.sectors} setores`}
          to="/galpoes"
        />
        <Kpi
          icon={Grid3x3}
          label="Ocupação das posições"
          value={formatPercent(totals.occupancy_pct)}
          detail={`${totals.positions_used} de ${totals.positions_total} posições`}
          to="/mapa"
        />
        <Kpi
          icon={AlertTriangle}
          label="Alertas"
          value={formatNumber(alerts)}
          detail={`${totals.low_stock_count} estoque baixo · ${totals.expiring_count} validade`}
          tone={alerts ? 'warning' : 'brand'}
        />
      </div>

      <div className={styles.grid}>
        <section className={`card ${styles.span2}`}>
          <header className="card-header">
            <h2>
              <Warehouse size={17} /> Ocupação por galpão
            </h2>
            <Link to="/mapa" className="btn btn-ghost btn-sm">
              Ver mapa
            </Link>
          </header>
          <div className={`card-body ${styles.bars}`}>
            {data.occupancy_by_warehouse.length === 0 && <p className="muted">Nenhum galpão cadastrado.</p>}
            {data.occupancy_by_warehouse.map((w) => {
              const pct = w.positions_total ? (w.positions_used / w.positions_total) * 100 : 0;
              return (
                <Link key={w.warehouse_id} to={`/mapa?galpao=${w.warehouse_id}`} className={styles.barRow}>
                  <span className={styles.barLabel}>
                    <strong className="mono">{w.code}</strong>
                    <span>{w.name}</span>
                  </span>
                  <div className={styles.barTrack}>
                    <span
                      className={styles.barFill}
                      style={{ width: `${pct}%`, background: pct > 90 ? 'var(--color-warning-600)' : undefined }}
                    />
                  </div>
                  <span className={styles.barValue}>
                    <strong>{formatPercent(pct)}</strong>
                    <small>
                      {w.positions_used}/{w.positions_total} · {formatLiters(w.volume_l)}
                    </small>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <h2>
              <AlertTriangle size={17} /> Estoque baixo
            </h2>
            {totals.low_stock_count > 0 && <span className="badge badge-warning">{totals.low_stock_count}</span>}
          </header>
          <div className="card-body">
            {data.low_stock.length === 0 ? (
              <p className={styles.ok}>Todos os produtos acima do estoque mínimo.</p>
            ) : (
              <ul className={styles.list}>
                {data.low_stock.map((item) => (
                  <li key={item.product_id}>
                    <span className="color-dot" style={{ background: item.color }} />
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {formatLiters(item.total_volume_l)} de mín. {formatLiters(item.min_stock_l)}
                      </small>
                      <div className="progress" style={{ height: 5, marginTop: 4 }}>
                        <span
                          style={{
                            width: `${Math.min(100, (item.total_volume_l / item.min_stock_l) * 100)}%`,
                            background: 'var(--color-warning-600)',
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className={`card ${styles.span2}`}>
          <header className="card-header">
            <h2>
              <Droplets size={17} /> Volume por produto
            </h2>
            <Link to="/produtos" className="btn btn-ghost btn-sm">
              Produtos
            </Link>
          </header>
          <div className={`card-body ${styles.bars}`}>
            {data.volume_by_product.length === 0 && <p className="muted">Nenhum produto armazenado ainda.</p>}
            {data.volume_by_product.map((p) => (
              <Link key={p.product_id} to={`/mapa?busca=${encodeURIComponent(p.code)}`} className={styles.barRow}>
                <span className={styles.barLabel}>
                  <strong>{p.name}</strong>
                  <span className="mono">{p.code}</span>
                </span>
                <div className={styles.barTrack}>
                  <span className={styles.barFill} style={{ width: `${(p.volume_l / maxVolume) * 100}%`, background: p.color }} />
                </div>
                <span className={styles.barValue}>
                  <strong>{formatLiters(p.volume_l)}</strong>
                  <small>{p.containers} recipiente(s)</small>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <h2>
              <CalendarClock size={17} /> Validade próxima
            </h2>
            {totals.expiring_count > 0 && <span className="badge badge-warning">{totals.expiring_count}</span>}
          </header>
          <div className="card-body">
            {data.expiring_soon.length === 0 ? (
              <p className={styles.ok}>Nenhum recipiente vence nos próximos 60 dias.</p>
            ) : (
              <ul className={styles.list}>
                {data.expiring_soon.map((item) => (
                  <li key={item.container_id}>
                    <span className={`badge ${item.days_left < 0 ? 'badge-danger' : 'badge-warning'}`}>
                      {item.days_left < 0 ? 'Vencido' : `${item.days_left} d`}
                    </span>
                    <div>
                      <strong>{item.product_name}</strong>
                      <small>
                        <Link to={`/mapa?busca=${encodeURIComponent(item.container_code)}`} className="mono">
                          {item.container_code}
                        </Link>{' '}
                        em {item.location_code} · {formatDate(item.expiry_date)}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className={`card ${styles.span3}`}>
          <header className="card-header">
            <h2>
              <ArrowLeftRight size={17} /> Últimas movimentações
            </h2>
            <Link to="/movimentacoes" className="btn btn-ghost btn-sm">
              Ver histórico
            </Link>
          </header>
          {data.recent_movements.length === 0 ? (
            <div className="card-body">
              <p className="muted">Nenhuma movimentação registrada.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table table-responsive">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Tipo</th>
                    <th className="num">Quantidade</th>
                    <th>Local</th>
                    <th>Responsável</th>
                    <th>Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_movements.map((m) => {
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
                          {m.type === 'transferencia' ? `${m.from_location} → ${m.to_location}` : (m.to_location ?? m.from_location)}
                        </td>
                        <td data-label="Responsável">{m.performed_by}</td>
                        <td data-label="Quando" title={new Date(m.created_at).toLocaleString('pt-BR')}>
                          {formatRelative(m.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
