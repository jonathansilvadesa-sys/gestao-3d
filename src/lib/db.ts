/**
 * db.ts — Camada de persistência sobre o Supabase.
 *
 * Tabela: app_store
 *   key        TEXT
 *   user_id    UUID (FK → auth.users, nullable durante migração)
 *   value      JSONB
 *   updated_at TIMESTAMPTZ
 *   PRIMARY KEY (user_id, key)
 *
 * Estratégia:
 *   - Fase 1 (sem auth): rows sem user_id, acesso via política anon.
 *   - Fase 3 (com auth): user_id preenchido, RLS filtra por usuário.
 *   - adoptLegacyData(): no primeiro login, "adota" as rows sem user_id.
 */

import { supabase } from '@/lib/supabase';

const TABLE = 'app_store';

// ── Retorna o user_id da sessão atual (null se não autenticado) ────────────────
async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ── Leitura ───────────────────────────────────────────────────────────────────
export async function dbGet<T>(key: string): Promise<T | null> {
  try {
    const userId = await getUserId();

    let query = supabase.from(TABLE).select('value').eq('key', key);

    if (userId) {
      // Usuário autenticado: busca a própria row (user_id = uid)
      query = query.eq('user_id', userId);
    }
    // Sem auth: RLS permite leitura de rows sem user_id

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
    const userId = await getUserId();
    const row: Record<string, unknown> = {
      key,
      value,
      updated_at: new Date().toISOString(),
    };
    if (userId) row.user_id = userId;

    const { error } = await supabase.from(TABLE).upsert(row);
    if (error) console.warn('[db] set error:', key, error.message);
  } catch (e) {
    console.warn('[db] set exception:', key, e);
  }
}

// ── Migração: adota rows legadas (user_id NULL) para o usuário que acabou de entrar ──
export async function adoptLegacyData(userId: string): Promise<void> {
  try {
    // Verifica se já existem rows deste usuário (migração já feita)
    const { data: existing } = await supabase
      .from(TABLE)
      .select('key')
      .eq('user_id', userId)
      .limit(1);

    if (existing && existing.length > 0) return; // já migrado, nada a fazer

    // Atualiza todas as rows sem user_id para este usuário
    const { error } = await supabase
      .from(TABLE)
      .update({ user_id: userId })
      .is('user_id', null);

    if (error) console.warn('[db] adoptLegacyData error:', error.message);
    else console.info('[db] Dados legados migrados para user_id:', userId);
  } catch (e) {
    console.warn('[db] adoptLegacyData exception:', e);
  }
}
