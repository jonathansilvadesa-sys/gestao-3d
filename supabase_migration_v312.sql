-- ============================================================
-- Gestão 3D — Migration v3.12 (versão corrigida)
-- PK continua sendo "key" — user_id é coluna adicional de filtro.
-- Multi-user com PK composta virá em migration futura.
-- ============================================================

-- ── 1. Adiciona user_id como coluna simples (nullable, sem mudar a PK) ────────
ALTER TABLE app_store
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- ── 2. Índice para buscas rápidas por usuário ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_app_store_user_id ON app_store(user_id);

-- ── 3. Atualiza as políticas de RLS ──────────────────────────────────────────
DROP POLICY IF EXISTS "allow_all_anon" ON app_store;
DROP POLICY IF EXISTS "anon_legacy"    ON app_store;
DROP POLICY IF EXISTS "user_own_data"  ON app_store;

-- Anon: acessa rows sem user_id (dados pré-login / legados)
CREATE POLICY "anon_legacy"
  ON app_store FOR ALL TO anon
  USING  (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- Autenticado: acessa as próprias rows + rows legadas (adoção no primeiro login)
CREATE POLICY "user_own_data"
  ON app_store FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
