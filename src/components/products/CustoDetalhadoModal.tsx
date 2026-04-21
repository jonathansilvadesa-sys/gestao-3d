import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { R } from '@/utils/formatters';

const pct = (valor: number, total: number) =>
  total > 0 ? `${((valor / total) * 100).toFixed(1)}%` : '—';
import type { Product } from '@/types';

interface Props {
  product: Product;
  onClose: () => void;
}

const CORES = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899'];

interface LinhaItem {
  label: string;
  emoji: string;
  valor: number;
  descricao?: string;
  detalhe?: string;
  cor: string;
}

export function CustoDetalhadoModal({ product: p, onClose }: Props) {
  const custoAcessTotal = p.acessorios.reduce((a, x) => a + x.qtd * x.custoUn, 0);
  const custoAcessUn    = p.unidades > 0 ? custoAcessTotal / p.unidades : 0;
  const custoFixoRat    = p.custoFixoRateado ?? +(p.custoFixoMes / Math.max(p.unidadesMes, 1)).toFixed(2);
  const custoMaoObra    = (p.maoObraHoras ?? 0) * (p.maoObraTaxa ?? 0);
  const custoFrete      = p.custoFrete ?? 0;

  const itens: LinhaItem[] = useMemo(() => {
    const lista: LinhaItem[] = [];

    if (p.custoFilamento > 0) lista.push({
      label: 'Filamento',
      emoji: '🧵',
      valor: p.custoFilamento,
      descricao: `${p.peso}g consumidos`,
      detalhe: p.filamentos.length > 1
        ? p.filamentos.map((f) => `${f.nome}: ${f.peso}g @ R$${f.custoKg}/kg`).join(' · ')
        : `R$ ${(p.filamentos[0]?.custoKg ?? p.filamentoCustoKg).toFixed(2)}/kg`,
      cor: '#6366f1',
    });

    if (p.custoEnergia > 0) lista.push({
      label: 'Energia elétrica',
      emoji: '⚡',
      valor: p.custoEnergia,
      descricao: `${p.tempo}h × ${p.potenciaW}W`,
      detalhe: `${p.potenciaW}W × ${p.tempo}h ÷ 1000 × R$${p.custoKwh}/kWh`,
      cor: '#f59e0b',
    });

    if (p.amortizacao > 0) lista.push({
      label: 'Amortização da impressora',
      emoji: '🖨️',
      valor: p.amortizacao,
      descricao: `Desgaste por ${p.tempo}h de impressão`,
      detalhe: `(${p.tempo}h ÷ ${p.amortizacaoHoras ?? 20000}h) × R$${(p.amortizacaoValor ?? 6000).toLocaleString('pt-BR')}`,
      cor: '#8b5cf6',
    });

    if (custoFixoRat > 0) lista.push({
      label: 'Custo fixo rateado',
      emoji: '🏠',
      valor: custoFixoRat,
      descricao: 'Aluguel, conta, internet, etc.',
      detalhe: `R$${p.custoFixoMes}/mês ÷ produção proporcional`,
      cor: '#0ea5e9',
    });

    if (custoAcessUn > 0) lista.push({
      label: 'Acessórios',
      emoji: '🔩',
      valor: custoAcessUn,
      descricao: `${p.acessorios.length} item${p.acessorios.length !== 1 ? 's' : ''} por unidade`,
      detalhe: p.acessorios.map((a) => `${a.nome}: ${a.qtd}× R$${a.custoUn.toFixed(2)}`).join(' · '),
      cor: '#10b981',
    });

    if (custoMaoObra > 0) lista.push({
      label: 'Mão de obra',
      emoji: '🤲',
      valor: custoMaoObra,
      descricao: `${p.maoObraHoras}h de acabamento`,
      detalhe: `${p.maoObraHoras}h × R$${p.maoObraTaxa}/h`,
      cor: '#ec4899',
    });

    if (custoFrete > 0) lista.push({
      label: 'Frete',
      emoji: '🚚',
      valor: custoFrete,
      descricao: p.freteMode === 'percentual'
        ? `${p.freteValor}% do preço`
        : `Valor fixo`,
      cor: '#ef4444',
    });

    return lista;
  }, [p, custoAcessUn, custoFixoRat, custoMaoObra, custoFrete]);

  const custoUn    = p.custoUn;
  const impostoVal = p.precoConsumidor * (p.imposto / 100);
  const cartaoVal  = p.precoConsumidor * (p.txCartao / 100);
  const canalVal   = p.precoConsumidor * (p.custoAnuncio / 100);
  const lucroLiq   = p.lucroLiquidoConsumidor;

  const margemPct  = p.precoConsumidor > 0
    ? (lucroLiq / p.precoConsumidor * 100).toFixed(1)
    : '0';

  // Gráfico: custo de produção dividido em fatias
  const pieData = itens.filter((i) => i.valor > 0).map((i) => ({
    name: i.label, value: +(i.valor).toFixed(4), cor: i.cor,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 w-full sm:max-w-xl sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-3xl sm:rounded-t-3xl p-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-white">💸 Custo Detalhado</h2>
              <p className="text-sm text-white/80 mt-0.5 truncate">{p.nome}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 transition"
            >
              ×
            </button>
          </div>

          {/* KPIs rápidos */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-white/15 rounded-xl py-2 px-3 text-center">
              <p className="text-base font-bold text-white">{R(custoUn)}</p>
              <p className="text-[10px] text-white/70 font-medium">Custo Un.</p>
            </div>
            <div className="bg-white/15 rounded-xl py-2 px-3 text-center">
              <p className="text-base font-bold text-white">{R(p.precoConsumidor)}</p>
              <p className="text-[10px] text-white/70 font-medium">Preço Final</p>
            </div>
            <div className="bg-white/15 rounded-xl py-2 px-3 text-center">
              <p className="text-base font-bold text-white">{margemPct}%</p>
              <p className="text-[10px] text-white/70 font-medium">Margem</p>
            </div>
          </div>
        </div>

        {/* ── Corpo ────────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-5">

          {/* Gráfico pizza */}
          {pieData.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">
                Composição do custo de produção
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0" style={{ width: 120, height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.cor ?? CORES[i % CORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => R(v as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {pieData.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.cor ?? CORES[i % CORES.length] }} />
                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{entry.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex-shrink-0">
                        {custoUn > 0 ? pct(entry.value, custoUn) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Itens de custo de produção ────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">
              Custo de produção (por unidade)
            </h3>
            <div className="space-y-2">
              {itens.map((item, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-700/40 rounded-2xl p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                        style={{ background: item.cor + '22', color: item.cor }}
                      >
                        {item.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.label}</p>
                        {item.descricao && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.descricao}</p>
                        )}
                        {item.detalhe && (
                          <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-0.5 truncate max-w-[220px]">{item.detalhe}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{R(item.valor)}</p>
                      <p className="text-[10px] text-gray-400">
                        {custoUn > 0 ? pct(item.valor, custoUn) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total custo */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-indigo-800 dark:text-indigo-300 text-sm">Total — Custo de Produção</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Markup {p.markup}×</p>
                </div>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{R(custoUn)}</p>
              </div>
            </div>
          </div>

          {/* ── Composição do preço de venda ──────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">
              Composição do preço de venda
            </h3>
            <div className="space-y-2">

              {/* Custo de produção */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-300">🏗️ Custo de produção</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{R(custoUn)}</span>
              </div>

              {/* Impostos */}
              {impostoVal > 0 && (
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-red-50 dark:bg-red-900/10 rounded-xl">
                  <div>
                    <span className="text-sm text-red-700 dark:text-red-400">📋 Impostos</span>
                    <span className="text-xs text-red-400 ml-1.5">({p.imposto}%)</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{R(impostoVal)}</span>
                </div>
              )}

              {/* Taxa cartão */}
              {cartaoVal > 0 && (
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-orange-50 dark:bg-orange-900/10 rounded-xl">
                  <div>
                    <span className="text-sm text-orange-700 dark:text-orange-400">💳 Taxa cartão</span>
                    <span className="text-xs text-orange-400 ml-1.5">({p.txCartao}%)</span>
                  </div>
                  <span className="text-sm font-semibold text-orange-600">{R(cartaoVal)}</span>
                </div>
              )}

              {/* Taxa canal */}
              {canalVal > 0 && (
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                  <div>
                    <span className="text-sm text-amber-700 dark:text-amber-400">🛒 Taxa do canal</span>
                    <span className="text-xs text-amber-400 ml-1.5">({p.custoAnuncio}%)</span>
                  </div>
                  <span className="text-sm font-semibold text-amber-600">{R(canalVal)}</span>
                </div>
              )}

              {/* Lucro líquido */}
              <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl ${
                lucroLiq >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/10'
                  : 'bg-red-50 dark:bg-red-900/10'
              }`}>
                <div>
                  <span className={`text-sm font-bold ${lucroLiq >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                    {lucroLiq >= 0 ? '✅ Lucro líquido' : '❌ Prejuízo'}
                  </span>
                  <span className={`text-xs ml-1.5 ${lucroLiq >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ({margemPct}% de margem)
                  </span>
                </div>
                <span className={`text-lg font-bold ${lucroLiq >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                  {R(lucroLiq)}
                </span>
              </div>

              {/* Preço final */}
              <div className="flex items-center justify-between px-3.5 py-3 bg-indigo-600 rounded-2xl">
                <span className="text-sm font-bold text-white">🏷️ Preço ao consumidor</span>
                <span className="text-xl font-bold text-white">{R(p.precoConsumidor)}</span>
              </div>

              {/* Preço lojista */}
              {p.precoLojista > 0 && p.precoLojista !== p.precoConsumidor && (
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-purple-50 dark:bg-purple-900/10 rounded-xl">
                  <span className="text-sm text-purple-700 dark:text-purple-400">🏪 Preço lojista</span>
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-400">{R(p.precoLojista)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Legenda markup */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl px-4 py-3 text-xs text-gray-400 dark:text-gray-500 space-y-1">
            <p><span className="font-semibold text-gray-500 dark:text-gray-400">Markup {p.markup}×</span> significa que o preço é {p.markup}× o custo de produção antes de descontar impostos e taxas.</p>
            <p>Margem = lucro líquido ÷ preço de venda × 100</p>
          </div>
        </div>
      </div>
    </div>
  );
}
