/*
  # Fix Users Table RLS Policy

  1. Security
    - Add missing INSERT policy for users table
    - Allow authenticated users to insert their own profile data
    - This enables the upsert operation in ProfileSetupModal to work correctly

  The issue was that users could SELECT and UPDATE their own data, but couldn't INSERT
  their initial profile data, causing the upsert operation to fail with RLS violations.
*/

-- Add INSERT policy for users table
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);