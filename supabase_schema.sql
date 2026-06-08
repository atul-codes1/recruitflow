-- RecruitFlow Supabase Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobs Table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Applications Table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
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
    parsed_data JSONB,
    status TEXT DEFAULT 'unreviewed',
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

-- Optional: Initial seeded data (Uncomment if needed)
-- INSERT INTO jobs (title, slug, company, department, location, employment_type, description)
-- VALUES ('Senior Frontend Engineer', 'senior-frontend-engineer', 'RecruitFlow HQ', 'Engineering', 'Remote', 'Full-time', 'We are looking for a highly skilled frontend engineer...');
