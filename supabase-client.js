const SUPABASE_URL = 'https://iivohetwfssykiuyivne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpdm9oZXR3ZnNzeWtpdXlpdm5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTQxNTMsImV4cCI6MjA5NDY3MDE1M30.f1_XsjyvlVmwXr7vr5nF_cB8pIQHnagRnI3_Qm6ims4';

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
