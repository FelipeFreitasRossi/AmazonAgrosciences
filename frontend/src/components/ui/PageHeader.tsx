import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  /** Pequeno texto acima do título, ex.: a seção do menu. */
  eyebrow?: string;
  icon?: LucideIcon;
  description?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, eyebrow, icon: Icon, description, actions }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.lead}>
        {Icon && (
          <span className={styles.icon} aria-hidden>
            <Icon size={22} />
          </span>
        )}
        <div className={styles.text}>
          {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
