/**
 * db.ts — Camada de persistência sobre o Supabase.
 *
 * Tabela: app_store
 *   id         UUID (PK surrogate — adicionado na migration multitenancy)
 *   key        TEXT
 *   tenant_id  UUID (FK → tenants, nullable durante migração)
 *   user_id    UUID (FK → auth.users, legado)
 *   value      JSONB
 *   updated_at TIMESTAMPTZ
 *   UNIQUE NULLS NOT DISTINCT (key, tenant_id)
 *
 * Estratégia:
 *   - _activeTenantId preenchido → usa tenant_id nas queries (multi-tenant)
 *   - _activeTenantId null → usa user_id (legado v3.12)
 *   - setActiveTenant() é chamado pelo TenantContext ao carregar o tenant
 */

import { supabase } from '@/lib/supabase';

const TABLE = 'app_store';

// ── Tenant ativo (módulo singleton) ──────────────────────────────────────────
let _activeTenantId: string | null = null;

export function setActiveTenant(id: string | null): void {
  _activeTenantId = id;
}

export function getActiveTenant(): string | null {
  return _activeTenantId;
}

// ── User ID da sessão atual ───────────────────────────────────────────────────
async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ── Leitura ───────────────────────────────────────────────────────────────────
export async function dbGet<T>(key: string): Promise<T | null> {
  try {
    let query = supabase.from(TABLE).select('value').eq('key', key);

    if (_activeTenantId) {
      query = query.eq('tenant_id', _activeTenantId);
    } else {
      const userId = await getUserId();
      if (userId) query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) { console.warn('[db] get error:', key, error.message); return null; }
    return data ? (data.value as T) : null;
  } catch (e) {
    console.warn('[db] get exception:', key, e);
    return null;
  }
}

// ── Escrita (upsert) ──────────────────────────────────────────────────────────
export async function dbSet<T>(key: string, value: T): Promise<void> {
  try {
    const row: Record<string, unknown> = {
      key,
      value,
      updated_at: new Date().toISOString(),
    };

    if (_activeTenantId) {
      row.tenant_id = _activeTenantId;
      const { error } = await supabase
        .from(TABLE)
        .upsert(row, { onConflict: 'key,tenant_id' });
      if (error) console.warn('[db] set error (tenant):', key, error.message);
    } else {
      const userId = await getUserId();
      if (userId) row.user_id = userId;
      const { error } = await supabase
        .from(TABLE)
        .upsert(row, { onConflict: 'key' });
      if (error) console.warn('[db] set error (legacy):', key, error.message);
    }
  } catch (e) {
    console.warn('[db] set exception:', key, e);
  }
}

// ── Migra rows legadas (user_id) para um tenant ───────────────────────────────
export async function migrateUserDataToTenant(
  userId: string,
  tenantId: string,
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from(TABLE)
      .select('key')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (existing && existing.length > 0) {
      console.info('[db] Dados já migrados para tenant:', tenantId);
      return;
    }

    const { error } = await supabase
      .from(TABLE)
      .update({ tenant_id: tenantId })
      .eq('user_id', userId)
      .is('tenant_id', null);

    if (error) console.warn('[db] migrateUserDataToTenant error:', error.message);
    else console.info('[db] Dados migrados → tenant:', tenantId);
  } catch (e) {
    console.warn('[db] migrateUserDataToTenant exception:', e);
  }
}

// ── Legado: adota rows anônimas no primeiro login ─────────────────────────────
export async function adoptLegacyData(userId: string): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from(TABLE)
      .select('key')
      .eq('user_id', userId)
      .limit(1);

    if (existing && existing.length > 0) return;

    const { error } = await supabase
      .from(TABLE)
      .update({ user_id: userId })
      .is('user_id', null)
      .is('tenant_id', null);

    if (error) console.warn('[db] adoptLegacyData error:', error.message);
    else console.info('[db] Dados legados migrados para user_id:', userId);
  } catch (e) {
    console.warn('[db] adoptLegacyData exception:', e);
  }
}
