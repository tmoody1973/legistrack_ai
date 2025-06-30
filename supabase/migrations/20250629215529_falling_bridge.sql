/*
  # Add Full Text Content to Bills

  1. New Fields
    - `full_text_content` - Stores the complete text content of the bill
    
  2. Changes
    - Add full_text_content TEXT field to bills table
    - Update search_vector trigger to include full text in search
    
  3. Benefits
    - Enables full-text search within bill content
    - Provides complete text for AI analysis
    - Eliminates CORS issues by storing content locally
*/

-- Add full_text_content field to bills table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bills' AND column_name = 'full_text_content'
  ) THEN
    ALTER TABLE bills ADD COLUMN full_text_content TEXT;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bills_has_full_text ON bills((full_text_content IS NOT NULL));

-- Update search vector function to include full text content
CREATE OR REPLACE FUNCTION update_bills_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.short_title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.sponsors::text, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.full_text_content, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;