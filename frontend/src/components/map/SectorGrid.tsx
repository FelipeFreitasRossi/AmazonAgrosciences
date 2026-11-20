import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import type { Container, SectorMap } from '@/types/inventory.ts';
import { daysUntil, formatLiters, formatNumber } from '@/utils/format.ts';
import styles from './SectorGrid.module.css';

interface SectorGridProps {
  sector: SectorMap;
  warehouseCode: string;
  /** IDs destacados pela busca; null = sem busca ativa. */
  highlighted: Set<string> | null;
  onSelect: (container: Container) => void;
  onEmpty: (row: number, col: number) => void;
}

/** Planta 2D de um setor: cada célula é uma posição; recipientes aparecem com a cor do produto e o nível. */
export default function SectorGrid({ sector, warehouseCode, highlighted, onSelect, onEmpty }: SectorGridProps) {
  const byPosition = useMemo(() => {
    const result = new Map<string, Container>();
    sector.containers.forEach((c) => result.set(`${c.row}-${c.col}`, c));
    return result;
  }, [sector.containers]);

  const volume = sector.containers.reduce((sum, c) => sum + c.volume_l, 0);
  const matches = highlighted ? sector.containers.filter((c) => highlighted.has(c.id)).length : 0;

  return (
    <section className={`card ${styles.sector}`}>
      <header className={styles.header}>
        <div>
          <h3>
            Setor {sector.code}
            {sector.name && <span> · {sector.name}</span>}
          </h3>
          <p>
            {sector.rows} linhas × {sector.cols} colunas · <strong>{sector.positions_total - sector.positions_used} livres</strong> de{' '}
            {sector.positions_total} · {formatLiters(volume)} armazenados
          </p>
        </div>
        {highlighted && matches > 0 && <span className="badge badge-info">{matches} encontrado(s)</span>}
      </header>

      <div className={styles.scroll}>
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `28px repeat(${sector.cols}, minmax(var(--slot-min), 1fr))` }}
        >
          <span />
          {Array.from({ length: sector.cols }, (_, i) => (
            <span key={`c${i}`} className={styles.axis} title={`Coluna ${i + 1}`}>
              C{i + 1}
            </span>
          ))}

          {Array.from({ length: sector.rows }, (_, r) => {
            const row = r + 1;
            return [
              <span key={`r${row}`} className={styles.axis} title={`Linha ${row}`}>
                L{row}
              </span>,
              ...Array.from({ length: sector.cols }, (_, c) => {
                const col = c + 1;
                const number = String((row - 1) * sector.cols + col).padStart(2, '0');
                const container = byPosition.get(`${row}-${col}`);

                if (!container) {
                  return (
                    <button
                      key={`${row}-${col}`}
                      type="button"
                      className={`${styles.slot} ${styles.empty} ${highlighted ? styles.dim : ''}`}
                      onClick={() => onEmpty(row, col)}
                      title={`${warehouseCode}-${sector.code}-${number} · livre`}
                    >
                      <span className={styles.number}>{number}</span>
                      <Plus size={16} className={styles.plus} aria-hidden />
                    </button>
                  );
                }

                const days = daysUntil(container.expiry_date);
                const expiring = days !== null && days <= 60;
                const isMatch = highlighted?.has(container.id);
                return (
                  <button
                    key={`${row}-${col}`}
                    id={`slot-${container.id}`}
                    type="button"
                    className={`${styles.slot} ${styles.filled} ${highlighted ? (isMatch ? styles.match : styles.dim) : ''}`}
                    style={{ '--product': container.product_color } as CSSProperties}
                    onClick={() => onSelect(container)}
                    title={`${container.location_code} · ${container.product_name} · ${formatLiters(container.volume_l)} de ${formatLiters(container.capacity_l)}`}
                  >
                    <span className={styles.level} style={{ height: `${container.fill_pct}%` }} />
                    <span className={styles.slotTop}>
                      <span className={styles.number}>{number}</span>
                      <span className={styles.type}>{container.type_code}</span>
                    </span>
                    <span className={styles.slotVolume}>{formatNumber(Math.round(container.volume_l))} L</span>
                    <span className={styles.slotProduct}>{container.product_code}</span>
                    {expiring && (
                      <span
                        className={`${styles.flag} ${days !== null && days < 0 ? styles.flagDanger : ''}`}
                        title={days !== null && days < 0 ? 'Vencido' : 'Vence em breve'}
                      />
                    )}
                  </button>
                );
              }),
            ];
          })}
        </div>
      </div>
    </section>
  );
}
