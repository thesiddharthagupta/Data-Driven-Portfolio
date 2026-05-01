const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Mock browser globals for github-sync.js
global.GITHUB_SYNC_CONFIG = {
    USERNAME: 'thesiddharthagupta',
    TOKEN: ''
};
global.LANG_GRADIENT_MAP = {
    'Python':     'gradient-2',
    'JavaScript': 'gradient-4',
    'TypeScript': 'gradient-4',
    'C':          'gradient-1',
    'C++':        'gradient-5',
    'C#':         'gradient-1',
    'Java':       'gradient-3',
    'HTML':       'gradient-5',
    'CSS':        'gradient-3',
    'Markdown':   'gradient-2',
    'default':    'gradient-1'
};

const supabase = createClient(
    'https://uflybwitdxbjnjmgdydq.supabase.co',
    'sb_publishable_nwAWGDO6npNCPRQ1IubgdA_zk-Rg9-o'
);

global.getSupabase = () => supabase;

// We need a polyfill for fetch since Node 16 doesn't have it globally if they are on an old version,
// but let's assume they are on a new version or we can just mock it.
// Actually Node 18+ has fetch. 

const code = fs.readFileSync('github-sync.js', 'utf8');
eval(code);

async function testSync() {
    console.log("Starting test sync...");
    try {
        const result = await runGitHubSync((msg, pct) => console.log(`[${pct}%] ${msg}`));
        console.log("Sync Result:", result);
    } catch (e) {
        console.error("Sync Error:", e);
    }
}

testSync();
