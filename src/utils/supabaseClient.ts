import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://olkecrtlffoqrttobosg.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sa2VjcnRsZmZvcXJ0dG9ib3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODQ3MjQsImV4cCI6MjA5Nzk2MDcyNH0.tZvhblO6VF33uY1jHVICrWR_NvrNsSH8BpKdocWiGs4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
