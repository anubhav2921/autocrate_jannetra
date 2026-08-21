-- social_mentions_schema.sql
-- Run this in your Supabase SQL Editor to create the required table and policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create social_mentions table
CREATE TABLE IF NOT EXISTS social_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL,
    author_username TEXT,
    content TEXT,
    post_url TEXT,
    media_id TEXT UNIQUE,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_social_mentions_platform ON social_mentions(platform);
CREATE INDEX IF NOT EXISTS idx_social_mentions_created_at ON social_mentions(created_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE social_mentions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users (dashboard) to read all mentions
CREATE POLICY social_mentions_select_authenticated_policy ON social_mentions
    FOR SELECT TO authenticated
    USING (true);

-- 4. Enable Realtime (requires supabase_admin role, run in SQL Editor)
-- ALTER PUBLICATION supabase_realtime ADD TABLE social_mentions;
