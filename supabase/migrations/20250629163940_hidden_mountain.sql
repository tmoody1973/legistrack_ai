/*
  # Fix Representatives RLS Policies

  1. Security Updates
    - Add INSERT policy for authenticated users to manage representatives data
    - Add UPDATE policy for authenticated users to manage representatives data
    
  This allows the client-side sync functions to work properly while maintaining security.
*/

-- Add INSERT policy for representatives table
CREATE POLICY "Authenticated users can insert representatives" ON representatives
    FOR INSERT TO authenticated WITH CHECK (true);

-- Add UPDATE policy for representatives table  
CREATE POLICY "Authenticated users can update representatives" ON representatives
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);