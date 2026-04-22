import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { INITIAL_PRODUCTS } from '@/data/initialProducts';
import { dbGet, dbSet } from '@/lib/db';
import type { Product, ProductContextType } from '@/types';

const LS_KEY = 'gestao3d_products';
const DB_KEY = 'products';

const ProductContext = createContext<ProductContextType | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Product[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignora */ }
    return INITIAL_PRODUCTS;
  });

  // ── Sincroniza com Supabase na montagem ─────────────────────────────────────
  useEffect(() => {
    dbGet<Product[]>(DB_KEY).then((remoto) => {
      if (remoto && Array.isArray(remoto) && remoto.length > 0) {
        // Supabase tem dados → usa como fonte da verdade
        setProducts(remoto);
        localStorage.setItem(LS_KEY, JSON.stringify(remoto));
      } else {
        // Supabase vazio → migra localStorage para a nuvem
        const local = localStorage.getItem(LS_KEY);
        const dados = local ? JSON.parse(local) : INITIAL_PRODUCTS;
        if (dados.length > 0) dbSet(DB_KEY, dados).catch(console.error);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persiste em ambos (localStorage síncrono + Supabase em background) ──────
  const persist = (next: Product[]) => {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    dbSet(DB_KEY, next).catch(console.error);
    return next;
  };

  const addProduct = useCallback((p: Product) => {
    setProducts((prev) => persist([p, ...prev]));
  }, []);

  const updateProduct = useCallback((id: number, updates: Partial<Product>) => {
    setProducts((prev) =>
      persist(prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
    );
  }, []);

  const removeProduct = useCallback((id: number) => {
    setProducts((prev) => persist(prev.filter((p) => p.id !== id)));
  }, []);

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
