-- Fix the RLS policy issue preventing user signup
-- The problem is that the handle_new_user trigger function can't insert into users table
-- because of the RLS policy requiring auth.uid() = id

-- First, drop the problematic INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Keep the SELECT and UPDATE policies for security
-- These policies remain unchanged to protect user data

-- The handle_new_user function is SECURITY DEFINER so it can safely insert
-- without needing an explicit INSERT policy for the trigger context

-- Add a comment explaining why we're not recreating the INSERT policy
COMMENT ON TABLE users IS 'User profiles with intentionally no INSERT policy. 
The handle_new_user trigger (SECURITY DEFINER) handles insertion without RLS checks.
SELECT and UPDATE policies still protect user data appropriately.';

-- Log the change for audit purposes
DO $$
BEGIN
  RAISE NOTICE 'Removed INSERT policy on users table to fix signup issues. 
  The handle_new_user trigger will now work correctly.';
END $$;