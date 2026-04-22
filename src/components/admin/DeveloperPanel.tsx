/**
 * DeveloperPanel.tsx — Painel de desenvolvedor com gestão de tenants e convites.
 * Visível apenas para usuários com role 'developer'.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase }  from '@/lib/supabase';
import type { Invite } from '@/types';

// ── Seções do painel ───────────────────────────────────────────────────────────
type PanelTab = 'tenants' | 'invites';

export function DeveloperBadge() {
  const { myRole, tenant, allTenants, switchTenant, createTenant } = useTenant();
  const [open,         setOpen]         = useState(false);
  const [panelTab,     setPanelTab]     = useState<PanelTab>('tenants');
  const [invites,      setInvites]      = useState<Invite[]>([]);
  const [invLoading,   setInvLoading]   = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [copied,       setCopied]       = useState<string | null>(null);
  // ── Criar nova empresa ──────────────────────────────────────────────────────
  const [showNovaEmp,  setShowNovaEmp]  = useState(false);
  const [nomeEmp,      setNomeEmp]      = useState('');
  const [criandoEmp,   setCriandoEmp]   = useState(false);
  const [empError,     setEmpError]     = useState('');

  if (myRole !== 'developer') return null;

  const handleCriarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmp.trim()) return;
    setCriandoEmp(true);
    setEmpError('');
    const err = await createTenant(nomeEmp.trim());
    if (err) {
      setEmpError(err);
      setCriandoEmp(false);
    } else {
      setNomeEmp('');
      setShowNovaEmp(false);
      setCriandoEmp(false);
      // Recarrega a página para atualizar allTenants
      window.location.reload();
    }
  };

  // ── Carrega convites ─────────────────────────────────────────────────────────
  const loadInvites = useCallback(async () => {
    setInvLoading(true);
    const { data } = await supabase
      .from('invites')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(20);
    if (data) {
      setInvites(data.map((r) => ({
        id:       r.id,
        code:     r.code,
        usado:    r.usado,
        criadoPor: r.criado_por,
        usadoPor:  r.usado_por,
        usadoEm:   r.usado_em,
        expiraEm:  r.expira_em,
        criadoEm:  r.criado_em,
      })));
    }
    setInvLoading(false);
  }, []);

  useEffect(() => {
    if (open && panelTab === 'invites') loadInvites();
  }, [open, panelTab, loadInvites]);

  // ── Gerar novo convite ────────────────────────────────────────────────────────
  const gerarConvite = async () => {
    setGenerating(true);
    const { data, error } = await supabase
      .from('invites')
      .insert({}) // code gerado automaticamente pela função no banco
      .select()
      .single();

    if (!error && data) {
      const novo: Invite = {
        id: data.id, code: data.code, usado: false,
        criadoEm: data.criado_em,
      };
      setInvites((prev) => [novo, ...prev]);
    }
    setGenerating(false);
  };

  // ── Deletar convite ───────────────────────────────────────────────────────────
  const deletarConvite = async (id: string) => {
    await supabase.from('invites').delete().eq('id', id);
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  // ── Copiar código ─────────────────────────────────────────────────────────────
  const copiar = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Painel de desenvolvedor"
        className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-lg transition"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
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
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden flex flex-col max-h-[520px]">

            {/* Header */}
            <div className="bg-amber-50 dark:bg-amber-900/30 px-4 py-3 border-b border-amber-100 dark:border-amber-800 flex-shrink-0">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                🛠 Modo Desenvolvedor
              </p>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              {(['tenants', 'invites'] as PanelTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setPanelTab(t)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition ${
                    panelTab === t
                      ? 'text-indigo-600 border-b-2 border-indigo-500'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t === 'tenants' ? `🏢 Empresas (${allTenants.length})` : '🎟 Convites'}
                </button>
              ))}
            </div>

            {/* ── Aba Empresas ─────────────────────────────────────────────────── */}
            {panelTab === 'tenants' && (
              <div className="flex flex-col flex-1 overflow-hidden">

                {/* Botão / formulário nova empresa */}
                <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 flex-shrink-0">
                  {!showNovaEmp ? (
                    <button
                      onClick={() => setShowNovaEmp(true)}
                      className="w-full flex items-center justify-center gap-2 border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 text-xs font-semibold px-4 py-2 rounded-xl transition"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Nova empresa
                    </button>
                  ) : (
                    <form onSubmit={handleCriarEmpresa} className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Nome da empresa</p>
                      <input
                        autoFocus
                        value={nomeEmp}
                        onChange={(e) => setNomeEmp(e.target.value)}
                        placeholder="Ex: Print&Play 3D"
                        required
                        className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      {empError && <p className="text-xs text-red-500">{empError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={criandoEmp || !nomeEmp.trim()}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5"
                        >
                          {criandoEmp ? (
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                            </svg>
                          ) : null}
                          {criandoEmp ? 'Criando…' : 'Criar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowNovaEmp(false); setNomeEmp(''); setEmpError(''); }}
                          className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="overflow-y-auto flex-1">
                {allTenants.length === 0 ? (
                  <p className="text-xs text-gray-400 px-4 py-6 text-center">Nenhuma empresa ainda.<br/>Crie a primeira acima.</p>
                ) : (
                  <div className="p-2">
                    {allTenants.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { switchTenant(t.id); setOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-3 ${
                          tenant?.id === t.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/40'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {t.nome[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${
                            tenant?.id === t.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'
                          }`}>
                            {t.nome}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono truncate">{t.id.slice(0, 12)}…</p>
                        </div>
                        {tenant?.id === t.id && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                </div>{/* /overflow-y-auto */}
              </div>{/* /flex-col */}
            )}

            {/* ── Aba Convites ──────────────────────────────────────────────────── */}
            {panelTab === 'invites' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Botão gerar */}
                <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 flex-shrink-0">
                  <button
                    onClick={gerarConvite}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
                  >
                    {generating ? (
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    )}
                    Gerar novo convite
                  </button>
                </div>

                {/* Lista */}
                <div className="overflow-y-auto flex-1">
                  {invLoading ? (
                    <p className="text-xs text-gray-400 text-center py-6">Carregando…</p>
                  ) : invites.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Nenhum convite gerado ainda</p>
                  ) : (
                    <div className="p-2 space-y-1.5">
                      {invites.map((inv) => (
                        <div
                          key={inv.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
                            inv.usado
                              ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 opacity-60'
                              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                          }`}
                        >
                          {/* Código */}
                          <code className={`flex-1 font-mono font-bold tracking-widest text-sm ${
                            inv.usado ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'
                          }`}>
                            {inv.code}
                          </code>

                          {/* Status */}
                          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.usado
                              ? 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-300'
                              : 'bg-emerald-200 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
                          }`}>
                            {inv.usado ? 'usado' : 'livre'}
                          </span>

                          {/* Copiar */}
                          {!inv.usado && (
                            <button
                              onClick={() => copiar(inv.code)}
                              className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800 flex items-center justify-center text-emerald-600 transition"
                              title="Copiar código"
                            >
                              {copied === inv.code ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                              )}
                            </button>
                          )}

                          {/* Deletar */}
                          <button
                            onClick={() => deletarConvite(inv.id)}
                            className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center text-red-300 hover:text-red-500 transition"
                            title="Excluir convite"
                          >
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
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
              <p className="text-[10px] text-gray-400 text-center font-mono">
                {tenant?.id?.slice(0, 8) ?? '—'}… · {myRole}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
