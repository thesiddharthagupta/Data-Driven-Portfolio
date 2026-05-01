-- ============================================
-- Portfolio Database Migration (Safe / Idempotent)
-- Run this in Supabase SQL Editor.
-- It is safe to run multiple times.
-- ============================================

-- 1. Create projects table if it does not exist
CREATE TABLE IF NOT EXISTS projects (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    github_id        BIGINT UNIQUE NOT NULL,
    title            TEXT NOT NULL,
    description      TEXT,
    tech_stack       TEXT[],
    github_url       TEXT,
    homepage_url     TEXT,
    readme_url       TEXT,
    last_updated     TIMESTAMP WITH TIME ZONE,
    languages        TEXT[],
    stars            INTEGER DEFAULT 0,
    forks            INTEGER DEFAULT 0,
    gradient         TEXT DEFAULT 'gradient-1',
    is_pinned        BOOLEAN DEFAULT false,
    is_hidden        BOOLEAN DEFAULT false,
    manual_override  BOOLEAN DEFAULT false,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Safely add any missing columns (harmless if they already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='is_pinned') THEN
        ALTER TABLE projects ADD COLUMN is_pinned BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='is_hidden') THEN
        ALTER TABLE projects ADD COLUMN is_hidden BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='manual_override') THEN
        ALTER TABLE projects ADD COLUMN manual_override BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='tech_stack') THEN
        ALTER TABLE projects ADD COLUMN tech_stack TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='github_url') THEN
        ALTER TABLE projects ADD COLUMN github_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='homepage_url') THEN
        ALTER TABLE projects ADD COLUMN homepage_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='readme_url') THEN
        ALTER TABLE projects ADD COLUMN readme_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='last_updated') THEN
        ALTER TABLE projects ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='languages') THEN
        ALTER TABLE projects ADD COLUMN languages TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='stars') THEN
        ALTER TABLE projects ADD COLUMN stars INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='forks') THEN
        ALTER TABLE projects ADD COLUMN forks INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='gradient') THEN
        ALTER TABLE projects ADD COLUMN gradient TEXT DEFAULT 'gradient-1';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='github_id') THEN
        ALTER TABLE projects ADD COLUMN github_id BIGINT;
    END IF;
END
$$;

-- 3. Create sync_status table if it does not exist
CREATE TABLE IF NOT EXISTS sync_status (
    id            INTEGER PRIMARY KEY,
    last_sync     TIMESTAMP WITH TIME ZONE,
    status        TEXT,
    error_message TEXT
);

-- 4. Enable Row Level Security
ALTER TABLE projects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- 5. Public read policies (portfolio page can read projects)
DROP POLICY IF EXISTS "projects_public_read"    ON projects;
DROP POLICY IF EXISTS "syncstatus_public_read"  ON sync_status;
CREATE POLICY "projects_public_read"    ON projects    FOR SELECT USING (true);
CREATE POLICY "syncstatus_public_read"  ON sync_status FOR SELECT USING (true);

-- 6. Authenticated (admin) full access
DROP POLICY IF EXISTS "projects_auth_all"    ON projects;
DROP POLICY IF EXISTS "syncstatus_auth_all"  ON sync_status;
CREATE POLICY "projects_auth_all"   ON projects    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "syncstatus_auth_all" ON sync_status FOR ALL USING (auth.role() = 'authenticated');

-- 7. Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for contact messages
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Public can insert contact messages
DROP POLICY IF EXISTS "contact_insert_public" ON contact_messages;
CREATE POLICY "contact_insert_public" ON contact_messages FOR INSERT WITH CHECK (true);

-- Only Admin can read contact messages
DROP POLICY IF EXISTS "contact_read_auth" ON contact_messages;
CREATE POLICY "contact_read_auth" ON contact_messages FOR SELECT USING (auth.role() = 'authenticated');

-- Done! You can verify with:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'projects';
