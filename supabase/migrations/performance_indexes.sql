-- ─────────────────────────────────────────────────────────────────────────────
-- performance_indexes.sql — Índices e otimizações de RLS
--
-- Problemas corrigidos:
--  1. auth.uid() nas políticas RLS era avaliado POR LINHA.
--     Solução: (SELECT auth.uid()) → avaliado UMA VEZ por query (cache).
--     Impacto: 5–100x mais rápido em tabelas com muitas linhas.
--
--  2. tenant_memberships não tinha índices nas colunas usadas pelos
--     subqueries de RLS (tenant_id, user_id). Cada verificação de política
--     fazia um full scan de tenant_memberships.
--
-- Referência: https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Índices em tenant_memberships ─────────────────────────────────────────
-- Todas as políticas RLS de tarefas e tenants consultam esta tabela
-- filtrando por (tenant_id, user_id, ativo). Sem índices = full scan por query.

CREATE INDEX IF NOT EXISTS tm_user_id_idx
  ON public.tenant_memberships (user_id);

CREATE INDEX IF NOT EXISTS tm_tenant_user_idx
  ON public.tenant_memberships (tenant_id, user_id);

-- Índice parcial: maioria das queries filtra ativo = true
CREATE INDEX IF NOT EXISTS tm_tenant_user_ativo_idx
  ON public.tenant_memberships (tenant_id, user_id)
  WHERE ativo = true;


-- ── 2. Fix RLS em tarefas: auth.uid() → (SELECT auth.uid()) ──────────────────
-- Recria as 4 políticas com o wrapper SELECT para caching do resultado.

DROP POLICY IF EXISTS "tarefas_select" ON public.tarefas;
DROP POLICY IF EXISTS "tarefas_insert" ON public.tarefas;
DROP POLICY IF EXISTS "tarefas_update" ON public.tarefas;
DROP POLICY IF EXISTS "tarefas_delete" ON public.tarefas;

CREATE POLICY "tarefas_select" ON public.tarefas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = tarefas.tenant_id
      AND m.user_id   = (SELECT auth.uid())
      AND m.ativo     = true
  ));

CREATE POLICY "tarefas_insert" ON public.tarefas FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = tarefas.tenant_id
      AND m.user_id   = (SELECT auth.uid())
      AND m.ativo     = true
  ));

CREATE POLICY "tarefas_update" ON public.tarefas FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = tarefas.tenant_id
      AND m.user_id   = (SELECT auth.uid())
      AND m.ativo     = true
  ));

CREATE POLICY "tarefas_delete" ON public.tarefas FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = tarefas.tenant_id
      AND m.user_id   = (SELECT auth.uid())
      AND m.ativo     = true
  ));


-- ── 3. Fix RLS em tenants: auth.uid() → (SELECT auth.uid()) ──────────────────
-- Recria as políticas de tenants com o mesmo padrão de caching.

DROP POLICY IF EXISTS "tenants_select_members"      ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_developer"    ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_owner_or_dev" ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete_developer"    ON public.tenants;

CREATE POLICY "tenants_select_members"
  ON public.tenants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id   = (SELECT auth.uid())
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
  );

CREATE POLICY "tenants_insert_developer"
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
  );

CREATE POLICY "tenants_update_owner_or_dev"
  ON public.tenants FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id   = (SELECT auth.uid())
        AND tm.role      = 'owner'
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id   = (SELECT auth.uid())
        AND tm.role      = 'owner'
    )
  );

CREATE POLICY "tenants_delete_developer"
  ON public.tenants FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
  );
