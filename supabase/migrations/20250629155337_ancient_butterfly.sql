-- Fix RLS policies for bills table to allow authenticated users to manage bills

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Only system can modify bills" ON bills;
DROP POLICY IF EXISTS "Bills are publicly readable" ON bills;
DROP POLICY IF EXISTS "Authenticated users can manage bills" ON bills;

-- Create new policy that allows authenticated users to insert/update bills
CREATE POLICY "Authenticated users can manage bills" ON bills
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Ensure bills remain publicly readable (recreate after dropping)
CREATE POLICY "Bills are publicly readable" ON bills
    FOR SELECT 
    USING (true);