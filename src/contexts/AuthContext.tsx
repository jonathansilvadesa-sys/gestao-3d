import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AuthContextType, User, UserRole } from '@/types';

// ─── Usuários mock (substituir por Clerk/Auth0 + backend futuramente) ─────────
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: 1,
    nome: 'Jonathan Silva',
    email: 'jonathan@gestao3d.com',
    password: 'admin123',
    role: 'admin' as UserRole,
    avatar: 'J',
  },
  {
    id: 2,
    nome: 'Operador',
    email: 'operador@gestao3d.com',
    password: 'op123',
    role: 'operator' as UserRole,
    avatar: 'O',
  },
];

const SESSION_KEY = 'gestao3d_user';

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((email: string, password: string): boolean => {
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return false;
    const { password: _pw, ...safeUser } = found;
    setUser(safeUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
