-- Add full_text_url field to bills table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bills' AND column_name = 'full_text_url'
  ) THEN
    ALTER TABLE bills ADD COLUMN full_text_url TEXT;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bills_full_text_url ON bills(full_text_url);

-- Update search vector function to include full text URL
CREATE OR REPLACE FUNCTION update_bills_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.short_title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.sponsors::text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;