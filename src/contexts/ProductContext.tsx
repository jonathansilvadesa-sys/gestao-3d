import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { dbGet, dbSet } from '@/lib/db';
import { useTenant }    from '@/contexts/TenantContext';
import type { Product, ProductContextType } from '@/types';

const DB_KEY  = 'products';
const LS_BASE = 'gestao3d_products';

const ProductContext = createContext<ProductContextType | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const tenantId   = tenant?.id ?? null;

  // Sempre começa vazio — dados carregados do Supabase no useEffect
  const [products, setProducts] = useState<Product[]>([]);

  // ── Chave de localStorage isolada por tenant ──────────────────────────────
  const lsKey = tenantId ? `${LS_BASE}_${tenantId}` : null;

  // ── Recarrega quando o tenant muda ────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) { setProducts([]); return; }

    // Limpa imediatamente para não exibir dados do tenant anterior
    setProducts([]);

    dbGet<Product[]>(DB_KEY).then((remoto) => {
      if (remoto && Array.isArray(remoto) && remoto.length > 0) {
        // Supabase tem dados → fonte da verdade
        setProducts(remoto);
        if (lsKey) localStorage.setItem(lsKey, JSON.stringify(remoto));
      } else if (lsKey) {
        // Supabase vazio → tenta cache local DESTE tenant
        try {
          const stored = localStorage.getItem(lsKey);
          if (stored) {
            const cached = JSON.parse(stored) as Product[];
            if (Array.isArray(cached) && cached.length > 0) {
              setProducts(cached);
              // Sincroniza cache local com o Supabase
              dbSet(DB_KEY, cached).catch(console.error);
            }
          }
        } catch { /* ignora */ }
      }
      // Se Supabase e cache local estiverem vazios → lista vazia (empresa nova)
    });
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persiste em ambos (localStorage + Supabase) ───────────────────────────
  const persist = (next: Product[]) => {
    if (lsKey) localStorage.setItem(lsKey, JSON.stringify(next));
    dbSet(DB_KEY, next).catch(console.error);
    return next;
  };

  const addProduct = useCallback((p: Product) => {
    setProducts((prev) => persist([p, ...prev]));
  }, [lsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateProduct = useCallback((id: number, updates: Partial<Product>) => {
    setProducts((prev) =>
      persist(prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
    );
  }, [lsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeProduct = useCallback((id: number) => {
    setProducts((prev) => persist(prev.filter((p) => p.id !== id)));
  }, [lsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, removeProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts(): ProductContextType {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProducts must be used inside <ProductProvider>');
  return ctx;
}
