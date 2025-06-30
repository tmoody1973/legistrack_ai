/*
  # Add Podcast Overview Field to Bills Table

  1. Changes
    - Add `podcast_overview` TEXT field to bills table
    
  2. Benefits
    - Enables storage of podcast-style overviews for bills
    - Provides content for audio generation
    - Persists podcast overviews between sessions
*/

-- Add podcast_overview field to bills table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bills' AND column_name = 'podcast_overview'
  ) THEN
    ALTER TABLE bills ADD COLUMN podcast_overview TEXT;
  END IF;
END $$;