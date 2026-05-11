/**
 * KanbanTab.tsx — Board Kanban para gestão de tarefas de impressão 3D.
 *
 * Desktop: 6 colunas com scroll horizontal + drag-and-drop
 * Mobile:  seletor de coluna + botões de mover sempre visíveis
 */

import { useState, useRef, useCallback } from 'react';
import { useTarefas }         from '@/contexts/TarefaContext';
import { NovaTarefaModal }    from './NovaTarefaModal';
import type { Tarefa, TarefaStatus, TarefaPrioridade } from '@/types';

// ── Configuração das colunas ──────────────────────────────────────────────────
interface Coluna {
  status:    TarefaStatus;
  label:     string;
  emoji:     string;
  color:     string;
  textColor: string;
  badge:     string;
  dropHover: string; // classe quando um card está sendo arrastado sobre a coluna
}

const COLUNAS: Coluna[] = [
  { status: 'fila',         label: 'Fila',         emoji: '📥', color: 'bg-gray-100 dark:bg-gray-700',           textColor: 'text-gray-700 dark:text-gray-200',     badge: 'bg-gray-400',    dropHover: 'ring-2 ring-gray-400' },
  { status: 'imprimindo',   label: 'Imprimindo',   emoji: '🖨', color: 'bg-blue-50 dark:bg-blue-900/30',          textColor: 'text-blue-700 dark:text-blue-300',     badge: 'bg-blue-500',    dropHover: 'ring-2 ring-blue-400' },
  { status: 'pos_processo', label: 'Pós-processo', emoji: '✂️', color: 'bg-purple-50 dark:bg-purple-900/30',      textColor: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-500',  dropHover: 'ring-2 ring-purple-400' },
  { status: 'verificacao',  label: 'Verificação',  emoji: '🔍', color: 'bg-amber-50 dark:bg-amber-900/30',        textColor: 'text-amber-700 dark:text-amber-300',   badge: 'bg-amber-500',   dropHover: 'ring-2 ring-amber-400' },
  { status: 'pronto',       label: 'Pronto',       emoji: '✅', color: 'bg-emerald-50 dark:bg-emerald-900/30',    textColor: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-500', dropHover: 'ring-2 ring-emerald-400' },
  { status: 'entregue',     label: 'Entregue',     emoji: '📦', color: 'bg-indigo-50 dark:bg-indigo-900/30',      textColor: 'text-indigo-700 dark:text-indigo-300', badge: 'bg-indigo-500',  dropHover: 'ring-2 ring-indigo-400' },
];

const STATUS_ORDER = COLUNAS.map((c) => c.status);

const PRIORIDADE_CONFIG: Record<TarefaPrioridade, { label: string; bg: string; text: string }> = {
  alta:  { label: 'Alta',  bg: 'bg-red-100 dark:bg-red-900/40',         text: 'text-red-600 dark:text-red-400' },
  media: { label: 'Média', bg: 'bg-amber-100 dark:bg-amber-900/40',     text: 'text-amber-600 dark:text-amber-400' },
  baixa: { label: 'Baixa', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatarPrazo(prazo: string | undefined): { texto: string; atrasado: boolean } | null {
  if (!prazo) return null;
  const hoje  = new Date(); hoje.setHours(0, 0, 0, 0);
  const data  = new Date(prazo + 'T00:00:00');
  const diff  = Math.round((data.getTime() - hoje.getTime()) / 86_400_000);
  const atrasado = diff < 0;
  const texto =
    diff === 0  ? 'Hoje'
    : diff === 1  ? 'Amanhã'
    : diff === -1 ? 'Ontem'
    : diff < 0    ? `${Math.abs(diff)}d atrasado`
    : `${diff}d`;
  return { texto, atrasado };
}

// ── Card individual ───────────────────────────────────────────────────────────
interface CardProps {
  tarefa:     Tarefa;
  colIndex:   number;
  onEdit:     (t: Tarefa) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

function KanbanCard({ tarefa: t, colIndex, onEdit, onDragStart }: CardProps) {
  const { moveStatus, deleteTarefa } = useTarefas();
  const [moving, setMoving] = useState<'prev' | 'next' | null>(null);

  const prio     = PRIORIDADE_CONFIG[t.prioridade];
  const prazoFmt = formatarPrazo(t.prazo);
  const canPrev  = colIndex > 0;
  const canNext  = colIndex < STATUS_ORDER.length - 1;

  async function handleMove(dir: 'prev' | 'next') {
    if (moving) return;
    const targetIndex = dir === 'prev' ? colIndex - 1 : colIndex + 1;
    setMoving(dir);
    await moveStatus(t.id, STATUS_ORDER[targetIndex]);
    setMoving(null);
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, t.id)}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-2.5 cursor-grab active:cursor-grabbing active:opacity-60 active:scale-[0.98] transition-all group"
    >
      {/* Linha de prioridade + ações */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prio.bg} ${prio.text}`}>
          {prio.label}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(t)}
            title="Editar"
            className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition text-xs"
          >✏️</button>
          <button
            onClick={() => { if (confirm(`Excluir "${t.titulo}"?`)) deleteTarefa(t.id); }}
            title="Excluir"
            className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition text-base leading-none"
          >×</button>
        </div>
      </div>

      {/* Título */}
      <p className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug">{t.titulo}</p>

      {/* Peça vinculada */}
      {t.produtoNome && (
        <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full w-fit max-w-full truncate">
          🖨️ {t.produtoNome}
          {t.quantidade > 1 && <span className="font-bold ml-0.5">×{t.quantidade}</span>}
        </span>
      )}

      {/* Descrição */}
      {t.descricao && (
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{t.descricao}</p>
      )}

      {/* Rodapé: responsável + prazo */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-50 dark:border-gray-700">
        {t.responsavelNome ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
              {t.responsavelNome.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-500 truncate">{t.responsavelNome}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
        {prazoFmt && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
            prazoFmt.atrasado
              ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            📅 {prazoFmt.texto}
          </span>
        )}
      </div>

      {/* ── Botões de mover ─────────────────────────────────────────────────── */}
      {/* Sempre visíveis, com loading spinner quando processando */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => handleMove('prev')}
          disabled={!canPrev || moving !== null}
          title={canPrev ? `← Voltar para ${COLUNAS[colIndex - 1].label}` : 'Primeira etapa'}
          className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5
            ${canPrev
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
        >
          {moving === 'prev'
            ? <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            : <>← {canPrev ? COLUNAS[colIndex - 1].emoji : ''}</>
          }
        </button>

        <button
          type="button"
          onClick={() => handleMove('next')}
          disabled={!canNext || moving !== null}
          title={canNext ? `Avançar para ${COLUNAS[colIndex + 1].label} →` : 'Última etapa'}
          className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5
            ${canNext
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95 shadow-sm shadow-indigo-200 dark:shadow-indigo-900'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
        >
          {moving === 'next'
            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <>{canNext ? COLUNAS[colIndex + 1].emoji : ''} →</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Coluna do board ───────────────────────────────────────────────────────────
interface ColunaProps {
  coluna:        Coluna;
  tarefas:       Tarefa[];
  colIndex:      number;
  isDragOver:    boolean;
  onNova:        (status: TarefaStatus) => void;
  onEdit:        (t: Tarefa) => void;
  onDragStart:   (e: React.DragEvent, id: string) => void;
  onDragOver:    (e: React.DragEvent, status: TarefaStatus) => void;
  onDragLeave:   () => void;
  onDrop:        (e: React.DragEvent, status: TarefaStatus) => void;
}

function KanbanColuna({
  coluna, tarefas, colIndex, isDragOver,
  onNova, onEdit, onDragStart,
  onDragOver, onDragLeave, onDrop,
}: ColunaProps) {
  return (
    <div className="flex flex-col gap-3 min-w-[280px] max-w-[280px]">
      {/* Header da coluna */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-2xl ${coluna.color}`}>
        <div className="flex items-center gap-2">
          <span>{coluna.emoji}</span>
          <span className={`font-bold text-sm ${coluna.textColor}`}>{coluna.label}</span>
          {tarefas.length > 0 && (
            <span className={`text-xs text-white font-bold w-5 h-5 rounded-full flex items-center justify-center ${coluna.badge}`}>
              {tarefas.length}
            </span>
          )}
        </div>
        <button
          onClick={() => onNova(coluna.status)}
          title={`Adicionar em ${coluna.label}`}
          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-lg transition hover:scale-110 ${coluna.textColor} opacity-60 hover:opacity-100`}
        >+</button>
      </div>

      {/* Zona de drop */}
      <div
        onDragOver={(e) => onDragOver(e, coluna.status)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, coluna.status)}
        className={`flex flex-col gap-3 flex-1 min-h-[80px] rounded-2xl transition-all p-1 -m-1 ${
          isDragOver ? `${coluna.dropHover} bg-indigo-50/50 dark:bg-indigo-900/10` : ''
        }`}
      >
        {tarefas.length === 0 && (
          <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
            isDragOver
              ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}>
            <p className="text-xs text-gray-300 dark:text-gray-600">
              {isDragOver ? '↓ Soltar aqui' : 'Sem tarefas'}
            </p>
          </div>
        )}
        {tarefas.map((t) => (
          <KanbanCard
            key={t.id}
            tarefa={t}
            colIndex={colIndex}
            onEdit={onEdit}
            onDragStart={onDragStart}
          />
        ))}
      </div>

      {/* Botão de adicionar ao fundo */}
      <button
        onClick={() => onNova(coluna.status)}
        className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 text-xs font-semibold hover:border-indigo-300 hover:text-indigo-400 transition"
      >
        + Nova tarefa aqui
      </button>
    </div>
  );
}

// ── Board principal ───────────────────────────────────────────────────────────
export function KanbanTab() {
  const { tarefas, loading, moveStatus } = useTarefas();

  const [showModal, setShowModal]           = useState(false);
  const [editingTarefa, setEditingTarefa]   = useState<Tarefa | null>(null);
  const [statusModal, setStatusModal]       = useState<TarefaStatus>('fila');
  const [mobileColIndex, setMobileColIndex] = useState(0);
  const [dragOverStatus, setDragOverStatus] = useState<TarefaStatus | null>(null);

  const draggingId = useRef<string | null>(null);

  const tarefasPorStatus = useCallback(
    (status: TarefaStatus) => tarefas.filter((t) => t.status === status),
    [tarefas],
  );

  function abrirNova(status: TarefaStatus) {
    setStatusModal(status);
    setEditingTarefa(null);
    setShowModal(true);
  }

  function abrirEditar(t: Tarefa) {
    setEditingTarefa(t);
    setShowModal(true);
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, id: string) {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }

  function handleDragOver(e: React.DragEvent, status: TarefaStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  }

  function handleDragLeave() {
    // pequeno delay para evitar flicker ao passar entre filhos da coluna
    setTimeout(() => setDragOverStatus(null), 50);
  }

  async function handleDrop(e: React.DragEvent, status: TarefaStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    const id = draggingId.current ?? e.dataTransfer.getData('text/plain');
    draggingId.current = null;
    if (!id) return;
    const tarefa = tarefas.find((t) => t.id === id);
    if (!tarefa || tarefa.status === status) return;
    await moveStatus(id, status);
  }

  // ── Métricas ──────────────────────────────────────────────────────────────
  const totalTarefas = tarefas.length;
  const emAndamento  = tarefas.filter((t) => t.status === 'imprimindo').length;
  const atrasadas    = tarefas.filter((t) => {
    if (!t.prazo || t.status === 'entregue') return false;
    return new Date(t.prazo + 'T00:00:00') < new Date(new Date().setHours(0,0,0,0));
  }).length;
  const entregues = tarefas.filter((t) => t.status === 'entregue').length;

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">📋 Quadro de Tarefas</h2>
            <p className="text-sm text-gray-400 mt-0.5">Gerencie os processos de impressão da sua equipe</p>
          </div>
          <button
            onClick={() => abrirNova('fila')}
            className="shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nova tarefa
          </button>
        </div>

        {totalTarefas > 0 && (
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{totalTarefas}</p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{emAndamento}</p>
              <p className="text-xs text-gray-400">Imprimindo</p>
            </div>
            {atrasadas > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-red-500">{atrasadas}</p>
                <p className="text-xs text-gray-400">Atrasadas</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{entregues}</p>
              <p className="text-xs text-gray-400">Entregues</p>
            </div>
          </div>
        )}

        {/* Dica de drag */}
        {totalTarefas > 0 && (
          <p className="hidden sm:block text-[10px] text-gray-300 dark:text-gray-600 mt-3 pt-2 border-t border-gray-50 dark:border-gray-700">
            💡 Arraste os cards entre colunas ou use os botões ← → em cada card
          </p>
        )}
      </div>

      {/* ── Seletor de coluna (mobile) ────────────────────────────────────── */}
      <div className="sm:hidden flex gap-2 overflow-x-auto pb-1 px-0.5">
        {COLUNAS.map((c, i) => {
          const count = tarefasPorStatus(c.status).length;
          return (
            <button key={c.status}
              onClick={() => setMobileColIndex(i)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                mobileColIndex === i
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {c.emoji} {c.label}
              {count > 0 && (
                <span className={`text-[10px] w-4 h-4 rounded-full flex items-center justify-center ${
                  mobileColIndex === i ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Desktop: todas as colunas */}
          <div className="hidden sm:flex gap-4 overflow-x-auto pb-4 items-start">
            {COLUNAS.map((coluna, i) => (
              <KanbanColuna
                key={coluna.status}
                coluna={coluna}
                tarefas={tarefasPorStatus(coluna.status)}
                colIndex={i}
                isDragOver={dragOverStatus === coluna.status}
                onNova={abrirNova}
                onEdit={abrirEditar}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            ))}
          </div>

          {/* Mobile: coluna selecionada */}
          <div className="sm:hidden">
            <KanbanColuna
              coluna={COLUNAS[mobileColIndex]}
              tarefas={tarefasPorStatus(COLUNAS[mobileColIndex].status)}
              colIndex={mobileColIndex}
              isDragOver={false}
              onNova={abrirNova}
              onEdit={abrirEditar}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          </div>
        </>
      )}

      {/* Estado vazio */}
      {!loading && totalTarefas === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 flex flex-col items-center gap-4 text-center">
          <div className="text-6xl">📋</div>
          <div>
            <p className="font-bold text-gray-700 dark:text-gray-200 text-base">Nenhuma tarefa ainda</p>
            <p className="text-sm text-gray-400 max-w-xs mt-1">
              Crie tarefas para organizar os processos de impressão da sua equipe — do pedido à entrega.
            </p>
          </div>
          <button
            onClick={() => abrirNova('fila')}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition shadow-sm"
          >
            📋 Criar primeira tarefa
          </button>
        </div>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <NovaTarefaModal
          tarefa={editingTarefa ?? undefined}
          statusInicial={statusModal}
          onClose={() => { setShowModal(false); setEditingTarefa(null); }}
        />
      )}
    </div>
  );
}
