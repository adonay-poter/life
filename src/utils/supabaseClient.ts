import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const missingSupabaseEnvMessage = 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const createMissingEnvClient = () =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(missingSupabaseEnvMessage);
      }
    }
  ) as ReturnType<typeof createClient>;

export const supabase =
  isSupabaseConfigured
    ? createClient(supabaseUrl!, supabaseAnonKey!)
    : createMissingEnvClient();
