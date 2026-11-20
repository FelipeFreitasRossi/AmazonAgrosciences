import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Plus } from 'lucide-react';
import ProductForm from '@/components/products/ProductForm.tsx';
import InfoTip from '@/components/ui/InfoTip.tsx';
import { useResponsible } from '@/hooks/useResponsible.ts';
import { ApiError } from '@/services/api.ts';
import { containerService } from '@/services/inventoryService.ts';
import type { Container, ContainerType, Product } from '@/types/inventory.ts';
import { formatLiters, parseDecimal } from '@/utils/format.ts';
import LocationPicker from './LocationPicker.tsx';
import type { LocationValue } from './LocationPicker.tsx';

interface ContainerFormProps {
  products: Product[];
  types: ContainerType[];
  initialProductId?: string;
  initialWarehouseId?: string;
  initialLocation?: LocationValue | null;
  onProductCreated?: (product: Product) => void;
  onSaved: (container: Container) => void;
  onCancel: () => void;
}

type Errors = Partial<Record<'product' | 'type' | 'volume' | 'capacity' | 'location' | 'expiry' | 'responsible', string>>;

/** Entrada de um novo recipiente (IBC, barril...) com produto, litros e localização. */
export default function ContainerForm({
  products,
  types,
  initialProductId,
  initialWarehouseId,
  initialLocation,
  onProductCreated,
  onSaved,
  onCancel,
}: ContainerFormProps) {
  const [responsible, rememberResponsible] = useResponsible();
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productId, setProductId] = useState(initialProductId ?? '');
  const [typeId, setTypeId] = useState('');
  const [capacityText, setCapacityText] = useState('');
  const [volumeText, setVolumeText] = useState('');
  const [code, setCode] = useState('');
  const [lot, setLot] = useState('');
  const [manufacture, setManufacture] = useState('');
  const [expiry, setExpiry] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<LocationValue | null>(initialLocation ?? null);
  const [performedBy, setPerformedBy] = useState(responsible);
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!typeId && types.length) setTypeId(types[0].id);
  }, [types, typeId]);

  const type = types.find((t) => t.id === typeId);
  const capacity = parseDecimal(capacityText) ?? type?.capacity_l ?? 0;
  const volume = parseDecimal(volumeText);
  const fill = capacity && volume !== null ? Math.min(100, (volume / capacity) * 100) : 0;
  const product = products.find((p) => p.id === productId);

  function fillTo(fraction: number) {
    setVolumeText(String(Math.round(capacity * fraction * 10) / 10).replace('.', ','));
    setErrors((e) => ({ ...e, volume: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!productId) next.product = 'Selecione o produto.';
    if (!typeId) next.type = 'Selecione o tipo de recipiente.';
    const customCapacity = capacityText ? parseDecimal(capacityText) : null;
    if (capacityText && (customCapacity === null || customCapacity <= 0)) next.capacity = 'Capacidade inválida.';
    if (volume === null || volume < 0) next.volume = 'Informe quantos litros há no recipiente.';
    else if (volume > capacity) next.volume = `Máximo de ${formatLiters(capacity)} para este recipiente.`;
    if (!location) next.location = 'Escolha a posição no galpão.';
    if (manufacture && expiry && expiry < manufacture) next.expiry = 'A validade deve ser depois da fabricação.';
    if (performedBy.trim().length < 2) next.responsible = 'Informe quem está registrando.';
    setErrors(next);
    if (Object.keys(next).length || !location || volume === null) return;

    setSaving(true);
    setApiError(null);
    try {
      const created = await containerService.create({
        code: code.trim() || null,
        type_id: typeId,
        product_id: productId,
        sector_id: location.sectorId,
        row: location.row,
        col: location.col,
        volume_l: volume,
        capacity_l: customCapacity,
        lot: lot.trim() || null,
        manufacture_date: manufacture || null,
        expiry_date: expiry || null,
        notes: notes.trim() || null,
        performed_by: performedBy.trim(),
      });
      rememberResponsible(performedBy);
      onSaved(created);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Não foi possível registrar a entrada.');
    } finally {
      setSaving(false);
    }
  }

  if (creatingProduct) {
    return (
      <>
        <p className="alert alert-info" style={{ marginBottom: 14 }}>
          Cadastre o fertilizante. Em seguida você volta para a entrada com ele já selecionado.
        </p>
        <ProductForm
          onCancel={() => setCreatingProduct(false)}
          onSaved={(created) => {
            onProductCreated?.(created);
            setProductId(created.id);
            setCreatingProduct(false);
          }}
        />
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        {apiError && <div className="alert alert-error span-2">{apiError}</div>}

        <div className="step-title">
          <span className="step-number">1</span>
          <div>
            <strong>Qual produto?</strong>
            <small>O fertilizante que está dentro do recipiente. Se ainda não existe, clique em “Novo”.</small>
          </div>
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="c-product">
            Produto (fertilizante)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              id="c-product"
              className="select"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setErrors((x) => ({ ...x, product: undefined }));
              }}
              aria-invalid={errors.product ? true : undefined}
            >
              <option value="">Selecione...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-secondary" onClick={() => setCreatingProduct(true)} title="Cadastrar novo produto">
              <Plus size={16} /> Novo
            </button>
          </div>
          {errors.product ? (
            <span className="field-error">{errors.product}</span>
          ) : (
            product && (
              <span className="hint">
                <span className="color-dot" style={{ background: product.color, marginRight: 6, verticalAlign: -1 }} />
                {product.category}
                {product.composition ? ` · ${product.composition}` : ''}
              </span>
            )
          )}
        </div>

<div className="step-title">
          <span className="step-number">2</span>
          <div>
            <strong>Recipiente e quantidade</strong>
            <small>Tipo de embalagem e quantos litros ela tem agora.</small>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="c-type">
            Tipo de recipiente
          </label>
          <select id="c-type" className="select" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({formatLiters(t.capacity_l)})
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="c-capacity">
            Capacidade <span className="optional">(se diferente)</span>
            <InfoTip>Quanto cabe neste recipiente quando cheio. Deixe vazio para usar o padrão do tipo (ex.: IBC = 1.000 L).</InfoTip>
          </label>
          <div className="input-group">
            <input
              id="c-capacity"
              className="input"
              inputMode="decimal"
              placeholder={type ? String(type.capacity_l) : ''}
              style={{ paddingLeft: 12 }}
              value={capacityText}
              onChange={(e) => setCapacityText(e.target.value)}
            />
            <span className="input-suffix">L</span>
          </div>
          {errors.capacity && <span className="field-error">{errors.capacity}</span>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="c-volume">
            Quantidade atual
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="input-group" style={{ flex: '1 1 160px' }}>
              <input
                id="c-volume"
                className="input"
                inputMode="decimal"
                placeholder="Litros no recipiente"
                style={{ paddingLeft: 12 }}
                value={volumeText}
                onChange={(e) => {
                  setVolumeText(e.target.value);
                  setErrors((x) => ({ ...x, volume: undefined }));
                }}
                aria-invalid={errors.volume ? true : undefined}
              />
              <span className="input-suffix">L</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <button key={f} type="button" className="btn btn-secondary btn-sm" style={{ height: 40 }} onClick={() => fillTo(f)}>
                  {f === 1 ? 'Cheio' : `${f * 100}%`}
                </button>
              ))}
            </div>
          </div>
          <div className="progress" style={{ marginTop: 4 }}>
            <span style={{ width: `${fill}%`, '--bar': product?.color ?? 'var(--color-brand-500)' } as CSSProperties} />
          </div>
          {errors.volume ? (
            <span className="field-error">{errors.volume}</span>
          ) : (
            <span className="hint">
              {volume !== null ? `${Math.round(fill)}% de ${formatLiters(capacity)}` : `Capacidade: ${formatLiters(capacity)}`}
            </span>
          )}
        </div>

