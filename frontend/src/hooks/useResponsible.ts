import { useCallback, useState } from 'react';

const STORAGE_KEY = 'amazon-agro:responsavel';

function read(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Nome do funcionário responsável pelas operações, lembrado neste navegador.
 * Será substituído pelo usuário autenticado quando o módulo de login existir.
 */
export function useResponsible() {
  const [name, setName] = useState(read);

  const remember = useCallback((value: string) => {
    const trimmed = value.trim();
    setName(trimmed);
    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      /* armazenamento indisponível: segue sem lembrar */
    }
  }, []);

  return [name, remember] as const;
}
