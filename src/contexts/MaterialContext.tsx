import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Material, MaterialContextType } from '@/types';

const MATERIALS_KEY = 'gestao3d_materials';

const MaterialContext = createContext<MaterialContextType | null>(null);

export function MaterialProvider({ children }: { children: ReactNode }) {
  const [materials, setMaterials] = useState<Material[]>(() => {
    try {
      const stored = localStorage.getItem(MATERIALS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Material[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignora */ }
    return [];
  });

  const persist = (next: Material[]) => {
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(next));
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
