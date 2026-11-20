import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { Grid3x3, Map as MapIcon, Pencil, Plus, Sparkles, Trash2, Warehouse as WarehouseIcon } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState.tsx';
import HelpPanel from '@/components/ui/HelpPanel.tsx';
import Modal from '@/components/ui/Modal.tsx';
import PageHeader from '@/components/ui/PageHeader.tsx';
import { useToast } from '@/contexts/ToastContext.tsx';
import { useFetch } from '@/hooks/useFetch.ts';
import { ApiError } from '@/services/api.ts';
import { setupService, warehouseService } from '@/services/inventoryService.ts';
import type { Sector, Warehouse } from '@/types/inventory.ts';
import { formatLiters, formatPercent } from '@/utils/format.ts';
import styles from './WarehousesPage.module.css';

type Dialog =
  | { kind: 'warehouse'; warehouse: Warehouse | null }
  | { kind: 'sector'; warehouse: Warehouse; sector: Sector | null }
  | { kind: 'delete-warehouse'; warehouse: Warehouse }
  | { kind: 'delete-sector'; warehouse: Warehouse; sector: Sector };

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

export default function WarehousesPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useFetch((signal) => warehouseService.list(signal), []);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function createDemo() {
    setSeeding(true);
    try {
      const result = await setupService.createDemo();
      toast.success('Dados de exemplo criados', `${result.warehouses} galpões e ${result.containers} recipientes.`);
      reload();
    } catch (err) {
      toast.error('Não foi possível gerar os dados', err instanceof ApiError ? err.message : undefined);
    } finally {
      setSeeding(false);
    }
  }

  function done(message: string) {
    setDialog(null);
    toast.success(message);
    reload();
  }

  return (
    <>
      <PageHeader
        eyebrow="Cadastros"
        icon={WarehouseIcon}
        title="Galpões"
        description="Estrutura física do estoque. Aqui você desenha cada galpão para que ele apareça no mapa."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setDialog({ kind: 'warehouse', warehouse: null })}>
            <Plus size={17} /> Novo galpão
          </button>
        }
      />

      <HelpPanel
        id="galpoes"
        title="Como a estrutura funciona"
        steps={[
          <><strong>Galpão</strong>: o prédio (ex.: G01 — Galpão 01).</>,
          <><strong>Setor</strong>: uma área dentro do galpão (ex.: Setor A), desenhada como uma grade de <strong>linhas × colunas</strong>.</>,
          <><strong>Posição</strong>: cada quadrado da grade, onde cabe um IBC ou barril. Numeradas da esquerda para a direita, linha por linha.</>,
          <>O endereço completo fica <code>G01-A-07</code>: Galpão 01, Setor A, Posição 07.</>,
        ]}
        footer="Dica: desenhe a grade como as posições realmente estão no chão do galpão; assim o mapa fica fiel ao local."
      />

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {loading && !data && (
        <div className={styles.grid}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 260 }} />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="card">
          <EmptyState
            icon={WarehouseIcon}
            title="Nenhum galpão cadastrado"
            description="Cadastre cada galpão e divida-o em setores. Cada setor é uma grade de posições (linhas × colunas) onde ficam os IBCs e barris."
            action={
              <>
                <button type="button" className="btn btn-primary" onClick={() => setDialog({ kind: 'warehouse', warehouse: null })}>
                  <Plus size={16} /> Cadastrar galpão
                </button>
                <button type="button" className="btn btn-secondary" onClick={createDemo} disabled={seeding}>
                  {seeding ? <span className="spinner" aria-hidden /> : <Sparkles size={16} />}
                  Gerar dados de exemplo
                </button>
              </>
            }
          />
        </div>
      )}

      <div className={styles.grid}>
        {data?.map((w) => {
          const pct = w.positions_total ? (w.positions_used / w.positions_total) * 100 : 0;
          return (
            <article key={w.id} className={`card ${styles.warehouse}`}>
              <header className={styles.header}>
                <span className={styles.code}>{w.code}</span>
                <div className={styles.title}>
                  <h2>{w.name}</h2>
                  {w.description && <p>{w.description}</p>}
                </div>
                <div className={styles.headerActions}>
                  <button type="button" className="icon-btn" title="Editar" aria-label="Editar galpão" onClick={() => setDialog({ kind: 'warehouse', warehouse: w })}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" className="icon-btn danger" title="Excluir" aria-label="Excluir galpão" onClick={() => setDialog({ kind: 'delete-warehouse', warehouse: w })}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </header>

              <div className={styles.stats}>
                <div>
                  <span>Ocupação</span>
                  <strong>{formatPercent(pct)}</strong>
                </div>
                <div>
                  <span>Posições</span>
                  <strong>
                    {w.positions_used}/{w.positions_total}
                  </strong>
                </div>
                <div>
                  <span>Volume</span>
                  <strong>{formatLiters(w.total_volume_l)}</strong>
                </div>
              </div>
              <div className="progress" style={{ margin: '0 18px' }}>
                <span style={{ width: `${pct}%` }} />
              </div>

              <ul className={styles.sectors}>
                {w.sectors.length === 0 && <li className={styles.noSectors}>Nenhum setor. Adicione o primeiro para montar o mapa.</li>}
                {w.sectors.map((s) => (
                  <li key={s.id}>
                    <Grid3x3 size={16} className={styles.sectorIcon} aria-hidden />
                    <div className={styles.sectorText}>
                      <strong>
                        Setor {s.code}
                        {s.name && <span> · {s.name}</span>}
                      </strong>
                      <small>
                        {s.rows} × {s.cols} = {s.positions_total} posições · {s.positions_used} ocupadas
                      </small>
                    </div>
                    <button type="button" className="icon-btn" title="Editar setor" aria-label="Editar setor" onClick={() => setDialog({ kind: 'sector', warehouse: w, sector: s })}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="icon-btn danger" title="Excluir setor" aria-label="Excluir setor" onClick={() => setDialog({ kind: 'delete-sector', warehouse: w, sector: s })}>
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>

              <footer className={styles.footer}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: 'sector', warehouse: w, sector: null })}>
                  <Plus size={15} /> Adicionar setor
                </button>
                <Link to={`/mapa?galpao=${w.id}`} className="btn btn-ghost btn-sm">
                  <MapIcon size={15} /> Ver no mapa
                </Link>
              </footer>
            </article>
          );
        })}
      </div>

      <Modal
        open={dialog?.kind === 'warehouse'}
        onClose={() => setDialog(null)}
        title={dialog?.kind === 'warehouse' && dialog.warehouse ? `Editar ${dialog.warehouse.name}` : 'Novo galpão'}
        size="sm"
      >
        {dialog?.kind === 'warehouse' && (
          <WarehouseForm
            warehouse={dialog.warehouse}
            onCancel={() => setDialog(null)}
            onSaved={(w) => done(dialog.warehouse ? `${w.name} atualizado.` : `${w.name} cadastrado. Agora adicione os setores.`)}
          />
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'sector'}
        onClose={() => setDialog(null)}
        title={dialog?.kind === 'sector' && dialog.sector ? `Editar setor ${dialog.sector.code}` : 'Novo setor'}
        subtitle={dialog?.kind === 'sector' ? `${dialog.warehouse.code} — ${dialog.warehouse.name}` : undefined}
        size="sm"
      >
        {dialog?.kind === 'sector' && (
          <SectorForm
            warehouse={dialog.warehouse}
            sector={dialog.sector}
            onCancel={() => setDialog(null)}
            onSaved={() => done(dialog.sector ? 'Setor atualizado.' : 'Setor criado. As posições já aparecem no mapa.')}
          />
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'delete-warehouse' || dialog?.kind === 'delete-sector'}
        onClose={() => setDialog(null)}
        title="Confirmar exclusão"
        size="sm"
      >
        {(dialog?.kind === 'delete-warehouse' || dialog?.kind === 'delete-sector') && (
          <ConfirmDelete
            message={
              dialog.kind === 'delete-warehouse'
                ? `Excluir o galpão ${dialog.warehouse.code} e todos os seus setores? Só é possível se não houver recipientes armazenados.`
                : `Excluir o setor ${dialog.sector.code} de ${dialog.warehouse.code}? Só é possível se não houver recipientes nele.`
            }
            onCancel={() => setDialog(null)}
            onConfirm={async () => {
              if (dialog.kind === 'delete-warehouse') await warehouseService.remove(dialog.warehouse.id);
              else await warehouseService.removeSector(dialog.sector.id);
              done('Excluído com sucesso.');
            }}
          />
        )}
      </Modal>
    </>
  );
}

