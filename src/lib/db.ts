/**
 * db.ts — Camada de persistência sobre o Supabase.
 *
 * Tabela: app_store
 *   key        TEXT PRIMARY KEY
 *   value      JSONB
 *   updated_at TIMESTAMPTZ
 *
 * Estratégia de migração:
 *   - Primeira vez: copia dados do localStorage para o Supabase.
 *   - Depois: Supabase é a fonte da verdade; localStorage é cache para offline.
 *   - Escrita: síncrona no localStorage + fire-and-forget no Supabase.
 */

import { supabase } from '@/lib/supabase';

const TABLE = 'app_store';

// ── Leitura ───────────────────────────────────────────────────────────────────
export async function dbGet<T>(key: string): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();

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
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) console.warn('[db] set error:', key, error.message);
  } catch (e) {
    console.warn('[db] set exception:', key, e);
  }
}

// ── Remoção ───────────────────────────────────────────────────────────────────
export async function dbDelete(key: string): Promise<void> {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('key', key);
    if (error) console.warn('[db] delete error:', key, error.message);
  } catch (e) {
    console.warn('[db] delete exception:', key, e);
  }
}
