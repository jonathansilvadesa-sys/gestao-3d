-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: trigger de atualizado_em na tabela tarefas
--
-- O problema: set_updated_at() usa NEW.updated_at, mas a coluna
-- na tabela tarefas se chama atualizado_em.
-- Solução: criar uma função dedicada para tarefas.
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove o trigger incorreto
DROP TRIGGER IF EXISTS tarefas_updated_at ON public.tarefas;

-- Cria função dedicada que usa o nome correto da coluna
CREATE OR REPLACE FUNCTION public.set_tarefas_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

-- Recria o trigger apontando para a função correta
CREATE TRIGGER tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.set_tarefas_atualizado_em();
