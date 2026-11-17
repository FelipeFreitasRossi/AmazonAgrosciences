import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import styles from './StatusCard.module.css';

export type StatusState = 'ok' | 'error' | 'loading';

interface StatusCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  state: StatusState;
  meta?: string;
}

const STATE_LABEL: Record<StatusState, string> = {
  ok: 'Operacional',
  error: 'Indisponível',
  loading: 'Verificando',
};

export default function StatusCard({ icon: Icon, title, description, state, meta }: StatusCardProps) {
  const StateIcon = state === 'ok' ? CheckCircle2 : state === 'error' ? XCircle : Loader2;

  return (
    <article className={`${styles.card} ${styles[state]}`} aria-live="polite">
      <div className={styles.header}>
        <span className={styles.iconBox}>
          <Icon size={20} strokeWidth={2} aria-hidden />
        </span>
        <span className={styles.badge}>
          <StateIcon size={14} className={state === 'loading' ? styles.spin : undefined} aria-hidden />
          {STATE_LABEL[state]}
        </span>
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {meta && <p className={styles.meta}>{meta}</p>}
    </article>
  );
}
