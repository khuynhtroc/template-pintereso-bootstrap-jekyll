import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tcokskeplxyrokjjusmm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjb2tza2VwbHh5cm9ramp1c21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTEzMDYsImV4cCI6MjA3NDM4NzMwNn0.qtXdDLfaTqUUBql4jTmLieYGOwzNHif-vEMdlAYCiso';

export const supabase = createClient(supabaseUrl, supabaseKey);
