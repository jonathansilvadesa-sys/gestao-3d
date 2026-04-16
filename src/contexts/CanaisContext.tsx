import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CANAIS_VENDA, type CanalVenda } from '@/types';

// ─── Tipos do contexto ────────────────────────────────────────────────────────
interface CanaisContextType {
  canais: CanalVenda[];
  addCanal:    (c: Omit<CanalVenda, 'id'>) => void;
  updateCanal: (id: string, updates: Partial<Omit<CanalVenda, 'id'>>) => void;
  removeCanal: (id: string) => void;
  resetCanais: () => void;
}

const CanaisContext = createContext<CanaisContextType | null>(null);

const STORAGE_KEY = 'gestao3d_canais';

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CanaisProvider({ children }: { children: ReactNode }) {
  const [canais, setCanais] = useState<CanalVenda[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CanalVenda[];
        // garante que novos campos do default estejam presentes
        return parsed.length > 0 ? parsed : CANAIS_VENDA;
      }
    } catch { /* ignora */ }
    return CANAIS_VENDA;
  });

  const persist = useCallback((next: CanalVenda[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCanais(next);
  }, []);

  const addCanal = useCallback((c: Omit<CanalVenda, 'id'>) => {
    const id = `canal_${Date.now()}`;
    persist([...canais, { ...c, id }]);
  }, [canais, persist]);

  const updateCanal = useCallback((id: string, updates: Partial<Omit<CanalVenda, 'id'>>) => {
    persist(canais.map((c) => c.id === id ? { ...c, ...updates } : c));
  }, [canais, persist]);

  const removeCanal = useCallback((id: string) => {
    // Impede remoção se só restar 1 canal
    if (canais.length <= 1) return;
    persist(canais.filter((c) => c.id !== id));
  }, [canais, persist]);

  const resetCanais = useCallback(() => {
    persist(CANAIS_VENDA);
  }, [persist]);

  return (
    <CanaisContext.Provider value={{ canais, addCanal, updateCanal, removeCanal, resetCanais }}>
      {children}
    </CanaisContext.Provider>
  );
}

export function useCanais(): CanaisContextType {
  const ctx = useContext(CanaisContext);
  if (!ctx) throw new Error('useCanais must be used inside <CanaisProvider>');
  return ctx;
}