function WarehouseForm({ warehouse, onSaved, onCancel }: { warehouse: Warehouse | null; onSaved: (w: Warehouse) => void; onCancel: () => void }) {
  const [code, setCode] = useState(warehouse?.code ?? '');
  const [name, setName] = useState(warehouse?.name ?? '');
  const [description, setDescription] = useState(warehouse?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!CODE_PATTERN.test(code.trim())) return setError('Código inválido. Use letras e números, ex.: G01.');
    if (name.trim().length < 2) return setError('Informe o nome do galpão.');
    setSaving(true);
    setError(null);
    try {
      const payload = { code: code.trim().toUpperCase(), name: name.trim(), description: description.trim() || null };
      onSaved(warehouse ? await warehouseService.update(warehouse.id, payload) : await warehouseService.create(payload));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="form-grid">
      {error && <div className="alert alert-error span-2">{error}</div>}
      <div className="field">
        <label className="label" htmlFor="w-code">
          Código
        </label>
        <input id="w-code" className="input mono" placeholder="G01" value={code} onChange={(e) => setCode(e.target.value)} maxLength={30} />
      </div>
      <div className="field">
        <label className="label" htmlFor="w-name">
          Nome
        </label>
        <input id="w-name" className="input" placeholder="Galpão 01" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field span-2">
        <label className="label" htmlFor="w-desc">
          Descrição <span className="optional">(opcional)</span>
        </label>
        <textarea id="w-desc" className="textarea" placeholder="Ex.: Galpão próximo à doca 2" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-actions span-2">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner" aria-hidden />}
          Salvar
        </button>
      </div>
    </form>
  );
}

