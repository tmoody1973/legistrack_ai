/*
  # Initial Database Schema for LegisTrack AI

  1. New Tables
    - `users` - User profiles and preferences (extends Supabase auth.users)
    - `bills` - Legislative bills cache from Congress.gov and GovTrack
    - `representatives` - Congressional representatives information
    - `user_tracked_bills` - Bills that users are tracking
    - `user_activities` - User activity log for analytics

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Bills and representatives are publicly readable
    - Activity logs are user-specific

  3. Indexes
    - Performance indexes for common queries
    - Full-text search on bills
    - Geographic and political filtering
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- User preferences stored as JSONB for flexibility
    preferences JSONB DEFAULT '{
        "notifications": {
            "frequency": "daily",
            "email": true,
            "push": false
        },
        "interests": [],
        "location": {
            "state": null,
            "district": null,
            "zipCode": null
        },
        "contentTypes": ["text"]
    }'::jsonb,
    
    -- User profile information
    profile JSONB DEFAULT '{
        "demographics": {
            "ageGroup": null,
            "occupation": null
        },
        "civicEngagement": {
            "votingFrequency": null,
            "organizationMemberships": [],
            "issueAdvocacy": []
        }
    }'::jsonb
);

-- Bills table for caching legislative data
CREATE TABLE bills (
    id TEXT PRIMARY KEY, -- Format: {congress}-{type}-{number}
    congress INTEGER NOT NULL,
    bill_type TEXT NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    short_title TEXT,
    
    -- Bill status and timeline
    introduced_date DATE,
    status TEXT,
    latest_action JSONB DEFAULT '{
        "date": null,
        "text": null,
        "actionCode": null
    }'::jsonb,
    
    -- Content and analysis
    summary TEXT,
    ai_analysis JSONB DEFAULT '{
        "generated_at": null,
        "summary": null,
        "keyProvisions": [],
        "impactAssessment": {
            "economic": null,
            "social": null,
            "regional": null,
            "demographic": null
        },
        "passagePrediction": {
            "probability": null,
            "reasoning": null,
            "keyFactors": [],
            "timeline": null
        }
    }'::jsonb,
    
    -- Sponsors and cosponsors
    sponsors JSONB DEFAULT '[]'::jsonb,
    cosponsors_count INTEGER DEFAULT 0,
    
    -- Committee information
    committees JSONB DEFAULT '[]'::jsonb,
    
    -- Subject/topic classification
    subjects JSONB DEFAULT '[]'::jsonb,
    
    -- External references
    congress_url TEXT,
    govtrack_url TEXT,
    govtrack_id INTEGER,
    
    -- Voting information
    voting_data JSONB DEFAULT '{
        "votes": [],
        "vote_count": 0,
        "last_vote_date": null,
        "passage_probability": null
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_synced TIMESTAMPTZ DEFAULT now(),
    
    -- Full text search
    search_vector TSVECTOR
);

-- Representatives table
CREATE TABLE representatives (
    bioguide_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    party TEXT NOT NULL,
    state TEXT NOT NULL,
    district INTEGER, -- NULL for Senators
    chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
    
    -- Contact information
    contact_info JSONB DEFAULT '{
        "office": null,
        "phone": null,
        "email": null,
        "website": null,
        "socialMedia": {
            "twitter": null,
            "facebook": null
        }
    }'::jsonb,
    
    -- Voting and performance data
    voting_record JSONB DEFAULT '{
        "totalVotes": 0,
        "missedVotes": 0,
        "partyUnity": null,
        "recentPositions": []
    }'::jsonb,
    
    -- GovTrack data
    govtrack_id INTEGER,
    govtrack_data JSONB DEFAULT '{
        "ideology_score": null,
        "leadership_score": null,
        "missed_votes_pct": null,
        "votes_with_party_pct": null
    }'::jsonb,
    
    -- Committee memberships
    committees JSONB DEFAULT '[]'::jsonb,
    
    -- External links
    congress_url TEXT,
    govtrack_url TEXT,
    photo_url TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- User bill tracking
CREATE TABLE user_tracked_bills (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bill_id TEXT REFERENCES bills(id) ON DELETE CASCADE,
    tracked_at TIMESTAMPTZ DEFAULT now(),
    
    -- Notification preferences for this specific bill
    notification_settings JSONB DEFAULT '{
        "statusChanges": true,
        "votingUpdates": true,
        "aiInsights": false,
        "majorMilestones": true
    }'::jsonb,
    
    -- User notes and engagement
    user_notes TEXT,
    user_tags JSONB DEFAULT '[]'::jsonb,
    last_viewed TIMESTAMPTZ,
    view_count INTEGER DEFAULT 1,
    
    PRIMARY KEY (user_id, bill_id)
);

-- User activities log
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'view_bill', 'track_bill', 'search', 'contact_rep'
    target_id TEXT, -- Bill ID, Rep ID, etc.
    target_type TEXT, -- 'bill', 'representative', 'search_query'
    
    -- Activity details
    details JSONB DEFAULT '{}'::jsonb,
    session_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_bills_congress ON bills(congress);
CREATE INDEX idx_bills_type ON bills(bill_type);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_introduced_date ON bills(introduced_date);
CREATE INDEX idx_bills_updated_at ON bills(updated_at);
CREATE INDEX idx_bills_subjects ON bills USING GIN(subjects);
CREATE INDEX idx_bills_sponsors ON bills USING GIN(sponsors);
CREATE INDEX idx_bills_search ON bills USING GIN(search_vector);
CREATE INDEX idx_bills_compound_lookup ON bills(congress, bill_type, number);

CREATE INDEX idx_representatives_state ON representatives(state);
CREATE INDEX idx_representatives_chamber ON representatives(chamber);
CREATE INDEX idx_representatives_party ON representatives(party);
CREATE INDEX idx_representatives_district ON representatives(state, district) WHERE chamber = 'house';

CREATE INDEX idx_user_tracked_bills_user_id ON user_tracked_bills(user_id);
CREATE INDEX idx_user_tracked_bills_bill_id ON user_tracked_bills(bill_id);
CREATE INDEX idx_user_tracked_bills_tracked_at ON user_tracked_bills(tracked_at);

CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);

-- Full text search trigger for bills
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

CREATE TRIGGER update_bills_search_vector_trigger
    BEFORE INSERT OR UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_bills_search_vector();

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tracked_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Bills are publicly readable" ON bills
    FOR SELECT USING (true);

CREATE POLICY "Representatives are publicly readable" ON representatives
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own tracking" ON user_tracked_bills
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own activities" ON user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" ON user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();