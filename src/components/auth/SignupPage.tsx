/**
 * SignupPage.tsx — Cadastro de novo usuário com código de convite.
 *
 * Fluxo:
 *  1. Usuário preenche nome, e-mail, empresa, senha + código de convite
 *  2. Valida o código via Supabase (invites table)
 *  3. Chama supabase.auth.signUp() com nome e empresa nos metadados
 *  4. Marca o convite como usado
 *  5. TenantContext detecta new user sem tenant → OnboardingTenant auto-preenche empresa
 */

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Props {
  onBack: () => void; // volta para LoginPage
}

export function SignupPage({ onBack }: Props) {
  const { signup } = useAuth();

  const [nome,          setNome]          = useState('');
  const [email,         setEmail]         = useState('');
  const [empresa,       setEmpresa]       = useState('');
  const [senha,         setSenha]         = useState('');
  const [confirma,      setConfirma]      = useState('');
  const [codigo,        setCodigo]        = useState('');
  const [showSenha,     setShowSenha]     = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [confirmEmail,  setConfirmEmail]  = useState(false);

  // Formata o código enquanto digita (auto-maiúsculas e traço)
  const handleCodigo = (v: string) => {
    const clean = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 4) {
      setCodigo(clean);
    } else {
      setCodigo(clean.slice(0, 4) + '-' + clean.slice(4, 8));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações locais
    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirma) {
      setError('As senhas não coincidem.');
      return;
    }
    const codigoLimpo = codigo.replace(/-/g, '');
    if (codigoLimpo.length < 8) {
      setError('Código de convite inválido. Formato esperado: XXXX-XXXX');
      return;
    }

    setLoading(true);

    // 1. Valida o código no Supabase
    const { data: invite, error: invErr } = await supabase
      .from('invites')
      .select('id, code, usado, expira_em')
      .eq('code', codigo.toUpperCase())
      .maybeSingle();

    if (invErr || !invite) {
      setError('Código de convite não encontrado.');
      setLoading(false);
      return;
    }
    if (invite.usado) {
      setError('Este código de convite já foi utilizado.');
      setLoading(false);
      return;
    }
    if (invite.expira_em && new Date(invite.expira_em) < new Date()) {
      setError('Este código de convite expirou.');
      setLoading(false);
      return;
    }

    // 2. Cria a conta
    const err = await signup(email.trim(), senha, nome.trim(), empresa.trim());

    if (err === '__confirm_email__') {
      // Supabase exige confirmação de e-mail — instrui o usuário
      setConfirmEmail(true);
      setLoading(false);
      // Marca o convite como usado mesmo assim (evita reuso)
      await supabase
        .from('invites')
        .update({ usado: true, usado_em: new Date().toISOString() })
        .eq('id', invite.id);
      return;
    }

    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    // 3. Marca o convite como usado (usuário agora está autenticado)
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    await supabase
      .from('invites')
      .update({ usado: true, usado_por: userId ?? null, usado_em: new Date().toISOString() })
      .eq('id', invite.id);

    // Sucesso → onAuthStateChange do Supabase dispara automaticamente,
    // AuthContext atualiza user, TenantContext detecta sem tenant → OnboardingTenant
    setLoading(false);
  };

  // ── Estado: aguardando confirmação de e-mail ──────────────────────────────
  if (confirmEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="text-6xl">📬</div>
          <h2 className="text-2xl font-bold text-gray-800">Verifique seu e-mail</h2>
          <p className="text-gray-500">
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Clique no link para ativar sua conta e fazer login.
          </p>
          <button
            onClick={onBack}
            className="text-indigo-500 hover:text-indigo-700 text-sm font-semibold underline transition"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg">
            🖨
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mt-4">Gestão 3D</h1>
          <p className="text-gray-500 mt-1">Criar sua conta</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-4">
          <h2 className="text-xl font-bold text-gray-700">Cadastro</h2>
          <p className="text-sm text-gray-400 -mt-2">
            Você precisa de um código de convite para se cadastrar.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nome completo */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Nome completo
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="João da Silva"
                required
                autoComplete="name"
                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* E-mail */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Nome da empresa */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Nome da empresa / negócio
              </label>
              <input
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Studio 3D, Impressões do João..."
                required
                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Senha
              </label>
              <div className="relative mt-1">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showSenha ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Confirmar senha
              </label>
              <input
                type={showSenha ? 'text' : 'password'}
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className={`mt-1 w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
                  confirma && confirma !== senha
                    ? 'border-red-300 focus:ring-red-300'
                    : 'border-gray-200 focus:ring-indigo-400'
                }`}
              />
              {confirma && confirma !== senha && (
                <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
              )}
            </div>

            {/* Código de convite */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Código de convite
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => handleCodigo(e.target.value)}
                placeholder="XXXX-XXXX"
                required
                maxLength={9}
                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase"
              />
              <p className="text-xs text-gray-400 mt-1">
                Solicite um código ao administrador do sistema.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !nome || !email || !empresa || !senha || !confirma || !codigo}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Criando conta…
                </>
              ) : 'Criar conta'}
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={onBack}
              className="text-sm text-indigo-500 hover:text-indigo-700 transition font-semibold"
            >
              ← Já tenho conta
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">Gestão 3D v3.13 · Powered by Supabase</p>
      </div>
    </div>
  );
}
