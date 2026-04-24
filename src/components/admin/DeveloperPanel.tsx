/**
 * DeveloperPanel.tsx — Painel de desenvolvedor.
 * Visível para usuários com role 'developer' (user_metadata ou tenant_membership).
 *
 * Abas:
 *  - Empresas    : lista todos os tenants, abre gestão de membros por empresa
 *  - Permissões  : matriz de permissões por role (admin / operador)
 *  - Convites    : gera / copia / exclui códigos de convite
 */

import { useState, useEffect, useCallback } from 'react';
import { useTenant }       from '@/contexts/TenantContext';
import { useAuth }         from '@/contexts/AuthContext';
import { usePermissions }  from '@/contexts/PermissionsContext';
import { supabase }        from '@/lib/supabase';
import type { Invite, Permission, PermissionMatrix, ConfigurableRole } from '@/types';
import { DEFAULT_PERMISSION_MATRIX } from '@/types';

// ── Tipos internos ────────────────────────────────────────────────────────────
type PanelTab = 'tenants' | 'permissions' | 'invites';

interface TenantStat {
  id: string; nome: string; slug: string; plano: string;
  ativo: boolean; criado_em: string; total_membros: number;
}

interface MemberInfo {
  membership_id: string; user_id: string; email: string;
  nome: string; role: string; ativo: boolean; criado_em: string;
}

const ROLES = ['owner', 'admin', 'operador'] as const;
type MemberRole = typeof ROLES[number];

interface DeveloperBadgeProps {
  externalTrigger?: boolean;
  onExternalClose?: () => void;
}

