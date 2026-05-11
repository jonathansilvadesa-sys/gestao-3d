-- ─────────────────────────────────────────────────────────────────────────────
-- Função pública: retorna informações básicas de um convite válido.
-- Usada na LoginPage para mostrar o nome da empresa antes do cadastro.
-- SECURITY DEFINER para acessar tenants sem precisar de auth (anon pode chamar).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_invite_info(p_code TEXT)
RETURNS TABLE (
  tenant_nome  TEXT,
  expira_em    TIMESTAMPTZ,
  valido       BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_usado     BOOLEAN;
  v_expira    TIMESTAMPTZ;
BEGIN
  -- Busca o convite
  SELECT tenant_id, usado, expira_em
    INTO v_tenant_id, v_usado, v_expira
    FROM public.invites
   WHERE code = UPPER(p_code)
   LIMIT 1;

  -- Convite não encontrado
  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TIMESTAMPTZ, FALSE;
    RETURN;
  END IF;

  -- Convite já usado ou expirado
  IF v_usado OR (v_expira IS NOT NULL AND v_expira < NOW()) THEN
    RETURN QUERY SELECT NULL::TEXT, v_expira, FALSE;
    RETURN;
  END IF;

  -- Retorna nome do tenant
  RETURN QUERY
    SELECT t.nome, v_expira, TRUE
      FROM public.tenants t
     WHERE t.id = v_tenant_id
     LIMIT 1;
END;
$$;

-- Garante que usuários não autenticados (anon) possam chamar a função
GRANT EXECUTE ON FUNCTION public.get_invite_info(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invite_info(TEXT) TO authenticated;