<div className="step-title">
          <span className="step-number">3</span>
          <div>
            <strong>Onde está</strong>
            <small>Escolha o galpão, o setor e toque numa posição livre da grade.</small>
          </div>
        </div>

        <div className="span-2">
          <LocationPicker
            value={location}
            onChange={(value) => {
              setLocation(value);
              setErrors((x) => ({ ...x, location: undefined }));
            }}
            initialWarehouseId={initialWarehouseId}
            error={errors.location}
          />
        </div>

<div className="step-title">
          <span className="step-number">4</span>
          <div>
            <strong>Identificação e validade</strong>
            <small>Opcional, mas ajuda a rastrear o produto.</small>
          </div>
        </div>


        <div className="field">
          <label className="label" htmlFor="c-code">
            Código do recipiente <span className="optional">(opcional)</span>
            <InfoTip>Etiqueta única do IBC ou barril. Se deixar vazio, o sistema gera uma sequência (IBC-0001, IBC-0002...).</InfoTip>
          </label>
          <input
            id="c-code"
            className="input mono"
            placeholder={type ? `Automático: ${type.code}-0001` : 'Automático'}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="c-lot">
            Lote <span className="optional">(opcional)</span>
            <InfoTip>Número de fabricação impresso no rótulo. Permite rastrear de qual produção veio o produto.</InfoTip>
          </label>
          <input id="c-lot" className="input mono" value={lot} onChange={(e) => setLot(e.target.value)} />
        </div>

        <div className="field">
          <label className="label" htmlFor="c-manufacture">
            Fabricação <span className="optional">(opcional)</span>
          </label>
          <input id="c-manufacture" type="date" className="input" value={manufacture} onChange={(e) => setManufacture(e.target.value)} />
        </div>

        <div className="field">
          <label className="label" htmlFor="c-expiry">
            Validade <span className="optional">(opcional)</span>
          </label>
          <input id="c-expiry" type="date" className="input" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          {errors.expiry && <span className="field-error">{errors.expiry}</span>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="c-notes">
            Observações <span className="optional">(opcional)</span>
          </label>
          <textarea id="c-notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

<div className="step-title">
          <span className="step-number">5</span>
          <div>
            <strong>Quem está registrando</strong>
            <small>Fica gravado no histórico de movimentações.</small>
          </div>
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="c-responsible">
            Responsável pela entrada
          </label>
          <input
            id="c-responsible"
            className="input"
            placeholder="Seu nome"
            value={performedBy}
            onChange={(e) => setPerformedBy(e.target.value)}
            aria-invalid={errors.responsible ? true : undefined}
          />
          {errors.responsible && <span className="field-error">{errors.responsible}</span>}
        </div>

        <div className="form-actions span-2">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !products.length}>
            {saving && <span className="spinner" aria-hidden />}
            Registrar entrada
          </button>
        </div>
      </div>
    </form>
  );
}
