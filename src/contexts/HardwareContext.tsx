import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { dbGet, dbSet } from '@/lib/db';
import type { HardwarePeca, HardwareContextType } from '@/types';

const LS_KEY = 'gestao3d_hardware';
const DB_KEY = 'hardware';

function makeId() {
  return `hw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const HardwareContext = createContext<HardwareContextType | null>(null);

export function HardwareProvider({ children }: { children: ReactNode }) {
  const [pecas, setPecas] = useState<HardwarePeca[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    dbGet<HardwarePeca[]>(DB_KEY).then((remoto) => {
      if (remoto && Array.isArray(remoto) && remoto.length > 0) {
        setPecas(remoto);
        localStorage.setItem(LS_KEY, JSON.stringify(remoto));
      } else {
        const local = localStorage.getItem(LS_KEY);
        if (local) {
          const dados = JSON.parse(local) as HardwarePeca[];
          if (dados.length > 0) dbSet(DB_KEY, dados).catch(console.error);
        }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((next: HardwarePeca[]) => {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    dbSet(DB_KEY, next).catch(console.error);
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
