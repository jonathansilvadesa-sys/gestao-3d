-- ============================================================
-- Gestão 3D — Migration: Multi-Tenancy SaaS
-- Execute no SQL Editor do Supabase (uma única vez)
-- ============================================================

-- ── 1. Tabela de empresas (tenants) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT          NOT NULL,
  slug        TEXT          UNIQUE,
  plano       TEXT          NOT NULL DEFAULT 'free',
  ativo       BOOLEAN       NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ── 2. Tabela de membros do tenant ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_memberships (
  id          UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID   NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT   NOT NULL DEFAULT 'operador'
                     CHECK (role IN ('developer','owner','admin','operador')),
  ativo       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;

-- ── 3. app_store: adiciona tenant_id e reestrutura PK ────────────────────────
-- 3a. Adiciona coluna tenant_id (nullable para compatibilidade com dados legados)
ALTER TABLE app_store
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 3b. Adiciona nova PK surrogate (UUID) para substituir o PK de key TEXT
--     Só executa se a coluna "id" ainda não existe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_store' AND column_name = 'id'
  ) THEN
    ALTER TABLE app_store ADD COLUMN id UUID DEFAULT gen_random_uuid();
    UPDATE app_store SET id = gen_random_uuid() WHERE id IS NULL;
    ALTER TABLE app_store ALTER COLUMN id SET NOT NULL;

    -- Remove PK antiga (era só "key")
    ALTER TABLE app_store DROP CONSTRAINT IF EXISTS app_store_pkey;

    -- Nova PK no campo id
    ALTER TABLE app_store ADD PRIMARY KEY (id);

    -- Constraint única: (key, tenant_id) — NULLS NOT DISTINCT permite um row legado sem tenant
    ALTER TABLE app_store ADD CONSTRAINT uq_key_tenant
      UNIQUE NULLS NOT DISTINCT (key, tenant_id);
  END IF;
END $$;

-- ── 4. Funções helper (SECURITY DEFINER evita recursão em RLS) ──────────────

-- Verifica se o usuário atual é membro ativo do tenant
CREATE OR REPLACE FUNCTION is_tenant_member(tid UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE tenant_id = tid AND user_id = auth.uid() AND ativo = true
  );
$$;

-- Verifica se o usuário atual tem role admin/owner no tenant
CREATE OR REPLACE FUNCTION is_tenant_admin(tid UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE tenant_id = tid AND user_id = auth.uid()
      AND role IN ('owner','admin','developer') AND ativo = true
  );
$$;

-- Verifica se o usuário atual tem role developer (acesso global)
CREATE OR REPLACE FUNCTION is_developer()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE user_id = auth.uid() AND role = 'developer' AND ativo = true
  );
$$;

-- ── 5. RLS: tenants ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenants_read"   ON tenants;
DROP POLICY IF EXISTS "tenants_insert" ON tenants;
DROP POLICY IF EXISTS "tenants_update" ON tenants;

-- Qualquer autenticado pode criar um tenant (vira owner)
CREATE POLICY "tenants_insert"
  ON tenants FOR INSERT TO authenticated
  WITH CHECK (true);

-- Membros veem seu tenant; developer vê todos
CREATE POLICY "tenants_read"
  ON tenants FOR SELECT TO authenticated
  USING (is_tenant_member(id) OR is_developer());

-- Owner/admin pode atualizar dados do tenant
CREATE POLICY "tenants_update"
  ON tenants FOR UPDATE TO authenticated
  USING    (is_tenant_admin(id) OR is_developer())
  WITH CHECK (is_tenant_admin(id) OR is_developer());

-- ── 6. RLS: tenant_memberships ────────────────────────────────────────────────
DROP POLICY IF EXISTS "memberships_read"   ON tenant_memberships;
DROP POLICY IF EXISTS "memberships_insert" ON tenant_memberships;
DROP POLICY IF EXISTS "memberships_update" ON tenant_memberships;
DROP POLICY IF EXISTS "memberships_delete" ON tenant_memberships;

-- Usuário vê suas próprias memberships + membros de tenants que pertence
CREATE POLICY "memberships_read"
  ON tenant_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_tenant_member(tenant_id) OR is_developer());

-- Owner/admin adiciona membros; developer pode tudo; usuário pode se auto-inserir ao criar/entrar
CREATE POLICY "memberships_insert"
  ON tenant_memberships FOR INSERT TO authenticated
  WITH CHECK (
    is_tenant_admin(tenant_id)
    OR is_developer()
    OR user_id = auth.uid()   -- auto-insert ao criar tenant ou aceitar convite
  );

-- Owner/admin altera roles
CREATE POLICY "memberships_update"
  ON tenant_memberships FOR UPDATE TO authenticated
  USING    (is_tenant_admin(tenant_id) OR is_developer())
  WITH CHECK (is_tenant_admin(tenant_id) OR is_developer());

-- Owner/admin remove membros; usuário pode sair sozinho; developer tudo
CREATE POLICY "memberships_delete"
  ON tenant_memberships FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_tenant_admin(tenant_id) OR is_developer());

-- ── 7. RLS: app_store — atualiza para multi-tenant ────────────────────────────
DROP POLICY IF EXISTS "anon_legacy"       ON app_store;
DROP POLICY IF EXISTS "user_own_data"     ON app_store;
DROP POLICY IF EXISTS "tenant_data_access" ON app_store;

-- Anon: só rows sem tenant_id e sem user_id (pré-login absoluto)
CREATE POLICY "anon_legacy"
  ON app_store FOR ALL TO anon
  USING    (user_id IS NULL AND tenant_id IS NULL)
  WITH CHECK (user_id IS NULL AND tenant_id IS NULL);

-- Autenticado: acessa rows do seu tenant OU rows legadas do próprio user_id OU developer vê tudo
CREATE POLICY "tenant_data_access"
  ON app_store FOR ALL TO authenticated
  USING (
    (tenant_id IS NOT NULL AND is_tenant_member(tenant_id))
    OR (tenant_id IS NULL AND user_id = auth.uid())
    OR is_developer()
  )
  WITH CHECK (
    (tenant_id IS NOT NULL AND is_tenant_member(tenant_id))
    OR (tenant_id IS NULL AND user_id = auth.uid())
    OR is_developer()
  );

-- ── 8. Índices extras ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_app_store_tenant_id ON app_store(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user    ON tenant_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant  ON tenant_memberships(tenant_id);

-- ── 9. Configuração do usuário developer ─────────────────────────────────────
-- Execute após criar seu usuário no Supabase Auth.
-- Substitua <SEU_USER_ID_AQUI> pelo UUID do seu usuário.
--
-- PASSO 1: cria o tenant master
-- INSERT INTO tenants (nome, slug, plano)
--   VALUES ('Gestão 3D — Master', 'gestao3d-master', 'developer')
-- RETURNING id;
--
-- PASSO 2: insere sua membership como developer
-- INSERT INTO tenant_memberships (tenant_id, user_id, role)
--   VALUES ('<TENANT_ID_DO_PASSO1>', '<SEU_USER_ID_AQUI>', 'developer');
--
-- Após isso, seu usuário terá acesso total a todos os tenants.
