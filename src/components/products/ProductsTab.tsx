import { useState } from 'react';
import { Badge } from '@/components/shared/Badge';
import { R, COLORS } from '@/utils/formatters';
import { exportarRelatorioPDF } from '@/utils/exportPdf';
import type { Product } from '@/types';
import { useCanais }       from '@/contexts/CanaisContext';
import { usePermissions }  from '@/contexts/PermissionsContext';

interface Props {
  products: Product[];
  onSelect: (p: Product) => void;
  onEdit?: (p: Product) => void;
  onRemove?: (id: number) => void;
  onImport?: () => void;
}

export function ProductsTab({ products, onSelect, onEdit, onRemove, onImport }: Props) {
  const { canais }  = useCanais();
  const { can }     = usePermissions();
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const filtered = products.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()));

  const handleExport = async () => {
    setExporting(true);
    try { await exportarRelatorioPDF(products); }
    finally { setExporting(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-2 sm:gap-3">
        <h3 className="font-bold text-gray-700 dark:text-gray-200 flex-1 min-w-0">Todas as Peças</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar peça..."
          className="border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full sm:w-44 order-3 sm:order-none"
        />
        {/* Botão importar planilha */}
        {onImport && can('import_export_data') && (
          <button
            onClick={onImport}
            title="Importar produtos de planilha Excel/CSV"
            className="flex items-center gap-2 border border-emerald-200 text-emerald-700 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-emerald-50 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span className="hidden sm:inline">Importar</span>
          </button>
        )}
        {can('export_pdf') && <button
          onClick={handleExport}
          disabled={exporting || products.length === 0}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition"
        >
          {exporting ? (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )}
          PDF
        </button>}
      </div>

      {/* Empty state — sem produtos */}
      {products.length === 0 && (
        <div className="p-12 flex flex-col items-center gap-4 text-center">
          <svg width="90" height="90" viewBox="0 0 90 90" fill="none" className="opacity-60">
            <circle cx="45" cy="45" r="43" fill="#EEF2FF" />
            {/* impressora 3D estilizada */}
            <rect x="22" y="35" width="46" height="28" rx="5" fill="#C7D2FE" />
            <rect x="30" y="42" width="30" height="14" rx="3" fill="#EEF2FF" />
            <rect x="38" y="20" width="14" height="16" rx="2" fill="#818CF8" />
            <circle cx="45" cy="20" r="3" fill="#4F46E5" />
            <rect x="32" y="63" width="26" height="5" rx="2" fill="#A5B4FC" />
          </svg>
          <div>
            <p className="font-bold text-gray-700 text-base">Nenhuma peça cadastrada ainda</p>
            <p className="text-sm text-gray-400 max-w-xs mt-1">
              Comece cadastrando sua primeira peça. O sistema vai calcular automaticamente custo, markup e lucro para cada produto.
            </p>
          </div>
        </div>
      )}

      {/* Empty state — busca sem resultado */}
      {products.length > 0 && filtered.length === 0 && (
        <div className="p-10 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">🔍</span>
          <p className="font-semibold text-gray-600">Nenhuma peça corresponde a "{search}"</p>
          <p className="text-sm text-gray-400">Tente outro termo ou limpe a busca.</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Peça</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Tempo</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Peso</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Custo Un</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Markup</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Preço Final</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">Preço Lojista</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Lucro Líq.</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Ações</th>
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
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800">{p.nome}</span>
                      {p.canalVenda && p.canalVenda !== 'manual' && (() => {
                        const canal = canais.find((c) => c.id === p.canalVenda);
                        return canal ? (
                          <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                            {canal.emoji} {canal.nome}
                          </span>
                        ) : null;
                      })()}
                      {/* Mobile-only: custo + tempo/peso inline */}
                      <span className="text-[10px] text-gray-400 sm:hidden mt-0.5">{p.tempo}h · {p.peso}g · {R(p.custoUn)}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.tempo}h</td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.peso}g</td>
                <td className="px-4 py-3 font-medium text-gray-800 hidden sm:table-cell">{R(p.custoUn)}</td>
                <td className="px-4 py-3"><Badge v={`${p.markup}x`} bg={COLORS[i % COLORS.length]} /></td>
                <td className="px-4 py-3 font-bold text-indigo-700">{R(p.precoConsumidor)}</td>
                <td className="px-4 py-3 text-purple-600 hidden md:table-cell">{R(p.precoLojista)}</td>
                <td className="px-4 py-3 font-bold text-emerald-600">{R(p.lucroLiquidoConsumidor)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(p)}
                        title="Editar peça"
                        className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center transition"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                    {onRemove && (
                      <button
                        onClick={() => { if (confirm(`Remover "${p.nome}"?`)) onRemove(p.id); }}
                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition text-red-400 hover:text-red-600 font-bold text-lg"
                      >×</button>
                    )}
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
