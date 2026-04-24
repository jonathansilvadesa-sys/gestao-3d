import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { adoptLegacyData } from '@/lib/db';
import type { AuthContextType, User, UserRole } from '@/types';

const GOOGLE_INVITE_KEY = 'gestao3d_pending_google_invite';

// ─── Converte sessão Supabase → User interno ──────────────────────────────────
function toUser(sbUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  const email = sbUser.email ?? '';
  const nome  = (sbUser.user_metadata?.full_name as string) ?? email.split('@')[0];
  const role  = (sbUser.user_metadata?.role as UserRole) ?? 'admin';
  return {
    id:     sbUser.id,
    nome,
    email,
    role,
    avatar: nome.charAt(0).toUpperCase(),
  };
}

// ─── Mensagens de erro em português ──────────────────────────────────────────
function traduzirErro(msg: string): string {
  if (msg.includes('Invalid login credentials'))  return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed'))         return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('User already registered'))     return 'Este e-mail já está cadastrado.';
  if (msg.includes('rate limit'))                  return 'Muitas tentativas. Aguarde um momento.';
  if (msg.includes('Network'))                     return 'Sem conexão. Verifique sua internet.';
  return msg;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // true até a sessão inicial ser verificada
  const [googleBlockedError, setGoogleBlockedError] = useState<string | null>(null);

  const clearGoogleBlockedError = useCallback(() => setGoogleBlockedError(null), []);

  // ── Verifica sessão existente e escuta mudanças de auth ───────────────────
  useEffect(() => {
    // Timeout de segurança: se o Supabase demorar mais de 6s (ex: free tier pausado,
    // rede mobile lenta) desbloqueia a UI para o usuário ver a tela de login
    // em vez de ficar preso no "Carregando..." indefinidamente.
    const loadingTimeout = setTimeout(() => {
      setAuthLoading(false);
    }, 6000);

    // Sessão inicial (token persistido no localStorage do browser)
    supabase.auth.getSession().then(({ data }) => {
      clearTimeout(loadingTimeout);
      if (data.session?.user) setUser(toUser(data.session.user));
      setAuthLoading(false);
    }).catch(() => {
      clearTimeout(loadingTimeout);
      setAuthLoading(false);
    });

    // Listener para login/logout/refresh de token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }

      const sbUser = session.user;
      const isGoogleProvider = sbUser.app_metadata?.provider === 'google'
        || (sbUser.app_metadata?.providers as string[] | undefined)?.includes('google');

      // ── Para usuários Google: verifica se é novo (sem tenant) ──────────────
      if (isGoogleProvider && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const { data: memberships } = await supabase
          .from('tenant_memberships')
          .select('id')
          .eq('user_id', sbUser.id)
          .limit(1);

        const isNewUser = !memberships || memberships.length === 0;

        if (isNewUser) {
          // Verifica convite pendente guardado antes do redirect
          const pendingCode = localStorage.getItem(GOOGLE_INVITE_KEY);

          if (!pendingCode) {
            // Nenhum convite → bloqueia e desconecta
            await supabase.auth.signOut();
            setGoogleBlockedError(
              'Acesso via Google requer um código de convite. Solicite ao administrador.'
            );
            return;
          }

          // Revalida o convite (pode ter expirado durante o fluxo OAuth)
          const { data: invite } = await supabase
            .from('invites')
            .select('id, usado, expira_em')
            .eq('code', pendingCode.toUpperCase())
            .maybeSingle();

          if (!invite || invite.usado || (invite.expira_em && new Date(invite.expira_em) < new Date())) {
            localStorage.removeItem(GOOGLE_INVITE_KEY);
            await supabase.auth.signOut();
            setGoogleBlockedError(
              'O código de convite informado é inválido ou expirou. Solicite um novo ao administrador.'
            );
            return;
          }

          // Convite válido → marca como usado e limpa localStorage
          await supabase
            .from('invites')
            .update({ usado: true, usado_por: sbUser.id, usado_em: new Date().toISOString() })
            .eq('id', invite.id);

          localStorage.removeItem(GOOGLE_INVITE_KEY);
        }
      }

      setUser(toUser(sbUser));
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // ── Login com e-mail + senha ──────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return traduzirErro(error.message);
    // Fire-and-forget: não bloqueia o login se a migração demorar
    if (data.user) adoptLegacyData(data.user.id).catch(console.warn);
    return null;
  }, []);

  // ── Cadastro com e-mail + senha ──────────────────────────────────────────────
  const signup = useCallback(async (
    email: string,
    password: string,
    nome: string,
    nomeEmpresa: string,
  ): Promise<string | null> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: nome, initial_company: nomeEmpresa } },
    });
    if (error) return traduzirErro(error.message);
    // Se email confirmation estiver habilitado no Supabase, session será null
    if (!data.session) return '__confirm_email__';
    return null;
  }, []);

  // ── Login com Google OAuth ────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async (): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) return traduzirErro(error.message);
    return null; // redireciona para o Google — a sessão chegará via onAuthStateChange
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // ── Reset de senha via e-mail ─────────────────────────────────────────────
  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) return traduzirErro(error.message);
    return null;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginWithGoogle,
      signup,
      logout,
      resetPassword,
      isAuthenticated: !!user,
      authLoading,
      googleBlockedError,
      clearGoogleBlockedError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
