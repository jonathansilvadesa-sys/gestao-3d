import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { R, pct, margem, COLORS } from '@/utils/formatters';
import { recalcFromMarkup, calcMarkupFromMargem } from '@/utils/calc';
import { useCanais } from '@/contexts/CanaisContext';
import { useSettings } from '@/contexts/SettingsContext';
import type { Product } from '@/types';

interface Props {
  product: Product;
  onClose: () => void;
}

// ─── Cálculo para cada canal ──────────────────────────────────────────────────
// Estratégia A — Preço atual (markup fixo): mesma price em todos os canais, lucro varia.
// Estratégia B — Manter margem: preço diferente por canal para manter a mesma margem %.
function calcCanal(
  custoUn: number,
  markup: number,
  margemAlvo: number,   // % target
  imposto: number,
  txCartao: number,
  taxaCanal: number
) {
  // Estratégia A: mesmo markup → mesmo preço → lucro varia
  const rA = recalcFromMarkup(custoUn, markup, imposto, txCartao, taxaCanal);

  // Estratégia B: manter margemAlvo % → markup diferente → preço diferente
  const mkB   = calcMarkupFromMargem(margemAlvo, imposto, txCartao, taxaCanal);
  const rB    = recalcFromMarkup(custoUn, mkB, imposto, txCartao, taxaCanal);

  return { rA, rB, mkB };
}

