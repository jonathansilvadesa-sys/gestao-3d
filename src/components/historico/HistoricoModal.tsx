import { useState, useMemo } from 'react';
import type { Product, EstoqueTipoMovimento } from '@/types';

interface Props {
  products: Product[];
  onClose: () => void;
}

type FiltroTipo = 'todos' | EstoqueTipoMovimento;

const TIPO_INFO: Record<EstoqueTipoMovimento, { label: string; emoji: string; cls: string }> = {
  producao: { label: 'Produção',  emoji: '🖨️', cls: 'bg-indigo-100 text-indigo-700' },
  venda:    { label: 'Venda',     emoji: '🏷️', cls: 'bg-emerald-100 text-emerald-700' },
  ajuste:   { label: 'Ajuste',   emoji: '✏️',  cls: 'bg-amber-100 text-amber-700' },
  falha:    { label: 'Falha',    emoji: '⚠️',  cls: 'bg-red-100 text-red-600' },
};

function fmtData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtMes(ym: string) {
  const [y, m] = ym.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`;
}

export function HistoricoModal({ products, onClose }: Props) {
  const [filtroTipo,  setFiltroTipo]  = useState<FiltroTipo>('todos');
  const [filtroPeca,  setFiltroPeca]  = useState<string>('todos');
  const [filtroMes,   setFiltroMes]   = useState<string>('todos');
  const [busca,       setBusca]       = useState('');

  // Todos os movimentos achatados com referência ao produto
  const movimentos = useMemo(() => {
    const result: {
      id: string;
      produtoId: number;
      produtoNome: string;
      tipo: EstoqueTipoMovimento;
      quantidade: number;
      data: string;
      motivo?: string;
    }[] = [];

    for (const p of products) {
      for (const m of p.movimentosEstoque ?? []) {
        result.push({
          id: m.id,
          produtoId: p.id,
          produtoNome: p.nome,
          tipo: m.tipo,
          quantidade: m.quantidade,
          data: m.data,
          motivo: m.motivo,
        });
      }
    }

    // Ordena por data desc
    return result.sort((a, b) => b.data.localeCompare(a.data));
  }, [products]);

  // Meses únicos disponíveis
  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    movimentos.forEach((m) => set.add(m.data.slice(0, 7)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [movimentos]);

  // Filtrado
  const filtrados = useMemo(() => {
    return movimentos.filter((m) => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false;
      if (filtroPeca !== 'todos' && String(m.produtoId) !== filtroPeca) return false;
      if (filtroMes  !== 'todos' && !m.data.startsWith(filtroMes)) return false;
      if (busca && !m.produtoNome.toLowerCase().includes(busca.toLowerCase()) &&
          !(m.motivo ?? '').toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [movimentos, filtroTipo, filtroPeca, filtroMes, busca]);

  // Resumos rápidos dos filtrados
  const resumo = useMemo(() => {
    const vendas    = filtrados.filter((m) => m.tipo === 'venda')   .reduce((s, m) => s + m.quantidade, 0);
    const producoes = filtrados.filter((m) => m.tipo === 'producao').reduce((s, m) => s + m.quantidade, 0);
    const falhas    = filtrados.filter((m) => m.tipo === 'falha')   .reduce((s, m) => s + m.quantidade, 0);
    return { vendas, producoes, falhas, total: filtrados.length };
  }, [filtrados]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 w-full sm:max-w-2xl sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-t-3xl sm:rounded-t-3xl p-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">📋 Histórico de Movimentações</h2>
              <p className="text-sm text-white/80 mt-0.5">Produções, vendas, ajustes e falhas</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 transition"
            >
              ×
            </button>
          </div>

          {/* Resumo rápido */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-white/15 rounded-xl py-2 px-3 text-center">
              <p className="text-xl font-bold text-white">{resumo.vendas}</p>
              <p className="text-[11px] text-white/70 font-medium">Vendas</p>
            </div>
            <div className="bg-white/15 rounded-xl py-2 px-3 text-center">
              <p className="text-xl font-bold text-white">{resumo.producoes}</p>
              <p className="text-[11px] text-white/70 font-medium">Produções</p>
            </div>
            <div className="bg-white/15 rounded-xl py-2 px-3 text-center">
              <p className="text-xl font-bold text-white">{resumo.falhas}</p>
              <p className="text-[11px] text-white/70 font-medium">Falhas</p>
            </div>
          </div>
        </div>

        {/* ── Filtros ────────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0 space-y-3">

          {/* Busca */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar peça ou motivo…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {/* Filtro Tipo */}
            {(['todos', 'venda', 'producao', 'falha', 'ajuste'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  filtroTipo === t
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-indigo-400'
                }`}
              >
                {t === 'todos' ? '🔹 Todos' : `${TIPO_INFO[t].emoji} ${TIPO_INFO[t].label}`}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Filtro Peça */}
            <select
              value={filtroPeca}
              onChange={(e) => setFiltroPeca(e.target.value)}
              className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="todos">Todas as peças</option>
              {products.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.nome}</option>
              ))}
            </select>

            {/* Filtro Mês */}
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="todos">Todos os meses</option>
              {mesesDisponiveis.map((m) => (
                <option key={m} value={m}>{fmtMes(m)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Lista rolável ──────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
          {filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm">Nenhuma movimentação encontrada</p>
              {movimentos.length === 0 && (
                <p className="text-xs mt-1 text-gray-300">Registre produções e vendas na aba Estoque</p>
              )}
            </div>
          ) : (
            filtrados.map((m) => {
              const info = TIPO_INFO[m.tipo];
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl p-3.5"
                >
                  {/* Ícone tipo */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${info.cls}`}>
                    {info.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate max-w-[160px]">
                        {m.produtoNome}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${info.cls}`}>
                        {info.label}
                      </span>
                    </div>
                    {m.motivo && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{m.motivo}</p>
                    )}
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {fmtData(m.data)} às {fmtHora(m.data)}
                    </p>
                  </div>

                  {/* Quantidade */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-base font-bold ${
                      m.tipo === 'venda'    ? 'text-emerald-600' :
                      m.tipo === 'producao' ? 'text-indigo-600' :
                      m.tipo === 'falha'    ? 'text-red-500' :
                      'text-amber-600'
                    }`}>
                      {m.tipo === 'venda' ? '−' : m.tipo === 'falha' ? '−' : '+'}{m.quantidade}
                    </p>
                    <p className="text-[10px] text-gray-400">un.</p>
                  </div>
                </div>
              );
            })
          )}

          {/* Contador */}
          {filtrados.length > 0 && (
            <p className="text-center text-xs text-gray-400 pt-2">
              {filtrados.length} movimentaç{filtrados.length === 1 ? 'ão' : 'ões'} encontrada{filtrados.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
