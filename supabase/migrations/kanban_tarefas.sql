-- ─────────────────────────────────────────────────────────────────────────────
-- Módulo Kanban — Tarefas de Impressão 3D (v3.13)
-- Rodar no Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tarefas (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo           TEXT        NOT NULL,
  descricao        TEXT,
  status           TEXT        NOT NULL DEFAULT 'fila'
                     CHECK (status IN ('fila','imprimindo','pos_processo','verificacao','pronto','entregue')),
  prioridade       TEXT        NOT NULL DEFAULT 'media'
                     CHECK (prioridade IN ('alta','media','baixa')),
  produto_id       TEXT,
  produto_nome     TEXT,
  quantidade       INTEGER     NOT NULL DEFAULT 1 CHECK (quantidade >= 1),
  responsavel_id   UUID,
  responsavel_nome TEXT,
  prazo            DATE,
  notas            TEXT,
  criado_por       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de consulta
CREATE INDEX IF NOT EXISTS tarefas_tenant_idx        ON public.tarefas (tenant_id);
CREATE INDEX IF NOT EXISTS tarefas_tenant_status_idx ON public.tarefas (tenant_id, status);

-- Trigger de atualizado_em (função dedicada — a genérica usa NEW.updated_at, não atualizado_em)
CREATE OR REPLACE FUNCTION public.set_tarefas_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tarefas_updated_at ON public.tarefas;
CREATE TRIGGER tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.set_tarefas_atualizado_em();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Apenas membros ativos do tenant acessam
CREATE POLICY "tarefas_select" ON public.tarefas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = tarefas.tenant_id AND m.user_id = auth.uid() AND m.ativo = true
  ));

CREATE POLICY "tarefas_insert" ON public.tarefas FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = tarefas.tenant_id AND m.user_id = auth.uid() AND m.ativo = true
  ));

CREATE POLICY "tarefas_update" ON public.tarefas FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = tarefas.tenant_id AND m.user_id = auth.uid() AND m.ativo = true
  ));

CREATE POLICY "tarefas_delete" ON public.tarefas FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = tarefas.tenant_id AND m.user_id = auth.uid() AND m.ativo = true
  ));

-- ── GRANTs explícitos (exigidos pelo Supabase a partir de out/2025) ───────────
-- RLS sozinho não é suficiente; sem GRANT a tabela não aparece no Data API.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT USAGE ON SEQUENCE public.tarefas_id_seq TO authenticated; -- caso mude para serial
