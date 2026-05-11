/**
 * TarefaContext.tsx — Gerencia as tarefas do Kanban no Supabase.
 *
 * Tarefas são dados compartilhados pela equipe (multi-user), por isso
 * vivem exclusivamente no Supabase — sem localStorage.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth }   from '@/contexts/AuthContext';
import type { Tarefa, TarefaContextType, TarefaStatus } from '@/types';

const TarefaContext = createContext<TarefaContextType | null>(null);

export function useTarefas(): TarefaContextType {
  const ctx = useContext(TarefaContext);
  if (!ctx) throw new Error('useTarefas deve ser usado dentro de TarefaProvider');
  return ctx;
}

function mapTarefa(raw: Record<string, unknown>): Tarefa {
  return {
    id:               raw.id              as string,
    tenantId:         raw.tenant_id       as string,
    titulo:           raw.titulo          as string,
    descricao:        raw.descricao       as string | undefined,
    status:           raw.status          as TarefaStatus,
    prioridade:       raw.prioridade      as Tarefa['prioridade'],
    produtoId:        raw.produto_id      as string | undefined,
    produtoNome:      raw.produto_nome    as string | undefined,
    quantidade:       (raw.quantidade     as number) ?? 1,
    responsavelId:    raw.responsavel_id  as string | undefined,
    responsavelNome:  raw.responsavel_nome as string | undefined,
    prazo:            raw.prazo           as string | undefined,
    notas:            raw.notas           as string | undefined,
    criadoPor:        raw.criado_por      as string | undefined,
    criadoEm:         raw.criado_em       as string,
    atualizadoEm:     raw.atualizado_em   as string,
  };
}

export function TarefaProvider({ children }: { children: ReactNode }) {
  const { tenant }  = useTenant();
  const { user }    = useAuth();
  const tenantId    = tenant?.id ?? null;

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Carrega tarefas do tenant ───────────────────────────────────────────────
  const loadTarefas = useCallback(async (tid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tarefas')
        .select('*')
        .eq('tenant_id', tid)
        .order('criado_em', { ascending: true });

      if (error) { console.warn('[tarefas] load error:', error.message); return; }
      setTarefas((data ?? []).map(mapTarefa));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tenantId) { setTarefas([]); return; }
    loadTarefas(tenantId);

    // Subscrição em tempo real — reflete mudanças de outros membros da equipe
    const channel = supabase
      .channel(`tarefas:${tenantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tarefas',
        filter: `tenant_id=eq.${tenantId}`,
      }, () => {
        loadTarefas(tenantId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, loadTarefas]);

  // ── Criar tarefa ────────────────────────────────────────────────────────────
  const createTarefa = useCallback(async (
    t: Omit<Tarefa, 'id' | 'tenantId' | 'criadoEm' | 'atualizadoEm'>,
  ): Promise<string | null> => {
    if (!tenantId) return 'Nenhuma empresa ativa';
    const { data, error } = await supabase
      .from('tarefas')
      .insert({
        tenant_id:        tenantId,
        titulo:           t.titulo,
        descricao:        t.descricao        || null,
        status:           t.status           || 'fila',
        prioridade:       t.prioridade       || 'media',
        produto_id:       t.produtoId        || null,
        produto_nome:     t.produtoNome      || null,
        quantidade:       t.quantidade       || 1,
        responsavel_id:   t.responsavelId    || null,
        responsavel_nome: t.responsavelNome  || null,
        prazo:            t.prazo            || null,
        notas:            t.notas            || null,
        criado_por:       user?.id           || null,
      })
      .select()
      .single();

    if (error) { console.warn('[tarefas] create error:', error.message); return error.message; }
    if (data) setTarefas((prev) => [...prev, mapTarefa(data as Record<string, unknown>)]);
    return null;
  }, [tenantId, user?.id]);

  // ── Atualizar tarefa ────────────────────────────────────────────────────────
  const updateTarefa = useCallback(async (
    id: string,
    updates: Partial<Tarefa>,
  ): Promise<string | null> => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.titulo           !== undefined) dbUpdates.titulo           = updates.titulo;
    if (updates.descricao        !== undefined) dbUpdates.descricao        = updates.descricao;
    if (updates.status           !== undefined) dbUpdates.status           = updates.status;
    if (updates.prioridade       !== undefined) dbUpdates.prioridade       = updates.prioridade;
    if (updates.produtoId        !== undefined) dbUpdates.produto_id       = updates.produtoId;
    if (updates.produtoNome      !== undefined) dbUpdates.produto_nome     = updates.produtoNome;
    if (updates.quantidade       !== undefined) dbUpdates.quantidade       = updates.quantidade;
    if (updates.responsavelId    !== undefined) dbUpdates.responsavel_id   = updates.responsavelId;
    if (updates.responsavelNome  !== undefined) dbUpdates.responsavel_nome = updates.responsavelNome;
    if (updates.prazo            !== undefined) dbUpdates.prazo            = updates.prazo;
    if (updates.notas            !== undefined) dbUpdates.notas            = updates.notas;

    const { error } = await supabase.from('tarefas').update(dbUpdates).eq('id', id);
    if (error) { console.warn('[tarefas] update error:', error.message); return error.message; }

    setTarefas((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    return null;
  }, []);

  // ── Mover status ────────────────────────────────────────────────────────────
  const moveStatus = useCallback(async (id: string, newStatus: TarefaStatus) => {
    await updateTarefa(id, { status: newStatus });
  }, [updateTarefa]);

  // ── Deletar tarefa ──────────────────────────────────────────────────────────
  const deleteTarefa = useCallback(async (id: string) => {
    const { error } = await supabase.from('tarefas').delete().eq('id', id);
    if (!error) setTarefas((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TarefaContext.Provider value={{ tarefas, loading, createTarefa, updateTarefa, deleteTarefa, moveStatus }}>
      {children}
    </TarefaContext.Provider>
  );
}
