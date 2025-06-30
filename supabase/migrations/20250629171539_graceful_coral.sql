/*
  # Fix User Signup RLS Policy Issue

  1. Problem
    - The RLS policy "Users can insert own profile" prevents the handle_new_user trigger from working
    - During signup, auth.uid() is not available in the trigger context
    - This causes "Database error saving new user" with status 500

  2. Solution
    - Remove the INSERT policy that's blocking the trigger
    - Keep SELECT and UPDATE policies for security
    - The handle_new_user function is SECURITY DEFINER so it can safely insert
*/

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Keep the other policies for security
-- (SELECT and UPDATE policies remain unchanged)