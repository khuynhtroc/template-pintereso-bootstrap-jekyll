// assets/js/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
  console.error('Missing Supabase URL or ANON KEY');
}
export const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
