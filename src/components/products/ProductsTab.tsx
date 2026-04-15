import { useState } from 'react';
import { Badge } from '@/components/shared/Badge';
import { R, COLORS } from '@/utils/formatters';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  onSelect: (p: Product) => void;
  onEditMarkup: (p: Product) => void;
  onRemove: (id: number) => void;
}

export function ProductsTab({ products, onSelect, onEditMarkup, onRemove }: Props) {
  const [search, setSearch] = useState('');
  const filtered = products.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center gap-3">
        <h3 className="font-bold text-gray-700 flex-1">Todas as Peças</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar peça..."
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Peça', 'Tempo', 'Peso', 'Custo Un', 'Markup', 'Preço Final', 'Preço Lojista', 'Lucro Líq.', 'Ações'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((p, i) => (
              <tr key={p.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelect(p)}>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: COLORS[i % COLORS.length] }}
                    >
                      {p.nome[0]}
                    </div>
                    <span className="font-semibold text-gray-800">{p.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{p.tempo}h</td>
                <td className="px-4 py-3 text-gray-600">{p.peso}g</td>
                <td className="px-4 py-3 font-medium text-gray-800">{R(p.custoUn)}</td>
                <td className="px-4 py-3"><Badge v={`${p.markup}x`} bg={COLORS[i % COLORS.length]} /></td>
                <td className="px-4 py-3 font-bold text-indigo-700">{R(p.precoConsumidor)}</td>
                <td className="px-4 py-3 text-purple-600">{R(p.precoLojista)}</td>
                <td className="px-4 py-3 font-bold text-emerald-600">{R(p.lucroLiquidoConsumidor)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditMarkup(p)}
                      title="Editar markup"
                      className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => { if (confirm(`Remover "${p.nome}"?`)) onRemove(p.id); }}
                      title="Remover"
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition text-red-400 hover:text-red-600 font-bold text-lg"
                    >×</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
