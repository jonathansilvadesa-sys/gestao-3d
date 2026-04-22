/**
 * DeveloperPanel.tsx — Painel minimalista de desenvolvedor.
 * Visível apenas para usuários com role 'developer'.
 * Permite ver todos os tenants e trocar o contexto ativo.
 */

import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';

export function DeveloperBadge() {
  const { myRole, tenant, allTenants, switchTenant } = useTenant();
  const [open, setOpen] = useState(false);

  if (myRole !== 'developer') return null;

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
          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
            <div className="bg-amber-50 dark:bg-amber-900/30 px-4 py-3 border-b border-amber-100 dark:border-amber-800">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                🛠 Modo Desenvolvedor
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                {allTenants.length} empresa{allTenants.length !== 1 ? 's' : ''} cadastrada{allTenants.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-2 max-h-64 overflow-y-auto">
              {allTenants.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-3 text-center">Nenhuma empresa ainda</p>
              ) : (
                allTenants.map((t) => (
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
                      <p className="text-[11px] text-gray-400 truncate">{t.slug || t.id.slice(0, 8)}</p>
                    </div>
                    {tenant?.id === t.id && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-[10px] text-gray-400 text-center">
                Tenant ativo: <span className="font-mono">{tenant?.id?.slice(0, 8) ?? '—'}…</span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
