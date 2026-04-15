import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { INITIAL_PRODUCTS } from '@/data/initialProducts';
import type { Product, ProductContextType } from '@/types';

const PRODUCTS_KEY = 'gestao3d_products';

const ProductContext = createContext<ProductContextType | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem(PRODUCTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Product[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignora erros de parse */ }
    return INITIAL_PRODUCTS;
  });

  const persist = (next: Product[]) => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(next));
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
