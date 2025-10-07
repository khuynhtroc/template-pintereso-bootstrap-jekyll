import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
if (!window.__sb) {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY. Ensure config.supabase.js is loaded before sb-client.js');
  }
  window.__sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}
export const sb = window.__sb;
