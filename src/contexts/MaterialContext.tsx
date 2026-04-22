import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { dbGet, dbSet } from '@/lib/db';
import type { Material, MaterialContextType } from '@/types';

const LS_KEY = 'gestao3d_materials';
const DB_KEY = 'materials';

const MaterialContext = createContext<MaterialContextType | null>(null);

export function MaterialProvider({ children }: { children: ReactNode }) {
  const [materials, setMaterials] = useState<Material[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Material[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignora */ }
    return [];
  });

  // ── Sincroniza com Supabase na montagem ─────────────────────────────────────
  useEffect(() => {
    dbGet<Material[]>(DB_KEY).then((remoto) => {
      if (remoto && Array.isArray(remoto) && remoto.length > 0) {
        setMaterials(remoto);
        localStorage.setItem(LS_KEY, JSON.stringify(remoto));
      } else {
        const local = localStorage.getItem(LS_KEY);
        if (local) {
          const dados = JSON.parse(local) as Material[];
          if (dados.length > 0) dbSet(DB_KEY, dados).catch(console.error);
        }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (next: Material[]) => {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    dbSet(DB_KEY, next).catch(console.error);
    return next;
  };

  const addMaterial = useCallback((m: Material) => {
    setMaterials((prev) => persist([m, ...prev]));
  }, []);

  const updateMaterial = useCallback((id: number, updates: Partial<Material>) => {
    setMaterials((prev) =>
      persist(prev.map((m) => (m.id === id ? { ...m, ...updates } : m)))
    );
  }, []);

  const removeMaterial = useCallback((id: number) => {
    setMaterials((prev) => persist(prev.filter((m) => m.id !== id)));
  }, []);

  return (
    <MaterialContext.Provider value={{ materials, addMaterial, updateMaterial, removeMaterial }}>
      {children}
    </MaterialContext.Provider>
  );
}

export function useMaterials(): MaterialContextType {
  const ctx = useContext(MaterialContext);
  if (!ctx) throw new Error('useMaterials must be used inside <MaterialProvider>');
  return ctx;
}
