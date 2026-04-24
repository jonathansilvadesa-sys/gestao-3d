-- ─────────────────────────────────────────────────────────────────────────────
-- Correção: RLS references user_metadata (inseguro)
-- user_metadata pode ser alterado pelo próprio usuário via supabase.auth.updateUser()
-- app_metadata só pode ser alterado pelo servidor (service role / admin)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Remove as políticas com user_metadata criadas anteriormente
DROP POLICY IF EXISTS "tenants_select_members"       ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_developer"     ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_owner_or_dev"  ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete_developer"     ON public.tenants;

-- 2. Migra a role 'developer' de user_metadata → app_metadata
--    (uma vez só; mantém user_metadata intacto para o frontend legado)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "developer"}'::jsonb
WHERE raw_user_meta_data->>'role' = 'developer';

-- 3. Recria as políticas usando app_metadata (server-controlled = seguro para RLS)

-- SELECT: membro do tenant ou developer
CREATE POLICY "tenants_select_members"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id   = auth.uid()
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
  );

-- INSERT: apenas developer
CREATE POLICY "tenants_insert_developer"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
  );

-- UPDATE: owner do tenant ou developer
CREATE POLICY "tenants_update_owner_or_dev"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id   = auth.uid()
        AND tm.role       = 'owner'
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id   = auth.uid()
        AND tm.role       = 'owner'
    )
  );

-- DELETE: apenas developer
CREATE POLICY "tenants_delete_developer"
  ON public.tenants
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'developer'
  );
