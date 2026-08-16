-- Phase 1: Database Foundation & Schema for RBAC
-- Run this script in the Supabase SQL Editor.

-- 1. Create the application roles ENUM
CREATE TYPE app_role AS ENUM (
  'citizen', 
  'low_level_officer', 
  'sector_officer', 
  'district_admin'
);

-- 2. Create Jurisdictions Reference Table
-- This helps link officers and citizens to specific areas.
CREATE TABLE jurisdictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district TEXT NOT NULL,
    sector TEXT, -- Can be NULL for district-level entities
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create the User Roles Table
-- Links a Supabase Auth user to an app_role.
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'citizen',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create Officer Profiles
CREATE TABLE officer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    jurisdiction_id UUID REFERENCES jurisdictions(id),
    reports_to UUID REFERENCES auth.users(id), -- Hierarchical reporting
    department TEXT,
    badge_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE officer_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create Citizen Profiles
CREATE TABLE citizen_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    city TEXT,
    district TEXT,
    ward TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE citizen_profiles ENABLE ROW LEVEL SECURITY;

-- Add required columns to existing tables for RLS to work properly
-- Modify citizen_reports to link to the user who created it and the assigned officer
ALTER TABLE citizen_reports 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_officer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES jurisdictions(id);

-- Modify signal_problems (if needed for tracking assignment at a granular level)
ALTER TABLE signal_problems
ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES jurisdictions(id);

-- Optional: Create some initial indices
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_officer_profiles_jurisdiction ON officer_profiles(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_created_by ON citizen_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_assigned_officer ON citizen_reports(assigned_officer_id);
