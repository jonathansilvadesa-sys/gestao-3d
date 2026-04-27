import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://mhabdvdupuazoauhagip.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oYWJkdmR1cHVhem9hdWhhZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MDk5MTQsImV4cCI6MjA5MjM4NTkxNH0.AwQqQiZQkEIRRsGYLjKr2XCYOcYgbdIN5M807yFmWB8';

// storageKey versionado: bumpa para 'v2' (etc.) quando precisar
// invalidar TODAS as sessões cacheadas no localStorage dos usuários.
// O hardReset() em utils/hardReset.ts cobre o prefixo 'sb-' inteiro,
// mas usar uma chave própria torna a migração explícita.
const AUTH_STORAGE_KEY = 'gestao3d-auth-v1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storageKey: AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Padrão é 'implicit' em alguns wrappers — PKCE é mais robusto contra
    // problemas de cookie/cache durante o OAuth do Google.
    flowType: 'pkce',
  },
});
