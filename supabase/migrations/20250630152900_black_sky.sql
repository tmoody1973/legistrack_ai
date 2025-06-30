/*
  # Fix Generated Content RLS Policy

  1. Security Updates
    - Add policy to allow public updates of anonymous content
    - This enables authenticated users to "claim" previously anonymous content during upsert operations
    - Maintains security by only allowing updates where user_id is NULL

  2. Changes
    - New UPDATE policy for anonymous content
    - Allows seamless transition from anonymous to authenticated content creation
*/

-- Add policy to allow public updates of anonymous content
-- This enables authenticated users to update content that was created anonymously
CREATE POLICY "Public can update anonymous content" ON generated_content
    FOR UPDATE 
    TO public
    USING (user_id IS NULL);

-- Also add a policy to allow public to update content they can insert
-- This ensures consistency between INSERT and UPDATE permissions for anonymous users
CREATE POLICY "Public can update insertable content" ON generated_content
    FOR UPDATE 
    TO public
    USING (user_id IS NULL)
    WITH CHECK (user_id IS NULL);