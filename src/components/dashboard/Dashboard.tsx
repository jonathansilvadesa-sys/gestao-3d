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
  onEditMarkup: (p: Product) => void;
}

export function Dashboard({ products, onSelect, onEditMarkup }: Props) {
  const [exporting, setExporting] = useState(false);

  const totals = useMemo(() => ({
    totalPecas:     products.length,
    totalLucroC:    products.reduce((a, p) => a + p.lucroLiquidoConsumidor, 0),
    totalLucroL:    products.reduce((a, p) => a + p.lucroLiquidoLojista, 0),
    avgMarkup:      products.length
      ? (products.reduce((a, p) => a + p.markup, 0) / products.length).toFixed(1)
      : '0',
    maisLucrativo:  [...products].sort((a, b) => b.lucroLiquidoConsumidor - a.lucroLiquidoConsumidor)[0],
  }), [products]);

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
                onClick={() => onEditMarkup(p)}
                title="Editar markup"
                className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
