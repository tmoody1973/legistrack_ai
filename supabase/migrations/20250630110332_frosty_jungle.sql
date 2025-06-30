/*
  # Add Podcast Overview to Bills

  1. New Fields
    - `podcast_overview` - Stores the AI-generated podcast overview text for a bill
    
  2. Changes
    - Add podcast_overview TEXT field to bills table
    
  3. Benefits
    - Enables podcast-style summaries of bills
    - Provides content for audio features
    - Creates more accessible content formats
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