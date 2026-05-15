-- ─────────────────────────────────────────────────────────────────────────────
-- rls_baseline.sql — RLS e GRANTs nas tabelas core (app_store,
--                    tenant_memberships, invites)
--
-- Estas tabelas foram criadas via Supabase Dashboard e não tinham políticas
-- RLS documentadas em migrations. Este arquivo estabelece o estado correto
-- de forma idempotente (DROP POLICY IF EXISTS antes de cada CREATE POLICY).
--
-- Rodar no Supabase SQL Editor após todos os outros migrations.
-- ─────────────────────────────────────────────────────────────────────────────


-- ════════════════════════════════════════════════════════════════════════════
-- 1. app_store
--    Acesso por tenant_id (multi-tenant) ou user_id (legado).
--    Um usuário só pode ver/alterar os dados do seu próprio tenant
--    (ou seus próprios dados legados quando tenant_id IS NULL).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.app_store ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_store TO authenticated;

-- SELECT
DROP POLICY IF EXISTS "app_store_select" ON public.app_store;
CREATE POLICY "app_store_select" ON public.app_store
  FOR SELECT TO authenticated
  USING (
    -- modo multi-tenant: usuário é membro ativo do tenant
    (tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = app_store.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.ativo     = true
    ))
    OR
    -- modo legado: row pertence ao próprio usuário
    (tenant_id IS NULL AND user_id = (SELECT auth.uid()))
  );

-- INSERT
DROP POLICY IF EXISTS "app_store_insert" ON public.app_store;
CREATE POLICY "app_store_insert" ON public.app_store
  FOR INSERT TO authenticated
  WITH CHECK (
    (tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = app_store.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.ativo     = true
    ))
    OR
    (tenant_id IS NULL AND user_id = (SELECT auth.uid()))
  );

-- UPDATE
DROP POLICY IF EXISTS "app_store_update" ON public.app_store;
CREATE POLICY "app_store_update" ON public.app_store
  FOR UPDATE TO authenticated
  USING (
    (tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = app_store.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.ativo     = true
    ))
    OR
    (tenant_id IS NULL AND user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    (tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = app_store.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.ativo     = true
    ))
    OR
    (tenant_id IS NULL AND user_id = (SELECT auth.uid()))
  );

-- DELETE
DROP POLICY IF EXISTS "app_store_delete" ON public.app_store;
CREATE POLICY "app_store_delete" ON public.app_store
  FOR DELETE TO authenticated
  USING (
    (tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = app_store.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.ativo     = true
    ))
    OR
    (tenant_id IS NULL AND user_id = (SELECT auth.uid()))
  );

-- Índice de suporte para as subqueries de RLS
CREATE INDEX IF NOT EXISTS app_store_tenant_key_idx ON public.app_store (tenant_id, key);
CREATE INDEX IF NOT EXISTS app_store_user_key_idx   ON public.app_store (user_id, key)
  WHERE tenant_id IS NULL;


-- ════════════════════════════════════════════════════════════════════════════
-- 2. tenant_memberships
--    Membros podem ver membros do mesmo tenant.
--    Apenas owners e developers podem gerenciar membros.
--    Mutações críticas (add/remove) são feitas via RPCs SECURITY DEFINER,
--    mas as políticas garantem que o acesso direto via Data API também é seguro.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_memberships TO authenticated;

-- SELECT: ver membros do próprio tenant
DROP POLICY IF EXISTS "memberships_select" ON public.tenant_memberships;
CREATE POLICY "memberships_select" ON public.tenant_memberships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = tenant_memberships.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.ativo     = true
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
  );

-- INSERT: owner do tenant ou developer
DROP POLICY IF EXISTS "memberships_insert" ON public.tenant_memberships;
CREATE POLICY "memberships_insert" ON public.tenant_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = tenant_memberships.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.role      = 'owner'
        AND m.ativo     = true
    )
  );

-- UPDATE: owner do tenant ou developer (para mudar role / ativo)
DROP POLICY IF EXISTS "memberships_update" ON public.tenant_memberships;
CREATE POLICY "memberships_update" ON public.tenant_memberships
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = tenant_memberships.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.role      = 'owner'
        AND m.ativo     = true
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = tenant_memberships.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.role      = 'owner'
        AND m.ativo     = true
    )
  );

-- DELETE: apenas developer (remoção definitiva é rara; desativação usa UPDATE ativo=false)
DROP POLICY IF EXISTS "memberships_delete" ON public.tenant_memberships;
CREATE POLICY "memberships_delete" ON public.tenant_memberships
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
  );


-- ════════════════════════════════════════════════════════════════════════════
-- 3. invites
--    Leitura pública é feita via get_invite_info() SECURITY DEFINER (anon).
--    Acesso direto via Data API é restrito: apenas members do tenant podem
--    ver e criar convites; apenas developer pode deletar.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;

-- SELECT: member do tenant vinculado ao convite, ou developer
DROP POLICY IF EXISTS "invites_select" ON public.invites;
CREATE POLICY "invites_select" ON public.invites
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
    OR (tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = invites.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.ativo     = true
    ))
    -- convites legados sem tenant_id ficam invisíveis para não-developers
  );

-- INSERT: owner do tenant ou developer
DROP POLICY IF EXISTS "invites_insert" ON public.invites;
CREATE POLICY "invites_insert" ON public.invites
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
    OR (tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = invites.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.role IN ('owner', 'admin')
        AND m.ativo     = true
    ))
  );

-- UPDATE: usado apenas pelo sistema (marcar como usado) via RPCs — mas garante
--         que um membro não pode alterar convites de outro tenant
DROP POLICY IF EXISTS "invites_update" ON public.invites;
CREATE POLICY "invites_update" ON public.invites
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
    OR (tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = invites.tenant_id
        AND m.user_id   = (SELECT auth.uid())
        AND m.role IN ('owner', 'admin')
        AND m.ativo     = true
    ))
  );

-- DELETE: apenas developer
DROP POLICY IF EXISTS "invites_delete" ON public.invites;
CREATE POLICY "invites_delete" ON public.invites
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
  );
