-- ============================================================
-- Gestão 3D — Migration: Funções de administração (Developer Panel)
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── 1. Retorna membros de um tenant com dados do auth.users ──────────────────
CREATE OR REPLACE FUNCTION get_tenant_members_info(p_tenant_id UUID)
RETURNS TABLE (
  membership_id UUID,
  user_id       UUID,
  email         TEXT,
  nome          TEXT,
  role          TEXT,
  ativo         BOOLEAN,
  criado_em     TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    tm.id                                                          AS membership_id,
    tm.user_id,
    au.email,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      split_part(au.email, '@', 1)
    )                                                              AS nome,
    tm.role,
    tm.ativo,
    tm.criado_em
  FROM tenant_memberships tm
  JOIN auth.users au ON tm.user_id = au.id
  WHERE tm.tenant_id = p_tenant_id
  ORDER BY tm.criado_em;
$$;

GRANT EXECUTE ON FUNCTION get_tenant_members_info(UUID) TO authenticated;

-- ── 2. Lista todos os tenants com contagem de membros ativos ─────────────────
CREATE OR REPLACE FUNCTION get_all_tenants_with_stats()
RETURNS TABLE (
  id          UUID,
  nome        TEXT,
  slug        TEXT,
  plano       TEXT,
  ativo       BOOLEAN,
  criado_em   TIMESTAMPTZ,
  total_membros BIGINT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    t.id, t.nome, t.slug, t.plano, t.ativo, t.criado_em,
    COUNT(tm.id) FILTER (WHERE tm.ativo = true) AS total_membros
  FROM tenants t
  LEFT JOIN tenant_memberships tm ON tm.tenant_id = t.id
  GROUP BY t.id
  ORDER BY t.criado_em DESC;
$$;

GRANT EXECUTE ON FUNCTION get_all_tenants_with_stats() TO authenticated;

-- ── 3. Busca usuário por email (para adicionar a um tenant) ──────────────────
CREATE OR REPLACE FUNCTION find_user_by_email(p_email TEXT)
RETURNS TABLE (
  user_id UUID,
  email   TEXT,
  nome    TEXT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    id AS user_id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) AS nome
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION find_user_by_email(TEXT) TO authenticated;

-- ── 4. Exclui tenant (apenas developer pode chamar) ──────────────────────────
-- Apaga memberships e o tenant em cascata
CREATE OR REPLACE FUNCTION delete_tenant_by_id(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Valida que quem chama é developer
  IF NOT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE user_id = auth.uid() AND role = 'developer' AND ativo = true
  ) AND NOT (
    SELECT (raw_user_meta_data->>'role') = 'developer'
    FROM auth.users WHERE id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas developers podem excluir tenants';
  END IF;

  -- Remove dados do app_store deste tenant
  DELETE FROM app_store WHERE tenant_id = p_tenant_id;

  -- Remove memberships (cascata remove o tenant via FK ON DELETE CASCADE)
  DELETE FROM tenants WHERE id = p_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_tenant_by_id(UUID) TO authenticated;
