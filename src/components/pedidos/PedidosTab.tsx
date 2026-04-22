import { useState, useMemo } from 'react';
import { usePedidos }  from '@/contexts/PedidosContext';
import { useCanais }   from '@/contexts/CanaisContext';
import { R }           from '@/utils/formatters';
import { NovoPedidoModal } from './NovoPedidoModal';
import type { Pedido, PedidoStatus } from '@/types';
import { PEDIDO_STATUS_INFO } from '@/types';

// ── Sequência de próximo status ──────────────────────────────────────────────
const PROXIMO_STATUS: Partial<Record<PedidoStatus, PedidoStatus>> = {
  orcamento:   'confirmado',
  confirmado:  'em_producao',
  em_producao: 'pronto',
  pronto:      'entregue',
};

const FILTROS: { key: PedidoStatus | 'todos'; label: string }[] = [
  { key: 'todos',       label: 'Todos' },
  { key: 'orcamento',   label: 'Orçamento' },
  { key: 'confirmado',  label: 'Confirmado' },
  { key: 'em_producao', label: 'Produção' },
  { key: 'pronto',      label: 'Pronto' },
  { key: 'entregue',    label: 'Entregue' },
  { key: 'cancelado',   label: 'Cancelado' },
];

export function PedidosTab() {
  const { pedidos, updateStatus, removePedido } = usePedidos();
  const { canais } = useCanais();
  const [filtro,      setFiltro]      = useState<PedidoStatus | 'todos'>('todos');
  const [search,      setSearch]      = useState('');
  const [showNovo,    setShowNovo]    = useState(false);
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const filtered = useMemo(() => {
    return pedidos.filter((p) => {
      const passaFiltro = filtro === 'todos' || p.status === filtro;
      const passaBusca  = !search ||
        p.clienteNome.toLowerCase().includes(search.toLowerCase()) ||
        String(p.numero).includes(search);
      return passaFiltro && passaBusca;
    });
  }, [pedidos, filtro, search]);

  // Totais por status (para badges)
  const contadores = useMemo(() => {
    const c: Partial<Record<PedidoStatus, number>> = {};
    pedidos.forEach((p) => { c[p.status] = (c[p.status] ?? 0) + 1; });
    return c;
  }, [pedidos]);

  const totalAberto = pedidos
    .filter((p) => !['entregue', 'cancelado'].includes(p.status))
    .reduce((s, p) => s + p.valorTotal, 0);

  return (
    <div className="space-y-4">
      {/* Header + botão novo */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">Pedidos</h2>
            {pedidos.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {pedidos.filter((p) => !['entregue','cancelado'].includes(p.status)).length} em aberto
                {' · '}<span className="text-emerald-600 font-semibold">{R(totalAberto)}</span> a receber
              </p>
            )}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente ou nº…"
            className="border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full sm:w-44"
          />
          <button
            onClick={() => setShowNovo(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo Pedido
          </button>
        </div>

        {/* Filtros de status */}
        <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1 scrollbar-hide">
          {FILTROS.map(({ key, label }) => {
            const count = key === 'todos' ? pedidos.length : (contadores[key as PedidoStatus] ?? 0);
            return (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filtro === key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {key !== 'todos' && <span>{PEDIDO_STATUS_INFO[key as PedidoStatus].emoji}</span>}
                {label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    filtro === key ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {pedidos.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-4xl">🧾</div>
          <div>
            <p className="font-bold text-gray-700 dark:text-gray-200 text-base">Nenhum pedido ainda</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              Registre pedidos de clientes, controle o status e acompanhe o que está a receber.
            </p>
          </div>
          <button
            onClick={() => setShowNovo(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition"
          >
            Criar primeiro pedido
          </button>
        </div>
      )}

      {/* Lista filtrada vazia */}
      {pedidos.length > 0 && filtered.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-400">Nenhum pedido encontrado para este filtro.</p>
        </div>
      )}

      {/* Cards de pedidos */}
      <div className="space-y-3">
        {filtered.map((pedido) => (
          <PedidoCard
            key={pedido.id}
            pedido={pedido}
            canais={canais}
            expanded={expanded === pedido.id}
            onToggle={() => setExpanded(expanded === pedido.id ? null : pedido.id)}
            onAvançar={() => {
              const proximo = PROXIMO_STATUS[pedido.status];
              if (proximo) updateStatus(pedido.id, proximo);
            }}
            onCancelar={() => updateStatus(pedido.id, 'cancelado')}
            onRemover={() => { if (confirm(`Remover pedido #${pedido.numero}?`)) removePedido(pedido.id); }}
          />
        ))}
      </div>

      {showNovo && <NovoPedidoModal onClose={() => setShowNovo(false)} />}
    </div>
  );
}

// ── PedidoCard ────────────────────────────────────────────────────────────────
interface CardProps {
  pedido: Pedido;
  canais: { id: string; nome: string; emoji: string }[];
  expanded: boolean;
  onToggle: () => void;
  onAvançar: () => void;
  onCancelar: () => void;
  onRemover: () => void;
}

function PedidoCard({ pedido, canais, expanded, onToggle, onAvançar, onCancelar, onRemover }: CardProps) {
  const info  = PEDIDO_STATUS_INFO[pedido.status];
  const canal = canais.find((c) => c.id === pedido.canal);
  const proximo = PROXIMO_STATUS[pedido.status];
  const proxInfo = proximo ? PEDIDO_STATUS_INFO[proximo] : null;

  const dataEntregaStr = pedido.dataEntregaPrevista
    ? new Date(pedido.dataEntregaPrevista).toLocaleDateString('pt-BR')
    : null;

  const atrasado = pedido.dataEntregaPrevista
    && !['entregue','cancelado'].includes(pedido.status)
    && new Date(pedido.dataEntregaPrevista) < new Date();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition ${
      atrasado ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'
    }`}>
      {/* Linha principal */}
      <div
        className="p-4 flex items-center gap-3 cursor-pointer select-none"
        onClick={onToggle}
      >
        {/* Número */}
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">#{pedido.numero}</span>
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{pedido.clienteNome}</span>
            {canal && <span className="text-xs text-gray-400">{canal.emoji} {canal.nome}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${info.cor}`}>
              {info.emoji} {info.label}
            </span>
            {atrasado && (
              <span className="text-xs text-red-500 font-semibold">⚠️ Atrasado</span>
            )}
            {dataEntregaStr && !atrasado && (
              <span className="text-xs text-gray-400">📅 {dataEntregaStr}</span>
            )}
            <span className="text-xs text-gray-400">
              {pedido.itens.reduce((s, i) => s + i.quantidade, 0)} it.
            </span>
          </div>
        </div>

        {/* Valor */}
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-emerald-600 text-sm">{R(pedido.valorTotal)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Chevron */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
          className={`flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Detalhe expandido */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-50 dark:border-gray-700 pt-4">
          {/* Itens */}
          <div className="space-y-1">
            {pedido.itens.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  {item.quantidade}× {item.nome}
                </span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{R(item.subtotal)}</span>
              </div>
            ))}
            {pedido.desconto > 0 && (
              <div className="flex items-center justify-between text-sm text-red-500">
                <span>Desconto</span>
                <span>-{R(pedido.desconto)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm font-bold border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">
              <span className="text-gray-700 dark:text-gray-200">Total</span>
              <span className="text-emerald-600">{R(pedido.valorTotal)}</span>
            </div>
          </div>

          {/* Contato + notas */}
          {(pedido.clienteContato || pedido.notas) && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
              {pedido.clienteContato && <p>📞 {pedido.clienteContato}</p>}
              {pedido.notas && <p>📝 {pedido.notas}</p>}
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            {proximo && proxInfo && (
              <button
                onClick={onAvançar}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                {proxInfo.emoji} Avançar para {proxInfo.label}
              </button>
            )}
            {!['entregue','cancelado'].includes(pedido.status) && (
              <button
                onClick={onCancelar}
                className="text-xs font-semibold text-red-400 hover:text-red-600 border border-red-100 hover:border-red-200 px-3 py-2 rounded-xl transition"
              >
                Cancelar pedido
              </button>
            )}
            <button
              onClick={onRemover}
              className="ml-auto text-xs text-gray-300 hover:text-gray-500 px-3 py-2 rounded-xl transition"
            >
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
