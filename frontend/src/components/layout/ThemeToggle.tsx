import { Monitor, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext.tsx';
import type { ThemePreference } from '@/contexts/ThemeContext.tsx';
import styles from './ThemeToggle.module.css';

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Automático', icon: Monitor },
];

/**
 * "segmented": três botões (Claro / Escuro / Automático) para o menu lateral.
 * "cycle": um botão que alterna entre as opções, para espaços pequenos.
 */
export default function ThemeToggle({ variant = 'segmented' }: { variant?: 'segmented' | 'cycle' }) {
  const { preference, setPreference } = useTheme();

  if (variant === 'cycle') {
    const index = OPTIONS.findIndex((o) => o.value === preference);
    const current = OPTIONS[index];
    const next = OPTIONS[(index + 1) % OPTIONS.length];
    const Icon = current.icon;
    return (
      <button
        type="button"
        className={styles.cycle}
        onClick={() => setPreference(next.value)}
        aria-label={`Tema: ${current.label}. Tocar para mudar para ${next.label}`}
        title={`Tema: ${current.label} (clique para ${next.label})`}
      >
        <Icon size={19} />
      </button>
    );
  }

  return (
    <div className={styles.segmented} role="radiogroup" aria-label="Tema da interface">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          className={`${styles.option} ${preference === value ? styles.selected : ''}`}
          onClick={() => setPreference(value)}
          title={value === 'system' ? 'Automático: segue o tema do computador ou celular' : `Tema ${label.toLowerCase()}`}
        >
          <Icon size={15} aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
