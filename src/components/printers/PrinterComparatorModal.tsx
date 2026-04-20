import { useState, useMemo } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { PRINTER_PRESETS } from '@/types';
import { R } from '@/utils/formatters';

interface Props {
  onClose: () => void;
}

export function PrinterComparatorModal({ onClose }: Props) {
  const { settings, customPrinters, printerOverrides } = useSettings();

  // Parâmetros da peça para comparação
  const [tempo, setTempo]       = useState('3');
  const [custoKwh, setCustoKwh] = useState(String(settings.custoKwh));

  const allPrinters = useMemo(() => [
    ...PRINTER_PRESETS.map((p) => ({ ...p, ...(printerOverrides[p.id] ?? {}) })),
    ...customPrinters,
  ], [customPrinters, printerOverrides]);

  const resultados = useMemo(() => {
    const h   = parseFloat(tempo)    || 0;
    const kwh = parseFloat(custoKwh) || 0;

    return allPrinters.map((p) => {
      const energia      = +((p.potenciaW * h) / 1000 * kwh).toFixed(4);
      const amortizacao  = +((h / p.vidaUtilHoras) * p.valorMaquina).toFixed(4);
      const total        = +(energia + amortizacao).toFixed(4);
      return { ...p, energia, amortizacao, total };
    }).sort((a, b) => a.total - b.total);
  }, [allPrinters, tempo, custoKwh]);

  const melhor = resultados[0];
  const pior   = resultados[resultados.length - 1];

  // Ranking visual: escala relativa ao pior
  const escala = (v: number) =>
    pior && pior.total > 0 ? Math.round((v / pior.total) * 100) : 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 overflow-y-auto"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-3xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">⚖️ Comparador de Impressoras</h2>
              <p className="text-sm opacity-80 mt-0.5">
                Veja qual impressora tem menor custo para a sua peça
              </p>
            </div>
            <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-3xl font-light leading-none">×</button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Parâmetros */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">Parâmetros da Peça</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-indigo-700">Tempo de Impressão (h)</label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number" inputMode="decimal" min="0.1" step="0.5"
                    value={tempo}
                    onChange={(e) => setTempo(e.target.value)}
                    className="flex-1 border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  />
                  <span className="text-xs text-indigo-600 font-medium">h</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-indigo-700">Custo do kWh (R$)</label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number" inputMode="decimal" min="0" step="0.01"
                    value={custoKwh}
                    onChange={(e) => setCustoKwh(e.target.value)}
                    className="flex-1 border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  />
                  <span className="text-xs text-indigo-600 font-medium">R$</span>
                </div>
              </div>
            </div>
          </div>

          {/* Destaque do melhor */}
          {melhor && parseFloat(tempo) > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-sm font-bold text-emerald-800">
                  Menor custo: <span className="text-emerald-700">{melhor.marca} {melhor.nome}</span>
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {R(melhor.total)} total para {tempo}h de impressão
                  {pior && pior.total > 0 && melhor.total < pior.total && (
                    <span className="ml-1 font-semibold">
                      ({((1 - melhor.total / pior.total) * 100).toFixed(0)}% mais barato que o mais caro)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Tabela de comparação */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-bold text-gray-400 border-b border-gray-100">
                  <th className="text-left py-2 pr-3 font-semibold">Impressora</th>
                  <th className="text-right py-2 px-2 font-semibold">Potência</th>
                  <th className="text-right py-2 px-2 font-semibold">Energia</th>
                  <th className="text-right py-2 px-2 font-semibold">Amortização</th>
                  <th className="text-right py-2 pl-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resultados.map((p, i) => {
                  const isMelhor = i === 0;
                  const isPior   = i === resultados.length - 1 && resultados.length > 1;
                  const barra    = escala(p.total);
                  return (
                    <tr
                      key={p.id}
                      className={`${isMelhor ? 'bg-emerald-50/50' : isPior ? 'bg-red-50/30' : 'hover:bg-gray-50/50'} transition`}
                    >
                      <td className="py-3 pr-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {isMelhor && <span className="text-emerald-500 text-xs font-bold">🏆</span>}
                            {isPior   && <span className="text-red-400 text-xs">💸</span>}
                            <span className={`font-semibold ${isMelhor ? 'text-emerald-800' : 'text-gray-800'}`}>
                              {p.nome}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{p.marca}</span>
                        </div>
                        {/* Barra de custo relativo */}
                        <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all ${isMelhor ? 'bg-emerald-400' : isPior ? 'bg-red-400' : 'bg-indigo-300'}`}
                            style={{ width: `${barra}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-gray-500 text-xs">{p.potenciaW}W</td>
                      <td className="py-3 px-2 text-right">
                        <span className="font-medium text-gray-700">{R(p.energia)}</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="font-medium text-purple-700">{R(p.amortizacao)}</span>
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <span className={`font-bold text-sm ${isMelhor ? 'text-emerald-700' : isPior ? 'text-red-500' : 'text-gray-800'}`}>
                          {R(p.total)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-400 border-t border-gray-100 pt-3">
            <div>
              <span className="font-bold text-gray-600">Energia</span> = potência × horas ÷ 1000 × R$/kWh
            </div>
            <div>
              <span className="font-bold text-gray-600">Amortização</span> = (horas ÷ vida útil) × valor da máquina
            </div>
          </div>

          {allPrinters.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              Nenhuma impressora cadastrada. Adicione perfis em Configurações.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
