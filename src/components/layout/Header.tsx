import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsModal } from '@/components/settings/SettingsModal';
import type { AppTab } from '@/types';

interface HeaderProps {
  tab: AppTab;
  setTab: (t: AppTab) => void;
  totalEstoque: number;
  onNovaPeca: () => void;
}

const TABS: { key: AppTab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'produtos',  label: 'Produtos',  icon: '🖨️' },
  { key: 'materiais', label: 'Materiais', icon: '🧵' },
  { key: 'estoque',   label: 'Estoque',   icon: '📦' },
];

export function Header({ tab, setTab, totalEstoque, onNovaPeca }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Logo */}
          <div className="flex items-center gap-3 mr-2">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              🖨
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-gray-800 leading-none">Gestão 3D</h1>
              <p className="text-xs text-gray-400">Controle de Custos</p>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 flex-1 justify-center">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition relative flex items-center gap-1.5 ${
                  tab === key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'
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

          {/* Ações à direita */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              title="Configurações globais"
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition text-gray-500"
            >
              ⚙️
            </button>

            <button
              onClick={onNovaPeca}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition hidden sm:block"
            >
              + Nova Peça
            </button>

            {/* Avatar */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm"
              >
                {user?.avatar ?? '?'}
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 top-11 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 min-w-48 z-50"
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="font-semibold text-gray-800 text-sm">{user?.nome}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                    <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
                      {user?.role === 'admin' ? 'Admin' : 'Operador'}
                    </span>
                  </div>
                  <button
                    onClick={() => { setShowSettings(true); setShowUserMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition"
                  >⚙️ Configurações</button>
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition"
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
