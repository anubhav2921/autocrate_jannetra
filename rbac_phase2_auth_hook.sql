-- Phase 2: JWT Custom Claims Auth Hook
-- Run this script in the Supabase SQL Editor.

-- 1. Create the hook function
-- This function intercepts the JWT creation event and injects the user_role claim
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_role app_role;
BEGIN
  -- Query the user_roles table for the current user
  SELECT role INTO v_role 
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  
  IF v_role IS NOT NULL THEN
    -- Inject the retrieved role into the JWT app_metadata
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role::text));
  ELSE
    -- Default to 'citizen' if no specific role is assigned
    claims := jsonb_set(claims, '{user_role}', '"citizen"');
  END IF;
  
  -- Return the modified event object
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- 2. Grant permissions
-- The hook is executed by the supabase_auth_admin role, so it needs permission
-- to execute the function and read the user_roles table.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;

-- IMPORTANT INSTRUCTIONS:
-- After running this SQL, you MUST manually register the hook in the Supabase Dashboard:
-- 1. Go to Authentication -> Hooks
-- 2. Under 'Custom Access Token (JWT) Hook', select 'Add hook'
-- 3. Select the `public.custom_access_token_hook` function
-- 4. Save the configuration