function SectorForm({
  warehouse,
  sector,
  onSaved,
  onCancel,
}: {
  warehouse: Warehouse;
  sector: Sector | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const nextLetter = String.fromCharCode(65 + Math.min(25, warehouse.sectors.length));
  const [code, setCode] = useState(sector?.code ?? nextLetter);
  const [name, setName] = useState(sector?.name ?? '');
  const [rows, setRows] = useState(String(sector?.rows ?? 4));
  const [cols, setCols] = useState(String(sector?.cols ?? 8));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const r = Number(rows);
  const c = Number(cols);
  const validSize = Number.isInteger(r) && Number.isInteger(c) && r >= 1 && r <= 26 && c >= 1 && c <= 40;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!sector && !CODE_PATTERN.test(code.trim())) return setError('Código inválido. Ex.: A, B, C.');
    if (!validSize) return setError('Linhas entre 1 e 26 e colunas entre 1 e 40.');
    setSaving(true);
    setError(null);
    try {
      if (sector) await warehouseService.updateSector(sector.id, { name: name.trim() || null, rows: r, cols: c });
      else await warehouseService.createSector(warehouse.id, { code: code.trim().toUpperCase(), name: name.trim() || null, rows: r, cols: c });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="form-grid">
      {error && <div className="alert alert-error span-2">{error}</div>}
      <div className="field">
        <label className="label" htmlFor="s-code">
          Código
        </label>
        <input id="s-code" className="input mono" value={code} onChange={(e) => setCode(e.target.value)} disabled={Boolean(sector)} maxLength={30} />
      </div>
      <div className="field">
        <label className="label" htmlFor="s-name">
          Nome <span className="optional">(opcional)</span>
        </label>
        <input id="s-name" className="input" placeholder="Ex.: Área de foliares" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="s-rows">
          Linhas
        </label>
        <input id="s-rows" className="input" type="number" min={1} max={26} inputMode="numeric" value={rows} onChange={(e) => setRows(e.target.value)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="s-cols">
          Colunas
        </label>
        <input id="s-cols" className="input" type="number" min={1} max={40} inputMode="numeric" value={cols} onChange={(e) => setCols(e.target.value)} />
      </div>
      <div className="span-2">
        {validSize ? (
          <div className={styles.preview}>
            <div className={styles.previewGrid} style={{ gridTemplateColumns: `repeat(${c}, 1fr)` }}>
              {Array.from({ length: Math.min(r * c, 400) }, (_, i) => (
                <span key={i} />
              ))}
            </div>
            <span className="hint">
              {r * c} posições, numeradas de 01 a {String(r * c).padStart(2, '0')} da esquerda para a direita, linha a linha.
            </span>
          </div>
        ) : (
          <span className="field-error">Linhas entre 1 e 26 e colunas entre 1 e 40.</span>
        )}
      </div>
      <div className="form-actions span-2">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner" aria-hidden />}
          Salvar
        </button>
      </div>
    </form>
  );
}

function ConfirmDelete({ message, onConfirm, onCancel }: { message: string; onConfirm: () => Promise<void>; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir.');
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p>{message}</p>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
          {busy && <span className="spinner" aria-hidden />}
          Excluir
        </button>
      </div>
    </div>
  );
}
