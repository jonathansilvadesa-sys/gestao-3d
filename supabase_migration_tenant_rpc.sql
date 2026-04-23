-- ============================================================
-- Gestão 3D — Migration: create_tenant_for_user (RPC)
-- Execute no SQL Editor do Supabase
-- Resolve: "new row violates row-level security policy for table tenants"
-- ============================================================

-- ── Função SECURITY DEFINER ──────────────────────────────────────────────────
-- Cria o tenant + membership do owner em uma transação,
-- bypassando o RLS (seguro pois valida auth.uid() internamente).
CREATE OR REPLACE FUNCTION create_tenant_for_user(p_nome TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_slug      TEXT;
BEGIN
  -- Garante que há um usuário autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Gera slug a partir do nome
  v_slug := lower(regexp_replace(p_nome, '[^a-zA-Z0-9]', '-', 'g'));
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  v_slug := substring(v_slug, 1, 50);

  -- Garante unicidade do slug
  WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) LOOP
    v_slug := substring(v_slug, 1, 44) || '-' || floor(random() * 9000 + 1000)::text;
  END LOOP;

  -- Cria o tenant
  INSERT INTO tenants (nome, slug)
  VALUES (p_nome, v_slug)
  RETURNING id INTO v_tenant_id;

  -- Adiciona o usuário como owner
  INSERT INTO tenant_memberships (tenant_id, user_id, role)
  VALUES (v_tenant_id, auth.uid(), 'owner');

  RETURN v_tenant_id;
END;
$$;

-- Permite que qualquer usuário autenticado chame a função
GRANT EXECUTE ON FUNCTION create_tenant_for_user(TEXT) TO authenticated;

-- ── (Opcional) Revogar acesso anônimo para garantir ──────────────────────────
REVOKE EXECUTE ON FUNCTION create_tenant_for_user(TEXT) FROM anon;
