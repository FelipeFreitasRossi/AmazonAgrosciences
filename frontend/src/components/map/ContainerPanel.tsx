import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Info, MoveRight, Pencil, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch.ts';
import { useResponsible } from '@/hooks/useResponsible.ts';
import { ApiError } from '@/services/api.ts';
import { containerService, movementService } from '@/services/inventoryService.ts';
import type { Container } from '@/types/inventory.ts';
import {
  MOVEMENT_META,
  expiryStatus,
  formatDate,
  formatDateTime,
  formatLiters,
  parseDecimal,
} from '@/utils/format.ts';
import LocationPicker from './LocationPicker.tsx';
import type { LocationValue } from './LocationPicker.tsx';
import styles from './ContainerPanel.module.css';

type Tab = 'details' | 'entry' | 'withdraw' | 'move' | 'edit' | 'remove';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'details', label: 'Detalhes', icon: Info },
  { id: 'entry', label: 'Entrada', icon: ArrowDownToLine },
  { id: 'withdraw', label: 'Saída', icon: ArrowUpFromLine },
  { id: 'move', label: 'Transferir', icon: MoveRight },
  { id: 'edit', label: 'Editar', icon: Pencil },
  { id: 'remove', label: 'Remover', icon: Trash2 },
];

interface ContainerPanelProps {
  container: Container;
  onChanged: (container: Container, message: string) => void;
}

