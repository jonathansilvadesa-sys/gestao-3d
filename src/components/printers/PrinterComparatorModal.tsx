import { useState, useMemo } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { PRINTER_PRESETS } from '@/types';
import { R } from '@/utils/formatters';

interface Props {
  onClose: () => void;
}

export function PrinterComparatorModal({ onClose }: Props) {
  const { settings, customPrinters, printerOverrides } = useSettings();

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
      const energia     = +((p.potenciaW * h) / 1000 * kwh).toFixed(4);
      const amortizacao = +((h / p.vidaUtilHoras) * p.valorMaquina).toFixed(4);
      const total       = +(energia + amortizacao).toFixed(4);
      return { ...p, energia, amortizacao, total };
    }).sort((a, b) => a.total - b.total);
  }, [allPrinters, tempo, custoKwh]);

  const melhor = resultados[0];
  const pior   = resultados[resultados.length - 1];

  const escala = (v: number) =>
    pior && pior.total > 0 ? Math.round((v / pior.total) * 100) : 100;

  // Badges de ranking
  const badge = (i: number, total: number) => {
    if (i === 0) return { label: '🏆 Mais barata', cls: 'bg-emerald-100 text-emerald-700' };
    if (i === total - 1 && total > 1) return { label: '💸 Mais cara', cls: 'bg-red-100 text-red-600' };
    if (i === 1) return { label: '#2', cls: 'bg-indigo-100 text-indigo-600' };
    return { label: `#${i + 1}`, cls: 'bg-gray-100 text-gray-500' };
  };

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
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-3xl p-5 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold">⚖️ Comparador de Impressoras</h2>
              <p className="text-sm opacity-80 mt-0.5">Qual impressora tem menor custo para sua peça?</p>
            </div>
            {/* Botão fechar grande — fácil de tocar */}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition flex-shrink-0 text-white text-xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Parâmetros — dentro do header colorido */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold opacity-80 block mb-1">Tempo de impressão</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" inputMode="decimal" min="0.1" step="0.5"
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  className="flex-1 bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <span className="text-sm font-semibold opacity-80">h</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold opacity-80 block mb-1">Custo do kWh</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" inputMode="decimal" min="0" step="0.01"
                  value={custoKwh}
                  onChange={(e) => setCustoKwh(e.target.value)}
                  className="flex-1 bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <span className="text-sm font-semibold opacity-80">R$</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Corpo rolável ────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">

          {/* Destaque do melhor */}
          {melhor && parseFloat(tempo) > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">🏆</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 truncate">
                  {melhor.marca} {melhor.nome}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {R(melhor.total)} para {tempo}h
                  {pior && pior.total > 0 && melhor.total < pior.total && (
                    <span className="ml-1 font-semibold">
                      · {((1 - melhor.total / pior.total) * 100).toFixed(0)}% mais barata
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ── Cards de comparação ──────────────────────────────────── */}
          {allPrinters.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Nenhuma impressora cadastrada. Adicione perfis em Configurações.
            </div>
          ) : (
            <div className="space-y-3">
              {resultados.map((p, i) => {
                const b    = badge(i, resultados.length);
                const barra = escala(p.total);
                const isMelhor = i === 0;
                const isPior   = i === resultados.length - 1 && resultados.length > 1;

                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border p-4 transition ${
                      isMelhor
                        ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-900/10'
                        : isPior
                          ? 'border-red-100 dark:border-red-800 bg-red-50/40 dark:bg-red-900/10'
                          : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    {/* Card header: nome + badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className={`font-bold text-sm sm:text-base truncate ${isMelhor ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-100'}`}>
                          {p.nome}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{p.marca}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${b.cls}`}>
                        {b.label}
                      </span>
                    </div>

                    {/* Barra de custo relativo */}
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden mb-3">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${isMelhor ? 'bg-emerald-400' : isPior ? 'bg-red-400' : 'bg-indigo-300'}`}
                        style={{ width: `${barra}%` }}
                      />
                    </div>

                    {/* Métricas em grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white dark:bg-gray-700/60 rounded-xl py-2 px-1">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{p.potenciaW}W</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Potência</p>
                      </div>
                      <div className="bg-white dark:bg-gray-700/60 rounded-xl py-2 px-1">
                        <p className="text-xs font-bold text-indigo-600">{R(p.energia)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Energia</p>
                      </div>
                      <div className="bg-white dark:bg-gray-700/60 rounded-xl py-2 px-1">
                        <p className="text-xs font-bold text-purple-600">{R(p.amortizacao)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Amortização</p>
                      </div>
                    </div>

                    {/* Total — destaque central */}
                    <div className={`mt-3 rounded-xl py-2.5 px-4 flex items-center justify-between ${
                      isMelhor
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : isPior
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'bg-gray-50 dark:bg-gray-700/40'
                    }`}>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Custo total para {tempo}h</span>
                      <span className={`text-lg font-bold ${isMelhor ? 'text-emerald-700 dark:text-emerald-400' : isPior ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>
                        {R(p.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legenda */}
          <div className="text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1">
            <p><span className="font-semibold text-gray-500 dark:text-gray-400">Energia</span> = potência × horas ÷ 1000 × R$/kWh</p>
            <p><span className="font-semibold text-gray-500 dark:text-gray-400">Amortização</span> = (horas ÷ vida útil) × valor da máquina</p>
          </div>
        </div>
      </div>
    </div>
  );
}
