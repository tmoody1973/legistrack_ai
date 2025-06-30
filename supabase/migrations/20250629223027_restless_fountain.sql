/*
  # Add Generated Content Table for Video Briefings

  1. New Tables
    - `generated_content` - Store generated content like videos, audio, etc.
    
  2. Changes
    - Add table for storing Tavus video briefings and other generated content
    - Add appropriate indexes for performance
    - Enable RLS with proper policies
*/

-- Create generated_content table if it doesn't exist
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'video', 'audio', 'analysis', 'summary'
  source_type TEXT NOT NULL, -- 'tavus', 'elevenlabs', 'gemini'
  
  -- Generation parameters
  generator TEXT NOT NULL,
  generation_params JSONB DEFAULT '{}'::jsonb,
  
  -- Content storage
  content_url TEXT,
  content_data JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  title TEXT,
  description TEXT,
  duration INTEGER, -- seconds for audio/video
  file_size INTEGER, -- bytes
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  
  -- Usage tracking
  view_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_type ON generated_content(content_type);
CREATE INDEX IF NOT EXISTS idx_generated_content_source ON generated_content(source_type);
CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status);
CREATE INDEX IF NOT EXISTS idx_generated_content_created_at ON generated_content(created_at);

-- Enable RLS on generated_content table
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for generated_content
CREATE POLICY "Users can view own generated content" ON generated_content
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated content" ON generated_content
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated content" ON generated_content
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated content" ON generated_content
  FOR DELETE USING (auth.uid() = user_id);