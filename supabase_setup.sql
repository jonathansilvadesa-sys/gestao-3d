-- ============================================================
-- Gestão 3D — Setup inicial do banco Supabase
-- Execute no SQL Editor do painel Supabase (uma única vez)
-- ============================================================

-- Tabela principal: armazena todos os dados como chave→JSONB
CREATE TABLE IF NOT EXISTS app_store (
  key         TEXT PRIMARY KEY,
  value       JSONB          NOT NULL,
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Atualiza updated_at automaticamente em cada UPDATE
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

-- Row Level Security: habilita e libera acesso total para a chave anon
-- (fase 1 — sem autenticação; será restringido quando adicionar login)
ALTER TABLE app_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_anon" ON app_store;
CREATE POLICY "allow_all_anon"
  ON app_store
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
