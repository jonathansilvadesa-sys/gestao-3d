/**
 * OnboardingTenant.tsx — Tela mostrada quando o usuário está autenticado
 * mas ainda não possui uma empresa (tenant) configurada.
 *
 * Fluxo:
 *   1. "Criar minha empresa" → formulário com nome da empresa → createTenant()
 *   2. (futuro) "Entrar com convite" → código de acesso
 */

import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth }   from '@/contexts/AuthContext';
import { supabase }  from '@/lib/supabase';

export function OnboardingTenant() {
  const { createTenant } = useTenant();
  const { user, logout } = useAuth();

  const [nome, setNome]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Pré-preenche nome da empresa se veio do cadastro (user_metadata.initial_company)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const initial = data?.session?.user?.user_metadata?.initial_company as string | undefined;
      if (initial && !nome) setNome(initial);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    setError('');
    const err = await createTenant(nome.trim());
    setLoading(false);
    if (err) setError(err);
    // sucesso: TenantContext atualiza tenant → needsTenantSetup vira false → App mostra conteúdo
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
            🖨
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Gestão 3D</h1>
          <p className="text-sm text-gray-500 text-center">
            Olá, {user?.nome ?? user?.email}! Para começar, crie sua empresa no sistema.
          </p>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {/* Header do card */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5">
            <h2 className="text-white font-bold text-lg">Configurar minha empresa</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Seus dados ficam isolados e seguros, acessíveis em qualquer dispositivo.
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleCreate} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nome da empresa / negócio
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Impressões do João, Studio 3D..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
                required
                autoFocus
                maxLength={80}
              />
              <p className="text-xs text-gray-400 mt-1">Pode ser alterado depois nas configurações.</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !nome.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Criando empresa…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Criar minha empresa
                </>
              )}
            </button>
          </form>

          {/* Info de benefícios */}
          <div className="px-6 pb-5 space-y-2">
            {[
              ['🔒', 'Dados isolados — apenas você e sua equipe têm acesso'],
              ['☁️', 'Sincronização automática entre todos os dispositivos'],
              ['👥', 'Convide operadores para a equipe depois'],
            ].map(([emoji, texto]) => (
              <div key={texto} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="mt-0.5">{emoji}</span>
                <span>{texto}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-xs text-gray-400">
            Gestão 3D v3.12 · Powered by Supabase
          </p>
          <button
            onClick={() => logout()}
            className="text-xs text-gray-400 hover:text-gray-600 underline transition"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
