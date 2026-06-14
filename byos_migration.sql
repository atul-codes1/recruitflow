-- BYOS Migration: Add dynamic storage configuration to companies

-- Add the columns to the companies table with NO default fallback
-- This forces every company to explicitly connect their preferred storage
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS storage_config JSONB DEFAULT '{}'::jsonb;
