import { useState, useMemo } from 'react';
import { recalcFromMarkup, calcBreakEvenMarkup } from '@/utils/calc';
import { R } from '@/utils/formatters';
import type { Product } from '@/types';

interface Props {
  product: Product;
  onClose: () => void;
  onSave: (id: number, updates: Partial<Product>) => void;
}

export function EditMarkupModal({ product: p, onClose, onSave }: Props) {
  const [markup, setMarkup] = useState(String(p.markup));

  const preview = useMemo(
    () => recalcFromMarkup(p.custoUn, parseFloat(markup) || p.markup, p.imposto, p.txCartao, p.custoAnuncio),
    [p, markup]
  );

  const breakEven = calcBreakEvenMarkup(p.imposto, p.txCartao, p.custoAnuncio);
  const markupNum = parseFloat(markup) || p.markup;
  const isPrejuizo = markupNum < breakEven;
  const isNoPonto = Math.abs(markupNum - breakEven) < 0.1;

  const statusColor = isPrejuizo ? '#ef4444' : isNoPonto ? '#f59e0b' : '#10b981';
  const statusLabel = isPrejuizo ? '⚠️ Prejuízo após taxas' : isNoPonto ? '⚡ No ponto de equilíbrio' : '✅ Lucrativo';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-y-auto"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-3xl p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Editar Markup</h2>
            <p className="text-sm opacity-80 mt-0.5">{p.nome}</p>
          </div>
          <button onClick={onClose} className="text-3xl font-light opacity-70 hover:opacity-100">×</button>
        </div>

        <div className="p-6 space-y-5">

          {/* Controle de markup */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Novo Markup</label>
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => setMarkup((v) => String(Math.max(1, parseFloat(v) - 0.5)))}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-bold text-gray-600 flex items-center justify-center"
              >−</button>
              <input
                type="number" inputMode="decimal" step="0.5" min="1"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                className="flex-1 text-center text-2xl font-bold border-2 border-amber-300 rounded-xl py-2 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => setMarkup((v) => String(parseFloat(v) + 0.5))}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-bold text-gray-600 flex items-center justify-center"
              >+</button>
            </div>
          </div>

          {/* Break-even card */}
          <div
            className="rounded-2xl p-4 border-2"
            style={{ borderColor: statusColor, background: `${statusColor}10` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: statusColor }}>
                  Ponto de Equilíbrio
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: statusColor }}>
                  {breakEven}x mínimo
                </p>
                <p className="text-xs mt-0.5" style={{ color: statusColor }}>{statusLabel}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Soma das taxas</p>
                <p className="font-bold text-base text-gray-700">
                  {p.imposto + p.txCartao + p.custoAnuncio}%
                </p>
                <p className="text-xs">(imp + cartão + anúncio)</p>
              </div>
            </div>
          </div>

          {/* Tabela comparativa */}
          <div className="bg-amber-50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Comparação</p>
            <div className="grid grid-cols-3 text-xs text-center text-gray-500 font-semibold uppercase tracking-wide mb-1">
              <span></span><span>Atual</span><span>Novo</span>
            </div>
            {([
              ['Markup',                 `${p.markup}x`,                          `${markupNum}x`],
              ['Preço Consumidor',       R(p.precoConsumidor),                    R(preview.precoConsumidor)],
              ['Preço Lojista',          R(p.precoLojista),                       R(preview.precoLojista)],
              ['Lucro Líq. Consumidor',  R(p.lucroLiquidoConsumidor),             R(preview.lucroLiquidoConsumidor)],
              ['Lucro Líq. Lojista',     R(p.lucroLiquidoLojista),                R(preview.lucroLiquidoLojista)],
              ['Margem Consumidor',      `${((p.lucroLiquidoConsumidor / p.precoConsumidor) * 100).toFixed(1)}%`, `${preview.margemConsumidor}%`],
            ] as [string, string, string][]).map(([label, old, novo]) => (
              <div key={label} className="grid grid-cols-3 gap-2 text-sm items-center">
                <span className="text-gray-500 text-xs">{label}</span>
                <span className="text-center font-medium text-gray-400 line-through">{old}</span>
                <span
                  className="text-center font-bold"
                  style={{ color: preview.lucroLiquidoConsumidor < 0 ? '#ef4444' : '#92400e' }}
                >
                  {novo}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-500 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onSave(p.id, {
                  markup: markupNum,
                  precoConsumidor: preview.precoConsumidor,
                  precoLojista: preview.precoLojista,
                  lucroLiquidoConsumidor: preview.lucroLiquidoConsumidor,
                  lucroLiquidoLojista: preview.lucroLiquidoLojista,
                });
                onClose();
              }}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
