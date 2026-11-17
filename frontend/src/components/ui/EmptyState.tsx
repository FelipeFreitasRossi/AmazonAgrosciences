import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 52,
          height: 52,
          borderRadius: 14,
          background: 'var(--color-brand-50)',
          color: 'var(--color-brand-600)',
        }}
      >
        <Icon size={24} aria-hidden />
      </span>
      <strong style={{ fontSize: 16 }}>{title}</strong>
      {description && <p style={{ maxWidth: 420, color: 'var(--color-text-muted)', fontSize: 14 }}>{description}</p>}
      {action && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 6 }}>{action}</div>}
    </div>
  );
}
