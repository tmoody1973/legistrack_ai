/*
  # Create Storage Bucket for Audio Files

  1. New Features
    - Create a storage bucket for podcast audio files
    - Set up appropriate RLS policies for the bucket
    
  2. Benefits
    - Enables audio file storage and retrieval
    - Fixes "Bucket not found" errors
    - Provides proper security controls
*/

-- Create the podcast-audios bucket if it doesn't exist
DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  -- Check if the bucket already exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'podcast-audios'
  ) INTO bucket_exists;
  
  -- Create the bucket if it doesn't exist
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('podcast-audios', 'podcast-audios', true);
    
    RAISE NOTICE 'Created podcast-audios bucket';
  ELSE
    RAISE NOTICE 'podcast-audios bucket already exists';
  END IF;
END $$;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for the bucket to avoid conflicts
DROP POLICY IF EXISTS "Public can view audio files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audio files" ON storage.objects;

-- Create RLS policies for the bucket

-- Allow public read access to audio files
CREATE POLICY "Public can view audio files" ON storage.objects
FOR SELECT USING (bucket_id = 'podcast-audios');

-- Allow authenticated users to upload audio files
CREATE POLICY "Authenticated users can upload audio" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'podcast-audios');

-- Allow anonymous users to upload audio files (for anonymous content)
CREATE POLICY "Anonymous users can upload audio" ON storage.objects
FOR INSERT TO anon WITH CHECK (bucket_id = 'podcast-audios');

-- Allow users to update their own audio files
CREATE POLICY "Users can update own audio files" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'podcast-audios' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own audio files
CREATE POLICY "Users can delete own audio files" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'podcast-audios' AND auth.uid()::text = (storage.foldername(name))[1]);