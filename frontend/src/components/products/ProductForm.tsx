import { useState } from 'react';
import type { FormEvent } from 'react';
import InfoTip from '@/components/ui/InfoTip.tsx';
import { ApiError } from '@/services/api.ts';
import { productService } from '@/services/inventoryService.ts';
import type { Product, ProductInput } from '@/types/inventory.ts';
import { parseDecimal } from '@/utils/format.ts';

const SUGGESTED_CATEGORIES = [
  'Foliar',
  'NPK',
  'Micronutrientes',
  'Macronutrientes',
  'Bioestimulante',
  'Orgânico',
  'Organomineral',
  'Condicionador de solo',
  'Adjuvante',
  'Inoculante',
];

const COLORS = ['#1a7f5a', '#2563a8', '#c27c0e', '#7c3aed', '#c2410c', '#0e7490', '#be185d', '#4d7c0f', '#475569', '#a21caf'];

interface ProductFormProps {
  product?: Product | null;
  categories?: string[];
  onSaved: (product: Product) => void;
  onCancel: () => void;
}

type FormState = Record<
  | 'code'
  | 'name'
  | 'category'
  | 'description'
  | 'manufacturer'
  | 'composition'
  | 'density'
  | 'ph'
  | 'hazard_class'
  | 'storage_instructions'
  | 'min_stock'
  | 'color',
  string
>;

function initialState(product?: Product | null): FormState {
  return {
    code: product?.code ?? '',
    name: product?.name ?? '',
    category: product?.category ?? '',
    description: product?.description ?? '',
    manufacturer: product?.manufacturer ?? '',
    composition: product?.composition ?? '',
    density: product?.density_kg_l?.toString().replace('.', ',') ?? '',
    ph: product?.ph?.toString().replace('.', ',') ?? '',
    hazard_class: product?.hazard_class ?? '',
    storage_instructions: product?.storage_instructions ?? '',
    min_stock: product ? String(product.min_stock_l).replace('.', ',') : '',
    color: product?.color ?? '',
  };
}

