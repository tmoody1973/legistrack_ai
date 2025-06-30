-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Recreate INSERT policy with correct WITH CHECK clause
-- INSERT policies use WITH CHECK, not USING
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Recreate UPDATE policy with both USING and WITH CHECK for completeness
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);