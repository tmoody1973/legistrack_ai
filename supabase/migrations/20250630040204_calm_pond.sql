-- First, check if the generated_content table exists and add missing columns
DO $$
BEGIN
  -- Add source_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_content' AND column_name = 'source_id'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN source_id TEXT NOT NULL DEFAULT '';
  END IF;

  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_content' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- Update the default value for source_id to remove the default after adding
  ALTER TABLE generated_content ALTER COLUMN source_id DROP DEFAULT;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_generated_content_source ON generated_content(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_id ON generated_content(id);

-- Update RLS policies for generated_content
DROP POLICY IF EXISTS "Public can view anonymous content" ON generated_content;
DROP POLICY IF EXISTS "Public can insert anonymous content" ON generated_content;
DROP POLICY IF EXISTS "Users can view own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can insert own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can update own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can delete own generated content" ON generated_content;

-- Create updated RLS policies
CREATE POLICY "Public can view anonymous content" ON generated_content
    FOR SELECT TO public
    USING (user_id IS NULL);

CREATE POLICY "Public can insert anonymous content" ON generated_content
    FOR INSERT TO public
    WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can view own generated content" ON generated_content
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated content" ON generated_content
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated content" ON generated_content
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated content" ON generated_content
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);