export default function ProductForm({ product, categories = [], onSaved, onCancel }: ProductFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(product));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allCategories = Array.from(new Set([...categories, ...SUGGESTED_CATEGORIES]));

  const set = (field: keyof FormState) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  function validate(): ProductInput | null {
    const next: typeof errors = {};
    if (!form.code.trim()) next.code = 'Informe o código.';
    else if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(form.code.trim())) next.code = 'Use letras, números, "-", "_" ou ".".';
    if (form.name.trim().length < 2) next.name = 'Informe o nome do produto.';
    if (form.category.trim().length < 2) next.category = 'Informe a categoria.';

    const density = form.density ? parseDecimal(form.density) : null;
    if (form.density && (density === null || density <= 0 || density > 5)) next.density = 'Valor entre 0 e 5 kg/L.';
    const ph = form.ph ? parseDecimal(form.ph) : null;
    if (form.ph && (ph === null || ph < 0 || ph > 14)) next.ph = 'pH entre 0 e 14.';
    const minStock = form.min_stock ? parseDecimal(form.min_stock) : 0;
    if (minStock === null || minStock < 0) next.min_stock = 'Informe um número válido.';

    setErrors(next);
    if (Object.keys(next).length) return null;

    return {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      composition: form.composition.trim() || null,
      density_kg_l: density,
      ph,
      hazard_class: form.hazard_class.trim() || null,
      storage_instructions: form.storage_instructions.trim() || null,
      min_stock_l: minStock ?? 0,
      ...(form.color ? { color: form.color } : {}),
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const data = validate();
    if (!data) return;
    setSaving(true);
    setApiError(null);
    try {
      const saved = product ? await productService.update(product.id, data) : await productService.create(data);
      onSaved(saved);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Não foi possível salvar o produto.');
    } finally {
      setSaving(false);
    }
  }

  const field = (name: keyof FormState) => ({
    value: form[name],
    onChange: (e: { target: { value: string } }) => set(name)(e.target.value),
    'aria-invalid': errors[name] ? true : undefined,
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        {apiError && <div className="alert alert-error span-2">{apiError}</div>}

        <div className="step-title">
          <span className="step-number">1</span>
          <div>
            <strong>Identificação</strong>
            <small>Como o produto é reconhecido na empresa.</small>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="p-code">
            Código
            <InfoTip align="left">Código interno curto e único do produto, ex.: FOL-001. Aparece nos blocos do mapa.</InfoTip>
          </label>
          <input id="p-code" className="input mono" placeholder="Ex.: FOL-001" maxLength={30} {...field('code')} />
          {errors.code && <span className="field-error">{errors.code}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="p-category">
            Categoria
            <InfoTip>Grupo do fertilizante (Foliar, NPK, Bioestimulante...). Escolha uma sugestão ou digite uma nova.</InfoTip>
          </label>
          <input id="p-category" className="input" list="p-categories" placeholder="Ex.: Foliar" {...field('category')} />
          <datalist id="p-categories">
            {allCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.category && <span className="field-error">{errors.category}</span>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="p-name">
            Nome do fertilizante
          </label>
          <input id="p-name" className="input" placeholder="Ex.: Foliar Cálcio + Boro" maxLength={120} {...field('name')} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="p-composition">
            Composição / garantias <span className="optional">(opcional)</span>
            <InfoTip>Teores de nutrientes garantidos no rótulo.</InfoTip>
          </label>
          <input id="p-composition" className="input" placeholder="Ex.: N 10% + P 10% + K 10%" {...field('composition')} />
        </div>

        <div className="field">
          <label className="label" htmlFor="p-manufacturer">
            Fabricante <span className="optional">(opcional)</span>
          </label>
          <input id="p-manufacturer" className="input" {...field('manufacturer')} />
        </div>

        <div className="field">
          <label className="label" htmlFor="p-min">
            Estoque mínimo
            <InfoTip align="right">Soma de litros em todos os recipientes abaixo da qual o produto entra em alerta de “Estoque baixo”. Use 0 para não alertar.</InfoTip>
          </label>
          <div className="input-group">
            <input id="p-min" className="input" inputMode="decimal" placeholder="0" style={{ paddingLeft: 12 }} {...field('min_stock')} />
            <span className="input-suffix">L</span>
          </div>
          {errors.min_stock ? (
            <span className="field-error">{errors.min_stock}</span>
          ) : (
            <span className="hint">Abaixo disso o produto aparece em alerta.</span>
          )}
        </div>

<div className="step-title">
          <span className="step-number">2</span>
          <div>
            <strong>Características técnicas</strong>
            <small>Dados do rótulo e da ficha técnica. Todos opcionais.</small>
          </div>
        </div>


        <div className="field">
          <label className="label" htmlFor="p-density">
            Densidade <span className="optional">(opcional)</span>
            <InfoTip align="left">Quantos quilos pesa 1 litro. Ex.: 1,25 kg/L significa que 1.000 L pesam 1.250 kg.</InfoTip>
          </label>
          <div className="input-group">
            <input id="p-density" className="input" inputMode="decimal" placeholder="Ex.: 1,25" style={{ paddingLeft: 12 }} {...field('density')} />
            <span className="input-suffix">kg/L</span>
          </div>
          {errors.density && <span className="field-error">{errors.density}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="p-ph">
            pH <span className="optional">(opcional)</span>
          </label>
          <input id="p-ph" className="input" inputMode="decimal" placeholder="Ex.: 6,5" {...field('ph')} />
          {errors.ph && <span className="field-error">{errors.ph}</span>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="p-hazard">
            Classificação de risco <span className="optional">(opcional)</span>
            <InfoTip>Classe de risco da ficha de segurança (FISPQ/FDS), se houver.</InfoTip>
          </label>
          <input id="p-hazard" className="input" placeholder="Ex.: Não perigoso / Classe 8 — Corrosivo" {...field('hazard_class')} />
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="p-storage">
            Instruções de armazenamento <span className="optional">(opcional)</span>
          </label>
          <textarea id="p-storage" className="textarea" placeholder="Ex.: Manter ao abrigo do sol, entre 5 °C e 35 °C." {...field('storage_instructions')} />
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="p-description">
            Descrição <span className="optional">(opcional)</span>
          </label>
          <textarea id="p-description" className="textarea" {...field('description')} />
        </div>

<div className="step-title">
          <span className="step-number">3</span>
          <div>
            <strong>Aparência no mapa</strong>
            <small>A cor ajuda a reconhecer o produto de longe na planta dos galpões.</small>
          </div>
        </div>

        <div className="field span-2">
          <span className="label">Cor no mapa</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="radiogroup" aria-label="Cor no mapa">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={form.color === color}
                aria-label={color}
                onClick={() => set('color')(color)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: form.color === color ? '3px solid var(--color-text)' : '3px solid transparent',
                  outline: '1px solid var(--color-border)',
                  background: color,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <span className="hint">{form.color ? 'Cor escolhida.' : 'Se não escolher, uma cor é atribuída automaticamente.'}</span>
        </div>

        <div className="form-actions span-2" style={{ marginTop: 6 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" aria-hidden />}
            {product ? 'Salvar alterações' : 'Cadastrar produto'}
          </button>
        </div>
      </div>
    </form>
  );
}
