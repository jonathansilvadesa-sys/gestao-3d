-- =====================================================================
-- MIGRATION: Sistema de Convites (v3.13)
-- Execute no Supabase Dashboard → SQL Editor
-- =====================================================================

-- 1. Função para gerar código de convite legível (ex: A3F7-B2K9)
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT LANGUAGE sql AS $$
  SELECT upper(
    substring(md5(random()::text) from 1 for 4) || '-' ||
    substring(md5(random()::text) from 1 for 4)
  );
$$;

-- 2. Tabela de convites
CREATE TABLE IF NOT EXISTS invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT UNIQUE NOT NULL DEFAULT generate_invite_code(),
  usado      BOOLEAN NOT NULL DEFAULT false,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usado_por  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usado_em   TIMESTAMPTZ,
  expira_em  TIMESTAMPTZ,  -- NULL = sem expiração
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS invites_code_idx ON invites(code);
CREATE INDEX IF NOT EXISTS invites_usado_idx ON invites(usado);

-- 4. RLS
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ler (para validar código antes de se cadastrar)
CREATE POLICY "invites_public_read"
  ON invites FOR SELECT USING (true);

-- Apenas developer pode criar convites
CREATE POLICY "invites_dev_insert"
  ON invites FOR INSERT
  WITH CHECK (is_developer());

-- Usuário autenticado pode marcar convite como usado (desde que não esteja usado)
CREATE POLICY "invites_use"
  ON invites FOR UPDATE
  USING (NOT usado AND auth.uid() IS NOT NULL)
  WITH CHECK (usado_por = auth.uid());

-- Developer pode deletar convites
CREATE POLICY "invites_dev_delete"
  ON invites FOR DELETE
  USING (is_developer());
