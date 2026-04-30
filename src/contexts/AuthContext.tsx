import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { adoptLegacyData } from '@/lib/db';
import type { AuthContextType, User, UserRole } from '@/types';

const GOOGLE_INVITE_KEY   = 'gestao3d_pending_google_invite';
const ACTIVE_TENANT_KEY   = 'gestao3d_active_tenant';
const GOOGLE_VERIFIED_KEY = 'gestao3d_google_verified_uid';

/**
 * Lê a sessão Supabase direto do localStorage (sem rede).
 * Usado para inicialização otimista — evita loading screen para usuários que
 * já fizeram login antes e têm token ainda válido ou refreshável.
 */
function readLocalSession(): User | null {
  try {
    const key = Object.keys(localStorage)
      .find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { user: sbUser, expires_at } = JSON.parse(raw) as {
      user?: Record<string, unknown>;
      expires_at?: number;
    };
    if (!sbUser || !expires_at) return null;
    const now = Math.floor(Date.now() / 1000);
    // Aceita até 5 min expirado — Supabase consegue refresh nessa janela
    if (expires_at < now - 300) return null;
    return toUser(sbUser as Parameters<typeof toUser>[0]);
  } catch {
    return null;
  }
}

function purgeStaleAuth(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Cobre tokens padrão do Supabase (sb-<ref>-auth-token) E o nosso
      // storageKey customizado (gestao3d-auth-v*)
      if ((k.startsWith('sb-') && k.includes('-auth-token')) || k.startsWith('gestao3d-auth-')) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(ACTIVE_TENANT_KEY);
    localStorage.removeItem(GOOGLE_INVITE_KEY);
  } catch { /* ignora */ }
}

function isStaleAuthError(message: string | undefined | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('refresh token')
      || m.includes('invalid refresh')
      || m.includes('jwt expired')
      || m.includes('invalid jwt')
      || m.includes('user from sub claim')
      || m.includes('not authenticated');
}

function toUser(sbUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?:  Record<string, unknown>;
}): User {
  const email = sbUser.email ?? '';
  const nome  = (sbUser.user_metadata?.full_name as string) ?? email.split('@')[0];
  const role  = (sbUser.app_metadata?.role  as UserRole)
             ?? (sbUser.user_metadata?.role as UserRole)
             ?? 'admin';
  return { id: sbUser.id, nome, email, role, avatar: nome.charAt(0).toUpperCase() };
}

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
  // Inicialização otimista: se há sessão válida no localStorage, não mostra loading
  const localUser = readLocalSession();
  const [user, setUser]               = useState<User | null>(localUser);
  const [authLoading, setAuthLoading] = useState(!localUser);
  const [googleBlockedError, setGoogleBlockedError] = useState<string | null>(null);

  const clearGoogleBlockedError = useCallback(() => setGoogleBlockedError(null), []);

  useEffect(() => {
    // Se já temos usuário local, o timeout é mais curto (só refresh de segurança)
    const timeoutMs = localUser ? 10000 : 6000;
    const loadingTimeout = setTimeout(() => { setAuthLoading(false); }, timeoutMs);

    supabase.auth.getSession().then(({ data, error }) => {
      clearTimeout(loadingTimeout);
      if (error && isStaleAuthError(error.message)) {
        console.warn('[auth] sessão local inválida → purgando:', error.message);
        purgeStaleAuth();
        setUser(null);
        setAuthLoading(false);
        return;
      }
      if (data.session?.user) setUser(toUser(data.session.user));
      setAuthLoading(false);
    }).catch((e) => {
      clearTimeout(loadingTimeout);
      const msg = e?.message ?? String(e);
      if (isStaleAuthError(msg)) {
        console.warn('[auth] exceção em getSession → purgando:', msg);
        purgeStaleAuth();
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) {
        if (event === 'SIGNED_OUT') {
          try {
            localStorage.removeItem(ACTIVE_TENANT_KEY);
            localStorage.removeItem(GOOGLE_INVITE_KEY);
            localStorage.removeItem(GOOGLE_VERIFIED_KEY);
          } catch { /* ignora */ }
        }
        setUser(null);
        return;
      }

      const sbUser = session.user;

      // TOKEN_REFRESHED: apenas atualiza o usuário, nunca bloqueia em queries
      if (event === 'TOKEN_REFRESHED') {
        setUser(toUser(sbUser));
        return;
      }

      const isGoogleProvider = sbUser.app_metadata?.provider === 'google'
        || (sbUser.app_metadata?.providers as string[] | undefined)?.includes('google');

      // Usuário Google já verificado anteriormente → deixa entrar sem query
      if (isGoogleProvider && localStorage.getItem(GOOGLE_VERIFIED_KEY) === sbUser.id) {
        setUser(toUser(sbUser));
        return;
      }

      if (isGoogleProvider && event === 'SIGNED_IN') {
        const { data: memberships } = await supabase
          .from('tenant_memberships')
          .select('id')
          .eq('user_id', sbUser.id)
          .limit(1);

        const isNewUser = !memberships || memberships.length === 0;

        if (isNewUser) {
          const pendingCode = localStorage.getItem(GOOGLE_INVITE_KEY);

          if (!pendingCode) {
            await supabase.auth.signOut();
            setGoogleBlockedError('Acesso via Google requer um código de convite. Solicite ao administrador.');
            return;
          }

          const { data: invite } = await supabase
            .from('invites')
            .select('id, usado, expira_em')
            .eq('code', pendingCode.toUpperCase())
            .maybeSingle();

          if (!invite || invite.usado || (invite.expira_em && new Date(invite.expira_em) < new Date())) {
            localStorage.removeItem(GOOGLE_INVITE_KEY);
            await supabase.auth.signOut();
            setGoogleBlockedError('O código de convite informado é inválido ou expirou. Solicite um novo ao administrador.');
            return;
          }

          await supabase
            .from('invites')
            .update({ usado: true, usado_por: sbUser.id, usado_em: new Date().toISOString() })
            .eq('id', invite.id);

          localStorage.removeItem(GOOGLE_INVITE_KEY);
        }

        // Marca como verificado para as próximas visitas (evita re-query)
        try { localStorage.setItem(GOOGLE_VERIFIED_KEY, sbUser.id); } catch { /* ignora */ }
      }

      setUser(toUser(sbUser));
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return traduzirErro(error.message);
    if (data.user) adoptLegacyData(data.user.id).catch(console.warn);
    return null;
  }, []);

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
    if (!data.session) return '__confirm_email__';
    return null;
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
    });
    if (error) return traduzirErro(error.message);
    return null;
  }, []);

  const logout = useCallback(async () => { await supabase.auth.signOut(); }, []);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) return traduzirErro(error.message);
    return null;
  }, []);

  return (
    <AuthContext.Provider value={{
      user, login, loginWithGoogle, signup, logout, resetPassword,
      isAuthenticated: !!user, authLoading, googleBlockedError, clearGoogleBlockedError,
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
