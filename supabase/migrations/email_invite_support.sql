-- ─────────────────────────────────────────────────────────────────────────────
-- Suporte ao envio de convites por email (v3.12)
-- Rodar no Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Garante que a função generate_invite_code existe e retorna XXXX-XXXX
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    upper(substring(md5(random()::text), 1, 4)) || '-' ||
    upper(substring(md5(random()::text), 1, 4));
$$;

GRANT EXECUTE ON FUNCTION public.generate_invite_code() TO authenticated;

-- Índice para busca por código (já deve existir, mas garante)
CREATE INDEX IF NOT EXISTS invites_code_idx ON public.invites (code);

-- Índice para busca por tenant + não usado (listagem de convites pendentes)
CREATE INDEX IF NOT EXISTS invites_tenant_pending_idx
  ON public.invites (tenant_id, usado)
  WHERE usado = false;
