import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import styles from './HelpPanel.module.css';

interface HelpPanelProps {
  /** Identificador para lembrar se o painel foi recolhido neste navegador. */
  id: string;
  title?: string;
  steps: ReactNode[];
  footer?: ReactNode;
}

const KEY = (id: string) => `amazon-agro:ajuda:${id}`;

function readCollapsed(id: string): boolean {
  try {
    return localStorage.getItem(KEY(id)) === 'recolhido';
  } catch {
    return false;
  }
}

/** Painel "Como funciona esta tela", aberto na primeira visita e recolhível depois. */
export default function HelpPanel({ id, title = 'Como funciona esta tela', steps, footer }: HelpPanelProps) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(id));

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(KEY(id), next ? 'recolhido' : 'aberto');
    } catch {
      /* sem armazenamento: apenas não lembra */
    }
  }

  return (
    <section className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}>
      <button type="button" className={styles.header} onClick={toggle} aria-expanded={!collapsed}>
        <span className={styles.icon}>
          <Lightbulb size={16} aria-hidden />
        </span>
        <strong>{title}</strong>
        <span className={styles.hint}>{collapsed ? 'Mostrar' : 'Ocultar'}</span>
        <ChevronDown size={16} className={styles.chevron} aria-hidden />
      </button>
      {!collapsed && (
        <div className={styles.body}>
          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <li key={index}>
                <span className={styles.number}>{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {footer && <p className={styles.footer}>{footer}</p>}
        </div>
      )}
    </section>
  );
}
