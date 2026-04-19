import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { HardwarePeca, HardwareContextType } from '@/types';

const STORAGE_KEY = 'gestao3d_hardware';

function makeId() {
  return `hw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const HardwareContext = createContext<HardwareContextType | null>(null);

export function HardwareProvider({ children }: { children: ReactNode }) {
  const [pecas, setPecas] = useState<HardwarePeca[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback((next: HardwarePeca[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }, []);

  const addPeca = useCallback((p: Omit<HardwarePeca, 'id'>) => {
    setPecas((prev) => persist([...prev, { ...p, id: makeId() }]));
  }, [persist]);

  const updatePeca = useCallback((id: string, updates: Partial<HardwarePeca>) => {
    setPecas((prev) =>
      persist(prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
    );
  }, [persist]);

  const removePeca = useCallback((id: string) => {
    setPecas((prev) => persist(prev.filter((p) => p.id !== id)));
  }, [persist]);

  const adicionarHoras = useCallback((id: string, horas: number) => {
    setPecas((prev) =>
      persist(
        prev.map((p) =>
          p.id === id ? { ...p, horasUsadas: +(p.horasUsadas + horas).toFixed(1) } : p
        )
      )
    );
  }, [persist]);

  const getAlertasEstoque = useCallback((): HardwarePeca[] => {
    return pecas.filter(
      (p) => p.estoqueMinimo > 0 && p.estoqueAtual <= p.estoqueMinimo
    );
  }, [pecas]);

  const getAlertasHoras = useCallback((): HardwarePeca[] => {
    return pecas.filter(
      (p) => p.horasVidaUtil > 0 && p.horasUsadas >= p.horasVidaUtil * 0.9
    );
  }, [pecas]);

  return (
    <HardwareContext.Provider
      value={{
        pecas,
        addPeca,
        updatePeca,
        removePeca,
        adicionarHoras,
        getAlertasEstoque,
        getAlertasHoras,
      }}
    >
      {children}
    </HardwareContext.Provider>
  );
}

export function useHardware(): HardwareContextType {
  const ctx = useContext(HardwareContext);
  if (!ctx) throw new Error('useHardware must be used inside <HardwareProvider>');
  return ctx;
}
