import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/shared/Badge';
import { InfoTooltip } from '@/components/shared/Tooltip';
import { R, margem, COLORS, truncate } from '@/utils/formatters';
import { exportarRelatorioPDF } from '@/utils/exportPdf';
import { useSettings } from '@/contexts/SettingsContext';
import { PrinterComparatorModal } from '@/components/printers/PrinterComparatorModal';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  onSelect: (p: Product) => void;
  onEdit: (p: Product) => void;
}

export function Dashboard({ products, onSelect, onEdit }: Props) {
  const [exporting, setExporting] = useState(false);
  const [showComparator, setShowComparator] = useState(false);
  const { settings, resetFaturamentoMes } = useSettings();

  const mesAtual = new Date().toISOString().slice(0, 7);
  // Auto-reset faturamento se o mês mudou
  const faturamentoMes = settings.faturamentoMesRef === mesAtual
    ? settings.faturamentoMesAtual
    : 0;

  const totals = useMemo(() => {
    const comEstoque = products.filter((p) => (p.estoque ?? 0) > 0);
    return {
      totalPecas:     products.length,
      totalLucroC:    products.reduce((a, p) => a + p.lucroLiquidoConsumidor, 0),
      totalLucroL:    products.reduce((a, p) => a + p.lucroLiquidoLojista, 0),
      avgMarkup:      products.length
        ? (products.reduce((a, p) => a + p.markup, 0) / products.length).toFixed(1)
        : '0',
      maisLucrativo:  [...products].sort((a, b) => b.lucroLiquidoConsumidor - a.lucroLiquidoConsumidor)[0],
      // Estoque — visão contábil
      totalItens:         comEstoque.reduce((a, p) => a + (p.estoque ?? 0), 0),
      capitalImobilizado: comEstoque.reduce((a, p) => a + (p.estoque ?? 0) * p.custoUn, 0),
      potencialVenda:     comEstoque.reduce((a, p) => a + (p.estoque ?? 0) * p.precoConsumidor, 0),
    };
  }, [products]);

  // ── Alertas de Break-even ─────────────────────────────────────────────────
  const alertasBreakeeven = useMemo(() => {
    return products
      .filter((p) => {
        if (p.lucroLiquidoConsumidor <= 0) return false;
        const lote = p.estoque > 0 ? p.estoque : p.unidades;
        if (lote <= 0) return false;
        const capital = p.custoUn * lote;
        const breakevenUnits = Math.ceil(capital / p.lucroLiquidoConsumidor);
        return (p.estoque ?? 0) < breakevenUnits;
      })
      .map((p) => {
        const lote = p.estoque > 0 ? p.estoque : p.unidades;
        const capital = p.custoUn * lote;
        const breakevenUnits = Math.ceil(capital / p.lucroLiquidoConsumidor);
        const faltam = breakevenUnits - (p.estoque ?? 0);
        const pct = lote > 0
          ? Math.min(100, Math.round(((p.estoque ?? 0) / breakevenUnits) * 100))
          : 0;
        return { p, breakevenUnits, faltam, pct };
      })
      .sort((a, b) => b.faltam - a.faltam);
  }, [products]);

  const chartData = products.map((p) => ({
    name:        truncate(p.nome, 10),
    'Custo Un':  p.custoUn,
    'Preço':     p.precoConsumidor,
    'Lucro Líq.': p.lucroLiquidoConsumidor,
  }));

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportarRelatorioPDF(products);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {/* KPI cards + botões */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-gray-700 dark:text-gray-200 text-lg">Visão Geral</h2>
        <div className="flex items-center gap-2">
          {/* Label visível apenas no desktop */}
          <button
            onClick={() => setShowComparator(true)}
            className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 transition shadow-sm"
          >
            <span>⚖️</span>
            <span className="hidden sm:inline">Comparar Impressoras</span>
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || products.length === 0}
            className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
          >
            {exporting ? (
              <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            )}
            <span className="hidden sm:inline">{exporting ? 'Gerando PDF…' : 'Exportar PDF'}</span>
            <span className="sm:hidden">{exporting ? '…' : 'PDF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de peças"           value={totals.totalPecas}       color="indigo" />
        <StatCard label="Lucro total (consumidor)"  value={R(totals.totalLucroC)}   color="emerald" />
        <StatCard label="Lucro total (lojista)"     value={R(totals.totalLucroL)}   color="purple" />
        <StatCard
          label="Markup médio"
          value={`${totals.avgMarkup}x`}
          sub={totals.maisLucrativo ? `+ lucrativo: ${totals.maisLucrativo.nome}` : undefined}
          color="pink"
          tooltip="Markup é o multiplicador aplicado sobre o custo de produção para chegar ao preço de venda. Ex: markup 2x = preço = 2× o custo."
        />
      </div>

      {/* ── Meta de Faturamento Mensal ─────────────────────────────────────── */}
      {settings.metaFaturamento > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-700">🎯 Meta de Faturamento — {mesAtual.slice(0, 7).replace('-', '/')}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Faturamento registrado via vendas do mês</p>
            </div>
            <button
              onClick={resetFaturamentoMes}
              className="text-xs text-gray-400 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50"
              title="Zerar faturamento do mês"
            >
              Zerar mês
            </button>
          </div>
          {(() => {
            const pctMeta = Math.min(100, Math.round((faturamentoMes / settings.metaFaturamento) * 100));
            const faltaMeta = Math.max(0, settings.metaFaturamento - faturamentoMes);
            const cor = pctMeta >= 100 ? 'bg-emerald-500' : pctMeta >= 60 ? 'bg-indigo-500' : pctMeta >= 30 ? 'bg-amber-400' : 'bg-red-400';
            return (
              <>
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-2xl font-bold text-gray-800">{R(faturamentoMes)}</span>
                  <span className="text-sm font-semibold text-gray-400">de {R(settings.metaFaturamento)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${cor}`}
                    style={{ width: `${pctMeta}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className={`font-bold ${pctMeta >= 100 ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {pctMeta}% {pctMeta >= 100 ? '🎉 Meta atingida!' : ''}
                  </span>
                  {pctMeta < 100 && (
                    <span className="text-gray-400">Faltam {R(faltaMeta)}</span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Estoque — visão contábil */}
      {totals.totalItens > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5" data-tour="dashboard-patrimonio">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-700">📦 Estoque — Visão Contábil</h3>
              <p className="text-xs text-gray-400 mt-0.5">{totals.totalItens} unidade{totals.totalItens !== 1 ? 's' : ''} em estoque</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-1">💰 Capital Imobilizado</p>
              <p className="text-2xl font-bold text-purple-700">{R(totals.capitalImobilizado)}</p>
              <p className="text-xs text-purple-400 mt-1">
                Custo de produção parado — dinheiro que saiu do bolso e ainda não voltou
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">🏷️ Potencial de Venda</p>
              <p className="text-2xl font-bold text-emerald-700">{R(totals.potencialVenda)}</p>
              <p className="text-xs text-emerald-400 mt-1">
                Faturamento bruto estimado se todo o estoque for vendido
              </p>
              {totals.capitalImobilizado > 0 && (
                <p className="text-xs font-semibold text-emerald-600 mt-2">
                  ↑ {((totals.potencialVenda / totals.capitalImobilizado - 1) * 100).toFixed(0)}% acima do custo
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Alertas de Break-even ──────────────────────────────────────────── */}
      {alertasBreakeeven.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5" data-tour="dashboard-breakeven">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">⚠️</span>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="font-bold text-amber-700">Ponto de Equilíbrio não atingido</h3>
                <InfoTooltip
                  text="Break-even (ponto de equilíbrio) é a quantidade mínima de vendas necessária para recuperar o custo de produção investido. Abaixo disso, o capital ainda está 'preso' no estoque."
                  position="right"
                />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {alertasBreakeeven.length} {alertasBreakeeven.length === 1 ? 'produto precisa' : 'produtos precisam'} de mais vendas para recuperar o capital investido
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {alertasBreakeeven.map(({ p, breakevenUnits, faltam, pct }) => (
              <div key={p.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <button
                    onClick={() => onSelect(p)}
                    className="font-semibold text-gray-800 text-sm hover:text-indigo-600 transition text-left"
                  >
                    {p.nome}
                  </button>
                  <div className="text-right text-xs shrink-0 ml-2">
                    <span className="font-bold text-amber-700">{p.estoque ?? 0}</span>
                    <span className="text-amber-500"> / {breakevenUnits} un.</span>
                  </div>
                </div>
                {/* Barra de progresso */}
                <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden mb-1.5">
                  <div
                    className="h-2 rounded-full bg-amber-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-amber-600">
                  <span>{pct}% do break-even</span>
                  <span className="font-semibold">
                    Faltam <strong>{faltam}</strong> venda{faltam !== 1 ? 's' : ''} · {R(faltam * p.lucroLiquidoConsumidor)} de lucro
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-700 mb-4">Custo × Preço × Lucro por Peça</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
            <Tooltip formatter={(v) => R(v as number)} />
            <Legend />
            <Bar dataKey="Custo Un"   fill="#e0e7ff" radius={[4,4,0,0]} />
            <Bar dataKey="Preço"      fill="#6366f1" radius={[4,4,0,0]} />
            <Bar dataKey="Lucro Líq." fill="#10b981" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cards de produtos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((p, i) => (
          <div key={p.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ background: COLORS[i % COLORS.length] }}
              >
                {p.nome[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{p.nome}</p>
                <p className="text-xs text-gray-400">{p.tempo}h · {p.peso}g · {p.unidades} unid.</p>
              </div>
              <Badge v={`${p.markup}x`} bg={COLORS[i % COLORS.length]} />
              <button
                onClick={() => onEdit(p)}
                title="Editar peça"
                className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center transition"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-xl py-2">
                <p className="text-xs text-gray-400">Custo Un</p>
                <p className="font-bold text-gray-700 text-sm">{R(p.custoUn)}</p>
              </div>
              <div className="bg-indigo-50 rounded-xl py-2">
                <p className="text-xs text-indigo-400">Preço</p>
                <p className="font-bold text-indigo-700 text-sm">{R(p.precoConsumidor)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl py-2">
                <p className="text-xs text-emerald-400">Lucro Líq.</p>
                <p className="font-bold text-emerald-700 text-sm">{R(p.lucroLiquidoConsumidor)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Margem {margem(p.lucroLiquidoConsumidor, p.precoConsumidor)}%</span>
              <button onClick={() => onSelect(p)} className="text-indigo-500 font-semibold">Ver detalhes →</button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparador de Impressoras */}
      {showComparator && (
        <PrinterComparatorModal onClose={() => setShowComparator(false)} />
      )}
    </>
  );
}
