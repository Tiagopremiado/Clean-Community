import { createClient } from '@supabase/supabase-js';

const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || 'https://obiidydewdwjuckbwjnd.supabase.co';
const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iaWlkeWRld2R3anVja2J3am5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1OTczMzksImV4cCI6MjEwNTE3MzMzOX0.fJnRYqT7nSySEaHPCnOHAf3v7ZlZoXuSd4G0hCCRhAg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
