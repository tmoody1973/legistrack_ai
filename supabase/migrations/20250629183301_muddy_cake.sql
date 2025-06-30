/*
  # Add Bill Subjects Table and Policy Area Field

  1. New Tables
    - `bill_subjects` - Stores all available legislative subjects and policy areas
    
  2. Schema Updates
    - Add `policy_area` field to bills table
    
  3. Changes
    - Create new table for subject management
    - Add policy area field to bills table
    - Add appropriate indexes for performance
*/

-- Create bill_subjects table to store all available subjects
CREATE TABLE IF NOT EXISTS bill_subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('legislative', 'policy')),
  count INTEGER DEFAULT 0,
  update_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add policy_area field to bills table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bills' AND column_name = 'policy_area'
  ) THEN
    ALTER TABLE bills ADD COLUMN policy_area TEXT;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bill_subjects_type ON bill_subjects(type);
CREATE INDEX IF NOT EXISTS idx_bill_subjects_name ON bill_subjects(name);
CREATE INDEX IF NOT EXISTS idx_bills_policy_area ON bills(policy_area);

-- Enable RLS on bill_subjects table
ALTER TABLE bill_subjects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bill_subjects
CREATE POLICY "Bill subjects are publicly readable" ON bill_subjects
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage bill subjects" ON bill_subjects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);