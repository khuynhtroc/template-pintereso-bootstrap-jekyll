// assets/js/sb-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Đảm bảo URL/KEY đã được nạp từ config.supabase.js trước khi file này chạy. [web:344]
if (!window.__sb) {
  window.__sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}
export const sb = window.__sb;
