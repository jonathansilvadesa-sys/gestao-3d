-- ============================================================
-- Gestão 3D — Setup completo do banco Supabase (v3.12)
-- Execute no SQL Editor do painel Supabase (uma única vez)
-- ============================================================

-- ── 1. Tabela principal ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_store (
  key         TEXT           NOT NULL,
  user_id     UUID           REFERENCES auth.users(id) ON DELETE CASCADE,
  value       JSONB          NOT NULL,
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key, user_id)   -- chave composta: par único por usuário
);

-- Índice para buscas rápidas por usuário
CREATE INDEX IF NOT EXISTS idx_app_store_user_id ON app_store(user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_store_updated_at ON app_store;
CREATE TRIGGER trg_app_store_updated_at
  BEFORE UPDATE ON app_store
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE app_store ENABLE ROW LEVEL SECURITY;

-- Anon: lê/grava rows sem user_id (Fase 1 — antes de ter login)
DROP POLICY IF EXISTS "anon_legacy" ON app_store;
CREATE POLICY "anon_legacy"
  ON app_store FOR ALL TO anon
  USING  (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- Autenticado: acesso total às próprias rows + pode atualizar rows legadas (user_id IS NULL → adoção)
DROP POLICY IF EXISTS "user_own_data" ON app_store;
CREATE POLICY "user_own_data"
  ON app_store FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ── 3. Cria o primeiro usuário admin (execute depois de terminar o setup) ─────
-- Substitua pelo seu e-mail e senha real.
-- Ou use o painel Supabase: Authentication → Users → Invite user
--
-- SELECT supabase_auth.admin_create_user(
--   email := 'jonathansilvadesa@gmail.com',
--   password := 'sua_senha_aqui',
--   data := '{"full_name": "Jonathan Silva", "role": "admin"}'::jsonb
-- );
