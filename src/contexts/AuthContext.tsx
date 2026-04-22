import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { adoptLegacyData } from '@/lib/db';
import type { AuthContextType, User, UserRole } from '@/types';

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
  const [user, setUser]             = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // true até a sessão inicial ser verificada

  // ── Verifica sessão existente e escuta mudanças de auth ───────────────────
  useEffect(() => {
    // Sessão inicial (token persistido no localStorage do browser)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(toUser(data.session.user));
      setAuthLoading(false);
    });

    // Listener para login/logout/refresh de token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Login com e-mail + senha ──────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return traduzirErro(error.message);

    // Migra dados legados (sem user_id) para este usuário na primeira entrada
    if (data.user) await adoptLegacyData(data.user.id);

    return null;
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
      logout,
      resetPassword,
      isAuthenticated: !!user,
      authLoading,
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
