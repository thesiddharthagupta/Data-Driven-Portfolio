// Initialize Supabase Client
const { createClient } = supabase;
const _supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
        storage: window.sessionStorage
    }
});

// Helper to get supabase instance
function getSupabase() {
    return _supabase;
}