export default function ContainerPanel({ container, onChanged }: ContainerPanelProps) {
  const [tab, setTab] = useState<Tab>('details');
  const expiry = expiryStatus(container.expiry_date);

  return (
    <div className={styles.panel}>
      <div className={styles.hero}>
        <div className={styles.tank} style={{ '--product': container.product_color } as CSSProperties}>
          <span className={styles.liquid} style={{ height: `${container.fill_pct}%` }} />
          <span className={styles.tankLabel}>{Math.round(container.fill_pct)}%</span>
        </div>
        <div className={styles.heroText}>
          <span className={styles.location}>{container.location_label}</span>
          <strong className={styles.product}>
            <span className="color-dot" style={{ background: container.product_color }} />
            {container.product_name}
          </strong>
          <span className={styles.volume}>
            {formatLiters(container.volume_l)} <small>de {formatLiters(container.capacity_l)}</small>
          </span>
          <div className={styles.tags}>
            <span className="badge mono">{container.code}</span>
            <span className="badge">{container.type_name}</span>
            <span className={`badge badge-${expiry.tone === 'neutral' ? '' : expiry.tone}`}>{expiry.label}</span>
          </div>
        </div>
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`${styles.tab} ${tab === id ? styles.tabActive : ''} ${id === 'remove' ? styles.tabDanger : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={15} aria-hidden /> {label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {tab === 'details' && <Details container={container} />}
        {(tab === 'entry' || tab === 'withdraw') && (
          <VolumeForm key={tab} mode={tab} container={container} onDone={onChanged} />
        )}
        {tab === 'move' && <MoveForm container={container} onDone={onChanged} />}
        {tab === 'edit' && <EditForm container={container} onDone={onChanged} />}
        {tab === 'remove' && <RemoveForm container={container} onDone={onChanged} />}
      </div>
    </div>
  );
}

function Details({ container }: { container: Container }) {
  const { data, loading } = useFetch(
    (signal) => movementService.list({ container_id: container.id, limit: 10 }, signal),
    [container.id, container.updated_at],
  );

  const rows: [string, string | null][] = [
    ['Código da posição', container.location_code],
    ['Galpão', `${container.warehouse_code} — ${container.warehouse_name}`],
    ['Setor / posição', `Setor ${container.sector_code} · Linha ${container.row}, coluna ${container.col}`],
    ['Produto', `${container.product_code} · ${container.product_category}`],
    ['Lote', container.lot],
    ['Fabricação', formatDate(container.manufacture_date)],
    ['Validade', formatDate(container.expiry_date)],
    ['Espaço livre', formatLiters(Math.max(0, container.capacity_l - container.volume_l))],
    ['Observações', container.notes],
  ];

  return (
    <>
      <dl className={styles.details}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || '—'}</dd>
          </div>
        ))}
      </dl>

      <h3 className={styles.subtitle}>Histórico do recipiente</h3>
      {loading && !data && <div className="skeleton" style={{ height: 80 }} />}
      {data && data.items.length === 0 && <p className="muted">Sem movimentações.</p>}
      <ul className={styles.history}>
        {data?.items.map((m) => (
          <li key={m.id}>
            <span className={`badge badge-${MOVEMENT_META[m.type].tone === 'neutral' ? '' : MOVEMENT_META[m.type].tone}`}>
              {MOVEMENT_META[m.type].label}
            </span>
            <div>
              <strong>{formatLiters(m.volume_l)}</strong>
              {m.type === 'transferencia' && (
                <span className="mono muted">
                  {' '}
                  {m.from_location} → {m.to_location}
                </span>
              )}
              <small>
                {formatDateTime(m.created_at)} · {m.performed_by}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function ResponsibleField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="field">
      <label className="label" htmlFor="op-responsible">
        Responsável
      </label>
      <input
        id="op-responsible"
        className="input"
        placeholder="Seu nome"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

interface ActionProps {
  container: Container;
  onDone: (container: Container, message: string) => void;
}

function useAction() {
  const [responsible, remember] = useResponsible();
  const [performedBy, setPerformedBy] = useState(responsible);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function run<T>(action: () => Promise<T>): Promise<T | null> {
    if (performedBy.trim().length < 2) {
      setError('Informe o nome do responsável.');
      return null;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await action();
      remember(performedBy);
      return result;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir a operação.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  return { performedBy: performedBy.trim(), setPerformedBy, rawPerformedBy: performedBy, error, setError, saving, run };
}

function VolumeForm({ mode, container, onDone }: ActionProps & { mode: 'entry' | 'withdraw' }) {
  const action = useAction();
  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  const limit = mode === 'entry' ? container.capacity_l - container.volume_l : container.volume_l;
  const value = parseDecimal(text);
  const after = value === null ? null : container.volume_l + (mode === 'entry' ? value : -value);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (value === null || value <= 0) return action.setError('Informe a quantidade em litros.');
    if (value > limit + 1e-6) {
      return action.setError(
        mode === 'entry' ? `Cabem no máximo ${formatLiters(limit)}.` : `Disponível no recipiente: ${formatLiters(limit)}.`,
      );
    }
    const payload = { volume_l: value, performed_by: action.performedBy, notes: notes.trim() || null };
    const result = await action.run(() =>
      mode === 'entry' ? containerService.entry(container.id, payload) : containerService.withdraw(container.id, payload),
    );
    if (result) {
      onDone(result, `${mode === 'entry' ? 'Entrada' : 'Saída'} de ${formatLiters(value)} registrada em ${container.code}.`);
    }
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      {action.error && <div className="alert alert-error">{action.error}</div>}
      <div className="field">
        <label className="label" htmlFor="op-volume">
          {mode === 'entry' ? 'Litros a adicionar' : 'Litros a retirar'}
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="input-group" style={{ flex: 1 }}>
            <input
              id="op-volume"
              className="input"
              inputMode="decimal"
              style={{ paddingLeft: 12 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Até ${formatLiters(limit)}`}
            />
            <span className="input-suffix">L</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setText(String(Math.round(limit * 10) / 10).replace('.', ','))}
          >
            {mode === 'entry' ? 'Completar' : 'Tudo'}
          </button>
        </div>
        {after !== null && after >= 0 && after <= container.capacity_l && (
          <span className="hint">
            Ficará com {formatLiters(after)} ({Math.round((after / container.capacity_l) * 100)}%).
          </span>
        )}
      </div>
      <div className="field">
        <label className="label" htmlFor="op-notes">
          Observação <span className="optional">(opcional)</span>
        </label>
        <input
          id="op-notes"
          className="input"
          placeholder={mode === 'withdraw' ? 'Ex.: Pedido 1234 / Fazenda Boa Vista' : 'Ex.: NF 5678'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <ResponsibleField value={action.rawPerformedBy} onChange={action.setPerformedBy} />
      <button type="submit" className={`btn ${mode === 'entry' ? 'btn-primary' : 'btn-danger'} btn-block`} disabled={action.saving || limit <= 0}>
        {action.saving && <span className="spinner" aria-hidden />}
        {limit <= 0
          ? mode === 'entry'
            ? 'Recipiente cheio'
            : 'Recipiente vazio'
          : mode === 'entry'
            ? 'Registrar entrada'
            : 'Registrar saída'}
      </button>
    </form>
  );
}

