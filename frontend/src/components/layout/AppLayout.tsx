import { NavLink, Outlet } from 'react-router';
import { ArrowLeftRight, LayoutDashboard, Leaf, Map, Package, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useHealthCheck } from '@/hooks/useHealthCheck.ts';
import styles from './AppLayout.module.css';

interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', short: 'Início', icon: LayoutDashboard },
  { to: '/mapa', label: 'Mapa do estoque', short: 'Mapa', icon: Map },
  { to: '/produtos', label: 'Produtos', short: 'Produtos', icon: Package },
  { to: '/movimentacoes', label: 'Movimentações', short: 'Histórico', icon: ArrowLeftRight },
  { to: '/galpoes', label: 'Galpões', short: 'Galpões', icon: Warehouse },
];

function SystemStatus({ compact = false }: { compact?: boolean }) {
  const { data, loading } = useHealthCheck();
  const state = loading ? 'loading' : data?.status === 'ok' ? 'ok' : 'error';
  const label = loading ? 'Conectando...' : state === 'ok' ? 'Sistema online' : 'Falha de conexão';
  const title = data ? `API v${data.version} · MongoDB ${data.database.status === 'ok' ? 'conectado' : 'indisponível'}` : label;

  return (
    <span className={`${styles.status} ${styles[`status_${state}`]}`} title={title}>
      <span className={styles.statusDot} aria-hidden />
      {!compact && <span className={styles.statusLabel}>{label}</span>}
    </span>
  );
}

export default function AppLayout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            <Leaf size={20} strokeWidth={2.2} />
          </span>
          <div className={styles.brandText}>
            <strong>Amazon Agrosciences</strong>
            <span>Gestão de Estoque</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Navegação principal">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
              title={label}
            >
              <Icon size={19} aria-hidden />
              <span className={styles.navLabel}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <SystemStatus />
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.mobileHeader}>
          <div className={styles.brand}>
            <span className={styles.logo} aria-hidden>
              <Leaf size={18} strokeWidth={2.2} />
            </span>
            <div className={styles.brandText}>
              <strong>Amazon Agrosciences</strong>
            </div>
          </div>
          <SystemStatus compact />
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <nav className={styles.bottomNav} aria-label="Navegação principal">
        {NAV_ITEMS.map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `${styles.bottomLink} ${isActive ? styles.bottomActive : ''}`}
          >
            <Icon size={21} aria-hidden />
            <span>{short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
