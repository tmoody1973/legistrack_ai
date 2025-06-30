/*
  # Fix generated_content table ID column type

  1. Changes
    - Change `id` column from UUID to TEXT to support Tavus API string IDs
    - Update primary key constraint
    - Preserve existing data if any

  2. Security
    - Maintain existing RLS policies
*/

-- First, drop the existing primary key constraint
ALTER TABLE generated_content DROP CONSTRAINT generated_content_pkey;

-- Change the id column type from UUID to TEXT
ALTER TABLE generated_content ALTER COLUMN id TYPE TEXT;

-- Recreate the primary key constraint
ALTER TABLE generated_content ADD CONSTRAINT generated_content_pkey PRIMARY KEY (id);

-- Update any indexes that reference the id column
DROP INDEX IF EXISTS idx_generated_content_id;
CREATE INDEX idx_generated_content_id ON generated_content(id);