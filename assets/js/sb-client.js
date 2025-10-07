// assets/js/sb-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

if (!window.__sb) {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY; ensure config.supabase.js loads first.');
  }
  window.__sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}
export const sb = window.__sb; // dùng chung cho mọi file
