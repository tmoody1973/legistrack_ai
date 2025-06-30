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