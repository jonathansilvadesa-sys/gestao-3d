import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { dbGet, dbSet } from '@/lib/db';
import { useTenant }    from '@/contexts/TenantContext';
import type { Pedido, PedidoStatus, PedidosContextType } from '@/types';

const DB_KEY  = 'pedidos';
const LS_BASE = 'gestao3d_pedidos';

const PedidosContext = createContext<PedidosContextType | null>(null);

export function usePedidos(): PedidosContextType {
  const ctx = useContext(PedidosContext);
  if (!ctx) throw new Error('usePedidos deve ser usado dentro de PedidosProvider');
  return ctx;
}

export function PedidosProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const tenantId   = tenant?.id ?? null;
  const lsKey      = tenantId ? `${LS_BASE}_${tenantId}` : null;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  // ── Recarrega quando o tenant muda ─────────────────────────────────────
  useEffect(() => {
    if (!tenantId) { setPedidos([]); return; }

    setPedidos([]);

    dbGet<Pedido[]>(DB_KEY).then((remoto) => {
      if (remoto && Array.isArray(remoto) && remoto.length > 0) {
        setPedidos(remoto);
        if (lsKey) localStorage.setItem(lsKey, JSON.stringify(remoto));
      } else if (lsKey) {
        try {
          const stored = localStorage.getItem(lsKey);
          if (stored) {
            const cached = JSON.parse(stored) as Pedido[];
            if (Array.isArray(cached) && cached.length > 0) {
              setPedidos(cached);
              dbSet(DB_KEY, cached).catch(console.error);
            }
          }
        } catch { /* ignora */ }
      }
    });
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (next: Pedido[]) => {
    if (lsKey) localStorage.setItem(lsKey, JSON.stringify(next));
    dbSet(DB_KEY, next).catch(console.error);
    return next;
  };

  const proximoNumero = useCallback((lista: Pedido[]) => {
    if (lista.length === 0) return 1;
    return Math.max(...lista.map((p) => p.numero)) + 1;
  }, []);

  const addPedido = useCallback((
    p: Omit<Pedido, 'id' | 'numero' | 'criadoEm' | 'atualizadoEm'>
  ) => {
    setPedidos((prev) => {
      const now = new Date().toISOString();
      const novoPedido: Pedido = {
        ...p,
        id: `ped_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        numero: proximoNumero(prev),
        criadoEm: now,
        atualizadoEm: now,
      };
      return persist([novoPedido, ...prev]);
    });
  }, [proximoNumero]);

  const updatePedido = useCallback((id: string, updates: Partial<Pedido>) => {
    setPedidos((prev) =>
      persist(prev.map((p) =>
        p.id === id ? { ...p, ...updates, atualizadoEm: new Date().toISOString() } : p
      ))
    );
  }, []);

  const removePedido = useCallback((id: string) => {
    setPedidos((prev) => persist(prev.filter((p) => p.id !== id)));
  }, []);

  const updateStatus = useCallback((id: string, status: PedidoStatus) => {
    const updates: Partial<Pedido> = { status };
    if (status === 'entregue') updates.dataEntregue = new Date().toISOString();
    updatePedido(id, updates);
  }, [updatePedido]);

  return (
    <PedidosContext.Provider value={{ pedidos, addPedido, updatePedido, removePedido, updateStatus }}>
      {children}
    </PedidosContext.Provider>
  );
}
