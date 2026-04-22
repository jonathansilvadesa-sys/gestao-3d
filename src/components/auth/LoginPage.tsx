import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'login' | 'reset';

export function LoginPage() {
  const { login, resetPassword } = useAuth();
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await login(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const err = await resetPassword(email);
    if (err) setError(err);
    else setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    setLoading(false);
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

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">E-mail</label>
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
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Senha</label>
                  <input
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
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">E-mail</label>
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

        <p className="text-center text-xs text-gray-300 mt-6">Gestão 3D v3.12 · Powered by Supabase</p>
      </div>
    </div>
  );
}
