import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Map as MapIcon, MapPin, PackagePlus, Search, Warehouse as WarehouseIcon, X } from 'lucide-react';
import ContainerForm from '@/components/map/ContainerForm.tsx';
import ContainerPanel from '@/components/map/ContainerPanel.tsx';
import MapGuide from '@/components/map/MapGuide.tsx';
import SectorGrid from '@/components/map/SectorGrid.tsx';
import type { LocationValue } from '@/components/map/LocationPicker.tsx';
import EmptyState from '@/components/ui/EmptyState.tsx';
import Modal from '@/components/ui/Modal.tsx';
import PageHeader from '@/components/ui/PageHeader.tsx';
import { useToast } from '@/contexts/ToastContext.tsx';
import { useFetch } from '@/hooks/useFetch.ts';
import { containerService, productService, warehouseService } from '@/services/inventoryService.ts';
import type { Container, Product, WarehouseMap } from '@/types/inventory.ts';
import { formatLiters, formatPercent } from '@/utils/format.ts';
import styles from './MapPage.module.css';

interface EntryState {
  productId?: string;
  location?: LocationValue | null;
}

export default function MapPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [searchText, setSearchText] = useState(params.get('busca') ?? '');
  const [debounced, setDebounced] = useState(searchText);
  const [selected, setSelected] = useState<Container | null>(null);
  const [entry, setEntry] = useState<EntryState | null>(null);
  const [flash, setFlash] = useState<Set<string> | null>(null);

  const warehouseParam = params.get('galpao') ?? '';

  const warehouses = useFetch((signal) => warehouseService.list(signal), []);
  const products = useFetch((signal) => productService.list({}, signal), []);
  const types = useFetch((signal) => containerService.types(signal), []);

  const warehouseId = warehouseParam || warehouses.data?.[0]?.id || '';

  const map = useFetch<WarehouseMap | null>(
    (signal) => (warehouseId ? warehouseService.map(warehouseId, signal) : Promise.resolve(null)),
    [warehouseId],
  );

  // Busca global (todos os galpões) com atraso para não consultar a cada tecla
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(searchText.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const results = useFetch<Container[] | null>(
    (signal) => (debounced ? containerService.list({ search: debounced }, signal) : Promise.resolve(null)),
    [debounced],
  );

  // Abre a entrada quando vem de outra tela (?novo=<produto>)
  useEffect(() => {
    const novo = params.get('novo');
    if (novo !== null) {
      setEntry({ productId: novo && novo !== '1' ? novo : undefined });
      const next = new URLSearchParams(params);
      next.delete('novo');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const highlighted = useMemo(() => {
    if (flash) return flash;
    if (!debounced || !results.data) return null;
    return new Set(results.data.map((c) => c.id));
  }, [debounced, results.data, flash]);

  // Rola até o primeiro recipiente destacado
  useEffect(() => {
    if (!highlighted || !map.data) return;
    const first = map.data.sectors.flatMap((s) => s.containers).find((c) => highlighted.has(c.id));
    if (first) document.getElementById(`slot-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [highlighted, map.data]);

  const resultsByWarehouse = useMemo(() => {
    const groups = new Map<string, { code: string; count: number }>();
    results.data?.forEach((c) => {
      if (!c.warehouse_id) return;
      const group = groups.get(c.warehouse_id) ?? { code: c.warehouse_code, count: 0 };
      group.count += 1;
      groups.set(c.warehouse_id, group);
    });
    return [...groups.entries()].sort((a, b) => a[1].code.localeCompare(b[1].code));
  }, [results.data]);

  const legend = useMemo(() => {
    const totals = new Map<string, { name: string; code: string; color: string; volume: number; count: number }>();
    map.data?.sectors.forEach((s) =>
      s.containers.forEach((c) => {
        const item = totals.get(c.product_id) ?? { name: c.product_name, code: c.product_code, color: c.product_color, volume: 0, count: 0 };
        item.volume += c.volume_l;
        item.count += 1;
        totals.set(c.product_id, item);
      }),
    );
    return [...totals.values()].sort((a, b) => b.volume - a.volume);
  }, [map.data]);

  function selectWarehouse(id: string) {
    const next = new URLSearchParams(params);
    next.set('galpao', id);
    setParams(next, { replace: true });
  }

  function refresh() {
    map.reload();
    warehouses.reload();
    products.reload();
  }

  function handleCreated(container: Container) {
    setEntry(null);
    toast.success(`${container.code} armazenado`, `${container.product_name} · ${container.location_label}`);
    if (container.warehouse_id && container.warehouse_id !== warehouseId) selectWarehouse(container.warehouse_id);
    setFlash(new Set([container.id]));
    window.setTimeout(() => setFlash(null), 4500);
    refresh();
  }

  function handleChanged(container: Container, message: string) {
    toast.success(message);
    setSelected(container.status === 'active' ? container : null);
    refresh();
  }

  function addProduct(product: Product) {
    products.setData((list) => (list ? [...list, product].sort((a, b) => a.name.localeCompare(b.name)) : [product]));
  }

  const warehouse = map.data?.warehouse;
  const noWarehouses = warehouses.data && warehouses.data.length === 0;

  return (
    <>
      <PageHeader
        eyebrow="Estoque"
        icon={MapIcon}
        title="Mapa do estoque"
        description="Planta vista de cima de cada galpão. Cada quadrado é uma posição no chão: os coloridos têm um recipiente, os tracejados estão livres."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEntry({})} disabled={Boolean(noWarehouses)}>
            <PackagePlus size={17} /> Nova entrada
          </button>
        }
      />

      {noWarehouses ? (
        <div className="card">
          <EmptyState
            icon={WarehouseIcon}
            title="Nenhum galpão cadastrado"
            description="Cadastre os galpões e seus setores (grade de posições) para começar a montar o mapa."
            action={
              <Link className="btn btn-primary" to="/galpoes">
                Cadastrar galpões
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <div className={`input-group ${styles.search}`}>
              <Search size={17} aria-hidden />
              <input
                className="input"
                type="search"
                placeholder="Onde está? Busque por produto, código do IBC, lote ou posição"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                aria-label="Buscar no estoque"
              />
              {searchText && (
                <button type="button" className={`icon-btn ${styles.clear}`} onClick={() => setSearchText('')} aria-label="Limpar busca">
                  <X size={16} />
                </button>
              )}
            </div>
            <p className={styles.searchHint}>
              Digite o nome do fertilizante, o código do recipiente (ex.: <code>IBC-0012</code>), o lote ou a posição (ex.:{' '}
              <code>G01-A-07</code>). A busca procura em todos os galpões.
            </p>
          </div>

          {debounced && results.data && (
            <div className={styles.results}>
              <MapPin size={16} aria-hidden />
              {results.data.length === 0 ? (
                <span>Nenhum recipiente encontrado para “{debounced}”.</span>
              ) : (
                <>
                  <span>
                    <strong>{results.data.length}</strong> recipiente(s) com “{debounced}”:
                  </span>
                  <div className={styles.resultChips}>
                    {resultsByWarehouse.map(([id, group]) => (
                      <button
                        key={id}
                        type="button"
                        className={`${styles.chip} ${id === warehouseId ? styles.chipActive : ''}`}
                        onClick={() => selectWarehouse(id)}
                      >
                        {group.code} <b>{group.count}</b>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className={styles.tabs} role="tablist" aria-label="Galpões">
            {warehouses.data?.map((w) => {
              const pct = w.positions_total ? (w.positions_used / w.positions_total) * 100 : 0;
              return (
                <button
                  key={w.id}
                  type="button"
                  role="tab"
                  aria-selected={w.id === warehouseId}
                  className={`${styles.tab} ${w.id === warehouseId ? styles.tabActive : ''}`}
                  onClick={() => selectWarehouse(w.id)}
                >
                  <span className={styles.tabCode}>{w.code}</span>
                  <span className={styles.tabMeta}>{formatPercent(pct)} ocupado</span>
                  <span className={styles.tabBar}>
                    <span style={{ width: `${pct}%` }} />
                  </span>
                </button>
              );
            })}
          </div>

          <MapGuide />

          {warehouse && (
            <div className={styles.summary}>
              <div>
                <h2>{warehouse.name}</h2>
                {warehouse.description && <p>{warehouse.description}</p>}
              </div>
              <dl>
                <div>
                  <dt>Posições</dt>
                  <dd>
                    {warehouse.positions_used}/{warehouse.positions_total}
                  </dd>
                </div>
                <div>
                  <dt>Volume</dt>
                  <dd>{formatLiters(warehouse.total_volume_l)}</dd>
                </div>
                <div>
                  <dt>Setores</dt>
                  <dd>{warehouse.sectors.length}</dd>
                </div>
              </dl>
            </div>
          )}

          {legend.length > 0 && (
            <div className={styles.legend} aria-label="Legenda de cores dos produtos">
              <span className={styles.legendTitle}>Cores dos produtos neste galpão:</span>
              {legend.map((item) => (
                <span key={item.code} className={styles.legendItem} title={item.name}>
                  <span className="color-dot" style={{ background: item.color }} />
                  <span className={styles.legendName}>{item.name}</span>
                  <span className="muted">{formatLiters(item.volume)}</span>
                </span>
              ))}
            </div>
          )}

          {map.error && <div className="alert alert-error">{map.error}</div>}
          {map.loading && !map.data && <div className="skeleton" style={{ height: 320 }} />}

          {map.data && map.data.sectors.length === 0 && (
            <div className="card">
              <EmptyState
                icon={WarehouseIcon}
                title="Este galpão ainda não tem setores"
                description="Crie setores/áreas com o número de linhas e colunas de posições na tela de Galpões."
                action={
                  <Link className="btn btn-secondary" to="/galpoes">
                    Configurar setores
                  </Link>
                }
              />
            </div>
          )}

          <div className={styles.sectors}>
            {map.data?.sectors.map((sector) => (
              <SectorGrid
                key={sector.id}
                sector={sector}
                warehouseCode={map.data?.warehouse.code ?? ''}
                highlighted={highlighted}
                onSelect={setSelected}
                onEmpty={(row, col) => setEntry({ location: { sectorId: sector.id, row, col } })}
              />
            ))}
          </div>
        </>
      )}

      <Modal
        open={entry !== null}
        onClose={() => setEntry(null)}
        title="Nova entrada no estoque"
        subtitle="Produto, quantidade em litros e posição no galpão"
        size="lg"
      >
        {entry && (
          <ContainerForm
            products={products.data ?? []}
            types={types.data ?? []}
            initialProductId={entry.productId}
            initialWarehouseId={warehouseId}
            initialLocation={entry.location}
            onProductCreated={addProduct}
            onSaved={handleCreated}
            onCancel={() => setEntry(null)}
          />
        )}
      </Modal>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.type_name} ${selected.code}` : ''}
        subtitle={selected?.location_code}
        size="md"
      >
        {selected && <ContainerPanel key={selected.id} container={selected} onChanged={handleChanged} />}
      </Modal>
    </>
  );
}
