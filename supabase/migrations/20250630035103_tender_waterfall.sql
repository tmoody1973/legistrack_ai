-- First, ensure the generated_content table has proper structure
DO $$
BEGIN
  -- Check if user_id column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_content' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS on generated_content table
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can view own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can update own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can delete own generated content" ON generated_content;
DROP POLICY IF EXISTS "Public can insert anonymous content" ON generated_content;
DROP POLICY IF EXISTS "Public can view content" ON generated_content;

-- Create comprehensive RLS policies for generated_content

-- Allow authenticated users to insert their own content
CREATE POLICY "Users can insert own generated content" ON generated_content
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow public (unauthenticated) users to insert content without user_id
CREATE POLICY "Public can insert anonymous content" ON generated_content
  FOR INSERT 
  TO public
  WITH CHECK (user_id IS NULL);

-- Allow users to view their own content
CREATE POLICY "Users can view own generated content" ON generated_content
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow public to view content without user_id (anonymous content)
CREATE POLICY "Public can view anonymous content" ON generated_content
  FOR SELECT 
  TO public
  USING (user_id IS NULL);

-- Allow users to update their own content
CREATE POLICY "Users can update own generated content" ON generated_content
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own content
CREATE POLICY "Users can delete own generated content" ON generated_content
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_id ON generated_content(id);
CREATE INDEX IF NOT EXISTS idx_generated_content_type ON generated_content(content_type);
CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status);
CREATE INDEX IF NOT EXISTS idx_generated_content_created_at ON generated_content(created_at);