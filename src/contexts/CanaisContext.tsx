import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { CANAIS_VENDA, type CanalVenda } from '@/types';
import { useTenant } from '@/contexts/TenantContext';

// ─── Tipos do contexto ────────────────────────────────────────────────────────
interface CanaisContextType {
  canais: CanalVenda[];
  addCanal:    (c: Omit<CanalVenda, 'id'>) => void;
  updateCanal: (id: string, updates: Partial<Omit<CanalVenda, 'id'>>) => void;
  removeCanal: (id: string) => void;
  resetCanais: () => void;
}

const CanaisContext  = createContext<CanaisContextType | null>(null);
const LS_BASE        = 'gestao3d_canais';

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CanaisProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const tenantId   = tenant?.id ?? null;
  const lsKey      = tenantId ? `${LS_BASE}_${tenantId}` : null;

  // Começa com os canais padrão; recarrega quando tenant muda
  const [canais, setCanais] = useState<CanalVenda[]>(CANAIS_VENDA);

  useEffect(() => {
    if (!tenantId) { setCanais(CANAIS_VENDA); return; }

    // Tenta carregar configuração de canais deste tenant
    if (lsKey) {
      try {
        const stored = localStorage.getItem(lsKey);
        if (stored) {
          const parsed = JSON.parse(stored) as CanalVenda[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCanais(parsed);
            return;
          }
        }
      } catch { /* ignora */ }
    }
    // Novo tenant → canais padrão
    setCanais(CANAIS_VENDA);
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((next: CanalVenda[]) => {
    if (lsKey) localStorage.setItem(lsKey, JSON.stringify(next));
    setCanais(next);
  }, [lsKey]);

  const addCanal = useCallback((c: Omit<CanalVenda, 'id'>) => {
    const id = `canal_${Date.now()}`;
    setCanais((prev) => {
      const next = [...prev, { ...c, id }];
      if (lsKey) localStorage.setItem(lsKey, JSON.stringify(next));
      return next;
    });
  }, [lsKey]);

  const updateCanal = useCallback((id: string, updates: Partial<Omit<CanalVenda, 'id'>>) => {
    setCanais((prev) => {
      const next = prev.map((c) => c.id === id ? { ...c, ...updates } : c);
      if (lsKey) localStorage.setItem(lsKey, JSON.stringify(next));
      return next;
    });
  }, [lsKey]);

  const removeCanal = useCallback((id: string) => {
    setCanais((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((c) => c.id !== id);
      if (lsKey) localStorage.setItem(lsKey, JSON.stringify(next));
      return next;
    });
  }, [lsKey]);

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
