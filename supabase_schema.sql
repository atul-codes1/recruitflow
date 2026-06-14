-- RecruitFlow Supabase Schema (Live Production Sync)
-- This file serves as documentation for the actual schema running in production.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Companies (Multi-Tenant Workspaces)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    subscription_status TEXT DEFAULT 'active',
    storage_provider TEXT,
    storage_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Profiles (RBAC and User Data)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'recruiter')),
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    company TEXT,
    budget TEXT,
    experience TEXT,
    department TEXT,
    location TEXT,
    employment_type TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Resume Files (Deduplication Architecture)
CREATE TABLE resume_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_hash TEXT UNIQUE NOT NULL,
    drive_file_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Applications
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    recruiter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resume_file_id UUID REFERENCES resume_files(id) ON DELETE SET NULL,
    
    candidate_name TEXT NOT NULL,
    candidate_email TEXT,
    candidate_phone TEXT,
    experience_level TEXT,
    experience_years NUMERIC,
    skills JSONB,
    
    resume_filename TEXT,
    drive_file_id TEXT,
    drive_web_url TEXT,
    local_path TEXT,
    file_hash TEXT, -- Inline deduplication fallback
    
    parsed_data JSONB,
    raw_text TEXT,
    embedding vector(768), -- AI Semantic Search Context
    
    status TEXT DEFAULT 'unreviewed',
    ai_status TEXT DEFAULT 'completed', -- Queue Status (queued, uploading, failed, completed)
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to automatically update 'updated_at' on jobs table
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_modtime
BEFORE UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION update_modified_column();
