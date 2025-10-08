// assets/js/config.supabase.js
// Thay thế bằng thông tin Supabase của bạn
const supabaseUrl = 'https://tcokskeplxyrokjjusmm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjb2tza2VwbHh5cm9ramp1c21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTEzMDYsImV4cCI6MjA3NDM4NzMwNn0.qtXdDLfaTqUUBql4jTmLieYGOwzNHif-vEMdlAYCiso';

// Khởi tạo và export Supabase client để các script khác có thể dùng
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Đưa client vào global scope để các script khác truy cập dễ dàng
window.supabaseClient = supabase;
