import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArchiveRestore, CheckCircle2, MapPin, Package, PackagePlus, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import ProductForm from '@/components/products/ProductForm.tsx';
import EmptyState from '@/components/ui/EmptyState.tsx';
import Modal from '@/components/ui/Modal.tsx';
import PageHeader from '@/components/ui/PageHeader.tsx';
import { useToast } from '@/contexts/ToastContext.tsx';
import { useFetch } from '@/hooks/useFetch.ts';
import { ApiError } from '@/services/api.ts';
import { productService } from '@/services/inventoryService.ts';
import type { Product } from '@/types/inventory.ts';
import { formatLiters } from '@/utils/format.ts';
import styles from './ProductsPage.module.css';

function stockStatus(p: Product): { label: string; tone: string } {
  if (!p.active) return { label: 'Arquivado', tone: '' };
  if (p.total_volume_l <= 0) return { label: 'Sem estoque', tone: 'badge-danger' };
  if (p.low_stock) return { label: 'Estoque baixo', tone: 'badge-warning' };
  return { label: 'Em estoque', tone: 'badge-success' };
}

export default function ProductsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined); // undefined = fechado, null = novo
  const [justCreated, setJustCreated] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (params.get('novo') !== null) {
      setEditing(null);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const products = useFetch(
    (signal) => productService.list({ search: debounced, category, include_archived: showArchived }, signal),
    [debounced, category, showArchived],
  );
  const categories = useFetch((signal) => productService.categories(signal), []);

  function handleSaved(product: Product) {
    const isNew = editing === null;
    setEditing(undefined);
    products.reload();
    categories.reload();
    if (isNew) setJustCreated(product);
    else toast.success('Produto atualizado', product.name);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const result = await productService.remove(deleting.id);
      toast.success(result.result === 'archived' ? 'Produto arquivado' : 'Produto excluído', result.message);
      setDeleting(null);
      products.reload();
    } catch (err) {
      toast.error('Não foi possível excluir', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function restore(product: Product) {
    try {
      await productService.restore(product.id);
      toast.success('Produto restaurado', product.name);
      products.reload();
    } catch (err) {
      toast.error('Não foi possível restaurar', err instanceof ApiError ? err.message : undefined);
    }
  }

  const list = products.data ?? [];

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Fertilizantes cadastrados, características e estoque somado de todos os recipientes."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
            <Plus size={17} /> Novo produto
          </button>
        }
      />

      <div className={`card ${styles.toolbar}`}>
        <div className="input-group" style={{ flex: '1 1 260px' }}>
          <Search size={17} aria-hidden />
          <input
            className="input"
            type="search"
            placeholder="Buscar por nome, código, fabricante ou composição"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar produtos"
          />
        </div>
        <select className="select" style={{ flex: '0 1 220px' }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categories.data?.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className={styles.toggle}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Mostrar arquivados
        </label>
      </div>

      <div className="card">
        {products.error && <div className="alert alert-error" style={{ margin: 16 }}>{products.error}</div>}
        {products.loading && !products.data && (
          <div style={{ padding: 16, display: 'grid', gap: 10 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 44 }} />
            ))}
          </div>
        )}

        {products.data && list.length === 0 && (
          <EmptyState
            icon={Package}
            title={debounced || category ? 'Nenhum produto encontrado' : 'Nenhum fertilizante cadastrado'}
            description={
              debounced || category ? 'Ajuste a busca ou o filtro de categoria.' : 'Cadastre o primeiro produto para começar a controlar o estoque.'
            }
            action={
              !debounced &&
              !category && (
                <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
                  <Plus size={16} /> Cadastrar produto
                </button>
              )
            }
          />
        )}

        {list.length > 0 && (
          <div className="table-wrap">
            <table className="table table-responsive">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th className="num">Em estoque</th>
                  <th className="num">Recipientes</th>
                  <th>Situação</th>
                  <th className="actions">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const status = stockStatus(p);
                  const ratio = p.min_stock_l > 0 ? Math.min(100, (p.total_volume_l / p.min_stock_l) * 100) : 100;
                  return (
                    <tr key={p.id} className={!p.active ? styles.archived : undefined}>
                      <td className="primary">
                        <div className={styles.product}>
                          <span className={styles.swatch} style={{ background: p.color }} />
                          <div>
                            <strong>{p.name}</strong>
                            <span className="mono muted">
                              {p.code}
                              {p.composition ? ` · ${p.composition}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Categoria">{p.category}</td>
                      <td data-label="Em estoque" className="num">
                        <div className={styles.stock}>
                          <strong>{formatLiters(p.total_volume_l)}</strong>
                          {p.min_stock_l > 0 && (
                            <>
                              <div className="progress" title={`Mínimo: ${formatLiters(p.min_stock_l)}`}>
                                <span
                                  style={{
                                    width: `${ratio}%`,
                                    background: p.low_stock ? 'var(--color-warning-600)' : 'var(--color-success-600)',
                                  }}
                                />
                              </div>
                              <small className="muted">mín. {formatLiters(p.min_stock_l)}</small>
                            </>
                          )}
                        </div>
                      </td>
                      <td data-label="Recipientes" className="num">
                        {p.containers_count}
                      </td>
                      <td data-label="Situação">
                        <span className={`badge ${status.tone}`}>{status.label}</span>
                      </td>
                      <td className="actions">
                        {p.active ? (
                          <div className={styles.actions}>
                            {p.containers_count > 0 && (
                              <button
                                type="button"
                                className="icon-btn"
                                title="Ver no mapa"
                                aria-label="Ver no mapa"
                                onClick={() => navigate(`/mapa?busca=${encodeURIComponent(p.code)}`)}
                              >
                                <MapPin size={17} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="icon-btn"
                              title="Armazenar (nova entrada)"
                              aria-label="Armazenar"
                              onClick={() => navigate(`/mapa?novo=${p.id}`)}
                            >
                              <PackagePlus size={17} />
                            </button>
                            <button type="button" className="icon-btn" title="Editar" aria-label="Editar" onClick={() => setEditing(p)}>
                              <Pencil size={16} />
                            </button>
                            <button type="button" className="icon-btn danger" title="Excluir" aria-label="Excluir" onClick={() => setDeleting(p)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => restore(p)}>
                            <ArchiveRestore size={15} /> Restaurar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? `Editar ${editing.name}` : 'Novo produto'}
        subtitle={editing ? editing.code : 'Cadastro de fertilizante'}
        size="md"
      >
        {editing !== undefined && (
          <ProductForm
            key={editing?.id ?? 'new'}
            product={editing}
            categories={categories.data ?? []}
            onSaved={handleSaved}
            onCancel={() => setEditing(undefined)}
          />
        )}
      </Modal>

      <Modal open={justCreated !== null} onClose={() => setJustCreated(null)} title="Produto cadastrado" size="sm">
        {justCreated && (
          <div className={styles.created}>
            <CheckCircle2 size={40} className={styles.createdIcon} aria-hidden />
            <p>
              <strong>{justCreated.name}</strong> foi cadastrado. Deseja registrar agora onde ele está armazenado e quantos litros há?
            </p>
            <div className="form-actions" style={{ width: '100%' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setJustCreated(null)}>
                Depois
              </button>
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/mapa?novo=${justCreated.id}`)}>
                <PackagePlus size={16} /> Armazenar agora
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={deleting !== null} onClose={() => setDeleting(null)} title="Excluir produto" size="sm">
        {deleting && (
          <div className={styles.created} style={{ alignItems: 'stretch', textAlign: 'left' }}>
            <p>
              Excluir <strong>{deleting.name}</strong>? Se o produto já tiver histórico de movimentações, ele será{' '}
              <strong>arquivado</strong> em vez de apagado, para preservar o histórico.
            </p>
            {deleting.containers_count > 0 && (
              <div className="alert alert-error">
                Há {deleting.containers_count} recipiente(s) com este produto. Remova-os no mapa antes de excluir.
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleting(null)} disabled={busy}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={busy || deleting.containers_count > 0}>
                {busy && <span className="spinner" aria-hidden />}
                Excluir
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
