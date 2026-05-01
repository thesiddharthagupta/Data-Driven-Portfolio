const express = require('express');
const router = express.Router();
const githubSync = require('./githubSync');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get Sync Status
router.get('/sync-status', async (req, res) => {
    const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || { status: 'never', last_sync: null });
});

// Trigger Manual Sync
router.post('/sync-now', async (req, res) => {
    // Run in background
    githubSync.syncRepositories()
        .then(result => console.log('Manual sync finished:', result))
        .catch(err => console.error('Manual sync failed:', err));
    
    res.json({ message: 'Sync started in background' });
});

// Get All Projects (Admin View)
router.get('/projects', async (req, res) => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('last_updated', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Update Project
router.patch('/projects/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('projects')
        .update(req.body)
        .eq('id', id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Project updated' });
});

// Delete/Hide Project
router.delete('/projects/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Project deleted' });
});

module.exports = router;
