-- ─────────────────────────────────────────────────────────────────────────────
-- Correções de segurança — Supabase Security Advisor
-- Rodar no Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Function Search Path Mutable → set_updated_at
--    Adiciona SET search_path = public para evitar search_path injection
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Function Search Path Mutable → generate_invite_code
--    Adiciona SET search_path = public
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT upper(
    substring(md5(random()::text), 1, 4) ||
    substring(md5(random()::text), 1, 4)
  );
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS Policy Always True → public.tenants
--    Substitui políticas com USING (true) por políticas com escopo real:
--    • SELECT  → qualquer autenticado que seja membro do tenant
--    • INSERT  → apenas developer (via user_metadata)
--    • UPDATE  → apenas developer
--    • DELETE  → apenas developer
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove políticas permissivas existentes
DROP POLICY IF EXISTS "tenants_select_all"  ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_all"  ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_all"  ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete_all"  ON public.tenants;
DROP POLICY IF EXISTS "Allow all"           ON public.tenants;
DROP POLICY IF EXISTS "Enable all"          ON public.tenants;
-- Tenta remover qualquer política genérica que use (true)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'tenants'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenants', pol.policyname);
  END LOOP;
END;
$$;

-- SELECT: usuário pode ver apenas os tenants dos quais é membro
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
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'developer'
  );

-- INSERT: apenas developer pode criar novos tenants diretamente
-- (o fluxo normal usa a RPC create_tenant_for_user com SECURITY DEFINER)
CREATE POLICY "tenants_insert_developer"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'developer'
  );

-- UPDATE: owner do tenant ou developer
CREATE POLICY "tenants_update_owner_or_dev"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'developer'
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id   = auth.uid()
        AND tm.role       = 'owner'
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'developer'
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
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'developer'
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Leaked Password Protection
--    NÃO é configurável via SQL — deve ser ativado no Dashboard:
--    Authentication > Settings > Password Security
--    Habilitar: "Enable Leaked Password Protection"
--    (verifica senhas contra base HaveIBeenPwned)
-- ─────────────────────────────────────────────────────────────────────────────
