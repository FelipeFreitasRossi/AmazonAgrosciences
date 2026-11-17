import {
  ArrowLeftRight,
  Boxes,
  Database,
  LayoutDashboard,
  Leaf,
  MonitorSmartphone,
  Package,
  RefreshCw,
  Server,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import StatusCard from '@/components/StatusCard/StatusCard.tsx';
import type { StatusState } from '@/components/StatusCard/StatusCard.tsx';
import { useHealthCheck } from '@/hooks/useHealthCheck.ts';
import styles from './HomePage.module.css';

interface UpcomingModule {
  icon: LucideIcon;
  title: string;
  description: string;
}

const UPCOMING_MODULES: UpcomingModule[] = [
  { icon: LayoutDashboard, title: 'Dashboard', description: 'Indicadores, estoque baixo e últimas movimentações.' },
  { icon: Package, title: 'Produtos', description: 'Cadastro, edição, categorias e unidades de medida.' },
  { icon: Warehouse, title: 'Galpões e localizações', description: 'Galpão → Setor → Posição → IBC ou barril.' },
  { icon: ArrowLeftRight, title: 'Movimentações', description: 'Entradas, saídas, transferências e histórico.' },
  { icon: ShieldCheck, title: 'Usuários e acesso', description: 'Login, perfis de administrador e funcionário.' },
];

function formatTime(date: Date | null): string {
  return date ? date.toLocaleTimeString('pt-BR') : '—';
}

export default function HomePage() {
  const { data, error, loading, lastChecked, refresh } = useHealthCheck();

  const apiState: StatusState = loading ? 'loading' : data ? 'ok' : 'error';
  const dbState: StatusState = loading ? 'loading' : data?.database.status === 'ok' ? 'ok' : 'error';
  const allOk = !loading && apiState === 'ok' && dbState === 'ok';

  const apiDescription = loading
    ? 'Consultando o servidor FastAPI...'
    : data
      ? 'FastAPI respondendo em /api/v1.'
      : (error ?? 'API indisponível.');

  const dbDescription = loading
    ? 'Aguardando resposta da API...'
    : data?.database.status === 'ok'
      ? 'Conexão com o banco estabelecida.'
      : (data?.database.detail ?? 'Sem resposta da API, não foi possível testar o banco.');

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brand}>
            <span className={styles.logo} aria-hidden>
              <Leaf size={20} strokeWidth={2.2} />
            </span>
            <div className={styles.brandText}>
              <strong>Amazon Agrosciences</strong>
              <span>Gestão de Estoque</span>
            </div>
          </div>
          {data && (
            <span className={styles.envTag}>
              {data.environment} · v{data.version}
            </span>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              <Boxes size={15} aria-hidden /> Configuração inicial
            </p>
            <h1 className={styles.title}>Validação da integração</h1>
            <p className={styles.subtitle}>
              Esta tela confirma que frontend, API e banco de dados estão se comunicando antes de iniciarmos os módulos
              do sistema.
            </p>
          </div>

          <div className={styles.heroActions}>
            <div className={`${styles.summary} ${allOk ? styles.summaryOk : loading ? '' : styles.summaryError}`}>
              <span className={styles.dot} aria-hidden />
              {loading ? 'Verificando serviços...' : allOk ? 'Todos os serviços operacionais' : 'Há serviços com falha'}
            </div>
            <button type="button" className={styles.button} onClick={() => void refresh()} disabled={loading}>
              <RefreshCw size={16} className={loading ? styles.spin : undefined} aria-hidden />
              Verificar novamente
            </button>
          </div>
        </section>

        <section className={styles.statusGrid} aria-label="Status dos serviços">
          <StatusCard
            icon={MonitorSmartphone}
            title="Frontend"
            description="React + TypeScript + Vite em execução."
            state="ok"
            meta="localhost:5173"
          />
          <StatusCard
            icon={Server}
            title="API REST"
            description={apiDescription}
            state={apiState}
            meta={`Última verificação: ${formatTime(lastChecked)}`}
          />
          <StatusCard
            icon={Database}
            title="MongoDB"
            description={dbDescription}
            state={dbState}
            meta={data?.database.latency_ms != null ? `Latência: ${data.database.latency_ms} ms` : undefined}
          />
        </section>

        <section className={styles.modules}>
          <div className={styles.sectionHeader}>
            <h2>Próximos módulos</h2>
            <span>Arquitetura preparada</span>
          </div>
          <ul className={styles.moduleList}>
            {UPCOMING_MODULES.map(({ icon: Icon, title, description }) => (
              <li key={title} className={styles.moduleItem}>
                <span className={styles.moduleIcon}>
                  <Icon size={18} aria-hidden />
                </span>
                <div className={styles.moduleText}>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </div>
                <span className={styles.soon}>Em breve</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