// ── Componente principal ──────────────────────────────────────────────────────
export function DeveloperBadge({ externalTrigger, onExternalClose }: DeveloperBadgeProps = {}) {
  const { user }                                                    = useAuth();
  const { myRole, tenant, allTenants, switchTenant, createTenant } = useTenant();
  const { matrix, updateMatrix }                                    = usePermissions();

  const [open,       setOpen]       = useState(false);
  const [panelTab,   setPanelTab]   = useState<PanelTab>('tenants');

  // ── Permissões ────────────────────────────────────────────────────────────
  const [localMatrix,  setLocalMatrix]  = useState<PermissionMatrix>(DEFAULT_PERMISSION_MATRIX);
  const [permSaving,   setPermSaving]   = useState(false);
  const [permSaved,    setPermSaved]    = useState(false);

  // ── Empresas ─────────────────────────────────────────────────────────────
  const [tenantStats,    setTenantStats]    = useState<TenantStat[]>([]);
  const [statsLoading,   setStatsLoading]   = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantStat | null>(null);

  // ── Membros da empresa selecionada ────────────────────────────────────────
  const [members,      setMembers]      = useState<MemberInfo[]>([]);
  const [membLoading,  setMembLoading]  = useState(false);
  const [addEmail,     setAddEmail]     = useState('');
  const [addRole,      setAddRole]      = useState<MemberRole>('operador');
  const [addLoading,   setAddLoading]   = useState(false);
  const [addError,     setAddError]     = useState('');
  const [addSuccess,   setAddSuccess]   = useState('');
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  // ── Criar nova empresa ────────────────────────────────────────────────────
  const [showNovaEmp, setShowNovaEmp]  = useState(false);
  const [nomeEmp,     setNomeEmp]      = useState('');
  const [criandoEmp,  setCriandoEmp]   = useState(false);
  const [empError,    setEmpError]     = useState('');

  // ── Excluir empresa ───────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<TenantStat | null>(null);
  const [deleting,      setDeleting]      = useState(false);

  // ── Convites ──────────────────────────────────────────────────────────────
  const [invites,    setInvites]    = useState<Invite[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied,     setCopied]     = useState<string | null>(null);

  // Visível se role developer em qualquer camada
  const isDeveloper = user?.role === 'developer' || myRole === 'developer';
  if (!isDeveloper) return null;

  // Abre via trigger externo (ex.: menu do avatar)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (externalTrigger) setOpen(true);
  }, [externalTrigger]);

  const closePanel = () => { setOpen(false); onExternalClose?.(); };

  // ── Carrega stats dos tenants ─────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadTenantStats = useCallback(async () => {
    setStatsLoading(true);
    const { data, error } = await supabase.rpc('get_all_tenants_with_stats');
    if (!error && data) setTenantStats(data as TenantStat[]);
    setStatsLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (open && panelTab === 'tenants') loadTenantStats();
  }, [open, panelTab, loadTenantStats]);

  // Sincroniza localMatrix com o contexto ao abrir a aba de permissões
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (open && panelTab === 'permissions') {
      setLocalMatrix(matrix);
      setPermSaved(false);
    }
  }, [open, panelTab, matrix]);

  // ── Salva a matriz de permissões ──────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const savePermissions = useCallback(async () => {
    setPermSaving(true);
    await updateMatrix(localMatrix);
    setPermSaving(false);
    setPermSaved(true);
    setTimeout(() => setPermSaved(false), 2500);
  }, [localMatrix, updateMatrix]);

  const togglePerm = (role: ConfigurableRole, perm: Permission, value: boolean) => {
    setLocalMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [perm]: value },
    }));
    setPermSaved(false);
  };

  // ── Carrega membros de um tenant ──────────────────────────────────────────
  const loadMembers = useCallback(async (tenantId: string) => {
    setMembLoading(true);
    setMembers([]);
    const { data, error } = await supabase
      .rpc('get_tenant_members_info', { p_tenant_id: tenantId });
    if (!error && data) setMembers(data as MemberInfo[]);
    setMembLoading(false);
  }, []);

  const openTenant = (t: TenantStat) => {
    setSelectedTenant(t);
    setAddEmail(''); setAddRole('operador'); setAddError(''); setAddSuccess('');
    loadMembers(t.id);
  };

  // ── Alterar role do membro ────────────────────────────────────────────────
  const changeRole = async (membershipId: string, newRole: MemberRole) => {
    const { error } = await supabase
      .from('tenant_memberships')
      .update({ role: newRole })
      .eq('id', membershipId);
    if (!error) {
      setMembers((prev) =>
        prev.map((m) => m.membership_id === membershipId ? { ...m, role: newRole } : m)
      );
    }
  };

  // ── Remover membro ────────────────────────────────────────────────────────
  const removeMember = async (membershipId: string) => {
    setDeletingId(membershipId);
    const { error } = await supabase
      .from('tenant_memberships')
      .update({ ativo: false })
      .eq('id', membershipId);
    if (!error) setMembers((prev) => prev.filter((m) => m.membership_id !== membershipId));
    setDeletingId(null);
  };

  // ── Adicionar membro por email ────────────────────────────────────────────
  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !addEmail.trim()) return;
    setAddLoading(true); setAddError(''); setAddSuccess('');

    // Busca usuário pelo email
    const { data: found, error: findErr } = await supabase
      .rpc('find_user_by_email', { p_email: addEmail.trim() });

    if (findErr || !found || found.length === 0) {
      setAddError('Usuário não encontrado. Verifique o e-mail ou peça para ele se cadastrar.');
      setAddLoading(false); return;
    }

    const { user_id } = found[0];

    // Insere a membership
    const { error: insErr } = await supabase
      .from('tenant_memberships')
      .upsert({ tenant_id: selectedTenant.id, user_id, role: addRole, ativo: true },
               { onConflict: 'tenant_id,user_id' });

    if (insErr) { setAddError(insErr.message); setAddLoading(false); return; }

    setAddSuccess(`${found[0].nome} adicionado como ${addRole}!`);
    setAddEmail('');
    await loadMembers(selectedTenant.id);
    await loadTenantStats();
    setAddLoading(false);
  };

  // ── Excluir empresa ───────────────────────────────────────────────────────
  const deleteTenant = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const { error } = await supabase.rpc('delete_tenant_by_id', { p_tenant_id: confirmDelete.id });
    if (!error) {
      setTenantStats((prev) => prev.filter((t) => t.id !== confirmDelete.id));
      setConfirmDelete(null);
      if (selectedTenant?.id === confirmDelete.id) setSelectedTenant(null);
    }
    setDeleting(false);
  };

  // ── Criar nova empresa ────────────────────────────────────────────────────
  const handleCriarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmp.trim()) return;
    setCriandoEmp(true); setEmpError('');
    const err = await createTenant(nomeEmp.trim());
    if (err) { setEmpError(err); setCriandoEmp(false); }
    else { setNomeEmp(''); setShowNovaEmp(false); setCriandoEmp(false); await loadTenantStats(); }
  };

  // ── Convites ──────────────────────────────────────────────────────────────
  const loadInvites = useCallback(async () => {
    setInvLoading(true);
    const { data } = await supabase.from('invites').select('*')
      .order('criado_em', { ascending: false }).limit(20);
    if (data) {
      setInvites(data.map((r) => ({
        id: r.id, code: r.code, usado: r.usado,
        criadoPor: r.criado_por, usadoPor: r.usado_por,
        usadoEm: r.usado_em, expiraEm: r.expira_em, criadoEm: r.criado_em,
      })));
    }
    setInvLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (open && panelTab === 'invites') loadInvites();
  }, [open, panelTab, loadInvites]);

  const gerarConvite = async () => {
    setGenerating(true);
    const { data, error } = await supabase.from('invites').insert({}).select().single();
    if (!error && data) {
      setInvites((prev) => [{
        id: data.id, code: data.code, usado: false, criadoEm: data.criado_em,
      }, ...prev]);
    }
    setGenerating(false);
  };

  const deletarConvite = async (id: string) => {
    await supabase.from('invites').delete().eq('id', id);
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  const copiar = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code); setTimeout(() => setCopied(null), 2000);
    });
  };

  // ── Helpers de UI ─────────────────────────────────────────────────────────
  const roleColor = (role: string) => {
    switch (role) {
      case 'developer': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'owner':     return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'admin':     return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
      default:          return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const planoColor = (plano: string) =>
    plano === 'developer' ? 'text-amber-600' : plano === 'pro' ? 'text-indigo-600' : 'text-gray-400';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* Badge DEV */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Painel de desenvolvedor"
        className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-lg transition"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
        DEV
        {tenant && (
          <span className="hidden sm:inline text-amber-600 font-normal">
            · {tenant.nome.slice(0, 18)}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={closePanel} />

          {/* Painel — largura maior para gestão */}
          <div className="absolute right-0 top-full mt-2 w-[420px] max-w-[95vw] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden flex flex-col max-h-[600px]">

            {/* Header */}
            <div className="bg-amber-50 dark:bg-amber-900/30 px-4 py-3 border-b border-amber-100 dark:border-amber-800 flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedTenant && panelTab === 'tenants' && (
                  <button onClick={() => setSelectedTenant(null)}
                    className="w-6 h-6 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800 flex items-center justify-center text-amber-600 transition">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                )}
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  {selectedTenant && panelTab === 'tenants'
                    ? `🏢 ${selectedTenant.nome}`
                    : '🛠 Modo Desenvolvedor'}
                </p>
              </div>
              <button onClick={closePanel}
                className="w-6 h-6 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800 flex items-center justify-center text-amber-500 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Sub-tabs */}
            {!selectedTenant && (
              <div className="flex border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                {(['tenants', 'permissions', 'invites'] as PanelTab[]).map((t) => (
                  <button key={t} onClick={() => setPanelTab(t)}
                    className={`flex-1 py-2.5 text-xs font-semibold transition ${
                      panelTab === t
                        ? 'text-indigo-600 border-b-2 border-indigo-500'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    }`}>
                    {t === 'tenants'
                      ? `🏢 Empresas (${tenantStats.length})`
                      : t === 'permissions'
                        ? '🔐 Permissões'
                        : '🎟 Convites'}
                  </button>
                ))}
              </div>
            )}

            {/* ── ABA EMPRESAS ─────────────────────────────────────────────── */}
            {panelTab === 'tenants' && (
              <div className="flex flex-col flex-1 overflow-hidden">

                {/* ── Vista detalhe de um tenant ── */}
                {selectedTenant ? (
                  <div className="flex flex-col flex-1 overflow-hidden">

                    {/* Info do tenant */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 font-mono">{selectedTenant.slug}</p>
                        <span className={`text-xs font-bold ${planoColor(selectedTenant.plano)}`}>
                          {selectedTenant.plano.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => setConfirmDelete(selectedTenant)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg transition"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                        </svg>
                        Excluir empresa
                      </button>
                    </div>

                    {/* Adicionar membro */}
                    <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 flex-shrink-0">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                        Adicionar membro
                      </p>
                      <form onSubmit={addMember} className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={addEmail}
                            onChange={(e) => setAddEmail(e.target.value)}
                            placeholder="email@usuario.com"
                            className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                          <select
                            value={addRole}
                            onChange={(e) => setAddRole(e.target.value as MemberRole)}
                            className="border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            disabled={addLoading || !addEmail.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                          >
                            {addLoading
                              ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            }
                          </button>
                        </div>
                        {addError   && <p className="text-xs text-red-500">{addError}</p>}
                        {addSuccess && <p className="text-xs text-emerald-600 font-semibold">{addSuccess}</p>}
                      </form>
                    </div>

                    {/* Lista de membros */}
                    <div className="overflow-y-auto flex-1">
                      {membLoading ? (
                        <p className="text-xs text-gray-400 text-center py-6">Carregando membros…</p>
                      ) : members.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">Nenhum membro encontrado</p>
                      ) : (
                        <div className="p-3 space-y-2">
                          {members.map((m) => (
                            <div key={m.membership_id}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                                m.ativo
                                  ? 'bg-white dark:bg-gray-750 border-gray-100 dark:border-gray-700'
                                  : 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 opacity-50'
                              }`}>
                              {/* Avatar */}
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {(m.nome || m.email)[0]?.toUpperCase()}
                              </div>
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{m.nome}</p>
                                <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                              </div>
                              {/* Role selector */}
                              <select
                                value={m.role}
                                onChange={(e) => changeRole(m.membership_id, e.target.value as MemberRole)}
                                className={`text-[10px] font-bold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${roleColor(m.role)}`}
                              >
                                {ROLES.map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                              {/* Remover */}
                              <button
                                onClick={() => removeMember(m.membership_id)}
                                disabled={deletingId === m.membership_id}
                                className="w-6 h-6 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center text-red-300 hover:text-red-500 transition flex-shrink-0"
                                title="Remover membro"
                              >
                                {deletingId === m.membership_id
                                  ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                }
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Entrar neste tenant */}
                    <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
                      <button
                        onClick={() => { switchTenant(selectedTenant.id); closePanel(); }}
                        className={`w-full text-xs font-semibold py-2 rounded-xl transition flex items-center justify-center gap-2 ${
                          tenant?.id === selectedTenant.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 cursor-default'
                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-600 dark:text-gray-300 hover:text-indigo-600'
                        }`}
                      >
                        {tenant?.id === selectedTenant.id ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Empresa ativa
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                            Entrar como esta empresa
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                ) : (
                  /* ── Vista lista de tenants ── */
                  <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Botão nova empresa */}
                    <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 flex-shrink-0">
                      {!showNovaEmp ? (
                        <button onClick={() => setShowNovaEmp(true)}
                          className="w-full flex items-center justify-center gap-2 border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 text-xs font-semibold px-4 py-2 rounded-xl transition">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Nova empresa
                        </button>
                      ) : (
                        <form onSubmit={handleCriarEmpresa} className="space-y-2">
                          <input
                            autoFocus value={nomeEmp}
                            onChange={(e) => setNomeEmp(e.target.value)}
                            placeholder="Nome da empresa"
                            className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                          {empError && <p className="text-xs text-red-500">{empError}</p>}
                          <div className="flex gap-2">
                            <button type="submit" disabled={criandoEmp || !nomeEmp.trim()}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition">
                              {criandoEmp ? 'Criando…' : 'Criar'}
                            </button>
                            <button type="button"
                              onClick={() => { setShowNovaEmp(false); setNomeEmp(''); setEmpError(''); }}
                              className="px-3 py-2 text-xs text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg transition hover:text-gray-600">
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Lista de tenants */}
                    <div className="overflow-y-auto flex-1">
                      {statsLoading ? (
                        <p className="text-xs text-gray-400 text-center py-6">Carregando empresas…</p>
                      ) : tenantStats.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">Nenhuma empresa cadastrada</p>
                      ) : (
                        <div className="p-2 space-y-1">
                          {tenantStats.map((t) => (
                            <button key={t.id} onClick={() => openTenant(t)}
                              className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-3 group ${
                                tenant?.id === t.id
                                  ? 'bg-indigo-50 dark:bg-indigo-900/40'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              }`}>
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {t.nome[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-semibold truncate ${
                                    tenant?.id === t.id
                                      ? 'text-indigo-700 dark:text-indigo-300'
                                      : 'text-gray-700 dark:text-gray-200'
                                  }`}>{t.nome}</p>
                                  {tenant?.id === t.id && (
                                    <span className="text-[10px] bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                                      ativa
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] font-bold ${planoColor(t.plano)}`}>
                                    {t.plano}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    · {t.total_membros} membro{t.total_membros !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                className="text-gray-300 group-hover:text-gray-400 flex-shrink-0">
                                <polyline points="9 18 15 12 9 6"/>
                              </svg>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ABA PERMISSÕES ────────────────────────────────────────────── */}
            {panelTab === 'permissions' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Cabeçalho explicativo */}
                <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 flex-shrink-0">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    Define o que cada role pode fazer <strong className="text-gray-700 dark:text-gray-200">nesta empresa</strong>.
                    Owner e Developer sempre têm acesso total.
                  </p>
                </div>

                {/* Matriz */}
                <div className="overflow-y-auto flex-1 px-3 py-2">
                  {/* Header de colunas */}
                  <div className="grid grid-cols-[1fr_72px_72px] gap-x-2 px-2 mb-1">
                    <div />
                    {(['admin', 'operador'] as ConfigurableRole[]).map((r) => (
                      <div key={r} className="text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{r}</div>
                    ))}
                  </div>

                  {/* Grupos de permissões */}
                  {([
                    {
                      label: 'Dashboard & Relatórios',
                      perms: [
                        { key: 'view_dashboard' as Permission,   label: 'Ver Dashboard' },
                        { key: 'view_financial'  as Permission,  label: 'Ver dados financeiros' },
                        { key: 'view_reports'    as Permission,  label: 'Ver relatórios' },
                        { key: 'export_pdf'      as Permission,  label: 'Exportar PDF' },
                        { key: 'import_export_data' as Permission, label: 'Importar / Exportar Excel' },
                      ],
                    },
                    {
                      label: 'Produtos / Peças',
                      perms: [
                        { key: 'manage_products' as Permission, label: 'Criar / editar / excluir peças' },
                        { key: 'view_costs'      as Permission, label: 'Ver custos e margens' },
                      ],
                    },
                    {
                      label: 'Estoque',
                      perms: [
                        { key: 'manage_stock'  as Permission, label: 'Produção / Venda / Falha' },
                        { key: 'adjust_stock'  as Permission, label: 'Ajuste manual de estoque' },
                      ],
                    },
                    {
                      label: 'Materiais & Hardware',
                      perms: [
                        { key: 'manage_materials' as Permission, label: 'Gerenciar filamentos e hardware' },
                      ],
                    },
                    {
                      label: 'Configurações',
                      perms: [
                        { key: 'manage_settings'  as Permission, label: 'Alterar configurações' },
                        { key: 'manage_printers'  as Permission, label: 'Gerenciar impressoras' },
                      ],
                    },
                  ] as { label: string; perms: { key: Permission; label: string }[] }[]).map((group) => (
                    <div key={group.label} className="mb-3">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-1">
                        {group.label}
                      </p>
                      <div className="bg-white dark:bg-gray-750 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                        {group.perms.map((perm, idx) => (
                          <div key={perm.key}
                            className={`grid grid-cols-[1fr_72px_72px] gap-x-2 items-center px-3 py-2 ${
                              idx < group.perms.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''
                            }`}
                          >
                            <span className="text-xs text-gray-700 dark:text-gray-300 leading-tight">{perm.label}</span>
                            {(['admin', 'operador'] as ConfigurableRole[]).map((role) => (
                              <div key={role} className="flex justify-center">
                                <button
                                  onClick={() => togglePerm(role, perm.key, !localMatrix[role][perm.key])}
                                  className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                                    localMatrix[role][perm.key]
                                      ? 'bg-indigo-500'
                                      : 'bg-gray-200 dark:bg-gray-600'
                                  }`}
                                >
                                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                    localMatrix[role][perm.key] ? 'translate-x-4' : 'translate-x-0.5'
                                  }`} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão Salvar */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
                  <button onClick={savePermissions} disabled={permSaving}
                    className={`w-full text-sm font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
                      permSaved
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white'
                    }`}>
                    {permSaving ? (
                      <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Salvando…</>
                    ) : permSaved ? (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Salvo!</>
                    ) : (
                      'Salvar permissões'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── ABA CONVITES ──────────────────────────────────────────────── */}
            {panelTab === 'invites' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 flex-shrink-0">
                  <button onClick={gerarConvite} disabled={generating}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition">
                    {generating
                      ? <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    }
                    Gerar novo convite
                  </button>
                </div>
                <div className="overflow-y-auto flex-1">
                  {invLoading ? (
                    <p className="text-xs text-gray-400 text-center py-6">Carregando…</p>
                  ) : invites.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Nenhum convite gerado</p>
                  ) : (
                    <div className="p-2 space-y-1.5">
                      {invites.map((inv) => (
                        <div key={inv.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
                            inv.usado
                              ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 opacity-60'
                              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                          }`}>
                          <code className={`flex-1 font-mono font-bold tracking-widest text-sm ${
                            inv.usado ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'
                          }`}>{inv.code}</code>
                          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.usado
                              ? 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-300'
                              : 'bg-emerald-200 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
                          }`}>{inv.usado ? 'usado' : 'livre'}</span>
                          {!inv.usado && (
                            <button onClick={() => copiar(inv.code)}
                              className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800 flex items-center justify-center text-emerald-600 transition">
                              {copied === inv.code
                                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              }
                            </button>
                          )}
                          <button onClick={() => deletarConvite(inv.id)}
                            className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center text-red-300 hover:text-red-500 transition">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14H6L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
              <p className="text-[10px] text-gray-400 text-center font-mono">
                {tenant?.id?.slice(0, 8) ?? '—'}… · {user?.role === 'developer' ? 'developer (meta)' : myRole}
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Modal confirmar exclusão de empresa ────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 max-w-sm w-full z-10">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">🗑️</div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">Excluir empresa?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span className="font-semibold text-gray-700 dark:text-gray-200">{confirmDelete.nome}</span> e todos os dados serão permanentemente excluídos. Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancelar
              </button>
              <button onClick={deleteTenant} disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2">
                {deleting
                  ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Excluindo…</>
                  : 'Excluir'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
