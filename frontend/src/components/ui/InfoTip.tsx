import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import styles from './InfoTip.module.css';

interface InfoTipProps {
  /** Texto curto explicando o termo ou o número. */
  children: ReactNode;
  label?: string;
  align?: 'left' | 'center' | 'right';
}

/** Ícone "i" que mostra uma explicação ao passar o mouse, focar com o teclado ou tocar no celular. */
export default function InfoTip({ children, label = 'O que é isso?', align = 'center' }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={styles.wrap}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info size={14} aria-hidden />
      </button>
      {open && (
        <span role="tooltip" className={`${styles.bubble} ${styles[align]}`}>
          {children}
        </span>
      )}
    </span>
  );
}
