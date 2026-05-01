// Initialize Supabase Client
const { createClient } = supabase;
const _supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Helper to get supabase instance
function getSupabase() {
    return _supabase;
}
