import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly at startup rather than with a confusing runtime error later.
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy web/.env.example to web/.env.local and fill in your Supabase project values.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);