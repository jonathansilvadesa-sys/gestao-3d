import { useState, useRef, useEffect } from 'react';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  onProduzir: (id: number, qty: number) => void;
  onFalha:    (id: number, qty: number) => void;
}

type Acao = 'producao' | 'falha';

export function QuickActionFAB({ products, onProduzir, onFalha }: Props) {
  const [open, setOpen]           = useState(false);
  const [acao, setAcao]           = useState<Acao | null>(null);
  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [qty, setQty]             = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        fechar();
      }
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  function fechar() {
    setOpen(false);
    setAcao(null);
    setProdutoId(null);
    setQty(1);
  }

  function selecionarAcao(a: Acao) {
    setAcao(a);
    // Se só tem um produto, já pré-seleciona
    if (products.length === 1) setProdutoId(products[0].id);
    else setProdutoId(null);
  }

  function confirmar() {
    if (produtoId == null || qty <= 0) return;
    if (acao === 'producao') onProduzir(produtoId, qty);
    else if (acao === 'falha') onFalha(produtoId, qty);
    fechar();
  }

  const produtoSelecionado = products.find(p => p.id === produtoId);

  return (
    // Visível apenas em mobile (sm:hidden), posicionado acima do BottomTabBar
    <div ref={ref} className="sm:hidden fixed bottom-[72px] right-4 z-50 flex flex-col items-end gap-2">

      {/* ── Painel expandido ─────────────────────────────────────────── */}
      {open && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 w-72"
          style={{ animation: 'fabPanelIn 0.18s ease-out' }}>

          {/* Sem ação selecionada — escolha */}
          {!acao && (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ação Rápida</p>
              {products.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">Nenhuma peça cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => selecionarAcao('producao')}
                    className="w-full flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-semibold text-sm px-4 py-3 rounded-xl transition"
                  >
                    <span className="text-xl">🖨️</span>
                    <div className="text-left">
                      <p className="font-bold">Registrar Produção</p>
                      <p className="text-xs font-normal opacity-70">Adicionar ao estoque</p>
                    </div>
                  </button>
                  <button
                    onClick={() => selecionarAcao('falha')}
                    className="w-full flex items-center gap-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold text-sm px-4 py-3 rounded-xl transition"
                  >
                    <span className="text-xl">💀</span>
                    <div className="text-left">
                      <p className="font-bold">Registrar Falha</p>
                      <p className="text-xs font-normal opacity-70">Desconta filamento, sem estoque</p>
                    </div>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Com ação selecionada — escolha produto + qtd */}
          {acao && (
            <>
              {/* Cabeçalho da ação */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => { setAcao(null); setProdutoId(null); setQty(1); }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm"
                >
                  ←
                </button>
                <p className={`text-sm font-bold ${acao === 'producao' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {acao === 'producao' ? '🖨️ Registrar Produção' : '💀 Registrar Falha'}
                </p>
              </div>

              {/* Seletor de produto */}
              {products.length > 1 && (
                <div className="mb-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Peça</label>
                  <select
                    value={produtoId ?? ''}
                    onChange={(e) => setProdutoId(Number(e.target.value) || null)}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Selecionar peça...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Info da peça selecionada */}
              {produtoSelecionado && (
                <div className="mb-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <span>{produtoSelecionado.nome}</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Estoque: {produtoSelecionado.estoque ?? 0} un.
                  </span>
                </div>
              )}

              {/* Stepper de quantidade */}
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Quantidade</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xl font-bold flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition active:scale-95"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    inputMode="numeric"
                  />
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xl font-bold flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Confirmar */}
              <button
                onClick={confirmar}
                disabled={!produtoId}
                className={`w-full py-3 rounded-xl font-bold text-sm text-white transition disabled:opacity-40 active:scale-95 ${
                  acao === 'producao'
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {acao === 'producao' ? `Produzir ${qty} un.` : `Registrar ${qty} falha${qty > 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Botão principal do FAB ────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Ação rápida"
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
          open
            ? 'bg-gray-700 dark:bg-gray-600 rotate-45'
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
        style={{ animation: 'fadeInScale 0.25s ease-out' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
}
