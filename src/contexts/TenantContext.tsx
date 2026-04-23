/**
 * TenantContext.tsx — Gerencia o tenant ativo do usuário.
 *
 * Responsabilidades:
 *  - Busca as memberships do usuário logado no Supabase
 *  - Define o tenant ativo (primeiro membership por padrão)
 *  - Chama setActiveTenant() no db.ts para sincronizar o tenant com as queries
 *  - Expõe funções de gestão: createTenant, inviteMember, etc.
 *  - Para role 'developer': carrega todos os tenants e permite switching
 */

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { setActiveTenant, migrateUserDataToTenant } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant, TenantMember, TenantRole, TenantContextType } from '@/types';

const TenantContext = createContext<TenantContextType | null>(null);

export function useTenant(): TenantContextType {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant deve ser usado dentro de TenantProvider');
  return ctx;
}

interface Props { children: ReactNode; }

export function TenantProvider({ children }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [tenant, setTenant]         = useState<Tenant | null>(null);
  const [myRole, setMyRole]         = useState<TenantRole | null>(null);
  const [members, setMembers]       = useState<TenantMember[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [tenantLoading, setTenantLoading] = useState(true);

  // ── Carrega tenant do usuário ───────────────────────────────────────────────
  const loadTenant = useCallback(async (uid: string) => {
    setTenantLoading(true);
    try {
      // Busca memberships com dados do tenant inline
      const { data: memberships, error } = await supabase
        .from('tenant_memberships')
        .select('id, tenant_id, user_id, role, ativo, criado_em, tenants(id, nome, slug, plano, ativo, criado_em)')
        .eq('user_id', uid)
        .eq('ativo', true)
        .order('criado_em', { ascending: true });

      if (error) {
        console.warn('[tenant] loadTenant error:', error.message);
        setTenantLoading(false);
        return;
      }

      if (!memberships || memberships.length === 0) {
        // Usuário sem tenant → needsTenantSetup
        setActiveTenant(null);
        setTenant(null);
        setMyRole(null);
        setTenantLoading(false);
        return;
      }

      // Preferência: último tenant salvo no localStorage
      const savedId = localStorage.getItem('gestao3d_active_tenant');
      const match = memberships.find((m) => {
        const t = m.tenants as unknown as Tenant | null;
        return t?.id === savedId;
      });
      const active = match ?? memberships[0];
      const activeTenant = active.tenants as unknown as Tenant;
      const activeRole   = active.role as TenantRole;

      setTenant(mapTenant(activeTenant));
      setMyRole(activeRole);
      setActiveTenant(activeTenant.id);
      localStorage.setItem('gestao3d_active_tenant', activeTenant.id);

      // Developer: carrega todos os tenants
      if (activeRole === 'developer') {
        const { data: all } = await supabase
          .from('tenants')
          .select('*')
          .order('criado_em', { ascending: true });
        setAllTenants((all ?? []).map(mapTenant));
      }

      // Carrega membros do tenant ativo
      await loadMembers(activeTenant.id);
    } catch (e) {
      console.warn('[tenant] loadTenant exception:', e);
    } finally {
      setTenantLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carrega membros do tenant ───────────────────────────────────────────────
  const loadMembers = async (tenantId: string) => {
    const { data, error } = await supabase
      .from('tenant_memberships')
      .select('id, tenant_id, user_id, role, ativo, criado_em')
      .eq('tenant_id', tenantId)
      .eq('ativo', true);

    if (!error && data) {
      setMembers(data.map(mapMember));
    }
  };

  // ── Recarrega quando userId muda ────────────────────────────────────────────
  useEffect(() => {
    if (userId) {
      loadTenant(userId);
    } else {
      setTenant(null);
      setMyRole(null);
      setMembers([]);
      setAllTenants([]);
      setActiveTenant(null);
      setTenantLoading(false);
    }
  }, [userId, loadTenant]);

  // ── createTenant ────────────────────────────────────────────────────────────
  // Usa RPC SECURITY DEFINER para criar tenant + membership atomicamente,
  // bypassando o RLS (evita "new row violates row-level security policy").
  const createTenant = useCallback(async (nome: string): Promise<string | null> => {
    if (!userId) return 'Usuário não autenticado';

    try {
      // 1. Chama a função SQL create_tenant_for_user() — bypassa RLS
      const { data: newTenantId, error: rpcErr } = await supabase
        .rpc('create_tenant_for_user', { p_nome: nome });

      if (rpcErr || !newTenantId) {
        console.warn('[tenant] createTenant rpc error:', rpcErr?.message);
        return rpcErr?.message ?? 'Erro ao criar empresa';
      }

      // 2. Busca o tenant recém-criado
      const { data: newTenant, error: fetchErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', newTenantId)
        .single();

      if (fetchErr || !newTenant) return fetchErr?.message ?? 'Erro ao carregar empresa criada';

      // 3. Migra dados legados (user_id → tenant_id)
      await migrateUserDataToTenant(userId, newTenantId);

      // 4. Atualiza contexto local
      const t = mapTenant(newTenant as Record<string, unknown>);
      setTenant(t);
      setMyRole('owner');
      setActiveTenant(t.id);
      localStorage.setItem('gestao3d_active_tenant', t.id);
      setMembers([{
        id: `tmp_${Date.now()}`, tenantId: t.id, userId,
        role: 'owner', ativo: true, criadoEm: new Date().toISOString(),
      }]);

      return null; // sucesso
    } catch (e) {
      console.warn('[tenant] createTenant exception:', e);
      return 'Erro inesperado ao criar empresa';
    }
  }, [userId]);

  // ── inviteMember ────────────────────────────────────────────────────────────
  // Versão MVP: adiciona por user_id diretamente (sem email invite)
  // Produção: enviar email via Supabase Edge Function + magic link
  const inviteMember = useCallback(async (
    email: string,
    role: TenantRole,
  ): Promise<string | null> => {
    if (!tenant) return 'Nenhuma empresa ativa';
    try {
      // Busca user_id pelo email na tabela auth.users (via RPC se disponível)
      // Por enquanto, armazena o convite como pending (futuro)
      console.info('[tenant] inviteMember (MVP): email', email, 'role', role, '→ tenant', tenant.id);
      return 'Funcionalidade de convite por email em breve. Peça ao usuário para se cadastrar e informe o ID do tenant.';
    } catch (e) {
      return 'Erro ao enviar convite';
    }
  }, [tenant]);

  // ── removeMember ────────────────────────────────────────────────────────────
  const removeMember = useCallback(async (memberId: string): Promise<void> => {
    const { error } = await supabase
      .from('tenant_memberships')
      .update({ ativo: false })
      .eq('id', memberId);

    if (!error) setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }, []);

  // ── updateMemberRole ────────────────────────────────────────────────────────
  const updateMemberRole = useCallback(async (
    memberId: string,
    role: TenantRole,
  ): Promise<void> => {
    const { error } = await supabase
      .from('tenant_memberships')
      .update({ role })
      .eq('id', memberId);

    if (!error) setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m));
  }, []);

  // ── switchTenant (developer only) ──────────────────────────────────────────
  const switchTenant = useCallback(async (tenantId: string): Promise<void> => {
    if (!userId) return;
    const found = allTenants.find((t) => t.id === tenantId);
    if (!found) return;

    setActiveTenant(tenantId);
    localStorage.setItem('gestao3d_active_tenant', tenantId);
    setTenant(found);
    await loadMembers(tenantId);
  }, [allTenants, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── migrateExistingData ─────────────────────────────────────────────────────
  const migrateExistingData = useCallback(async (): Promise<void> => {
    if (!userId || !tenant) return;
    await migrateUserDataToTenant(userId, tenant.id);
  }, [userId, tenant]);

  const needsTenantSetup = !tenantLoading && !!userId && !tenant;

  return (
    <TenantContext.Provider value={{
      tenant, myRole, members, allTenants, tenantLoading, needsTenantSetup,
      createTenant, inviteMember, removeMember, updateMemberRole,
      switchTenant, migrateExistingData,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

// ── Mappers ───────────────────────────────────────────────────────────────────
function mapTenant(raw: Record<string, unknown>): Tenant {
  return {
    id:       raw.id as string,
    nome:     raw.nome as string,
    slug:     (raw.slug as string) ?? '',
    plano:    (raw.plano as string) ?? 'free',
    ativo:    raw.ativo as boolean ?? true,
    criadoEm: (raw.criado_em as string) ?? new Date().toISOString(),
  };
}

function mapMember(raw: Record<string, unknown>): TenantMember {
  return {
    id:       raw.id as string,
    tenantId: raw.tenant_id as string,
    userId:   raw.user_id as string,
    role:     raw.role as TenantRole,
    ativo:    raw.ativo as boolean ?? true,
    criadoEm: raw.criado_em as string,
  };
}
