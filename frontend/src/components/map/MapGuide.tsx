import { useState } from 'react';
import type { CSSProperties } from 'react';
import { BookOpen, ChevronDown, Plus } from 'lucide-react';
import styles from './MapGuide.module.css';

const KEY = 'amazon-agro:ajuda:guia-mapa';

function readOpen(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'recolhido';
  } catch {
    return true;
  }
}

/** Legenda ilustrada: explica cada parte de um bloco do mapa. */
export default function MapGuide() {
  const [open, setOpen] = useState(readOpen);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(KEY, next ? 'aberto' : 'recolhido');
    } catch {
      /* ignora */
    }
  }

  return (
    <section className={`card ${styles.guide}`}>
      <button type="button" className={styles.header} onClick={toggle} aria-expanded={open}>
        <BookOpen size={17} aria-hidden />
        <strong>Como ler o mapa</strong>
        <span>{open ? 'Ocultar' : 'Mostrar'}</span>
        <ChevronDown size={16} className={`${styles.chevron} ${open ? '' : styles.rotated}`} aria-hidden />
      </button>

      {open && (
        <div className={styles.body}>
          <div className={styles.sample}>
            <div className={styles.slot} style={{ '--product': '#1a7f5a' } as CSSProperties} aria-hidden>
              <span className={styles.level} />
              <span className={styles.top}>
                <span className={styles.number}>
                  07<i>1</i>
                </span>
                <span className={styles.flag}>
                  <i>5</i>
                </span>
                <span className={styles.type}>
                  IBC<i>2</i>
                </span>
              </span>
              <span className={styles.volume}>
                650 L<i>3</i>
              </span>
              <span className={styles.code}>
                FOL-001<i>4</i>
              </span>
              <span className={styles.levelMark}>
                <i>6</i>
              </span>
            </div>
            <ol className={styles.callouts}>
              <li>
                <b>1</b> <strong>Número da posição</strong> dentro do setor. Com o galpão e o setor forma o código, ex.: <code>G01-A-07</code>.
              </li>
              <li>
                <b>2</b> <strong>Tipo de recipiente</strong>: IBC, BAR (barril) ou BOM (bombona).
              </li>
              <li>
                <b>3</b> <strong>Litros</strong> que há agora no recipiente.
              </li>
              <li>
                <b>4</b> <strong>Código do produto</strong>. A cor do bloco também identifica o produto (veja a legenda acima do mapa).
              </li>
              <li>
                <b>5</b> <strong>Ponto de alerta</strong>: laranja vence em até 60 dias; vermelho já venceu.
              </li>
              <li>
                <b>6</b> <strong>Nível</strong>: a parte colorida sobe de baixo para cima conforme o recipiente está cheio.
              </li>
            </ol>
          </div>

          <div className={styles.others}>
            <div className={styles.other}>
              <span className={styles.empty} aria-hidden>
                <small>08</small>
                <Plus size={15} />
              </span>
              <p>
                <strong>Posição livre.</strong> Clique para armazenar um recipiente ali.
              </p>
            </div>
            <div className={styles.other}>
              <span className={styles.found} aria-hidden />
              <p>
                <strong>Encontrado na busca.</strong> Contorno azul piscando; o resto fica apagado.
              </p>
            </div>
            <div className={styles.other}>
              <span className={styles.axis} aria-hidden>
                L2 · C3
              </span>
              <p>
                <strong>Linhas e colunas.</strong> L = linha (frente → fundo), C = coluna (esquerda → direita).
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
