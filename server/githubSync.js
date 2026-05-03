const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const _ = require('lodash');

/**
 * GitHub Sync Service
 * Handles fetching repositories, extracting tech stacks, and updating Supabase.
 */
class GitHubSyncService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        this.githubToken = process.env.GITHUB_TOKEN;
        this.username = process.env.GITHUB_USERNAME;
        this.githubApi = axios.create({
            baseURL: 'https://api.github.com',
            headers: {
                Authorization: `token ${this.githubToken}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
    }

    async syncRepositories() {
        console.log(`[${new Date().toISOString()}] Starting GitHub sync for ${this.username}...`);
        
        try {
            // 1. Fetch all repositories
            const repos = await this.fetchAllRepos();
            console.log(`Found ${repos.length} repositories.`);

            // 2. Process repositories in batches of 3 to speed up without hitting rate limits too fast
            const batchSize = 3;
            for (let i = 0; i < repos.length; i += batchSize) {
                const batch = repos.slice(i, i + batchSize);
                await Promise.all(batch.map(repo => this.processRepo(repo)));
            }

            // 3. Update sync status
            await this.updateSyncStatus('success');
            console.log('Sync completed successfully.');
            return { success: true, count: repos.length };

        } catch (error) {
            console.error('Sync failed:', error.message);
            await this.updateSyncStatus('failed', error.message);
            return { success: false, error: error.message };
        }
    }

    async fetchAllRepos() {
        let allRepos = [];
        let page = 1;
        while (true) {
            const response = await this.githubApi.get(`/users/${this.username}/repos`, {
                params: { per_page: 100, page: page, sort: 'updated' }
            });
            if (response.data.length === 0) break;
            allRepos = allRepos.concat(response.data);
            page++;
        }
        return allRepos;
    }

    async processRepo(repo) {
        // Check if project exists and has manual override
        const { data: existingProject } = await this.supabase
            .from('projects')
            .select('manual_override, is_hidden, is_pinned')
            .eq('github_id', repo.id)
            .maybeSingle();

        if (existingProject && existingProject.manual_override) {
            // Only update dynamic fields if manual override is on
            await this.supabase.from('projects').update({
                updated_at: repo.updated_at,
                github_url: repo.html_url,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                languages: await this.getLanguages(repo.name)
            }).eq('github_id', repo.id);
            return;
        }

        // Extract Tech Stack
        const techStack = await this.detectTechStack(repo);
        
        // Fetch README snippet
        const description = repo.description || 'No description provided.';
        
        const projectData = {
            github_id: repo.id,
            title: this.formatTitle(repo.name),
            description: description,
            tech_stack: techStack,
            github_url: repo.html_url,
            homepage_url: repo.homepage,
            updated_at: repo.updated_at,
            languages: await this.getLanguages(repo.name),
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            is_hidden: existingProject ? existingProject.is_hidden : false,
            is_pinned: existingProject ? existingProject.is_pinned : false
        };

        // Upsert project
        const { error } = await this.supabase
            .from('projects')
            .upsert(projectData, { onConflict: 'github_id' });

        if (error) console.error(`Error upserting ${repo.name}:`, error.message);
    }

    async detectTechStack(repo) {
        const stack = new Set();
        
        // 1. Check primary language
        if (repo.language) stack.add(repo.language);

        // 2. Check for key files
        try {
            const { data: files } = await this.githubApi.get(`/repos/${this.username}/${repo.name}/contents`);
            const filenames = files.map(f => f.name);

            if (filenames.includes('package.json')) stack.add('Node.js');
            if (filenames.includes('requirements.txt') || filenames.includes('pyproject.toml')) stack.add('Python');
            if (filenames.includes('pom.xml') || filenames.includes('build.gradle')) stack.add('Java');
            if (filenames.includes('ProjectSettings')) stack.add('Unity');
            if (filenames.includes('index.html')) stack.add('Web');
            if (filenames.includes('docker-compose.yml') || filenames.includes('Dockerfile')) stack.add('Docker');
        } catch (e) {
            // Might be empty or private
        }

        return Array.from(stack).slice(0, 5); // Limit to 5 tags
    }

    async getLanguages(repoName) {
        try {
            const { data } = await this.githubApi.get(`/repos/${this.username}/${repoName}/languages`);
            return Object.keys(data);
        } catch (e) {
            return [];
        }
    }

    formatTitle(name) {
        return name
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async updateSyncStatus(status, error = null) {
        try {
            const { data } = await this.supabase.from('sync_status').select('id').limit(1).maybeSingle();
            const payload = {
                last_sync: new Date(),
                status: status,
                error_message: error
            };

            if (data) {
                await this.supabase.from('sync_status').update(payload).eq('id', data.id);
            } else {
                await this.supabase.from('sync_status').insert({ id: 1, ...payload });
            }
        } catch (e) {
            console.error('Error updating sync status:', e);
        }
    }
}

module.exports = new GitHubSyncService();
