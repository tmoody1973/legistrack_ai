-- Add missing INSERT policy for users table
-- First check if the policy already exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile" ON users
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Update bills table policy to allow authenticated users to manage bills
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Only system can modify bills" ON bills;
DROP POLICY IF EXISTS "Authenticated users can manage bills" ON bills;

-- Create the new policy
CREATE POLICY "Authenticated users can manage bills" ON bills
    FOR ALL TO authenticated USING (true) WITH CHECK (true);