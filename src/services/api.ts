/**
 * Camada de serviços — simula chamadas assíncronas a uma API.
 *
 * Cada função usa Promise + setTimeout para imitar latência de rede.
 * Quando o backend (FastAPI + PostgreSQL) estiver pronto, basta
 * substituir o corpo de cada função por um fetch() real.
 *
 * Exemplo de migração futura:
 *   async function getProducts(): Promise<Product[]> {
 *     const res = await fetch(`${import.meta.env.VITE_API_URL}/products`);
 *     return res.json();
 *   }
 */

import type { Product, Material, AppSettings } from '@/types';

const DELAY = 120; // ms de latência simulada

const delay = <T>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), DELAY));

// ─── Products ────────────────────────────────────────────────────────────────
export const api = {
  products: {
    list: (products: Product[]): Promise<Product[]> =>
      delay(products),

    create: (product: Product, current: Product[]): Promise<Product[]> =>
      delay([product, ...current]),

    update: (id: number, updates: Partial<Product>, current: Product[]): Promise<Product[]> =>
      delay(current.map((p) => (p.id === id ? { ...p, ...updates } : p))),

    remove: (id: number, current: Product[]): Promise<Product[]> =>
      delay(current.filter((p) => p.id !== id)),
  },

  // ─── Materials ─────────────────────────────────────────────────────────────
  materials: {
    list: (materials: Material[]): Promise<Material[]> =>
      delay(materials),

    create: (material: Material, current: Material[]): Promise<Material[]> =>
      delay([material, ...current]),

    update: (id: number, updates: Partial<Material>, current: Material[]): Promise<Material[]> =>
      delay(current.map((m) => (m.id === id ? { ...m, ...updates } : m))),

    remove: (id: number, current: Material[]): Promise<Material[]> =>
      delay(current.filter((m) => m.id !== id)),
  },

  // ─── Settings ──────────────────────────────────────────────────────────────
  settings: {
    get: (settings: AppSettings): Promise<AppSettings> =>
      delay(settings),

    update: (partial: Partial<AppSettings>, current: AppSettings): Promise<AppSettings> =>
      delay({ ...current, ...partial }),
  },
};
