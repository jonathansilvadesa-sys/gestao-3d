import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  AcessorioEstoque, AcessorioMovimento, AcessorioVariante,
  AcessorioContextType,
} from '@/types';

// ─── Dados iniciais de demonstração ──────────────────────────────────────────
function makeId() { return `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function makeVId() { return `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

const INITIAL_ACESSORIOS: AcessorioEstoque[] = [
  {
    id: 'demo_ima',
    nome: 'Imã de Neodímio',
    categoria: 'magnetico',
    unidade: 'un',
    variantes: [
      { id: 'demo_ima_3mm', tamanho: '3mm', estoqueAtual: 48, estoqueMinimo: 20, custoUn: 0.50 },
      { id: 'demo_ima_5mm', tamanho: '5mm', estoqueAtual: 12, estoqueMinimo: 20, custoUn: 0.80 },
      { id: 'demo_ima_8mm', tamanho: '8mm', estoqueAtual: 30, estoqueMinimo: 10, custoUn: 1.20 },
    ],
    movimentacoes: [
      { id: 'mov_1', data: new Date(Date.now() - 7 * 86400000).toISOString(), tipo: 'entrada', varianteId: 'demo_ima_3mm', quantidade: 50, motivo: 'Compra inicial' },
      { id: 'mov_2', data: new Date(Date.now() - 2 * 86400000).toISOString(), tipo: 'saida',   varianteId: 'demo_ima_3mm', quantidade: 2,  motivo: 'Uso em Porta-copo' },
    ],
  },
  {
    id: 'demo_parafuso',
    nome: 'Parafuso M3',
    categoria: 'fixacao',
    unidade: 'pç',
    variantes: [
      { id: 'demo_par_m3x8',  tamanho: 'M3×8',  estoqueAtual: 80, estoqueMinimo: 30, custoUn: 0.15 },
      { id: 'demo_par_m3x10', tamanho: 'M3×10', estoqueAtual: 18, estoqueMinimo: 30, custoUn: 0.18 },
      { id: 'demo_par_m3x16', tamanho: 'M3×16', estoqueAtual: 45, estoqueMinimo: 20, custoUn: 0.22 },
    ],
    movimentacoes: [
      { id: 'mov_3', data: new Date(Date.now() - 5 * 86400000).toISOString(), tipo: 'entrada', varianteId: 'demo_par_m3x8', quantidade: 100, motivo: 'Compra inicial' },
    ],
  },
  {
    id: 'demo_insert',
    nome: 'Insert de Rosca M3',
    categoria: 'fixacao',
    unidade: 'un',
    variantes: [
      { id: 'demo_ins_std', tamanho: '', estoqueAtual: 60, estoqueMinimo: 20, custoUn: 0.40 },
    ],
    movimentacoes: [],
  },
  {
    id: 'demo_embalagem',
    nome: 'Embalagem Ziplock',
    categoria: 'embalagem',
    unidade: 'un',
    variantes: [
      { id: 'demo_emb_p',   tamanho: 'P (8×12cm)',  estoqueAtual: 35, estoqueMinimo: 15, custoUn: 0.60 },
      { id: 'demo_emb_m',   tamanho: 'M (12×17cm)', estoqueAtual: 20, estoqueMinimo: 15, custoUn: 0.90 },
    ],
    movimentacoes: [],
  },
  {
    id: 'demo_chaveiro',
    nome: 'Kit Chaveiro (argola + corrente)',
    categoria: 'chaveiro',
    unidade: 'un',
    variantes: [
      { id: 'demo_chav_std', tamanho: '', estoqueAtual: 40, estoqueMinimo: 15, custoUn: 3.50 },
    ],
    movimentacoes: [],
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'gestao3d_acessorios';
const AcessorioContext = createContext<AcessorioContextType | null>(null);

export function AcessorioProvider({ children }: { children: ReactNode }) {
  const [acessorios, setAcessorios] = useState<AcessorioEstoque[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : INITIAL_ACESSORIOS;
    } catch {
      return INITIAL_ACESSORIOS;
    }
  });

  const persist = useCallback((next: AcessorioEstoque[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }, []);

  const addAcessorio = useCallback(
    (a: Omit<AcessorioEstoque, 'id' | 'movimentacoes'>) => {
      // Garante ids nas variantes
      const variantes: AcessorioVariante[] = a.variantes.map((v) =>
        v.id ? v : { ...v, id: makeVId() }
      );
      const novo: AcessorioEstoque = {
        ...a,
        variantes,
        id: makeId(),
        movimentacoes: [],
      };
      setAcessorios((prev) => persist([...prev, novo]));
    },
    [persist]
  );

  const updateAcessorio = useCallback(
    (id: string, updates: Partial<Omit<AcessorioEstoque, 'id'>>) => {
      setAcessorios((prev) =>
        persist(prev.map((a) => (a.id === id ? { ...a, ...updates } : a)))
      );
    },
    [persist]
  );

  const removeAcessorio = useCallback(
    (id: string) => {
      setAcessorios((prev) => persist(prev.filter((a) => a.id !== id)));
    },
    [persist]
  );

  const addMovimento = useCallback(
    (acessorioId: string, mov: Omit<AcessorioMovimento, 'id' | 'data'>) => {
      const movimento: AcessorioMovimento = {
        ...mov,
        id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        data: new Date().toISOString(),
      };

      setAcessorios((prev) =>
        persist(
          prev.map((a) => {
            if (a.id !== acessorioId) return a;

            const updatedVariantes = a.variantes.map((v) => {
              if (v.id !== mov.varianteId) return v;
              if (mov.tipo === 'ajuste') {
                // ajuste = define o estoque absoluto
                return { ...v, estoqueAtual: Math.max(0, mov.quantidade) };
              }
              const delta = mov.tipo === 'entrada' ? mov.quantidade : -mov.quantidade;
              return { ...v, estoqueAtual: Math.max(0, v.estoqueAtual + delta) };
            });

            return {
              ...a,
              variantes: updatedVariantes,
              movimentacoes: [movimento, ...a.movimentacoes].slice(0, 200),
            };
          })
        )
      );
    },
    [persist]
  );

  const getAbaixoMinimo = useCallback((): { acessorio: AcessorioEstoque; variante: AcessorioVariante }[] => {
    const result: { acessorio: AcessorioEstoque; variante: AcessorioVariante }[] = [];
    acessorios.forEach((a) => {
      a.variantes.forEach((v) => {
        if (v.estoqueMinimo > 0 && v.estoqueAtual <= v.estoqueMinimo) {
          result.push({ acessorio: a, variante: v });
        }
      });
    });
    return result;
  }, [acessorios]);

  return (
    <AcessorioContext.Provider
      value={{
        acessorios,
        addAcessorio,
        updateAcessorio,
        removeAcessorio,
        addMovimento,
        getAbaixoMinimo,
      }}
    >
      {children}
    </AcessorioContext.Provider>
  );
}

export function useAcessorios(): AcessorioContextType {
  const ctx = useContext(AcessorioContext);
  if (!ctx) throw new Error('useAcessorios must be used inside <AcessorioProvider>');
  return ctx;
}