function MoveForm({ container, onDone }: ActionProps) {
  const action = useAction();
  const [target, setTarget] = useState<LocationValue | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!target) return action.setError('Escolha a posição de destino.');
    const result = await action.run(() =>
      containerService.move(container.id, {
        sector_id: target.sectorId,
        row: target.row,
        col: target.col,
        performed_by: action.performedBy,
      }),
    );
    if (result) onDone(result, `${container.code} transferido para ${result.location_code}.`);
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      {action.error && <div className="alert alert-error">{action.error}</div>}
      <p className="muted" style={{ fontSize: 13.5 }}>
        Atualmente em <strong className="mono">{container.location_code}</strong>. Escolha o destino (pode ser outro galpão).
      </p>
      <LocationPicker
        value={target}
        onChange={setTarget}
        initialWarehouseId={container.warehouse_id ?? undefined}
        currentContainerId={container.id}
      />
      <ResponsibleField value={action.rawPerformedBy} onChange={action.setPerformedBy} />
      <button type="submit" className="btn btn-primary btn-block" disabled={action.saving}>
        {action.saving && <span className="spinner" aria-hidden />}
        Confirmar transferência
      </button>
    </form>
  );
}

function EditForm({ container, onDone }: ActionProps) {
  const action = useAction();
  const [lot, setLot] = useState(container.lot ?? '');
  const [manufacture, setManufacture] = useState(container.manufacture_date ?? '');
  const [expiry, setExpiry] = useState(container.expiry_date ?? '');
  const [notes, setNotes] = useState(container.notes ?? '');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (manufacture && expiry && expiry < manufacture) return action.setError('A validade deve ser depois da fabricação.');
    const result = await action.run(() =>
      containerService.update(container.id, {
        lot: lot.trim() || null,
        manufacture_date: manufacture || null,
        expiry_date: expiry || null,
        notes: notes.trim() || null,
      }),
    );
    if (result) onDone(result, `Dados de ${container.code} atualizados.`);
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      {action.error && <div className="alert alert-error">{action.error}</div>}
      <div className="form-grid">
        <div className="field span-2">
          <label className="label" htmlFor="e-lot">
            Lote
          </label>
          <input id="e-lot" className="input mono" value={lot} onChange={(e) => setLot(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="e-man">
            Fabricação
          </label>
          <input id="e-man" type="date" className="input" value={manufacture} onChange={(e) => setManufacture(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="e-exp">
            Validade
          </label>
          <input id="e-exp" type="date" className="input" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </div>
        <div className="field span-2">
          <label className="label" htmlFor="e-notes">
            Observações
          </label>
          <textarea id="e-notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={action.saving}>
        {action.saving && <span className="spinner" aria-hidden />}
        Salvar
      </button>
    </form>
  );
}

function RemoveForm({ container, onDone }: ActionProps) {
  const action = useAction();
  const [notes, setNotes] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await action.run(() =>
      containerService.remove(container.id, { performed_by: action.performedBy, notes: notes.trim() || null }),
    );
    if (result) onDone(result, `${container.code} removido de ${container.location_code}. A posição está livre.`);
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      {action.error && <div className="alert alert-error">{action.error}</div>}
      <div className="alert alert-error" style={{ background: 'var(--color-warning-50)', color: 'var(--color-warning-600)' }}>
        O recipiente sai do galpão e a posição {container.location_code} fica livre.
        {container.volume_l > 0 && ` Os ${formatLiters(container.volume_l)} restantes serão registrados como saída.`} O histórico é mantido.
      </div>
      <div className="field">
        <label className="label" htmlFor="r-notes">
          Motivo <span className="optional">(opcional)</span>
        </label>
        <input id="r-notes" className="input" placeholder="Ex.: IBC vazio devolvido ao fornecedor" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <ResponsibleField value={action.rawPerformedBy} onChange={action.setPerformedBy} />
      <button type="submit" className="btn btn-danger btn-block" disabled={action.saving}>
        {action.saving && <span className="spinner" aria-hidden />}
        Remover recipiente
      </button>
    </form>
  );
}
