/**
 * PermissionsContext.tsx — Matriz de permissões por role (v3.9)
 *
 * - owner e developer sempre têm acesso a tudo (sem consulta à matriz)
 * - admin e operador seguem a matriz configurada pelo developer/owner
 * - A matriz é persistida no app_store com chave 'permissions'
 * - Recarrega automaticamente ao trocar de tenant
 */

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { dbGet, dbSet } from '@/lib/db';
import { useTenant }    from '@/contexts/TenantContext';
import { useAuth }      from '@/contexts/AuthContext';
import type {
  Permission, PermissionMatrix, PermissionsContextType,
  ConfigurableRole,
} from '@/types';
import { DEFAULT_PERMISSION_MATRIX } from '@/types';

const PermissionsContext = createContext<PermissionsContextType | null>(null);

const DB_KEY = 'permissions';

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user }             = useAuth();
  const { tenant, myRole }   = useTenant();
  const tenantId             = tenant?.id ?? null;

  const [matrix,             setMatrix]             = useState<PermissionMatrix>(DEFAULT_PERMISSION_MATRIX);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // ── Recarrega a matriz quando o tenant muda ─────────────────────────────────
  useEffect(() => {
    if (!tenantId) {
      setMatrix(DEFAULT_PERMISSION_MATRIX);
      return;
    }

    setPermissionsLoading(true);
    dbGet<PermissionMatrix>(DB_KEY).then((remoto: PermissionMatrix | null) => {
      if (remoto && typeof remoto === 'object') {
        // Merge com defaults para garantir que novas permissões tenham valor padrão
        const merged: PermissionMatrix = {
          admin:   { ...DEFAULT_PERMISSION_MATRIX.admin,   ...(remoto.admin   ?? {}) },
          operador: { ...DEFAULT_PERMISSION_MATRIX.operador, ...(remoto.operador ?? {}) },
        };
        setMatrix(merged);
      } else {
        setMatrix(DEFAULT_PERMISSION_MATRIX);
      }
    }).finally(() => setPermissionsLoading(false));
  }, [tenantId]);

  // ── can() — verifica se o usuário atual tem uma permissão ──────────────────
  const can = useCallback((permission: Permission): boolean => {
    // developer e owner têm tudo sempre
    if (user?.role === 'developer') return true;
    if (myRole === 'developer' || myRole === 'owner') return true;

    // roles configuráveis consultam a matriz
    const role = myRole as ConfigurableRole | null;
    if (!role || !(role in matrix)) return false;

    return matrix[role][permission] ?? false;
  }, [user, myRole, matrix]);

  // ── Salva a matriz atualizada ───────────────────────────────────────────────
  const updateMatrix = useCallback(async (newMatrix: PermissionMatrix): Promise<void> => {
    setMatrix(newMatrix);
    await dbSet(DB_KEY, newMatrix);
  }, []);

  return (
    <PermissionsContext.Provider value={{ matrix, can, updateMatrix, permissionsLoading }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextType {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions deve ser usado dentro de <PermissionsProvider>');
  return ctx;
}
