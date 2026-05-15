import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth }         from '@/contexts/AuthContext';
import { useAcessorios }   from '@/contexts/AcessorioContext';
import { useMaterials }    from '@/contexts/MaterialContext';
import { useTheme }        from '@/contexts/ThemeContext';
import { useHardware }     from '@/contexts/HardwareContext';
import { usePermissions }  from '@/contexts/PermissionsContext';
import { SettingsModal }   from '@/components/settings/SettingsModal';
import { DeveloperBadge }  from '@/components/admin/DeveloperPanel';
import {
  IconDashboard, IconProdutos, IconMateriais,
  IconEstoque, IconPedidos, IconKanban,
} from '@/components/layout/TabIcons';
import type { AppTab } from '@/types';

interface HeaderProps {
  tab: AppTab;
  setTab: (t: AppTab) => void;
  totalEstoque: number;
  onNovaPeca: () => void;
  onSearch?: () => void;
  breakEvenCount?: number;
}

const TABS: { key: AppTab; label: string; icon: JSX.Element }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <IconDashboard size={16} /> },
  { key: 'produtos',  label: 'Produtos',  icon: <IconProdutos  size={16} /> },
  { key: 'materiais', label: 'Materiais', icon: <IconMateriais size={16} /> },
  { key: 'estoque',   label: 'Estoque',   icon: <IconEstoque   size={16} /> },
  { key: 'pedidos',   label: 'Pedidos',   icon: <IconPedidos   size={16} /> },
  { key: 'kanban',    label: 'Tarefas',   icon: <IconKanban    size={16} /> },
];

