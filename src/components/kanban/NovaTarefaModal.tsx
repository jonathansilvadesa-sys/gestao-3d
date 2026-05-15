/**
 * NovaTarefaModal.tsx — Criar ou editar uma tarefa do Kanban.
 */

import { useState, type FormEvent } from 'react';
import { useTarefas }   from '@/contexts/TarefaContext';
import { useTenant }    from '@/contexts/TenantContext';
import { useAuth }      from '@/contexts/AuthContext';
import { useProducts }  from '@/contexts/ProductContext';
import type { Tarefa, TarefaStatus, TarefaPrioridade } from '@/types';

const COLUNAS: { value: TarefaStatus; label: string }[] = [
  { value: 'fila',          label: '📥 Fila' },
  { value: 'imprimindo',    label: '🖨 Imprimindo' },
  { value: 'pos_processo',  label: '✂️ Pós-processo' },
  { value: 'verificacao',   label: '🔍 Verificação' },
  { value: 'pronto',        label: '✅ Pronto' },
  { value: 'entregue',      label: '📦 Entregue' },
];

const PRIORIDADES: { value: TarefaPrioridade; label: string; color: string }[] = [
  { value: 'alta',  label: '🔴 Alta',  color: 'border-red-400 bg-red-50 text-red-700' },
  { value: 'media', label: '🟡 Média', color: 'border-amber-400 bg-amber-50 text-amber-700' },
  { value: 'baixa', label: '🟢 Baixa', color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
];

interface Props {
  tarefa?: Tarefa;          // se passado → modo edição
  statusInicial?: TarefaStatus;
  onClose: () => void;
}

export function NovaTarefaModal({ tarefa, statusInicial = 'fila', onClose }: Props) {
  const { createTarefa, updateTarefa } = useTarefas();
  const { members }   = useTenant();
  const { user }      = useAuth();
  const { products }  = useProducts();

  const editando = !!tarefa;

  const [titulo,          setTitulo]         = useState(tarefa?.titulo          ?? '');
  const [descricao,       setDescricao]      = useState(tarefa?.descricao       ?? '');
  const [status,          setStatus]         = useState<TarefaStatus>(tarefa?.status ?? statusInicial);
  const [prioridade,      setPrioridade]     = useState<TarefaPrioridade>(tarefa?.prioridade ?? 'media');
  const [produtoId,       setProdutoId]      = useState(tarefa?.produtoId       ?? '');
  const [responsavelNome, setResponsavelNome] = useState(tarefa?.responsavelNome ?? '');
  const [prazo,           setPrazo]          = useState(tarefa?.prazo           ?? '');
  const [quantidade,      setQuantidade]     = useState(String(tarefa?.quantidade ?? 1));
  const [notas,           setNotas]          = useState(tarefa?.notas           ?? '');
  const [loading,         setLoading]        = useState(false);
  const [erro,            setErro]           = useState('');

  // Produto selecionado para exibir o nome
  const produtoSelecionado = products.find((p) => String(p.id) === produtoId);

  // Monta lista de membros com nome legível
  const membrosOptions = members.map((m) => ({
    value: m.userId,
    label: m.nome ?? m.email ?? m.userId.slice(0, 8),
  }));
  // Adiciona o próprio usuário se não estiver na lista
  if (user && !membrosOptions.find((m) => m.value === user.id)) {
    membrosOptions.unshift({ value: user.id, label: user.nome ?? user.email });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) { setErro('O título é obrigatório.'); return; }
    setLoading(true);
    setErro('');

    const payload = {
      titulo:           titulo.trim(),
      descricao:        descricao.trim() || undefined,
      status,
      prioridade,
      produtoId:        produtoId       || undefined,
      produtoNome:      produtoSelecionado?.nome || undefined,
      quantidade:       Math.max(1, parseInt(quantidade) || 1),
      responsavelNome:  responsavelNome.trim() || undefined,
      prazo:            prazo            || undefined,
      notas:            notas.trim()    || undefined,
    };

    const err = editando
      ? await updateTarefa(tarefa!.id, payload)
      : await createTarefa(payload);

    setLoading(false);
    if (err) { setErro(err); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {editando ? 'Editar tarefa' : 'Nova tarefa'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Organize o processo de impressão</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition text-lg font-bold">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Título */}
          <div>
            <label htmlFor="tarefa-titulo" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Título *</label>
            <input id="tarefa-titulo" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Imprimir peças do pedido #12"
              className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required autoFocus />
          </div>

          {/* Prioridade */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prioridade</label>
            <div className="mt-1 flex gap-2">
              {PRIORIDADES.map((p) => (
                <button type="button" key={p.value}
                  onClick={() => setPrioridade(p.value)}
                  className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold transition ${
                    prioridade === p.value ? p.color + ' border-current' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Coluna / Status */}
          <div>
            <label htmlFor="tarefa-coluna" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Coluna</label>
            <select id="tarefa-coluna" value={status} onChange={(e) => setStatus(e.target.value as TarefaStatus)}
              className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {COLUNAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Peça do catálogo */}
          <div>
            <label htmlFor="tarefa-peca" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Peça do catálogo</label>
            <select id="tarefa-peca" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}
              className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— Nenhuma peça vinculada —</option>
              {products.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.nome}</option>
              ))}
            </select>
          </div>

          {/* Quantidade + Prazo lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tarefa-qtd" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quantidade</label>
              <input id="tarefa-qtd" type="number" inputMode="numeric" min={1} value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label htmlFor="tarefa-prazo" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prazo</label>
              <input id="tarefa-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)}
                className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Responsável */}
          <div>
            <label htmlFor="tarefa-responsavel" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Responsável</label>
            {membrosOptions.length > 1 ? (
              <select id="tarefa-responsavel" value={responsavelNome}
                onChange={(e) => setResponsavelNome(e.target.value)}
                className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">— Sem responsável —</option>
                {membrosOptions.map((m) => (
                  <option key={m.value} value={m.label}>{m.label}</option>
                ))}
              </select>
            ) : (
              <input id="tarefa-responsavel" type="text" value={responsavelNome}
                onChange={(e) => setResponsavelNome(e.target.value)}
                placeholder="Nome do responsável"
                className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            )}
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="tarefa-descricao" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descrição</label>
            <textarea id="tarefa-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)}
              rows={2} placeholder="Detalhes da tarefa (opcional)"
              className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>

          {/* Notas */}
          <div>
            <label htmlFor="tarefa-notas" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notas internas</label>
            <textarea id="tarefa-notas" value={notas} onChange={(e) => setNotas(e.target.value)}
              rows={2} placeholder="Ex: usar PLA preto, parâmetros de impressão..."
              className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{erro}</div>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !titulo.trim()}
              className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-50">
              {loading ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
