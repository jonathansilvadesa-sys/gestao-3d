import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { hardReset } from '@/utils/hardReset';

const GOOGLE_INVITE_KEY = 'gestao3d_pending_google_invite';

type Mode = 'login' | 'reset';
type GoogleStep = 'idle' | 'invite';

interface Props { onShowSignup?: () => void; }

export function LoginPage({ onShowSignup }: Props) {
  const { login, loginWithGoogle, resetPassword, googleBlockedError, clearGoogleBlockedError } = useAuth();
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Limpeza profunda — última cartada quando o cache do navegador trava o login
  const handleHardReset = async () => {
    if (resetting) return;
    const ok = window.confirm(
      'Isso vai limpar dados locais do app neste navegador (sessão, cache, cookies do site) e recarregar a página. Você continuará com sua conta no servidor — só precisa fazer login de novo. Continuar?'
    );
    if (!ok) return;
    setResetting(true);
    await hardReset(true);
  };

  // ── Google OAuth — step de convite ────────────────────────────────────────
  const [googleStep, setGoogleStep]       = useState<GoogleStep>('idle');
  const [inviteCode, setInviteCode]       = useState('');
  const [inviteError, setInviteError]     = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteTenantNome, setInviteTenantNome] = useState<string | null>(null);

  // Lê ?invite= da URL ao montar (link de convite por email)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlInvite = params.get('invite');
    if (urlInvite) {
      const clean = urlInvite.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      const formatted = clean.length > 4 ? clean.slice(0,4) + '-' + clean.slice(4) : clean;
      setInviteCode(formatted);
      setGoogleStep('invite');
      // Remove o param da URL sem recarregar a página
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Formata o código enquanto digita (auto-maiúsculas e traço)
  // + lookup em tempo real do nome da empresa quando o código completa 8 chars
  const handleInviteCode = async (v: string) => {
    const clean = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formatted = clean.length <= 4 ? clean : clean.slice(0, 4) + '-' + clean.slice(4, 8);
    setInviteCode(formatted);
    setInviteError('');

    // Quando o código fica completo (8 chars), busca o nome da empresa
    if (clean.length === 8) {
      const code = clean.slice(0, 4) + '-' + clean.slice(4);
      try {
        const { data } = await supabase.rpc('get_invite_info', { p_code: code });
        const info = Array.isArray(data) ? data[0] : data;
        if (info?.valido && info?.tenant_nome) {
          setInviteTenantNome(info.tenant_nome as string);
        } else {
          setInviteTenantNome(null);
        }
      } catch { setInviteTenantNome(null); }
    } else {
      setInviteTenantNome(null);
    }
  };

  // Clique inicial no botão Google → abre o step de convite
  const handleGoogleClick = () => {
    setInviteCode('');
    setInviteError('');
    setInviteTenantNome(null);
    clearGoogleBlockedError();
    setGoogleStep('invite');
  };

  // Confirma o código de convite e redireciona para o Google
  const handleGoogleInviteConfirm = async (e: FormEvent) => {
    e.preventDefault();
    setInviteError('');

    const codigoLimpo = inviteCode.replace(/-/g, '');
    if (codigoLimpo.length < 8) {
      setInviteError('Código de convite inválido. Formato esperado: XXXX-XXXX');
      return;
    }

    setInviteLoading(true);

    // Valida o código via RPC (que também retorna o nome da empresa)
    const { data: rpcData } = await supabase
      .rpc('get_invite_info', { p_code: inviteCode.toUpperCase() });

    const info = Array.isArray(rpcData) ? rpcData[0] : rpcData;

    if (!info) {
      setInviteError('Código de convite não encontrado.');
      setInviteLoading(false);
      return;
    }
    if (!info.valido) {
      // Pode ser expirado ou já usado — verifica a data
      if (info.expira_em && new Date(info.expira_em as string) < new Date()) {
        setInviteError('Este código de convite expirou.');
      } else {
        setInviteError('Este código de convite já foi utilizado ou é inválido.');
      }
      setInviteLoading(false);
      return;
    }

    if (info.tenant_nome) setInviteTenantNome(info.tenant_nome as string);

    // Guarda o código para uso pós-retorno do OAuth
    localStorage.setItem(GOOGLE_INVITE_KEY, inviteCode.toUpperCase());

    setGoogleLoading(true);
    const err = await loginWithGoogle();
    if (err) {
      localStorage.removeItem(GOOGLE_INVITE_KEY);
      setInviteError(err);
      setGoogleLoading(false);
      setInviteLoading(false);
    }
    // sucesso → redireciona para Google, página sai daqui
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const err = await login(email, password);
      if (err) setError(err);
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const err = await resetPassword(email);
      if (err) setError(err);
      else setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg">
            🖨
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mt-4">Gestão 3D</h1>
          <p className="text-gray-500 mt-1">Controle de Custos e Estoque</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-5">

          {mode === 'login' ? (
            <>
              <h2 className="text-xl font-bold text-gray-700">Entrar na conta</h2>

              {/* ── Google OAuth ── */}
              {googleBlockedError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                  {googleBlockedError}
                </div>
              )}

              {googleStep === 'invite' ? (
                /* Step: solicita código de convite antes de redirecionar */
                <form onSubmit={handleGoogleInviteConfirm} className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      type="button"
                      onClick={() => { setGoogleStep('idle'); setInviteError(''); setInviteTenantNome(null); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition text-lg"
                    >←</button>
                    <span className="text-sm font-semibold text-gray-600">Código de convite para continuar com Google</span>
                  </div>

                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => handleInviteCode(e.target.value)}
                    placeholder="XXXX-XXXX"
                    required
                    maxLength={9}
                    autoFocus
                    className={`w-full border rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 uppercase transition ${
                      inviteTenantNome
                        ? 'border-emerald-300 focus:ring-emerald-400 bg-emerald-50'
                        : 'border-gray-200 focus:ring-indigo-400'
                    }`}
                  />

                  {/* Nome da empresa — aparece após validar o código */}
                  {inviteTenantNome && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2.5 text-sm">
                      <span className="text-base">🏢</span>
                      <div>
                        <p className="font-semibold">{inviteTenantNome}</p>
                        <p className="text-xs text-emerald-600">Você será adicionado a esta empresa</p>
                      </div>
                    </div>
                  )}

                  {inviteError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                      {inviteError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={inviteLoading || googleLoading || inviteCode.replace(/-/g, '').length < 8}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    {(inviteLoading || googleLoading) ? (
                      <svg className="animate-spin w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 48 48">
                        <path fill="#4285F4" d="M47.53 24.56c0-1.61-.14-3.17-.41-4.67H24v8.84h13.2c-.57 3.02-2.3 5.58-4.9 7.3v6.07h7.93c4.64-4.27 7.3-10.56 7.3-17.54z"/>
                        <path fill="#34A853" d="M24 48c6.63 0 12.19-2.2 16.26-5.97l-7.93-6.07c-2.2 1.48-5.02 2.35-8.33 2.35-6.41 0-11.84-4.33-13.78-10.15H2.01v6.26C6.07 42.88 14.44 48 24 48z"/>
                        <path fill="#FBBC05" d="M10.22 28.16A14.86 14.86 0 0 1 9.44 24c0-1.44.25-2.83.78-4.16v-6.26H2.01A23.98 23.98 0 0 0 0 24c0 3.87.93 7.53 2.01 10.42l8.21-6.26z"/>
                        <path fill="#EA4335" d="M24 9.5c3.61 0 6.85 1.24 9.39 3.68l7.04-7.04C36.18 2.19 30.62 0 24 0 14.44 0 6.07 5.12 2.01 13.58l8.21 6.26C12.16 13.83 17.59 9.5 24 9.5z"/>
                      </svg>
                    )}
                    {(inviteLoading || googleLoading) ? 'Verificando…' : 'Confirmar e continuar com Google'}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={googleLoading || loading}
                  className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {googleLoading ? (
                    <svg className="animate-spin w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 48 48">
                      <path fill="#4285F4" d="M47.53 24.56c0-1.61-.14-3.17-.41-4.67H24v8.84h13.2c-.57 3.02-2.3 5.58-4.9 7.3v6.07h7.93c4.64-4.27 7.3-10.56 7.3-17.54z"/>
                      <path fill="#34A853" d="M24 48c6.63 0 12.19-2.2 16.26-5.97l-7.93-6.07c-2.2 1.48-5.02 2.35-8.33 2.35-6.41 0-11.84-4.33-13.78-10.15H2.01v6.26C6.07 42.88 14.44 48 24 48z"/>
                      <path fill="#FBBC05" d="M10.22 28.16A14.86 14.86 0 0 1 9.44 24c0-1.44.25-2.83.78-4.16v-6.26H2.01A23.98 23.98 0 0 0 0 24c0 3.87.93 7.53 2.01 10.42l8.21-6.26z"/>
                      <path fill="#EA4335" d="M24 9.5c3.61 0 6.85 1.24 9.39 3.68l7.04-7.04C36.18 2.19 30.62 0 24 0 14.44 0 6.07 5.12 2.01 13.58l8.21 6.26C12.16 13.83 17.59 9.5 24 9.5z"/>
                    </svg>
                  )}
                  {googleLoading ? 'Redirecionando…' : 'Continuar com Google'}
                </button>
              )}

              {/* Separador */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-100" />
                <span className="text-xs text-gray-300 font-semibold">ou</span>
                <div className="flex-1 border-t border-gray-100" />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="text-xs font-bold text-gray-400 uppercase tracking-widest">E-mail</label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Senha</label>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Entrando…
                    </>
                  ) : 'Entrar'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(''); }}
                  className="w-full text-sm text-indigo-500 hover:text-indigo-700 transition text-center"
                >
                  Esqueci minha senha
                </button>

                {onShowSignup && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 border-t border-gray-100"/>
                    <span className="text-xs text-gray-300">ou</span>
                    <div className="flex-1 border-t border-gray-100"/>
                  </div>
                )}
                {onShowSignup && (
                  <button
                    type="button"
                    onClick={onShowSignup}
                    className="w-full text-sm font-semibold text-gray-600 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 rounded-2xl py-3 transition text-center"
                  >
                    Não tem conta? <span className="text-indigo-500">Criar agora →</span>
                  </button>
                )}
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition"
                >←</button>
                <h2 className="text-xl font-bold text-gray-700">Recuperar senha</h2>
              </div>
              <p className="text-sm text-gray-400">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="text-xs font-bold text-gray-400 uppercase tracking-widest">E-mail</label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                    ✅ {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !!success}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Enviando…
                    </>
                  ) : 'Enviar link de recuperação'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleHardReset}
            disabled={resetting}
            className="text-xs text-gray-400 hover:text-indigo-500 underline transition disabled:opacity-50"
          >
            {resetting ? 'Limpando dados locais…' : 'Tendo problemas para entrar? Limpar dados deste navegador'}
          </button>
          <p className="text-center text-xs text-gray-300">Gestão 3D v3.12 · Powered by Supabase</p>
        </div>
      </div>
    </div>
  );
}
