import { useEffect, useMemo, useState } from 'react';
import { useFetch } from '@/hooks/useFetch.ts';
import { warehouseService } from '@/services/inventoryService.ts';
import type { WarehouseMap } from '@/types/inventory.ts';
import styles from './LocationPicker.module.css';

export interface LocationValue {
  sectorId: string;
  row: number;
  col: number;
}

interface LocationPickerProps {
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
  initialWarehouseId?: string;
  /** Recipiente sendo transferido: sua posição atual aparece como "atual". */
  currentContainerId?: string;
  error?: string;
}

/** Seleção de Galpão → Setor → Posição livre, com uma mini grade clicável. */
export default function LocationPicker({ value, onChange, initialWarehouseId, currentContainerId, error }: LocationPickerProps) {
  const { data: warehouses } = useFetch((signal) => warehouseService.list(signal), []);
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId ?? '');
  const [sectorId, setSectorId] = useState(value?.sectorId ?? '');

  useEffect(() => {
    if (!warehouseId && warehouses?.length) setWarehouseId(warehouses[0].id);
  }, [warehouses, warehouseId]);

  const { data: map, loading } = useFetch<WarehouseMap | null>(
    (signal) => (warehouseId ? warehouseService.map(warehouseId, signal) : Promise.resolve(null)),
    [warehouseId],
  );

  const sectors = map?.warehouse.id === warehouseId ? map.sectors : [];
  const sector = sectors.find((s) => s.id === sectorId) ?? null;

  useEffect(() => {
    if (!sectorId && sectors.length) setSectorId(sectors[0].id);
  }, [sectors, sectorId]);

  const occupied = useMemo(() => {
    const map = new Map<string, string>();
    sector?.containers.forEach((c) => map.set(`${c.row}-${c.col}`, c.id));
    return map;
  }, [sector]);

  const freeCount = sector ? sector.positions_total - occupied.size : 0;

  function changeWarehouse(id: string) {
    setWarehouseId(id);
    setSectorId('');
    onChange(null);
  }

  function changeSector(id: string) {
    setSectorId(id);
    onChange(null);
  }

  if (warehouses && warehouses.length === 0) {
    return <div className="alert alert-info">Cadastre um galpão e um setor antes de armazenar recipientes.</div>;
  }

  return (
    <div className={styles.picker}>
      <div className={styles.selects}>
        <div className="field">
          <label className="label" htmlFor="loc-warehouse">
            Galpão
          </label>
          <select id="loc-warehouse" className="select" value={warehouseId} onChange={(e) => changeWarehouse(e.target.value)}>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name} ({w.positions_total - w.positions_used} livres)
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="loc-sector">
            Setor / área
          </label>
          <select
            id="loc-sector"
            className="select"
            value={sectorId}
            onChange={(e) => changeSector(e.target.value)}
            disabled={!sectors.length}
          >
            {!sectors.length && <option value="">{loading ? 'Carregando...' : 'Nenhum setor'}</option>}
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                Setor {s.code}
                {s.name ? ` — ${s.name}` : ''} ({s.positions_total - s.positions_used} livres)
              </option>
            ))}
          </select>
        </div>
      </div>

      {sector && (
        <div className={styles.gridBox}>
          <div className={styles.gridHeader}>
            <span>Toque numa posição livre</span>
            <span className={styles.free}>{freeCount} livres</span>
          </div>
          <div className={styles.scroll}>
            <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${sector.cols}, minmax(32px, 1fr))` }}>
              {Array.from({ length: sector.rows * sector.cols }, (_, index) => {
                const row = Math.floor(index / sector.cols) + 1;
                const col = (index % sector.cols) + 1;
                const holder = occupied.get(`${row}-${col}`);
                const isCurrent = holder !== undefined && holder === currentContainerId;
                const selected = value?.sectorId === sector.id && value.row === row && value.col === col;
                const number = index + 1;
                return (
                  <button
                    key={index}
                    type="button"
                    className={`${styles.cell} ${holder ? styles.taken : ''} ${isCurrent ? styles.current : ''} ${selected ? styles.selected : ''}`}
                    disabled={Boolean(holder)}
                    onClick={() => onChange({ sectorId: sector.id, row, col })}
                    title={holder ? (isCurrent ? 'Posição atual' : 'Ocupada') : `Posição ${String(number).padStart(2, '0')}`}
                    aria-pressed={selected}
                  >
                    {String(number).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.legend}>
            <span>
              <i className={styles.legendFree} /> Livre
            </span>
            <span>
              <i className={styles.legendTaken} /> Ocupada
            </span>
            <span>
              <i className={styles.legendSelected} /> Selecionada
            </span>
          </div>
        </div>
      )}

      {value && sector && (
        <p className={styles.summary}>
          Destino: <strong className="mono">{map?.warehouse.code}-{sector.code}-{String((value.row - 1) * sector.cols + value.col).padStart(2, '0')}</strong>
          {' '}(linha {value.row}, coluna {value.col})
        </p>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
