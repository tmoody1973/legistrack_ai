-- Fix representatives table policies to allow authenticated users to manage representatives data

-- Add INSERT policy for representatives table (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'representatives' 
        AND policyname = 'Authenticated users can insert representatives'
    ) THEN
        CREATE POLICY "Authenticated users can insert representatives" ON representatives
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;

-- Add UPDATE policy for representatives table (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'representatives' 
        AND policyname = 'Authenticated users can update representatives'
    ) THEN
        CREATE POLICY "Authenticated users can update representatives" ON representatives
            FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;