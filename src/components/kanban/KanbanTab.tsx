/**
 * KanbanTab.tsx — Board Kanban para gestão de tarefas de impressão 3D.
 *
 * Desktop: 6 colunas com scroll horizontal
 * Mobile: seletor de coluna + uma coluna por vez
 */

import { useState } from 'react';
import { useTarefas }         from '@/contexts/TarefaContext';
import { NovaTarefaModal }    from './NovaTarefaModal';
import type { Tarefa, TarefaStatus, TarefaPrioridade } from '@/types';

// ── Configuração das colunas ──────────────────────────────────────────────────
interface Coluna {
  status:     TarefaStatus;
  label:      string;
  emoji:      string;
  color:      string;   // fundo do header da coluna
  textColor:  string;
  badge:      string;   // fundo do badge de contagem
}

const COLUNAS: Coluna[] = [
  { status: 'fila',         label: 'Fila',          emoji: '📥', color: 'bg-gray-100 dark:bg-gray-700',      textColor: 'text-gray-700 dark:text-gray-200', badge: 'bg-gray-400' },
  { status: 'imprimindo',   label: 'Imprimindo',    emoji: '🖨',  color: 'bg-blue-50 dark:bg-blue-900/30',   textColor: 'text-blue-700 dark:text-blue-300',  badge: 'bg-blue-500' },
  { status: 'pos_processo', label: 'Pós-processo',  emoji: '✂️',  color: 'bg-purple-50 dark:bg-purple-900/30', textColor: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-500' },
  { status: 'verificacao',  label: 'Verificação',   emoji: '🔍', color: 'bg-amber-50 dark:bg-amber-900/30',  textColor: 'text-amber-700 dark:text-amber-300',  badge: 'bg-amber-500' },
  { status: 'pronto',       label: 'Pronto',        emoji: '✅', color: 'bg-emerald-50 dark:bg-emerald-900/30', textColor: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-500' },
  { status: 'entregue',     label: 'Entregue',      emoji: '📦', color: 'bg-indigo-50 dark:bg-indigo-900/30', textColor: 'text-indigo-700 dark:text-indigo-300', badge: 'bg-indigo-500' },
];

const STATUS_ORDER = COLUNAS.map((c) => c.status);

const PRIORIDADE_CONFIG: Record<TarefaPrioridade, { label: string; bg: string; text: string }> = {
  alta:  { label: 'Alta',  bg: 'bg-red-100 dark:bg-red-900/40',     text: 'text-red-600 dark:text-red-400' },
  media: { label: 'Média', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400' },
  baixa: { label: 'Baixa', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatarPrazo(prazo: string | undefined): { texto: string; atrasado: boolean } | null {
  if (!prazo) return null;
  const hoje   = new Date(); hoje.setHours(0, 0, 0, 0);
  const data   = new Date(prazo + 'T00:00:00');
  const diff   = Math.round((data.getTime() - hoje.getTime()) / 86_400_000);
  const atrasado = diff < 0;
  const texto =
    diff === 0 ? 'Hoje' :
    diff === 1 ? 'Amanhã' :
    diff === -1 ? 'Ontem' :
    diff < 0  ? `${Math.abs(diff)}d atrasado` :
    `${diff}d`;
  return { texto, atrasado };
}

// ── Card individual ───────────────────────────────────────────────────────────
interface CardProps {
  tarefa:   Tarefa;
  colIndex: number;
  onEdit:   (t: Tarefa) => void;
}

function KanbanCard({ tarefa: t, colIndex, onEdit }: CardProps) {
  const { moveStatus, deleteTarefa } = useTarefas();
  const prio    = PRIORIDADE_CONFIG[t.prioridade];
  const prazoFmt = formatarPrazo(t.prazo);
  const podeMover = (dir: 'prev' | 'next') =>
    dir === 'prev' ? colIndex > 0 : colIndex < STATUS_ORDER.length - 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-2.5 group">

      {/* Linha de prioridade + ações */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prio.bg} ${prio.text}`}>
          {prio.label}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(t)} title="Editar"
            className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-indigo-500 transition text-xs">
            ✏️
          </button>
          <button onClick={() => { if (confirm(`Excluir "${t.titulo}"?`)) deleteTarefa(t.id); }} title="Excluir"
            className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 transition text-xs">
            ×
          </button>
        </div>
      </div>

      {/* Título */}
      <p className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug">{t.titulo}</p>

      {/* Peça vinculada */}
      {t.produtoNome && (
        <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full w-fit max-w-full truncate">
          🖨️ {t.produtoNome}
          {t.quantidade > 1 && <span className="font-bold">×{t.quantidade}</span>}
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

      {/* Botões de mover ← → */}
      <div className="flex gap-1.5 pt-0.5">
        <button
          onClick={() => moveStatus(t.id, STATUS_ORDER[colIndex - 1])}
          disabled={!podeMover('prev')}
          title="Voltar etapa"
          className="flex-1 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-25 transition flex items-center justify-center gap-1">
          ← {colIndex > 0 ? COLUNAS[colIndex - 1].emoji : ''}
        </button>
        <button
          onClick={() => moveStatus(t.id, STATUS_ORDER[colIndex + 1])}
          disabled={!podeMover('next')}
          title="Avançar etapa"
          className="flex-1 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-25 transition flex items-center justify-center gap-1">
          {colIndex < COLUNAS.length - 1 ? COLUNAS[colIndex + 1].emoji : ''} →
        </button>
      </div>
    </div>
  );
}

// ── Coluna do board ───────────────────────────────────────────────────────────
interface ColunaProps {
  coluna:   Coluna;
  tarefas:  Tarefa[];
  colIndex: number;
  onNova:   (status: TarefaStatus) => void;
  onEdit:   (t: Tarefa) => void;
}

function KanbanColuna({ coluna, tarefas, colIndex, onNova, onEdit }: ColunaProps) {
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
          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-sm transition hover:scale-110 ${coluna.textColor} opacity-60 hover:opacity-100`}>
          +
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 flex-1">
        {tarefas.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center">
            <p className="text-xs text-gray-300 dark:text-gray-600">Sem tarefas</p>
          </div>
        )}
        {tarefas.map((t) => (
          <KanbanCard key={t.id} tarefa={t} colIndex={colIndex} onEdit={onEdit} />
        ))}
      </div>

      {/* Adicionar card ao fundo */}
      <button
        onClick={() => onNova(coluna.status)}
        className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 text-xs font-semibold hover:border-indigo-300 hover:text-indigo-400 transition">
        + Nova tarefa aqui
      </button>
    </div>
  );
}

// ── Board principal ───────────────────────────────────────────────────────────
export function KanbanTab() {
  const { tarefas, loading }  = useTarefas();
  const [showModal, setShowModal]      = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [statusModal, setStatusModal]  = useState<TarefaStatus>('fila');
  const [mobileColIndex, setMobileColIndex] = useState(0); // qual coluna ver no mobile

  const tarefasPorStatus = (status: TarefaStatus) =>
    tarefas.filter((t) => t.status === status);

  function abrirNova(status: TarefaStatus) {
    setStatusModal(status);
    setEditingTarefa(null);
    setShowModal(true);
  }

  function abrirEditar(t: Tarefa) {
    setEditingTarefa(t);
    setShowModal(true);
  }

  const totalTarefas = tarefas.length;
  const emAndamento  = tarefas.filter((t) => t.status === 'imprimindo').length;
  const atrasadas    = tarefas.filter((t) => {
    if (!t.prazo) return false;
    return new Date(t.prazo + 'T00:00:00') < new Date(new Date().setHours(0,0,0,0));
  }).length;

  return (
    <div className="space-y-4">

      {/* ── Header do módulo ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">📋 Quadro de Tarefas</h2>
            <p className="text-sm text-gray-400 mt-0.5">Gerencie os processos de impressão da sua equipe</p>
          </div>
          <button
            onClick={() => abrirNova('fila')}
            className="shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nova tarefa
          </button>
        </div>

        {/* Métricas rápidas */}
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
              <p className="text-lg font-bold text-emerald-600">
                {tarefas.filter((t) => t.status === 'entregue').length}
              </p>
              <p className="text-xs text-gray-400">Entregues</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Seletor de coluna (mobile only) ──────────────────────────────────── */}
      <div className="sm:hidden flex gap-2 overflow-x-auto pb-1 px-0.5">
        {COLUNAS.map((c, i) => {
          const count = tarefasPorStatus(c.status).length;
          return (
            <button key={c.status}
              onClick={() => setMobileColIndex(i)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                mobileColIndex === i
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700'
              }`}>
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

      {/* ── Board desktop (scroll horizontal) ───────────────────────────────── */}
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
                onNova={abrirNova}
                onEdit={abrirEditar}
              />
            ))}
          </div>

          {/* Mobile: apenas a coluna selecionada */}
          <div className="sm:hidden">
            <KanbanColuna
              coluna={COLUNAS[mobileColIndex]}
              tarefas={tarefasPorStatus(COLUNAS[mobileColIndex].status)}
              colIndex={mobileColIndex}
              onNova={abrirNova}
              onEdit={abrirEditar}
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
          <button onClick={() => abrirNova('fila')}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition shadow-sm">
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
