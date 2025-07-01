/*
  # Add Bill Tags Table for AI Tagging System

  1. New Tables
    - `bill_tags` - Stores AI-generated tags for bills with confidence scores
    
  2. Changes
    - Create new table for bill tags
    - Add appropriate indexes for performance
    - Enable RLS with proper policies
    
  3. Benefits
    - Enables AI-powered bill tagging based on user interests
    - Supports confidence scoring for relevance ranking
    - Allows user feedback on tag accuracy
*/

-- Create bill_tags table
CREATE TABLE IF NOT EXISTS bill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES bill_subjects(id) ON DELETE CASCADE,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  source TEXT NOT NULL DEFAULT 'AI', -- 'AI', 'manual', 'feedback'
  user_feedback JSONB DEFAULT '{
    "accurate": null,
    "feedback_count": 0,
    "last_feedback": null
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure each bill-subject pair is unique
  UNIQUE(bill_id, subject_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bill_tags_bill_id ON bill_tags(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_tags_subject_id ON bill_tags(subject_id);
CREATE INDEX IF NOT EXISTS idx_bill_tags_confidence ON bill_tags(confidence_score);
CREATE INDEX IF NOT EXISTS idx_bill_tags_source ON bill_tags(source);

-- Enable RLS on bill_tags table
ALTER TABLE bill_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bill_tags
CREATE POLICY "Bill tags are publicly readable" ON bill_tags
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage bill tags" ON bill_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_bill_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at timestamp
CREATE TRIGGER update_bill_tags_updated_at_trigger
  BEFORE UPDATE ON bill_tags
  FOR EACH ROW EXECUTE FUNCTION update_bill_tags_updated_at();