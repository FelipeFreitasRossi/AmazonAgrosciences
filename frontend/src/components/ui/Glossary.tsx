import { useState } from 'react';
import { Search } from 'lucide-react';
import styles from './Glossary.module.css';

interface Term {
  term: string;
  group: 'Estrutura' | 'Recipientes' | 'Produto' | 'Operações' | 'Indicadores';
  definition: string;
  example?: string;
}

const TERMS: Term[] = [
  {
    term: 'Galpão',
    group: 'Estrutura',
    definition: 'Prédio onde os produtos ficam armazenados. Cada galpão tem um código curto.',
    example: 'G01 = Galpão 01',
  },
  {
    term: 'Setor (ou área)',
    group: 'Estrutura',
    definition:
      'Divisão dentro de um galpão. Cada setor é desenhado como uma grade de posições, com linhas (L) e colunas (C).',
    example: 'Setor A com 4 linhas × 8 colunas = 32 posições',
  },
  {
    term: 'Posição',
    group: 'Estrutura',
    definition:
      'Lugar exato no chão do setor onde cabe um recipiente. As posições são numeradas da esquerda para a direita, linha por linha.',
    example: 'Posição 07 = linha 1, coluna 7 num setor de 8 colunas',
  },
  {
    term: 'Código da posição',
    group: 'Estrutura',
    definition: 'Endereço completo de onde algo está, no formato GALPÃO-SETOR-POSIÇÃO. Use-o para achar e comunicar a localização.',
    example: 'G01-A-07 = Galpão 01, Setor A, Posição 07',
  },
  {
    term: 'Recipiente',
    group: 'Recipientes',
    definition: 'Embalagem física que contém o produto: IBC, barril ou bombona. Cada um tem um código único.',
    example: 'IBC-0012, BAR-0003',
  },
  {
    term: 'IBC',
    group: 'Recipientes',
    definition: 'Contêiner intermediário (tanque plástico com gaiola metálica), normalmente com 1.000 litros.',
  },
  {
    term: 'Barril',
    group: 'Recipientes',
    definition: 'Tambor, normalmente com 200 litros.',
  },
  {
    term: 'Bombona',
    group: 'Recipientes',
    definition: 'Galão menor, normalmente com 50 litros.',
  },
  {
    term: 'Capacidade',
    group: 'Recipientes',
    definition: 'Quanto cabe no recipiente quando cheio. O sistema não deixa registrar mais do que isso.',
  },
  {
    term: 'Nível',
    group: 'Recipientes',
    definition: 'Quanto o recipiente está cheio, em litros e em porcentagem da capacidade. No mapa aparece como o preenchimento colorido do bloco.',
  },
  {
    term: 'Produto (fertilizante)',
    group: 'Produto',
    definition: 'O que está dentro do recipiente. É cadastrado uma vez e pode estar em vários recipientes e galpões.',
  },
  {
    term: 'Lote',
    group: 'Produto',
    definition: 'Número de fabricação impresso no rótulo. Serve para rastrear de qual produção veio o produto.',
  },
  {
    term: 'Composição / garantias',
    group: 'Produto',
    definition: 'Teores de nutrientes garantidos pelo fabricante.',
    example: 'N 10% + P 10% + K 10%',
  },
  {
    term: 'Densidade',
    group: 'Produto',
    definition: 'Quantos quilos pesa um litro do produto. Útil para converter litros em peso.',
    example: '1,25 kg/L: 1.000 L pesam 1.250 kg',
  },
  {
    term: 'Estoque mínimo',
    group: 'Produto',
    definition: 'Quantidade total (somando todos os recipientes) abaixo da qual o produto aparece em alerta de estoque baixo.',
  },
  {
    term: 'Entrada',
    group: 'Operações',
    definition: 'Registro de produto chegando: um recipiente novo armazenado ou litros adicionados a um recipiente existente.',
  },
  {
    term: 'Saída',
    group: 'Operações',
    definition: 'Registro de litros retirados de um recipiente (venda, aplicação, envio).',
  },
  {
    term: 'Transferência',
    group: 'Operações',
    definition: 'Mudança de um recipiente para outra posição, setor ou galpão. A quantidade não muda.',
  },
  {
    term: 'Remoção',
    group: 'Operações',
    definition: 'O recipiente sai do galpão (por exemplo, IBC vazio devolvido) e a posição fica livre.',
  },
  {
    term: 'Movimentação',
    group: 'Operações',
    definition: 'Qualquer uma das operações acima. Todas ficam no histórico com o responsável, a data e a hora.',
  },
  {
    term: 'Ocupação',
    group: 'Indicadores',
    definition: 'Porcentagem das posições que têm um recipiente. 100% significa que não há vagas livres.',
  },
  {
    term: 'Volume em estoque',
    group: 'Indicadores',
    definition: 'Soma dos litros de todos os recipientes armazenados.',
  },
  {
    term: 'Validade próxima',
    group: 'Indicadores',
    definition: 'Recipientes que vencem nos próximos 60 dias ou que já venceram.',
  },
];

/** Glossário pesquisável com os termos usados no sistema. */
export default function Glossary() {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const filtered = TERMS.filter(
    (t) => !term || t.term.toLowerCase().includes(term) || t.definition.toLowerCase().includes(term),
  );
  const groups = [...new Set(filtered.map((t) => t.group))];

  return (
    <div className={styles.glossary}>
      <div className="input-group">
        <Search size={17} aria-hidden />
        <input
          className="input"
          type="search"
          placeholder="Buscar um termo, ex.: posição, lote, IBC"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar no glossário"
        />
      </div>

      {filtered.length === 0 && <p className="muted">Nenhum termo encontrado.</p>}

      {groups.map((group) => (
        <section key={group}>
          <h3 className={styles.group}>{group}</h3>
          <dl className={styles.list}>
            {filtered
              .filter((t) => t.group === group)
              .map((t) => (
                <div key={t.term} className={styles.item}>
                  <dt>{t.term}</dt>
                  <dd>
                    {t.definition}
                    {t.example && <span className={styles.example}>Ex.: {t.example}</span>}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
