/*
  # Fix RLS Policies for Generated Content

  1. Changes
    - Simplify RLS policies for generated_content table
    - Allow all users to read all content
    - Allow authenticated users to write any content
    - Allow anonymous users to write content with null user_id
    
  2. Benefits
    - Fixes permission errors when saving comprehensive analysis
    - Allows authenticated users to update anonymous content
    - Simplifies policy structure for better maintainability
*/

-- Drop all existing policies for generated_content
DROP POLICY IF EXISTS "Public can view anonymous content" ON generated_content;
DROP POLICY IF EXISTS "Public can insert anonymous content" ON generated_content;
DROP POLICY IF EXISTS "Public can update anonymous content" ON generated_content;
DROP POLICY IF EXISTS "Public can update insertable content" ON generated_content;
DROP POLICY IF EXISTS "Users can view own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can insert own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can update own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can delete own generated content" ON generated_content;
DROP POLICY IF EXISTS "Allow all reads" ON generated_content;
DROP POLICY IF EXISTS "Allow authenticated write" ON generated_content;
DROP POLICY IF EXISTS "Allow anonymous write" ON generated_content;

-- Create new simplified policies

-- Allow anyone to read any content
CREATE POLICY "Allow all reads" ON generated_content
    FOR SELECT USING (true);

-- Allow authenticated users to write any content (including claiming anonymous content)
CREATE POLICY "Allow authenticated write" ON generated_content
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anonymous users to write content where user_id is NULL
CREATE POLICY "Allow anonymous write" ON generated_content
    FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);