export function Header({ tab, setTab, totalEstoque, onNovaPeca, onSearch, breakEvenCount = 0 }: HeaderProps) {
  const { user, logout }       = useAuth();
  const { getAbaixoMinimo }    = useAcessorios();
  const { materials }          = useMaterials();
  const { theme, toggleTheme } = useTheme();
  const { getAlertasEstoque: hwEstoque, getAlertasHoras: hwHoras } = useHardware();
  const { can }                = usePermissions();

  const [showSettings,  setShowSettings]  = useState(false);
  const [showUserMenu,  setShowUserMenu]  = useState(false);
  const [showNotif,     setShowNotif]     = useState(false);
  const [devTrigger,    setDevTrigger]    = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);

  // ── Fechar dropdown ao clicar fora ───────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    if (showNotif) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotif]);

  // ── Alertas de acessórios com estoque baixo ───────────────────────────────
  const acessorioAlertas = useMemo(() => getAbaixoMinimo(), [getAbaixoMinimo]);

  // ── Alertas de filamentos com estoque baixo (< 20% ou < 50 g) ────────────
  const filamentoAlertas = useMemo(() =>
    materials.filter((m) => {
      if (m.pesoTotal <= 0) return false;
      const pct = m.pesoAtual / m.pesoTotal;
      return pct < 0.2 || m.pesoAtual < 50;
    }),
  [materials]);

  // ── Alertas de hardware ───────────────────────────────────────────────────
  const hwEstoqueAlertas = useMemo(() => hwEstoque(), [hwEstoque]);
  const hwHorasAlertas   = useMemo(() => hwHoras(),   [hwHoras]);

  const totalAlertas =
    acessorioAlertas.length +
    filamentoAlertas.length +
    hwEstoqueAlertas.length +
    hwHorasAlertas.length +
    (breakEvenCount > 0 ? 1 : 0);

  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 mr-1 sm:mr-2">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              🖨
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-gray-800 dark:text-gray-100 leading-none">Gestão 3D</h1>
              <p className="text-xs text-gray-400">Controle de Custos</p>
            </div>
          </div>

          {/* Tabs — ocultas no mobile (substituídas pelo BottomTabBar) */}
          <nav className="hidden sm:flex gap-1 flex-1 justify-center">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                data-tour={`tab-${key}`}
                onClick={() => setTab(key)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition relative flex items-center gap-1.5 ${
                  tab === key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                <span className="hidden sm:inline">{icon}</span>
                <span>{label}</span>
                {key === 'estoque' && totalEstoque > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {totalEstoque > 9 ? '9+' : totalEstoque}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Espaçador — empurra ações para a direita no mobile */}
          <div className="flex-1 sm:hidden" />

          {/* Ações à direita */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* ── Badge de Developer ────────────────────────────────────── */}
            <DeveloperBadge
              externalTrigger={devTrigger}
              onExternalClose={() => setDevTrigger(false)}
            />

            {/* ── Busca Global — visível em todas as telas ─────────────── */}
            {onSearch && (
              <button
                onClick={onSearch}
                title="Busca global (Ctrl+K)"
                aria-label="Busca global"
                className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 flex items-center justify-center transition text-gray-500 dark:text-gray-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            )}

            {/* ── Botão Tema — oculto no mobile ────────────────────────── */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              className="hidden sm:flex w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 items-center justify-center transition text-gray-500 dark:text-gray-300"
            >
              {theme === 'dark' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

            {/* ── Sininho de Notificações — sempre visível ─────────────── */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotif((v) => !v)}
                title="Notificações e alertas"
                aria-label={totalAlertas > 0 ? `Notificações — ${totalAlertas} alerta${totalAlertas !== 1 ? 's' : ''}` : 'Notificações'}
                aria-expanded={showNotif}
                aria-haspopup="true"
                className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 flex items-center justify-center transition text-gray-500 dark:text-gray-300 relative"
              >
                {/* Ícone sino */}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {/* Badge contador */}
                {totalAlertas > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalAlertas > 9 ? '9+' : totalAlertas}
                  </span>
                )}
              </button>

              {/* Dropdown de notificações */}
              {showNotif && (
                <div className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h4 className="font-bold text-gray-700 dark:text-gray-200 text-sm">🔔 Alertas e Notificações</h4>
                    {totalAlertas === 0 && (
                      <span className="text-xs text-gray-400">Tudo em ordem ✓</span>
                    )}
                    {totalAlertas > 0 && (
                      <span className="text-xs font-bold text-red-500">{totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''}</span>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {totalAlertas === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-3xl mb-2">✅</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum alerta no momento.</p>
                        <p className="text-xs text-gray-400 mt-1">Estoques e metas estão saudáveis.</p>
                      </div>
                    ) : (
                      <>
                        {/* ── Acessórios ── */}
                        {acessorioAlertas.length > 0 && (
                          <div className="px-4 py-3">
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">
                              📦 Acessórios — Estoque Baixo
                            </p>
                            <div className="space-y-2">
                              {acessorioAlertas.map(({ acessorio, variante }) => {
                                const pct = variante.estoqueMinimo > 0
                                  ? Math.min(100, Math.round((variante.estoqueAtual / variante.estoqueMinimo) * 100))
                                  : 100;
                                return (
                                  <div key={variante.id} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                        {acessorio.nome}
                                        {variante.tamanho && (
                                          <span className="ml-1 text-gray-400 font-normal">({variante.tamanho})</span>
                                        )}
                                      </p>
                                      <p className="text-xs font-bold text-amber-600">
                                        {variante.estoqueAtual} / {variante.estoqueMinimo} {acessorio.unidade}
                                      </p>
                                    </div>
                                    <div className="mt-1.5 w-full bg-amber-100 dark:bg-amber-900/40 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="h-1.5 rounded-full bg-amber-400"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ── Filamentos ── */}
                        {filamentoAlertas.length > 0 && (
                          <div className={`px-4 py-3 ${acessorioAlertas.length > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">
                              🧵 Filamentos — Estoque Baixo
                            </p>
                            <div className="space-y-2">
                              {filamentoAlertas.map((m) => {
                                const pct = m.pesoTotal > 0
                                  ? Math.min(100, Math.round((m.pesoAtual / m.pesoTotal) * 100))
                                  : 0;
                                const cor = pct < 10 ? 'bg-red-400' : 'bg-purple-400';
                                return (
                                  <div key={m.id} className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-2.5">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                        {m.nome}
                                        <span className="ml-1 text-gray-400 font-normal">({m.tipo} · {m.cor})</span>
                                      </p>
                                      <p className="text-xs font-bold text-purple-600">
                                        {m.pesoAtual}g / {m.pesoTotal}g
                                      </p>
                                    </div>
                                    <div className="mt-1.5 w-full bg-purple-100 dark:bg-purple-900/40 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-1.5 rounded-full ${cor}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-purple-500 mt-1">{pct}% restante</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ── Hardware — Estoque Baixo ── */}
                        {hwEstoqueAlertas.length > 0 && (
                          <div className={`px-4 py-3 ${(acessorioAlertas.length > 0 || filamentoAlertas.length > 0) ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">
                              🔧 Hardware — Estoque Baixo
                            </p>
                            <div className="space-y-2">
                              {hwEstoqueAlertas.map((p) => (
                                <div key={p.id} className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-2.5">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{p.nome}</p>
                                    <p className="text-xs font-bold text-orange-600">
                                      {p.estoqueAtual} / {p.estoqueMinimo} un.
                                    </p>
                                  </div>
                                  {p.impressoraNome && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">{p.impressoraNome}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ── Hardware — Limite de Horas ── */}
                        {hwHorasAlertas.length > 0 && (
                          <div className={`px-4 py-3 ${(acessorioAlertas.length > 0 || filamentoAlertas.length > 0 || hwEstoqueAlertas.length > 0) ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2">
                              ⚠️ Hardware — Limite de Horas
                            </p>
                            <div className="space-y-2">
                              {hwHorasAlertas.map((p) => {
                                const pct = Math.min(100, Math.round((p.horasUsadas / p.horasVidaUtil) * 100));
                                const substituir = p.horasUsadas >= p.horasVidaUtil;
                                return (
                                  <div key={p.id} className="bg-red-50 dark:bg-red-900/20 rounded-xl p-2.5">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{p.nome}</p>
                                      <p className={`text-xs font-bold ${substituir ? 'text-red-600' : 'text-amber-600'}`}>
                                        {p.horasUsadas}h / {p.horasVidaUtil}h
                                      </p>
                                    </div>
                                    <div className="mt-1.5 w-full bg-red-100 dark:bg-red-900/40 rounded-full h-1.5 overflow-hidden">
                                      <div className={`h-1.5 rounded-full ${substituir ? 'bg-red-500' : 'bg-amber-400'}`}
                                        style={{ width: `${pct}%` }} />
                                    </div>
                                    <p className={`text-[10px] mt-1 font-semibold ${substituir ? 'text-red-600' : 'text-amber-600'}`}>
                                      {substituir ? '🔴 SUBSTITUIR AGORA' : `🟡 ${pct}% — próximo da troca`}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ── Break-even ── */}
                        {breakEvenCount > 0 && (
                          <div className={`px-4 py-3 ${(acessorioAlertas.length > 0 || filamentoAlertas.length > 0) ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">
                              ⚖️ Break-even
                            </p>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-2.5">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                {breakEvenCount} {breakEvenCount === 1 ? 'produto ainda não' : 'produtos ainda não'} atingiu o ponto de equilíbrio
                              </p>
                              <p className="text-[10px] text-indigo-500 mt-1">
                                Veja os detalhes no Dashboard
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Configurações — oculto no mobile ─────────────────── */}
            {can('manage_settings') && (
              <button
                onClick={() => setShowSettings(true)}
                title="Configurações globais"
                className="hidden sm:flex w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 items-center justify-center transition text-gray-500 dark:text-gray-300"
              >
                ⚙️
              </button>
            )}

            {/* ── Nova Peça — oculto no mobile (disponível no FAB) ───── */}
            <button
              onClick={onNovaPeca}
              className="hidden sm:flex bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition items-center gap-1.5"
            >
              + Nova Peça
            </button>

            {/* Avatar */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                aria-label={`Menu do usuário — ${user?.nome ?? 'Perfil'}`}
                aria-expanded={showUserMenu}
                aria-haspopup="true"
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm"
              >
                {user?.avatar ?? '?'}
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 top-11 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-2 min-w-48 z-50"
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{user?.nome}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                    {user?.role === 'developer' ? (
                      <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full mt-1 inline-flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                        </svg>
                        Developer
                      </span>
                    ) : user?.role === 'admin' ? (
                      <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full mt-1 inline-block">Admin</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full mt-1 inline-block">Operador</span>
                    )}
                  </div>
                  {/* ── Botão Painel Dev (só para developers) ── */}
                  {user?.role === 'developer' && (
                    <button
                      onClick={() => { setDevTrigger(true); setShowUserMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition flex items-center gap-2 font-semibold"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                      </svg>
                      Painel Dev
                    </button>
                  )}
                  {can('manage_settings') && (
                    <button
                      onClick={() => { setShowSettings(true); setShowUserMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition"
                    >⚙️ Configurações</button>
                  )}
                  {/* Tema — visível apenas no mobile (desktop tem botão próprio) */}
                  <button
                    onClick={() => { toggleTheme(); setShowUserMenu(false); }}
                    className="sm:hidden w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition"
                  >
                    {theme === 'dark' ? '🌞 Tema Claro' : '🌙 Tema Escuro'}
                  </button>
                  <button
                    onClick={() => logout()}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                  >Sair da conta</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
