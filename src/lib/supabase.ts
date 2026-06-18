import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Clean up quotes if present
supabaseUrl = supabaseUrl.replace(/["']/g, '').trim();
if (supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.replace('/rest/v1/', '');
} else if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.replace('/rest/v1', '');
}
supabaseAnonKey = supabaseAnonKey.replace(/["']/g, '').trim();

if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
  console.warn('Supabase URL and Anon Key need to be provided in environment variables.');
}

export const supabase = createClient(
  supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'public-anon-key'
);

