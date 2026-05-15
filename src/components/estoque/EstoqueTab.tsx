import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { StatCard } from '@/components/shared/StatCard';
import { InfoTooltip } from '@/components/shared/Tooltip';
import { SwipeableCard } from '@/components/shared/SwipeableCard';
import { EtiquetasModal } from '@/components/products/EtiquetasModal';
import { R, COLORS } from '@/utils/formatters';
import type { Product } from '@/types';

// ─── Tipos de ação inline ─────────────────────────────────────────────────────
type AcaoAtiva = 'producao' | 'venda' | 'ajuste' | 'falha' | null;

interface Estado {
  acao: AcaoAtiva;
  input: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  products: Product[];
  onProduzir: (id: number, qty: number) => void;
  onVender:   (id: number, qty: number) => void;
  onAjustar?: (id: number, qty: number) => void;
  onFalha:    (id: number, qty: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function MovBadge({ tipo }: { tipo: 'producao' | 'venda' | 'ajuste' | 'falha' }) {
  const map = {
    producao: { emoji: '🖨️', color: 'bg-emerald-100 text-emerald-700' },
    venda:    { emoji: '🏷️', color: 'bg-indigo-100 text-indigo-700' },
    ajuste:   { emoji: '✏️', color: 'bg-gray-100 text-gray-600' },
    falha:    { emoji: '💀', color: 'bg-red-100 text-red-600' },
  };
  const { emoji, color } = map[tipo];
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>
      {emoji}
    </span>
  );
}

// ─── Ícones dos botões de ação ────────────────────────────────────────────────
const IconProduzir = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);
const IconVender = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const IconFalha = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
const IconAjuste = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// ─── Componente principal ─────────────────────────────────────────────────────
export function EstoqueTab({ products, onProduzir, onVender, onAjustar, onFalha }: Props) {
  const [estados, setEstados] = useState<Record<number, Estado>>({});
  const [etiquetaProduct, setEtiquetaProduct] = useState<Product | null>(null);

  const totalItens   = products.reduce((a, p) => a + (p.estoque ?? 0), 0);
  const totalVendido = products.reduce((a, p) => a + (p.totalVendido ?? 0), 0);
  const valorCusto   = products.reduce((a, p) => a + (p.estoque ?? 0) * p.custoUn, 0);
  const valorVenda   = products.reduce((a, p) => a + (p.estoque ?? 0) * p.precoConsumidor, 0);

  const chartData = products
    .filter((p) => (p.estoque ?? 0) > 0)
    .map((p) => ({
      name: p.nome.length > 10 ? p.nome.slice(0, 10) + '…' : p.nome,
      Estoque: p.estoque ?? 0,
    }));

  function setEstado(id: number, acao: AcaoAtiva, input = '') {
    setEstados((prev) => ({ ...prev, [id]: { acao, input } }));
  }
  function setInput(id: number, val: string) {
    setEstados((prev) => ({ ...prev, [id]: { ...prev[id], input: val } }));
  }
  function fechar(id: number) {
    setEstados((prev) => ({ ...prev, [id]: { acao: null, input: '' } }));
  }

  function confirmar(product: Product) {
    const e = estados[product.id];
    if (!e) return;
    const qty = parseInt(e.input) || 0;
    if (qty <= 0 && e.acao !== 'ajuste') return;

    if (e.acao === 'producao') onProduzir(product.id, qty);
    else if (e.acao === 'venda') onVender(product.id, qty);
    else if (e.acao === 'ajuste') onAjustar?.(product.id, qty);
    else if (e.acao === 'falha') onFalha(product.id, qty);

    fechar(product.id);
  }

  return (
    <div className="space-y-6">
      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div
        data-tour={products.length === 0 ? 'taxa-falha' : undefined}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard label="Em estoque"      value={`${totalItens} un.`}   color="indigo" />
        <StatCard label="Total vendido"   value={`${totalVendido} un.`} color="emerald" />
        <StatCard label="Capital (custo)" value={R(valorCusto)}          color="purple" />
        <StatCard label="Potencial venda" value={R(valorVenda)}          color="pink" />
      </div>

      {/* ── Lista de produtos ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div
          data-tour={products.length === 0 ? 'btn-produzir' : undefined}
          className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700"
        >
          <h3 className="font-bold text-gray-700 dark:text-gray-200">Controle de Estoque</h3>
          {/* Instrução — visível apenas em telas maiores */}
          <p className="text-xs text-gray-400 mt-1 hidden sm:block">
            Use <strong>Produzir</strong> para somar peças prontas e descontar insumos ·
            Use <strong>Vender</strong> para registrar vendas ·
            Use <strong>✏️</strong> para ajuste manual sem gatilhos
          </p>
        </div>

        {/* Lista de cards — pb-32 garante espaço acima do BottomTabBar + FAB */}
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50 pb-32 sm:pb-4">
          {products.length === 0 && (
            <p className="text-center text-gray-400 py-10 text-sm">Nenhuma peça cadastrada ainda.</p>
          )}

          {products.map((p, i) => {
            const estoque   = p.estoque ?? 0;
            const vendido   = p.totalVendido ?? 0;
            const movs      = p.movimentosEstoque ?? [];
            const e         = estados[p.id] ?? { acao: null, input: '' };
            const acaoAtiva = e.acao;

            const statusColor = estoque === 0 ? 'bg-red-100 text-red-600' :
                                estoque <= 2  ? 'bg-amber-100 text-amber-700' :
                                               'bg-emerald-100 text-emerald-700';
            const statusLabel = estoque === 0 ? 'Sem estoque' :
                                estoque <= 2  ? 'Baixo' :
                                               `${estoque} un.`;

            return (
              <SwipeableCard
                key={p.id}
                actions={[
                  {
                    label: 'Vender',
                    icon: '🏷️',
                    color: 'bg-emerald-500',
                    onAction: () => { if (estoque > 0) onVender(p.id, 1); },
                  },
                  {
                    label: 'Produzir',
                    icon: '🖨️',
                    color: 'bg-indigo-500',
                    onAction: () => onProduzir(p.id, 1),
                  },
                ]}
              >
              <div className="px-4 py-4 space-y-3">

                {/* ── Cabeçalho do card: avatar + nome + status ─────────── */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}
                  >
                    {p.nome[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{p.nome}</p>
                    {/* Taxa de falha — linha secundária */}
                    {(() => {
                      const perdidas = p.unidadesPerdidas ?? 0;
                      const produz   = p.unidadesProduzidas ?? 0;
                      if (produz === 0) return null;
                      const taxa = perdidas / produz;
                      const cor  = taxa > 0.15 ? 'text-red-500' : taxa > 0.05 ? 'text-amber-500' : 'text-gray-400';
                      return (
                        <span
                          data-tour={i === 0 ? 'taxa-falha' : undefined}
                          className={`text-[11px] font-semibold ${cor} flex items-center gap-0.5`}
                        >
                          💀 {(taxa * 100).toFixed(1)}% falha
                          <InfoTooltip
                            text={`Taxa de Falha Real: ${(taxa * 100).toFixed(1)}% das ${produz} impressões falharam (${perdidas} perdida${perdidas !== 1 ? 's' : ''}). Abaixo de 5% é normal; acima de 15% indica problema recorrente.`}
                            position="top"
                            size={11}
                          />
                        </span>
                      );
                    })()}
                  </div>

                  {/* Botão etiqueta */}
                  <button
                    onClick={() => setEtiquetaProduct(p)}
                    title="Gerar etiqueta + QR Code"
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-gray-500 hover:text-indigo-600 transition text-sm"
                  >
                    🏷️
                  </button>

                  {/* Badge de status — canto superior direito */}
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* ── Métricas em grid ─────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-2 text-center">
                  <div>
                    <p className="text-base font-bold text-gray-800 dark:text-gray-100">{estoque}</p>
                    <p className="text-[10px] text-gray-400">em estoque</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-emerald-600">{vendido}</p>
                    <p className="text-[10px] text-gray-400">vendidos</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-purple-600">{R(estoque * p.custoUn)}</p>
                    <p className="text-[10px] text-gray-400">capital</p>
                  </div>
                </div>

                {/* ── Botões de ação em grade ──────────────────────────── */}
                <div
                  data-tour={i === 0 ? 'btn-produzir' : undefined}
                  className="grid grid-cols-4 gap-2"
                >
                  {/* Produzir */}
                  <button
                    onClick={() => setEstado(p.id, acaoAtiva === 'producao' ? null : 'producao', '')}
                    className={`col-span-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition active:scale-95 ${
                      acaoAtiva === 'producao'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                    }`}
                  >
                    <IconProduzir />
                    <span>Produzir</span>
                  </button>

                  {/* Vender */}
                  <button
                    onClick={() => setEstado(p.id, acaoAtiva === 'venda' ? null : 'venda', '')}
                    disabled={estoque === 0}
                    className={`col-span-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition active:scale-95 ${
                      acaoAtiva === 'venda'
                        ? 'bg-indigo-600 text-white'
                        : estoque === 0
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-300 cursor-not-allowed'
                          : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100'
                    }`}
                  >
                    <IconVender />
                    <span>Vender</span>
                  </button>

                  {/* Falha */}
                  <button
                    onClick={() => setEstado(p.id, acaoAtiva === 'falha' ? null : 'falha', '')}
                    className={`col-span-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition active:scale-95 ${
                      acaoAtiva === 'falha'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100'
                    }`}
                  >
                    <IconFalha />
                    <span>Falha</span>
                  </button>

                  {/* Ajuste manual — só visível se o usuário tem permissão */}
                  {onAjustar && (
                    <button
                      onClick={() => setEstado(p.id, acaoAtiva === 'ajuste' ? null : 'ajuste', String(estoque))}
                      title="Ajuste manual de inventário"
                      className={`col-span-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition active:scale-95 ${
                        acaoAtiva === 'ajuste'
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <IconAjuste />
                      <span>Ajuste</span>
                    </button>
                  )}
                </div>

                {/* ── Painel de ação inline ──────────────────────────────── */}
                {acaoAtiva && (
                  <div className={`rounded-xl p-3 border ${
                    acaoAtiva === 'producao' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' :
                    acaoAtiva === 'venda'    ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' :
                    acaoAtiva === 'falha'    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                                              'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                  }`}>
                    <p className={`text-xs font-bold mb-2 ${
                      acaoAtiva === 'producao' ? 'text-emerald-700 dark:text-emerald-400' :
                      acaoAtiva === 'venda'    ? 'text-indigo-700 dark:text-indigo-400' :
                      acaoAtiva === 'falha'    ? 'text-red-700 dark:text-red-400' :
                                                'text-amber-700 dark:text-amber-400'
                    }`}>
                      {acaoAtiva === 'producao' && '🖨️ Quantas unidades você terminou de produzir?'}
                      {acaoAtiva === 'venda'    && '🏷️ Quantas unidades você vendeu?'}
                      {acaoAtiva === 'ajuste'   && '✏️ Ajuste manual de inventário'}
                      {acaoAtiva === 'falha'    && '💀 Quantas unidades falharam?'}
                    </p>

                    {acaoAtiva === 'falha' && (
                      <p className="text-[11px] text-red-600 bg-red-100 rounded-lg px-2 py-1.5 mb-2">
                        💀 Registre as unidades que <strong>não saíram da impressora prontas</strong>.
                        O filamento será descontado, o estoque de peças <strong>não muda</strong>.
                      </p>
                    )}
                    {acaoAtiva === 'ajuste' && (
                      <p className="text-[11px] text-amber-600 bg-amber-100 rounded-lg px-2 py-1.5 mb-2">
                        ⚠️ Este ajuste <strong>não</strong> altera filamentos nem acessórios.
                      </p>
                    )}
                    {acaoAtiva === 'venda' && parseInt(e.input) > estoque && estoque > 0 && (
                      <p className="text-[11px] text-amber-600 bg-amber-100 rounded-lg px-2 py-1.5 mb-2">
                        ⚠️ Você tem apenas <strong>{estoque}</strong> un. em estoque.
                      </p>
                    )}

                    {/* Input + botões */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInput(p.id, String(Math.max(0, (parseInt(e.input) || 0) - 1)))}
                        className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold text-lg flex items-center justify-center hover:bg-gray-50 transition active:scale-95"
                      >−</button>
                      <input
                        type="number" inputMode="numeric"
                        min={0}
                        max={acaoAtiva === 'venda' ? estoque : undefined}
                        value={e.input}
                        onChange={(ev) => setInput(p.id, ev.target.value)}
                        onKeyDown={(ev) => { if (ev.key === 'Enter') confirmar(p); if (ev.key === 'Escape') fechar(p.id); }}
                        autoFocus
                        className="flex-1 text-center font-bold text-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl py-2 focus:outline-none focus:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400 bg-white"
                      />
                      <button
                        onClick={() => setInput(p.id, String((parseInt(e.input) || 0) + 1))}
                        className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold text-lg flex items-center justify-center hover:bg-gray-50 transition active:scale-95"
                      >+</button>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => confirmar(p)}
                        disabled={(parseInt(e.input) || 0) <= 0 && acaoAtiva !== 'ajuste'}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition active:scale-95 ${
                          acaoAtiva === 'producao' ? 'bg-emerald-600 hover:bg-emerald-700' :
                          acaoAtiva === 'venda'    ? 'bg-indigo-600 hover:bg-indigo-700' :
                          acaoAtiva === 'falha'    ? 'bg-red-600 hover:bg-red-700' :
                                                     'bg-amber-500 hover:bg-amber-600'
                        } disabled:opacity-40`}
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => fechar(p.id)}
                        className="px-4 py-3 rounded-xl text-sm font-bold bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 transition"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* Preview produção */}
                    {acaoAtiva === 'producao' && (parseInt(e.input) || 0) > 0 && p.filamentos.some(f => f.materialId != null) && (
                      <div className="mt-2 pt-2 border-t border-emerald-100">
                        <p className="text-[10px] text-emerald-600 font-semibold mb-1">Filamentos consumidos:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.filamentos.filter(f => f.materialId != null).map(f => (
                            <span key={f.id} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              {f.nome}: −{+(f.peso * (parseInt(e.input) || 0)).toFixed(1)}g
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview falha */}
                    {acaoAtiva === 'falha' && (parseInt(e.input) || 0) > 0 && p.filamentos.some(f => f.materialId != null) && (
                      <div className="mt-2 pt-2 border-t border-red-100">
                        <p className="text-[10px] text-red-600 font-semibold mb-1">Filamento descontado:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.filamentos.filter(f => f.materialId != null).map(f => (
                            <span key={f.id} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              {f.nome}: −{+(f.peso * (parseInt(e.input) || 0)).toFixed(1)}g
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview venda */}
                    {acaoAtiva === 'venda' && (parseInt(e.input) || 0) > 0 && (
                      <div className="mt-2 pt-2 border-t border-indigo-100">
                        <p className="text-[10px] text-indigo-600 font-semibold">
                          Faturamento: <strong>{R(Math.min(parseInt(e.input) || 0, estoque) * p.precoConsumidor)}</strong>
                          {' · '}
                          Lucro líq.: <strong>{R(Math.min(parseInt(e.input) || 0, estoque) * p.lucroLiquidoConsumidor)}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Histórico de movimentações ─────────────────────────── */}
                {movs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {movs.slice(0, 5).map((mov) => (
                      <span
                        key={mov.id}
                        className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          mov.tipo === 'producao' ? 'bg-emerald-50 text-emerald-600' :
                          mov.tipo === 'venda'    ? 'bg-indigo-50 text-indigo-600' :
                          mov.tipo === 'falha'    ? 'bg-red-50 text-red-600' :
                                                    'bg-gray-100 text-gray-500'
                        }`}
                        title={mov.motivo}
                      >
                        <MovBadge tipo={mov.tipo} />
                        {mov.tipo === 'producao' && `+${mov.quantidade}`}
                        {mov.tipo === 'venda'    && `−${mov.quantidade}`}
                        {mov.tipo === 'ajuste'   && `=${mov.quantidade}`}
                        {mov.tipo === 'falha'    && `✗${mov.quantidade}`}
                        {' '}em {fmtData(mov.data)}
                      </span>
                    ))}
                    {movs.length > 5 && (
                      <span className="text-[10px] text-gray-400 py-0.5">+{movs.length - 5} mais</span>
                    )}
                  </div>
                )}
              </div>
              </SwipeableCard>
            );
          })}
        </div>
      </div>

      {/* ── Gráfico ───────────────────────────────────────────────────────── */}
      {totalItens > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4">Distribuição do Estoque</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Estoque" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Modal de Etiqueta + QR Code ──────────────────────────────────── */}
      {etiquetaProduct && (
        <EtiquetasModal
          product={etiquetaProduct}
          onClose={() => setEtiquetaProduct(null)}
        />
      )}
    </div>
  );
}
