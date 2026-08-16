-- Phase 3: Row Level Security (RLS) Policies
-- Run this script in the Supabase SQL Editor.

-- Helper function to read the role from the JWT claim
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'user_role';
$$;

-- Enable RLS on core tables
ALTER TABLE citizen_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_problems ENABLE ROW LEVEL SECURITY;

-- ==============================================================
-- Policies for: citizen_reports
-- ==============================================================

-- 1. Citizens: Can INSERT new reports
CREATE POLICY citizen_reports_insert_policy ON citizen_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'citizen' 
    AND created_by = auth.uid()
  );

-- 2. Citizens: Can SELECT only their own reports
CREATE POLICY citizen_reports_select_citizen_policy ON citizen_reports
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'citizen' 
    AND created_by = auth.uid()
  );

-- 3. Low-Level Officers: Can SELECT reports assigned to them
CREATE POLICY citizen_reports_select_llo_policy ON citizen_reports
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'low_level_officer'
    AND assigned_officer_id = auth.uid()
  );

-- 4. Low-Level Officers: Can UPDATE (status/notes only) for assigned reports
-- Note: PostgreSQL RLS doesn't inherently restrict columns in UPDATE, but we restrict WHICH rows they can update.
-- Column-level restrictions are usually handled at the API/PostgREST level or with triggers.
CREATE POLICY citizen_reports_update_llo_policy ON citizen_reports
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'low_level_officer'
    AND assigned_officer_id = auth.uid()
  );

-- 5. Sector Officers: Can SELECT reports within their jurisdiction (sector)
CREATE POLICY citizen_reports_select_sector_policy ON citizen_reports
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'sector_officer'
    AND sector_id IN (
      SELECT jurisdiction_id FROM officer_profiles WHERE user_id = auth.uid()
    )
  );

-- 6. Sector Officers: Can UPDATE reports within their jurisdiction
CREATE POLICY citizen_reports_update_sector_policy ON citizen_reports
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'sector_officer'
    AND sector_id IN (
      SELECT jurisdiction_id FROM officer_profiles WHERE user_id = auth.uid()
    )
  );

-- 7. District Admins: Can SELECT all reports in their district (Analytics / Read-only)
CREATE POLICY citizen_reports_select_district_policy ON citizen_reports
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'district_admin'
    AND district IN (
      SELECT j.district 
      FROM officer_profiles op
      JOIN jurisdictions j ON op.jurisdiction_id = j.id
      WHERE op.user_id = auth.uid()
    )
  );


-- ==============================================================
-- Policies for: signal_problems (AI-aggregated tickets)
-- ==============================================================

-- 1. Citizens: NO ACCESS to signal_problems (implicit by lack of policy for 'citizen' role)

-- 2. Low-Level Officers: Can SELECT assigned signal_problems (assuming assignment by department/ward mapping or explicitly)
-- Assuming signal_problems doesn't currently have an assigned_officer_id. We rely on department/district filtering.
CREATE POLICY signal_problems_select_officer_policy ON signal_problems
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('low_level_officer', 'sector_officer', 'district_admin')
    -- For a robust system, you'd join with the officer's assigned department/district here.
    -- Simplified for now: all officers can read signal_problems. 
    -- We can tighten this based on department later.
  );

-- 3. Officers: Can UPDATE status of signal_problems
CREATE POLICY signal_problems_update_officer_policy ON signal_problems
  FOR UPDATE TO authenticated
  USING (
    get_user_role() IN ('low_level_officer', 'sector_officer', 'district_admin')
  );


-- ==============================================================
-- Policies for: Profiles (officer_profiles, citizen_profiles)
-- ==============================================================

-- Citizens can read and update their own profile
CREATE POLICY citizen_profiles_self_select ON citizen_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY citizen_profiles_self_update ON citizen_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Officers can read and update their own profile
CREATE POLICY officer_profiles_self_select ON officer_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY officer_profiles_self_update ON officer_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- District admins can read all officer profiles in their district
CREATE POLICY officer_profiles_admin_select ON officer_profiles
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'district_admin'
    AND jurisdiction_id IN (
        SELECT id FROM jurisdictions WHERE district = (
            SELECT j.district FROM officer_profiles op JOIN jurisdictions j ON op.jurisdiction_id = j.id WHERE op.user_id = auth.uid()
        )
    )
  );
