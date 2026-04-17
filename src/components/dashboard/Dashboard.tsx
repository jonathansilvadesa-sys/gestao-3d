import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/shared/Badge';
import { R, margem, COLORS, truncate } from '@/utils/formatters';
import { exportarRelatorioPDF } from '@/utils/exportPdf';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  onSelect: (p: Product) => void;
  onEdit: (p: Product) => void;
}

export function Dashboard({ products, onSelect, onEdit }: Props) {
  const [exporting, setExporting] = useState(false);

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
      {/* KPI cards + botão PDF */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-gray-700 text-lg">Visão Geral</h2>
        <button
          onClick={handleExport}
          disabled={exporting || products.length === 0}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
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
          {exporting ? 'Gerando PDF…' : 'Exportar PDF'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total de peças"           value={totals.totalPecas}       color="indigo" />
        <StatCard label="Lucro total (consumidor)"  value={R(totals.totalLucroC)}   color="emerald" />
        <StatCard label="Lucro total (lojista)"     value={R(totals.totalLucroL)}   color="purple" />
        <StatCard
          label="Markup médio"
          value={`${totals.avgMarkup}x`}
          sub={totals.maisLucrativo ? `+ lucrativo: ${totals.maisLucrativo.nome}` : undefined}
          color="pink"
        />
      </div>

      {/* Estoque — visão contábil */}
      {totals.totalItens > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-700">📦 Estoque — Visão Contábil</h3>
              <p className="text-xs text-gray-400 mt-0.5">{totals.totalItens} unidade{totals.totalItens !== 1 ? 's' : ''} em estoque</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Capital Imobilizado — valor patrimonial ao custo */}
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-1">💰 Capital Imobilizado</p>
              <p className="text-2xl font-bold text-purple-700">{R(totals.capitalImobilizado)}</p>
              <p className="text-xs text-purple-400 mt-1">
                Custo de produção parado — dinheiro que saiu do bolso e ainda não voltou
              </p>
            </div>
            {/* Potencial de Venda — valor de mercado */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">🏷️ Potencial de Venda</p>
              <p className="text-2xl font-bold text-emerald-700">{R(totals.potencialVenda)}</p>
              <p className="text-xs text-emerald-400 mt-1">
                Faturamento bruto estimado se todo o estoque for vendido
              </p>
              {/* Margem bruta implícita */}
              {totals.capitalImobilizado > 0 && (
                <p className="text-xs font-semibold text-emerald-600 mt-2">
                  ↑ {((totals.potencialVenda / totals.capitalImobilizado - 1) * 100).toFixed(0)}% acima do custo
                </p>
              )}
            </div>
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
    </>
  );
}