export function ProductModal({ product: p, onClose }: Props) {
  const { canais }   = useCanais();
  const { settings } = useSettings();
  const [modoMulti, setModoMulti] = useState<'markup' | 'margem'>('markup');
  const [showMulti, setShowMulti] = useState(false);

  const custoAcess = p.acessorios.reduce((a, x) => a + x.qtd * x.custoUn, 0);
  const margemC    = margem(p.lucroLiquidoConsumidor, p.precoConsumidor);
  const margemL    = margem(p.lucroLiquidoLojista, p.precoLojista);

  // Margem atual do produto como base para o modo "manter margem"
  const margemBase = parseFloat(margemC) || 0;

  const breakdownData = [
    { name: 'Filamento',   value: p.custoFilamento },
    { name: 'Energia',     value: p.custoEnergia },
    { name: 'Amortização', value: p.amortizacao },
    { name: 'Custo Fixo',  value: p.custoFixoMes > 0 ? +(p.custoFixoMes / p.unidadesMes).toFixed(2) : 0 },
    { name: 'Acessórios',  value: custoAcess / p.unidades },
    ...((p.maoObraHoras ?? 0) > 0 && (p.maoObraTaxa ?? 0) > 0
      ? [{ name: 'Mão de Obra', value: (p.maoObraHoras ?? 0) * (p.maoObraTaxa ?? 0) }]
      : []),
  ].filter((d) => d.value > 0);

  // Canal atual da peça
  const canalAtual = canais.find((c) => c.id === (p.canalVenda ?? 'manual'));

  // Simulação por canal
  const simulacao = canais.map((canal) => {
    const { rA, rB, mkB } = calcCanal(
      p.custoUn,
      p.markup,
      margemBase,
      p.imposto,
      p.txCartao,
      canal.taxaPercent
    );
    return { canal, rA, rB, mkB };
  });

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
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-3xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{p.nome}</h2>
              <p className="text-sm opacity-80 mt-1">
                {p.tempo}h · {p.peso}g · {p.unidades} unid. · Markup {p.markup}x
                {canalAtual && canalAtual.id !== 'manual' && (
                  <span className="ml-2 opacity-90">{canalAtual.emoji} {canalAtual.nome}</span>
                )}
              </p>
            </div>
            <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-3xl font-light leading-none">×</button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Preços principais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Consumidor Final</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{R(p.precoConsumidor)}</p>
              <p className="text-sm text-gray-500 mt-1">Lucro líq.: <span className="font-semibold text-emerald-600">{R(p.lucroLiquidoConsumidor)}</span></p>
              <p className="text-xs text-gray-400">Margem {margemC}%</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Preço Lojista</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">{R(p.precoLojista)}</p>
              <p className="text-sm text-gray-500 mt-1">Lucro líq.: <span className="font-semibold text-emerald-600">{R(p.lucroLiquidoLojista)}</span></p>
              <p className="text-xs text-gray-400">Margem {margemL}%</p>
            </div>
          </div>

          {/* Custo */}
          <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custo por Unidade</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{R(p.custoUn)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Custo total do lote</p>
              <p className="text-lg font-semibold text-gray-700">{R(p.custoTotal)}</p>
            </div>
          </div>

          {/* ── SIMULAÇÃO MULTICANAL ─────────────────────────────────────────── */}
          <div className="border border-indigo-100 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMulti((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 transition text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <div>
                  <p className="text-sm font-bold text-indigo-700">Simulação Multicanal</p>
                  <p className="text-xs text-indigo-500">Compare preço e lucro em todos os canais simultaneamente</p>
                </div>
              </div>
              <span className={`text-indigo-400 text-lg font-light transition-transform ${showMulti ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {showMulti && (
              <div className="p-4 space-y-3">
                {/* Toggle de modo */}
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500 shrink-0">Calcular por:</p>
                  <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setModoMulti('markup')}
                      className={`px-3 py-1.5 transition ${modoMulti === 'markup' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                    >Markup atual ({p.markup}×)</button>
                    <button
                      type="button"
                      onClick={() => setModoMulti('margem')}
                      className={`px-3 py-1.5 transition ${modoMulti === 'margem' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                    >Manter margem ({margemC}%)</button>
                  </div>
                </div>

                {modoMulti === 'markup' && (
                  <p className="text-xs text-gray-400 -mt-1">
                    Preço fixo em <strong className="text-gray-600">{R(p.precoConsumidor)}</strong> — veja como o lucro varia por canal.
                  </p>
                )}
                {modoMulti === 'margem' && (
                  <p className="text-xs text-gray-400 -mt-1">
                    Para manter <strong className="text-gray-600">{margemC}% de margem</strong> — veja o preço necessário em cada canal.
                  </p>
                )}

                {/* Tabela */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left py-2 font-semibold">Canal</th>
                        <th className="text-right py-2 font-semibold">Taxa</th>
                        <th className="text-right py-2 font-semibold">
                          {modoMulti === 'markup' ? 'Preço' : 'Preço sugerido'}
                        </th>
                        <th className="text-right py-2 font-semibold">Lucro líq.</th>
                        <th className="text-right py-2 font-semibold">Margem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {simulacao.map(({ canal, rA, rB, mkB }) => {
                        const isAtual = canal.id === (p.canalVenda ?? 'manual');
                        const r       = modoMulti === 'markup' ? rA : rB;
                        const lucro   = r.lucroLiquidoConsumidor;
                        const preco   = r.precoConsumidor;
                        const mg      = r.margemConsumidor;
                        const isNeg   = lucro < 0;

                        return (
                          <tr
                            key={canal.id}
                            className={`${isAtual ? 'bg-indigo-50/60' : 'hover:bg-gray-50/60'} transition`}
                          >
                            <td className="py-2.5 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="text-base leading-none">{canal.emoji}</span>
                                <div>
                                  <span className="font-medium text-gray-800">{canal.nome}</span>
                                  {isAtual && (
                                    <span className="ml-1.5 text-[10px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full">atual</span>
                                  )}
                                  {modoMulti === 'margem' && (
                                    <span className="ml-1 text-[10px] text-gray-400">{mkB}×</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 text-right text-gray-500">{canal.taxaPercent}%</td>
                            <td className="py-2.5 text-right font-bold text-indigo-700">{R(preco)}</td>
                            <td className={`py-2.5 text-right font-bold ${isNeg ? 'text-red-500' : 'text-emerald-600'}`}>
                              {R(lucro)}
                            </td>
                            <td className={`py-2.5 text-right font-semibold text-xs ${
                              mg >= 30 ? 'text-emerald-600' :
                              mg >= 15 ? 'text-amber-500' :
                              'text-red-500'
                            }`}>
                              {mg}%
                              {mg >= 30 && <span className="ml-0.5">✓</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Legenda de margem */}
                <div className="flex flex-wrap gap-3 pt-1 text-xs text-gray-400">
                  <span><span className="text-emerald-500 font-bold">≥ 30%</span> — saudável</span>
                  <span><span className="text-amber-500 font-bold">15–29%</span> — aceitável</span>
                  <span><span className="text-red-500 font-bold">&lt; 15%</span> — atenção</span>
                </div>

                {/* Melhor canal */}
                {(() => {
                  const r = modoMulti === 'markup' ? simulacao : simulacao;
                  const melhor = [...simulacao].sort((a, b) =>
                    modoMulti === 'markup'
                      ? b.rA.lucroLiquidoConsumidor - a.rA.lucroLiquidoConsumidor
                      : b.rB.margemConsumidor - a.rB.margemConsumidor
                  )[0];
                  if (!melhor) return null;
                  const lucroM = modoMulti === 'markup'
                    ? melhor.rA.lucroLiquidoConsumidor
                    : melhor.rB.lucroLiquidoConsumidor;
                  return (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs">
                      <span className="text-base">{melhor.canal.emoji}</span>
                      <span className="text-emerald-700">
                        <strong>{melhor.canal.nome}</strong> oferece o melhor resultado —{' '}
                        <strong>{R(lucroM)}</strong> de lucro líquido
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Composição do custo */}
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Composição do Custo</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={breakdownData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {breakdownData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => R(v as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Detalhamento */}
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Detalhamento</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {([
                  ['Filamento',                    R(p.custoFilamento)],
                  ['Energia elétrica',             R(p.custoEnergia)],
                  ['Amortização da impressora',    R(p.amortizacao)],
                  ['Custo fixo rateado',           R(p.custoFixoMes > 0 ? p.custoFixoMes / p.unidadesMes : 0)],
                  ['Acessórios / embalagem',       R(custoAcess)],
                  ...((p.maoObraHoras ?? 0) > 0 && (p.maoObraTaxa ?? 0) > 0
                    ? [['Mão de obra', R((p.maoObraHoras ?? 0) * (p.maoObraTaxa ?? 0))] as [string,string]]
                    : []),
                  ['Imposto',                      pct(p.imposto)],
                  ['Taxa de cartão',               pct(p.txCartao)],
                  ['Taxa da plataforma',           pct(p.custoAnuncio)],
                  ['Taxa de falhas',               pct(p.falhas)],
                ] as [string, string][]).map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-2 text-gray-600">{k}</td>
                    <td className="py-2 text-right font-medium text-gray-800">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Filamentos */}
          {p.filamentos && p.filamentos.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">🧵 Filamentos Utilizados</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs">
                    <th className="text-left pb-1">Filamento</th>
                    <th className="text-right pb-1">Peso (g)</th>
                    <th className="text-right pb-1">R$/kg</th>
                    <th className="text-right pb-1">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {p.filamentos.map((fl, i) => (
                    <tr key={i}>
                      <td className="py-1 text-gray-700">{fl.nome}</td>
                      <td className="py-1 text-right text-gray-600">{fl.peso}g</td>
                      <td className="py-1 text-right text-gray-600">{R(fl.custoKg)}</td>
                      <td className="py-1 text-right font-medium">{R((fl.peso / 1000) * fl.custoKg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Acessórios */}
          {p.acessorios.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">📦 Acessórios e Embalagens</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs">
                    <th className="text-left pb-1">Item</th>
                    <th className="text-right pb-1">Qtd</th>
                    <th className="text-right pb-1">Custo un.</th>
                    <th className="text-right pb-1">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {p.acessorios.map((a, i) => (
                    <tr key={i}>
                      <td className="py-1 text-gray-700">{a.nome}</td>
                      <td className="py-1 text-right text-gray-600">{a.qtd}</td>
                      <td className="py-1 text-right text-gray-600">{R(a.custoUn)}</td>
                      <td className="py-1 text-right font-medium">{R(a.qtd * a.custoUn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Frete */}
          {(p.freteMode && p.freteMode !== 'none' && (p.freteValor ?? 0) > 0) && (
            <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-sky-700">🚚 Frete</p>
                <p className="text-xs text-sky-500">
                  {p.freteMode === 'fixo'
                    ? `Valor fixo por peça`
                    : `${p.freteValor}% do preço de venda`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sky-700">{R(p.custoFrete ?? 0)}</p>
                <p className="text-xs text-sky-400">por unidade</p>
              </div>
            </div>
          )}

          {/* Histórico de preços */}
          {(p.historicoPrecos ?? []).length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">📈 Histórico de Preços</p>
              <div className="relative pl-4 space-y-0">
                {(p.historicoPrecos ?? []).map((h, i) => {
                  const subiu = h.precoNovo > h.precoAnterior;
                  const igual = h.precoNovo === h.precoAnterior;
                  const d = new Date(h.data);
                  const dataFmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
                  return (
                    <div key={i} className="relative pb-4 last:pb-0">
                      {/* Linha vertical */}
                      {i < (p.historicoPrecos ?? []).length - 1 && (
                        <div className="absolute left-[-13px] top-5 bottom-0 w-px bg-gray-200" />
                      )}
                      {/* Ponto */}
                      <div className={`absolute left-[-17px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                        igual ? 'bg-gray-400' : subiu ? 'bg-emerald-500' : 'bg-red-400'
                      }`} />
                      <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700">{dataFmt}</span>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                              igual ? 'bg-gray-100 text-gray-500'
                              : subiu ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                            }`}>
                              {igual ? '—' : subiu ? '↑ subiu' : '↓ baixou'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400 line-through text-xs">{R(h.precoAnterior)}</span>
                            <span className="font-bold text-gray-800">→ {R(h.precoNovo)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Markup: {h.markupAnterior}× → {h.markupNovo}×
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
