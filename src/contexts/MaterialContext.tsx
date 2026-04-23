import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { dbGet, dbSet } from '@/lib/db';
import { useTenant }    from '@/contexts/TenantContext';
import type { Material, MaterialContextType } from '@/types';

const DB_KEY  = 'materials';
const LS_BASE = 'gestao3d_materials';

const MaterialContext = createContext<MaterialContextType | null>(null);

export function MaterialProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const tenantId   = tenant?.id ?? null;

  const [materials, setMaterials] = useState<Material[]>([]);

  const lsKey = tenantId ? `${LS_BASE}_${tenantId}` : null;

  useEffect(() => {
    if (!tenantId) { setMaterials([]); return; }

    setMaterials([]);

    dbGet<Material[]>(DB_KEY).then((remoto) => {
      if (remoto && Array.isArray(remoto) && remoto.length > 0) {
        setMaterials(remoto);
        if (lsKey) localStorage.setItem(lsKey, JSON.stringify(remoto));
      } else if (lsKey) {
        try {
          const stored = localStorage.getItem(lsKey);
          if (stored) {
            const cached = JSON.parse(stored) as Material[];
            if (Array.isArray(cached) && cached.length > 0) {
              setMaterials(cached);
              dbSet(DB_KEY, cached).catch(console.error);
            }
          }
        } catch { /* ignora */ }
      }
    });
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (next: Material[]) => {
    if (lsKey) localStorage.setItem(lsKey, JSON.stringify(next));
    dbSet(DB_KEY, next).catch(console.error);
    return next;
  };

  const addMaterial = useCallback((m: Material) => {
    setMaterials((prev) => persist([m, ...prev]));
  }, [lsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMaterial = useCallback((id: number, updates: Partial<Material>) => {
    setMaterials((prev) =>
      persist(prev.map((m) => (m.id === id ? { ...m, ...updates } : m)))
    );
  }, [lsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeMaterial = useCallback((id: number) => {
    setMaterials((prev) => persist(prev.filter((m) => m.id !== id)));
  }, [lsKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
