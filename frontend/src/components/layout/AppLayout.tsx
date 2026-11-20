import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { ArrowLeftRight, BookOpen, LayoutDashboard, Leaf, Map, Package, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Glossary from '@/components/ui/Glossary.tsx';
import Modal from '@/components/ui/Modal.tsx';
import { useHealthCheck } from '@/hooks/useHealthCheck.ts';
import ThemeToggle from './ThemeToggle.tsx';
import styles from './AppLayout.module.css';

interface NavItem {
  to: string;
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Visão geral',
    items: [{ to: '/', label: 'Dashboard', short: 'Início', description: 'Resumo e alertas do estoque', icon: LayoutDashboard }],
  },
  {
    title: 'Estoque',
    items: [
      { to: '/mapa', label: 'Mapa do estoque', short: 'Mapa', description: 'Onde está cada recipiente', icon: Map },
      {
        to: '/movimentacoes',
        label: 'Movimentações',
        short: 'Histórico',
        description: 'Entradas, saídas e transferências',
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { to: '/produtos', label: 'Produtos', short: 'Produtos', description: 'Fertilizantes e características', icon: Package },
      { to: '/galpoes', label: 'Galpões', short: 'Galpões', description: 'Galpões, setores e posições', icon: Warehouse },
    ],
  },
];

const MOBILE_ORDER = ['/', '/mapa', '/produtos', '/movimentacoes', '/galpoes'];
const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const MOBILE_ITEMS = MOBILE_ORDER.map((to) => ALL_ITEMS.find((item) => item.to === to)!);

function SystemStatus({ compact = false }: { compact?: boolean }) {
  const { data, loading } = useHealthCheck();
  const state = loading ? 'loading' : data?.status === 'ok' ? 'ok' : 'error';
  const label = loading ? 'Conectando...' : state === 'ok' ? 'Sistema online' : 'Falha de conexão';
  const detail = data
    ? `API v${data.version} · banco ${data.database.status === 'ok' ? 'conectado' : 'indisponível'}`
    : loading
      ? 'Verificando servidor'
      : 'Backend não está respondendo';

  return (
    <span className={`${styles.status} ${styles[`status_${state}`]}`} title={`${label} · ${detail}`}>
      <span className={styles.statusDot} aria-hidden />
      {!compact && (
        <span className={styles.statusText}>
          <span>{label}</span>
          <small>{detail}</small>
        </span>
      )}
    </span>
  );
}

export default function AppLayout() {
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const { pathname } = useLocation();

  // Ao trocar de tela, começa sempre do topo (filtros na mesma tela, como ?galpao=, não rolam)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className={styles.navGroup}>
              <span className={styles.groupTitle}>{group.title}</span>
              {group.items.map(({ to, label, description, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                  title={`${label}: ${description}`}
                >
                  <Icon size={19} aria-hidden />
                  <span className={styles.navText}>
                    <span className={styles.navLabel}>{label}</span>
                    <small className={styles.navDescription}>{description}</small>
                  </span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.helpButton} onClick={() => setGlossaryOpen(true)} title="Glossário e ajuda">
            <BookOpen size={18} aria-hidden />
            <span className={styles.navText}>
              <span className={styles.navLabel}>Glossário e ajuda</span>
              <small className={styles.navDescription}>O que significa cada termo</small>
            </span>
          </button>
          <div className={styles.themeFull}>
            <ThemeToggle />
          </div>
          <div className={styles.themeCompact}>
            <ThemeToggle variant="cycle" />
          </div>
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
              <span>Gestão de Estoque</span>
            </div>
          </div>
          <div className={styles.mobileActions}>
            <SystemStatus compact />
            <ThemeToggle variant="cycle" />
            <button type="button" className={styles.mobileHelp} onClick={() => setGlossaryOpen(true)} aria-label="Glossário e ajuda">
              <BookOpen size={19} />
            </button>
          </div>
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <nav className={styles.bottomNav} aria-label="Navegação principal">
        {MOBILE_ITEMS.map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `${styles.bottomLink} ${isActive ? styles.bottomActive : ''}`}
          >
            <span className={styles.bottomIcon}>
              <Icon size={20} aria-hidden />
            </span>
            <span>{short}</span>
          </NavLink>
        ))}
      </nav>

      <Modal
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
        title="Glossário e ajuda"
        subtitle="O que significa cada termo usado no sistema"
        size="md"
      >
        <Glossary />
      </Modal>
    </div>
  );
}
