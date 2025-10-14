import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Lấy thông tin từ file _config.yml của Jekyll
const supabaseUrl = 'https://tcokskeplxyrokjjusmm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjb2tza2VwbHh5cm9ramp1c21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTEzMDYsImV4cCI6MjA3NDM4NzMwNn0.qtXdDLfaTqUUBql4jTmLieYGOwzNHif-vEMdlAYCiso';

// Khởi tạo và export client để các file khác có thể dùng
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
