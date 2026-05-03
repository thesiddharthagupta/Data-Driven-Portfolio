// ============================================
// github-sync.js — Client-Side GitHub Sync
// No backend server required.
// Works directly with GitHub API + Supabase.
// ============================================

var GITHUB_SYNC_CONFIG = {
    USERNAME: 'thesiddharthagupta',
    TOKEN: ''
};

var LANG_GRADIENT_MAP = {
    'Python': 'gradient-2',
    'JavaScript': 'gradient-4',
    'TypeScript': 'gradient-4',
    'C': 'gradient-1',
    'C++': 'gradient-5',
    'C#': 'gradient-1',
    'Java': 'gradient-3',
    'HTML': 'gradient-5',
    'CSS': 'gradient-3',
    'Markdown': 'gradient-2',
    'default': 'gradient-1'
};

// Set GitHub credentials at runtime
function setGitHubCredentials(username, token) {
    if (username) GITHUB_SYNC_CONFIG.USERNAME = username;
    if (token) GITHUB_SYNC_CONFIG.TOKEN = token;
}

// Format repo name: "my-cool-repo" -> "My Cool Repo"
function formatRepoTitle(name) {
    return name.replace(/[-_]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

// Build GitHub API headers
function buildHeaders() {
    var h = { 'Accept': 'application/vnd.github.v3+json' };
    if (GITHUB_SYNC_CONFIG.TOKEN) {
        h['Authorization'] = 'token ' + GITHUB_SYNC_CONFIG.TOKEN;
    }
    return h;
}

// Fetch all repos (handles pagination)
async function fetchAllRepos() {
    var username = GITHUB_SYNC_CONFIG.USERNAME;
    var headers = buildHeaders();
    var allRepos = [];
    var page = 1;

    while (true) {
        var res = await fetch(
            'https://api.github.com/users/' + username + '/repos?per_page=100&page=' + page + '&sort=updated',
            { headers: headers }
        );
        if (!res.ok) {
            var err = await res.json().catch(function () { return {}; });
            if (res.status === 403 || (err.message && err.message.includes('rate limit'))) {
                throw new Error('GitHub API Rate Limit Reached! To fix this, please enter a Personal Access Token in the GitHub Sync settings above. This token is only stored in your browser.');
            }
            throw new Error(err.message || 'GitHub API error ' + res.status + '. If rate limited, add a Personal Access Token in the Sync section.');
        }
        var batch = await res.json();
        if (!batch || batch.length === 0) break;
        allRepos = allRepos.concat(batch);
        page++;
        if (batch.length < 100) break;
    }
    return allRepos;
}

// Detect tech stack by inspecting repo root files
async function detectTechStack(repoName) {
    var username = GITHUB_SYNC_CONFIG.USERNAME;
    var headers = buildHeaders();
    var stack = [];

    try {
        var res = await fetch(
            'https://api.github.com/repos/' + username + '/' + repoName + '/contents',
            { headers: headers }
        );
        if (!res.ok) return stack;

        var files = await res.json();
        if (!Array.isArray(files)) return stack;

        var names = files.map(function (f) { return f.name; });

        if (names.indexOf('package.json') >= 0) stack.push('Node.js');
        if (names.indexOf('requirements.txt') >= 0 ||
            names.indexOf('pyproject.toml') >= 0) stack.push('Python');
        if (names.indexOf('pom.xml') >= 0 ||
            names.indexOf('build.gradle') >= 0) stack.push('Java');
        if (names.some(function (n) { return n.endsWith('.csproj'); }) ||
            names.indexOf('ProjectSettings') >= 0) stack.push('Unity/C#');
        if (names.some(function (n) { return n.endsWith('.html'); })) stack.push('Web');
        if (names.indexOf('Dockerfile') >= 0 ||
            names.indexOf('docker-compose.yml') >= 0) stack.push('Docker');
    } catch (e) {
        // ignore — empty or inaccessible repo
    }
    return stack.slice(0, 5);
}

// Fetch languages used in a repo
async function fetchRepoLanguages(repoName) {
    var username = GITHUB_SYNC_CONFIG.USERNAME;
    var headers = buildHeaders();
    try {
        var res = await fetch(
            'https://api.github.com/repos/' + username + '/' + repoName + '/languages',
            { headers: headers }
        );
        if (!res.ok) return [];
        var data = await res.json();
        return Object.keys(data);
    } catch (e) {
        return [];
    }
}

// Save sync status to Supabase
async function saveSyncStatus(status, errorMessage) {
    var supabase = getSupabase();
    try {
        const { data: existing } = await supabase.from('sync_status').select('id').limit(1).maybeSingle();
        const payload = {
            last_sync: new Date().toISOString(),
            status: status,
            error_message: errorMessage || null
        };

        if (existing) {
            await supabase.from('sync_status').update(payload).eq('id', existing.id);
        } else {
            await supabase.from('sync_status').insert({ id: 1, ...payload });
        }
    } catch (e) {
        console.error('Error saving sync status:', e);
    }
}

// Read sync status from Supabase
async function getSyncStatus() {
    var supabase = getSupabase();
    var result = await supabase
        .from('sync_status')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
    return result.data || { status: 'never', last_sync: null };
}

// Main sync function — called from admin panel
async function runGitHubSync(onProgress) {
    var supabase = getSupabase();
    var username = GITHUB_SYNC_CONFIG.USERNAME;

    if (!username) throw new Error('GitHub username is not set.');

    onProgress && onProgress('Connecting to GitHub...', 5);

    // 1. Fetch all repos
    var repos;
    try {
        repos = await fetchAllRepos();
    } catch (e) {
        await saveSyncStatus('failed', e.message);
        throw e;
    }

    onProgress && onProgress('Found ' + repos.length + ' repositories. Processing...', 15);

    var synced = 0;
    var errors = [];

    for (var i = 0; i < repos.length; i++) {
        var repo = repos[i];
        var pct = 15 + Math.round((i / repos.length) * 80);
        onProgress && onProgress('Syncing: ' + repo.name + ' (' + (i + 1) + '/' + repos.length + ')', pct);

        try {
            // Check for existing project with manual override
            var existResult = await supabase
                .from('projects')
                .select('id, title, description, manual_override, display_order, is_featured, updated_at, language, tech_stack, languages')
                .eq('github_id', repo.id)
                .maybeSingle();
            var existing = existResult.data;

            var languages = existing ? (existing.languages || []) : [];
            var techStack = existing ? existing.tech_stack : undefined;
            var mainLanguage = existing ? existing.language : (repo.language || 'Unknown');

            // Fetch metadata ONLY if repo has been updated or is new (to save rate limits)
            if (!existing || existing.updated_at !== repo.updated_at) {
                if (!existing || !existing.manual_override) {
                    languages = await fetchRepoLanguages(repo.name);
                    mainLanguage = languages.length > 0 ? languages[0] : (repo.language || 'Unknown');
                    techStack = await detectTechStack(repo.name);

                    // Merge language into tech stack
                    if (techStack !== undefined && mainLanguage !== 'Unknown' && techStack.indexOf(mainLanguage) < 0) {
                        techStack.unshift(mainLanguage);
                        techStack = techStack.slice(0, 5);
                    }
                }
            }

            var payload = {
                github_id: repo.id,
                title: existing && existing.manual_override ? existing.title : formatRepoTitle(repo.name),
                description: existing && existing.manual_override ? existing.description : (repo.description || 'No description provided.'),
                github_url: repo.html_url,
                link: repo.homepage || null,
                updated_at: repo.updated_at,
                language: mainLanguage,
                languages: languages,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                is_github: true,
                display_order: existing ? existing.display_order : 0,
                is_featured: existing ? existing.is_featured : false,
                manual_override: existing ? existing.manual_override : false,
                gradient: LANG_GRADIENT_MAP[repo.language] || LANG_GRADIENT_MAP['default']
            };

            if (techStack !== undefined) payload.tech_stack = techStack;

            if (existing) {
                var updateResult = await supabase
                    .from('projects')
                    .update(payload)
                    .eq('github_id', repo.id);

                if (updateResult.error) {
                    errors.push(repo.name + ': ' + updateResult.error.message);
                } else {
                    synced++;
                }
            } else {
                var insertResult = await supabase
                    .from('projects')
                    .insert(payload);

                if (insertResult.error) {
                    errors.push(repo.name + ': ' + insertResult.error.message);
                } else {
                    synced++;
                }
            }

        } catch (e) {
            errors.push(repo.name + ': ' + e.message);
        }
    }

    var finalStatus = errors.length === 0 ? 'success' : (synced > 0 ? 'partial' : 'failed');
    await saveSyncStatus(finalStatus, errors.slice(0, 5).join('; ') || null);

    onProgress && onProgress('Done! ' + synced + ' of ' + repos.length + ' repos synced.', 100);

    return { synced: synced, total: repos.length, errors: errors };
}


