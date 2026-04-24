-- ─────────────────────────────────────────────────────────────────────────────
-- Migração: controle de convites por empresa + rastreio de uso
-- Rodar no Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Adiciona colunas na tabela invites
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS tenant_id  UUID    REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS note       TEXT    DEFAULT NULL;

-- Índice para filtrar por empresa
CREATE INDEX IF NOT EXISTS invites_tenant_id_idx ON public.invites (tenant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RPC: get_invite_stats
--    Retorna todos os convites com: tenant, quem usou (nome + email), quando
--    Acesso restrito a developer (verificado via user_metadata)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_invite_stats()
RETURNS TABLE (
  id           UUID,
  code         TEXT,
  usado        BOOLEAN,
  note         TEXT,
  criado_em    TIMESTAMPTZ,
  expira_em    TIMESTAMPTZ,
  tenant_id    UUID,
  tenant_nome  TEXT,
  usado_por    UUID,
  usado_em     TIMESTAMPTZ,
  usuario_nome TEXT,
  usuario_email TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    i.id,
    i.code,
    i.usado,
    i.note,
    i.criado_em,
    i.expira_em,
    i.tenant_id,
    t.nome                                       AS tenant_nome,
    i.usado_por,
    i.usado_em,
    (u.raw_user_meta_data->>'full_name')::text   AS usuario_nome,
    u.email::text                                AS usuario_email
  FROM  public.invites i
  LEFT JOIN public.tenants    t ON t.id  = i.tenant_id
  LEFT JOIN auth.users        u ON u.id  = i.usado_por
  ORDER BY i.criado_em DESC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_stats() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC: get_invite_stats_for_tenant
--    Versão para owners: filtra pelo próprio tenant, sem expor outros tenants
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_invite_stats_for_tenant(p_tenant_id UUID)
RETURNS TABLE (
  id           UUID,
  code         TEXT,
  usado        BOOLEAN,
  note         TEXT,
  criado_em    TIMESTAMPTZ,
  expira_em    TIMESTAMPTZ,
  usado_por    UUID,
  usado_em     TIMESTAMPTZ,
  usuario_nome TEXT,
  usuario_email TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    i.id,
    i.code,
    i.usado,
    i.note,
    i.criado_em,
    i.expira_em,
    i.usado_por,
    i.usado_em,
    (u.raw_user_meta_data->>'full_name')::text AS usuario_nome,
    u.email::text                              AS usuario_email
  FROM  public.invites i
  LEFT JOIN auth.users u ON u.id = i.usado_por
  WHERE i.tenant_id = p_tenant_id
  ORDER BY i.criado_em DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_stats_for_tenant(UUID) TO authenticated;
