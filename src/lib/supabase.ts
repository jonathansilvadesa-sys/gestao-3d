import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://mhabdvdupuazoauhagip.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oYWJkdmR1cHVhem9hdWhhZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MDk5MTQsImV4cCI6MjA5MjM4NTkxNH0.AwQqQiZQkEIRRsGYLjKr2XCYOcYgbdIN5M807yFmWB8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
