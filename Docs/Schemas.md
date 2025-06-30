# Database Schemas - LegisTrack AI
## Complete Database Design & Type Definitions

---

## Database Schema Overview

The LegisTrack AI database uses PostgreSQL (via Supabase) with JSONB fields for flexible data storage and comprehensive indexes for performance optimization. The schema integrates data from both Congress.gov and GovTrack.us for comprehensive legislative tracking.

---

## Core Tables

### 1. Users Table

```sql
-- Users table for authentication and profile management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
            "push": false,
            "sms": false
        },
        "interests": [],
        "location": {
            "state": null,
            "district": null,
            "zipCode": null
        },
        "contentTypes": ["text"],
        "politicalBalance": "neutral"
    }'::jsonb,
    
    -- User profile information
    profile JSONB DEFAULT '{
        "demographics": {
            "ageGroup": null,
            "occupation": null,
            "incomeLevel": null
        },
        "civicEngagement": {
            "votingFrequency": null,
            "organizationMemberships": [],
            "issueAdvocacy": []
        }
    }'::jsonb,
    
    -- Engagement tracking
    engagement_stats JSONB DEFAULT '{
        "billsViewed": 0,
        "billsTracked": 0,
        "searchesPerformed": 0,
        "representativesContacted": 0,
        "contentShared": 0,
        "timeOnPlatform": 0
    }'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login);
CREATE INDEX idx_users_preferences_location ON users USING GIN((preferences->'location'));

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);
```

### 2. Bills Table (Legislative Data Cache)

```sql
-- Bills table for caching legislative data from Congress.gov and GovTrack
CREATE TABLE bills (
    id TEXT PRIMARY KEY, -- Format: {congress}-{type}-{number}
    congress INTEGER NOT NULL,
    bill_type TEXT NOT NULL, -- HR, S, HJRES, SJRES, HCONRES, SCONRES, HRES, SRES
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    short_title TEXT,
    official_title TEXT,
    
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
    cosponsors JSONB DEFAULT '[]'::jsonb,
    
    -- Committee information
    committees JSONB DEFAULT '[]'::jsonb,
    
    -- Subject/topic classification
    subjects JSONB DEFAULT '[]'::jsonb,
    policy_areas JSONB DEFAULT '[]'::jsonb,
    
    -- External references
    congress_url TEXT,
    govtrack_url TEXT,
    govtrack_id INTEGER, -- GovTrack bill ID
    
    -- GovTrack-specific data
    govtrack_data JSONB DEFAULT '{
        "prognosis": {
            "prediction": null,
            "factors": []
        },
        "sponsor_analysis": {
            "ideology_score": null,
            "leadership_score": null
        },
        "bill_type_display": null,
        "is_alive": true,
        "docs_house_gov_postdate": null,
        "docs_senate_gov_postdate": null
    }'::jsonb,
    
    -- Voting information from GovTrack
    voting_data JSONB DEFAULT '{
        "votes": [],
        "vote_count": 0,
        "last_vote_date": null,
        "passage_probability": null,
        "vote_summary": {
            "house": null,
            "senate": null
        }
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_synced TIMESTAMPTZ DEFAULT now(),
    
    -- Full text search
    search_vector TSVECTOR
);

-- Indexes for performance
CREATE INDEX idx_bills_congress ON bills(congress);
CREATE INDEX idx_bills_type ON bills(bill_type);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_introduced_date ON bills(introduced_date);
CREATE INDEX idx_bills_updated_at ON bills(updated_at);
CREATE INDEX idx_bills_subjects ON bills USING GIN(subjects);
CREATE INDEX idx_bills_sponsors ON bills USING GIN(sponsors);
CREATE INDEX idx_bills_committees ON bills USING GIN(committees);
CREATE INDEX idx_bills_search ON bills USING GIN(search_vector);
CREATE INDEX idx_bills_compound_lookup ON bills(congress, bill_type, number);
CREATE INDEX idx_bills_govtrack_id ON bills(govtrack_id);

-- Full text search trigger
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
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bills are publicly readable" ON bills
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage bills" ON bills
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 3. Representatives Table

```sql
-- Cache for congressional representatives with GovTrack integration
CREATE TABLE representatives (
    bioguide_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    suffix TEXT,
    nickname TEXT,
    
    -- Political affiliation
    party TEXT NOT NULL, -- D, R, I, etc.
    party_full_name TEXT,
    
    -- Geographic representation
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
            "facebook": null,
            "youtube": null
        }
    }'::jsonb,
    
    -- Service information
    terms JSONB DEFAULT '[]'::jsonb,
    current_term JSONB DEFAULT '{
        "start": null,
        "end": null,
        "office": null
    }'::jsonb,
    
    -- Voting and performance data
    voting_record JSONB DEFAULT '{
        "totalVotes": 0,
        "missedVotes": 0,
        "partyUnity": null,
        "recentPositions": []
    }'::jsonb,
    
    -- GovTrack-specific data
    govtrack_id INTEGER,
    govtrack_data JSONB DEFAULT '{
        "ideology_score": null,
        "leadership_score": null,
        "missed_votes_pct": null,
        "votes_with_party_pct": null,
        "bills_sponsored": 0,
        "bills_cosponsored": 0,
        "committees": [],
        "roles": []
    }'::jsonb,
    
    -- Biographical information
    biography JSONB DEFAULT '{
        "birthDate": null,
        "birthPlace": null,
        "education": [],
        "profession": null,
        "previousOffices": []
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
    last_synced TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_representatives_state ON representatives(state);
CREATE INDEX idx_representatives_chamber ON representatives(chamber);
CREATE INDEX idx_representatives_party ON representatives(party);
CREATE INDEX idx_representatives_district ON representatives(state, district) WHERE chamber = 'house';
CREATE INDEX idx_representatives_name ON representatives(last_name, first_name);
CREATE INDEX idx_representatives_govtrack_id ON representatives(govtrack_id);

-- Row Level Security
ALTER TABLE representatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Representatives are publicly readable" ON representatives
    FOR SELECT USING (true);
```

### 4. Votes Table (GovTrack Voting Data)

```sql
-- Store individual votes from GovTrack
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    govtrack_vote_id INTEGER UNIQUE NOT NULL,
    congress INTEGER NOT NULL,
    session TEXT NOT NULL,
    chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
    number INTEGER NOT NULL,
    
    -- Vote details
    question TEXT NOT NULL,
    question_details TEXT,
    vote_type TEXT, -- passage, amendment, procedural, etc.
    category TEXT,
    
    -- Timing
    created TIMESTAMPTZ NOT NULL,
    updated TIMESTAMPTZ,
    
    -- Results
    result TEXT, -- Passed, Failed, etc.
    result_text TEXT,
    
    -- Vote counts
    total_votes INTEGER DEFAULT 0,
    total_plus INTEGER DEFAULT 0, -- Yes votes
    total_minus INTEGER DEFAULT 0, -- No votes
    total_other INTEGER DEFAULT 0, -- Present, Not Voting
    
    -- Related legislation
    related_bill_id TEXT REFERENCES bills(id),
    related_amendment_id INTEGER,
    
    -- Vote breakdown by party
    vote_breakdown JSONB DEFAULT '{
        "Democratic": {"yes": 0, "no": 0, "other": 0},
        "Republican": {"yes": 0, "no": 0, "other": 0},
        "Independent": {"yes": 0, "no": 0, "other": 0}
    }'::jsonb,
    
    -- External references
    govtrack_url TEXT,
    source_url TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_votes_congress ON votes(congress);
CREATE INDEX idx_votes_chamber ON votes(chamber);
CREATE INDEX idx_votes_created ON votes(created);
CREATE INDEX idx_votes_related_bill ON votes(related_bill_id);
CREATE INDEX idx_votes_govtrack_id ON votes(govtrack_vote_id);

-- Row Level Security
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are publicly readable" ON votes
    FOR SELECT USING (true);
```

### 5. Vote Positions Table

```sql
-- Individual representative positions on votes
CREATE TABLE vote_positions (
    id SERIAL PRIMARY KEY,
    vote_id INTEGER REFERENCES votes(id) ON DELETE CASCADE,
    representative_bioguide_id TEXT REFERENCES representatives(bioguide_id),
    govtrack_person_id INTEGER,
    
    -- Vote position
    option TEXT NOT NULL, -- +, -, P (present), 0 (not voting)
    option_text TEXT, -- Yea, Nay, Present, Not Voting
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(vote_id, representative_bioguide_id)
);

-- Indexes
CREATE INDEX idx_vote_positions_vote_id ON vote_positions(vote_id);
CREATE INDEX idx_vote_positions_rep_id ON vote_positions(representative_bioguide_id);
CREATE INDEX idx_vote_positions_option ON vote_positions(option);

-- Row Level Security
ALTER TABLE vote_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vote positions are publicly readable" ON vote_positions
    FOR SELECT USING (true);
```

### 6. User Bill Tracking

```sql
-- Track which bills users are following
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
    
    -- User notes and tags
    user_notes TEXT,
    user_tags JSONB DEFAULT '[]'::jsonb,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    
    -- Engagement tracking
    last_viewed TIMESTAMPTZ,
    view_count INTEGER DEFAULT 1,
    
    PRIMARY KEY (user_id, bill_id)
);

-- Indexes
CREATE INDEX idx_user_tracked_bills_user_id ON user_tracked_bills(user_id);
CREATE INDEX idx_user_tracked_bills_bill_id ON user_tracked_bills(bill_id);
CREATE INDEX idx_user_tracked_bills_tracked_at ON user_tracked_bills(tracked_at);

-- Row Level Security
ALTER TABLE user_tracked_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tracking" ON user_tracked_bills
    FOR ALL USING (auth.uid() = user_id);
```

### 7. User Activities Log

```sql
-- Track user activities for analytics and personalization
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'view_bill', 'track_bill', 'search', 'contact_rep', 'share'
    target_id TEXT, -- Bill ID, Rep ID, etc.
    target_type TEXT, -- 'bill', 'representative', 'search_query'
    
    -- Activity details
    details JSONB DEFAULT '{}'::jsonb,
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_target ON user_activities(target_type, target_id);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);

-- Automatic cleanup (keep 1 year of data)
SELECT cron.schedule(
    'cleanup-user-activities',
    '0 2 * * 0', -- Weekly at 2 AM
    'DELETE FROM user_activities WHERE created_at < now() - interval ''1 year'';'
);

-- Row Level Security
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" ON user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" ON user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 8. Generated Content Cache

```sql
-- Cache for AI-generated content (videos, audio, analysis)
CREATE TABLE generated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL, -- 'video', 'audio', 'analysis', 'summary'
    source_type TEXT NOT NULL, -- 'bill', 'representative', 'topic'
    source_id TEXT NOT NULL,
    
    -- Generation parameters
    generator TEXT NOT NULL, -- 'tavus', 'elevenlabs', 'gemini'
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
    status TEXT DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
    error_message TEXT,
    
    -- Usage tracking
    view_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_generated_content_source ON generated_content(source_type, source_id);
CREATE INDEX idx_generated_content_type ON generated_content(content_type);
CREATE INDEX idx_generated_content_status ON generated_content(status);
CREATE INDEX idx_generated_content_expires_at ON generated_content(expires_at);

-- Automatic cleanup of expired content
SELECT cron.schedule(
    'cleanup-expired-content',
    '0 3 * * *', -- Daily at 3 AM
    'DELETE FROM generated_content WHERE expires_at < now();'
);
```

### 9. System Configuration

```sql
-- System configuration and feature flags
CREATE TABLE system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES users(id)
);

-- Insert default configuration
INSERT INTO system_config (key, value, description) VALUES
('feature_flags', '{
    "ai_analysis": true,
    "video_briefings": true,
    "audio_summaries": true,
    "bill_comparison": true,
    "govtrack_integration": true,
    "predictive_analytics": false,
    "social_features": false
}'::jsonb, 'Feature toggles for the application'),

('api_limits', '{
    "congress_api_per_hour": 1000,
    "govtrack_api_per_hour": 3600,
    "gemini_tokens_per_day": 50000,
    "tavus_videos_per_day": 100,
    "elevenlabs_characters_per_day": 10000
}'::jsonb, 'API usage limits and quotas'),

('content_settings', '{
    "max_tracked_bills_free": 10,
    "max_tracked_bills_premium": 100,
    "ai_analysis_cache_hours": 24,
    "video_briefing_cache_days": 7,
    "vote_data_sync_hours": 6
}'::jsonb, 'Content and caching settings');
```

---

## TypeScript Type Definitions

### Core Types

```typescript
// User types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
  preferences: UserPreferences;
  profile: UserProfile;
  engagement_stats: EngagementStats;
}

export interface UserPreferences {
  notifications: {
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  interests: string[];
  location: {
    state?: string;
    district?: number;
    zipCode?: string;
  };
  contentTypes: ('text' | 'audio' | 'video')[];
  politicalBalance: 'neutral' | 'conservative' | 'liberal';
}

export interface UserProfile {
  demographics: {
    ageGroup?: string;
    occupation?: string;
    incomeLevel?: string;
  };
  civicEngagement: {
    votingFrequency?: string;
    organizationMemberships: string[];
    issueAdvocacy: string[];
  };
}

export interface EngagementStats {
  billsViewed: number;
  billsTracked: number;
  searchesPerformed: number;
  representativesContacted: number;
  contentShared: number;
  timeOnPlatform: number;
}

// Bill types
export interface Bill {
  id: string;
  congress: number;
  bill_type: string;
  number: number;
  title: string;
  short_title?: string;
  official_title?: string;
  introduced_date?: string;
  status?: string;
  latest_action: BillAction;
  summary?: string;
  ai_analysis?: AIAnalysis;
  sponsors: Sponsor[];
  cosponsors_count: number;
  cosponsors: Sponsor[];
  committees: Committee[];
  subjects: string[];
  policy_areas: string[];
  congress_url?: string;
  govtrack_url?: string;
  govtrack_id?: number;
  govtrack_data: GovTrackBillData;
  voting_data: VotingData;
  created_at: string;
  updated_at: string;
  last_synced: string;
}

export interface BillAction {
  date?: string;
  text?: string;
  actionCode?: string;
}

export interface AIAnalysis {
  generated_at?: string;
  summary?: string;
  keyProvisions: string[];
  impactAssessment: {
    economic?: string;
    social?: string;
    regional?: string;
    demographic?: string;
  };
  passagePrediction: {
    probability?: number;
    reasoning?: string;
    keyFactors: string[];
    timeline?: string;
  };
}

export interface GovTrackBillData {
  prognosis: {
    prediction?: number;
    factors: string[];
  };
  sponsor_analysis: {
    ideology_score?: number;
    leadership_score?: number;
  };
  bill_type_display?: string;
  is_alive: boolean;
  docs_house_gov_postdate?: string;
  docs_senate_gov_postdate?: string;
}

export interface VotingData {
  votes: Vote[];
  vote_count: number;
  last_vote_date?: string;
  passage_probability?: number;
  vote_summary: {
    house?: VoteSummary;
    senate?: VoteSummary;
  };
}

export interface Vote {
  id: number;
  govtrack_vote_id: number;
  congress: number;
  chamber: 'house' | 'senate';
  question: string;
  created: string;
  result: string;
  total_votes: number;
  total_plus: number;
  total_minus: number;
  total_other: number;
  vote_breakdown: VoteBreakdown;
  govtrack_url?: string;
}

export interface VoteBreakdown {
  Democratic: { yes: number; no: number; other: number };
  Republican: { yes: number; no: number; other: number };
  Independent: { yes: number; no: number; other: number };
}

export interface VoteSummary {
  result: string;
  date: string;
  vote_count: number;
}

export interface Sponsor {
  bioguide_id: string;
  full_name: string;
  party: string;
  state: string;
  district?: number;
}

export interface Committee {
  name: string;
  chamber: 'house' | 'senate';
  url?: string;
}

// Representative types
export interface Representative {
  bioguide_id: string;
  full_name: string;
  first_name?: string;
  last_name: string;
  suffix?: string;
  nickname?: string;
  party: string;
  party_full_name?: string;
  state: string;
  district?: number;
  chamber: 'house' | 'senate';
  contact_info: ContactInfo;
  terms: Term[];
  current_term: Term;
  voting_record: VotingRecord;
  govtrack_id?: number;
  govtrack_data: GovTrackRepData;
  biography: Biography;
  committees: CommitteeMembership[];
  congress_url?: string;
  govtrack_url?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  last_synced: string;
  is_active: boolean;
}

export interface ContactInfo {
  office?: string;
  phone?: string;
  email?: string;
  website?: string;
  socialMedia: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
  };
}

export interface Term {
  start?: string;
  end?: string;
  office?: string;
}

export interface VotingRecord {
  totalVotes: number;
  missedVotes: number;
  partyUnity?: number;
  recentPositions: VotePosition[];
}

export interface GovTrackRepData {
  ideology_score?: number;
  leadership_score?: number;
  missed_votes_pct?: number;
  votes_with_party_pct?: number;
  bills_sponsored: number;
  bills_cosponsored: number;
  committees: GovTrackCommittee[];
  roles: GovTrackRole[];
}

export interface GovTrackCommittee {
  committee: string;
  role: string;
  subcommittees: string[];
}

export interface GovTrackRole {
  role_type: string;
  startdate: string;
  enddate?: string;
  party: string;
  state: string;
  district?: number;
}

export interface VotePosition {
  vote_id: number;
  bill_id?: string;
  option: string;
  option_text: string;
  date: string;
  question: string;
}

export interface Biography {
  birthDate?: string;
  birthPlace?: string;
  education: string[];
  profession?: string;
  previousOffices: string[];
}

export interface CommitteeMembership {
  name: string;
  role: string;
  chamber: 'house' | 'senate';
}

// Tracking types
export interface TrackedBill {
  user_id: string;
  bill_id: string;
  tracked_at: string;
  notification_settings: {
    statusChanges: boolean;
    votingUpdates: boolean;
    aiInsights: boolean;
    majorMilestones: boolean;
  };
  user_notes?: string;
  user_tags: string[];
  user_rating?: number;
  last_viewed?: string;
  view_count: number;
}

// Activity types
export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: 'view_bill' | 'track_bill' | 'search' | 'contact_rep' | 'share';
  target_id?: string;
  target_type?: 'bill' | 'representative' | 'search_query';
  details: Record<string, any>;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Generated content types
export interface GeneratedContent {
  id: string;
  content_type: 'video' | 'audio' | 'analysis' | 'summary';
  source_type: 'bill' | 'representative' | 'topic';
  source_id: string;
  generator: 'tavus' | 'elevenlabs' | 'gemini';
  generation_params: Record<string, any>;
  content_url?: string;
  content_data: Record<string, any>;
  title?: string;
  description?: string;
  duration?: number;
  file_size?: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error_message?: string;
  view_count: number;
  last_accessed?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Search and filter types
export interface BillSearchParams {
  query?: string;
  congress?: number;
  bill_type?: string;
  status?: string;
  sponsor_state?: string;
  sponsor_party?: string;
  subjects?: string[];
  introduced_after?: string;
  introduced_before?: string;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'date' | 'title' | 'status';
  order?: 'asc' | 'desc';
}

export interface BillFilters {
  congress: number[];
  types: string[];
  statuses: string[];
  subjects: string[];
  sponsors: {
    states: string[];
    parties: string[];
  };
  dateRange: {
    start?: string;
    end?: string;
  };
}

// GovTrack-specific types
export interface GovTrackBill {
  id: number;
  congress: number;
  bill_type: string;
  number: number;
  title: string;
  link: string;
  sponsor?: GovTrackPerson;
  prognosis?: {
    prediction: number;
    factors: string[];
  };
  votes: GovTrackVote[];
  vote_count: number;
  last_vote_date?: string;
}

export interface GovTrackPerson {
  id: number;
  name: string;
  party: string;
  state: string;
  district?: number;
  ideology_score?: number;
  leadership_score?: number;
}

export interface GovTrackVote {
  id: number;
  congress: number;
  session: string;
  chamber: string;
  number: number;
  question: string;
  created: string;
  result: string;
  total_votes: number;
  total_plus: number;
  total_minus: number;
  total_other: number;
  link: string;
}
```

### Database Functions

```sql
-- Function to get user's representatives based on location
CREATE OR REPLACE FUNCTION get_user_representatives(user_id UUID)
RETURNS TABLE(
    bioguide_id TEXT,
    full_name TEXT,
    party TEXT,
    chamber TEXT,
    contact_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.bioguide_id,
        r.full_name,
        r.party,
        r.chamber,
        r.contact_info
    FROM representatives r
    JOIN users u ON (
        r.state = (u.preferences->>'location'->'state')::TEXT
        AND (
            r.chamber = 'senate' 
            OR r.district = (u.preferences->>'location'->'district')::INTEGER
        )
    )
    WHERE u.id = user_id AND r.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get personalized bill recommendations with GovTrack data
CREATE OR REPLACE FUNCTION get_personalized_bills(user_id UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE(
    bill_id TEXT,
    relevance_score NUMERIC
) AS $$
DECLARE
    user_prefs JSONB;
    user_location JSONB;
    user_interests TEXT[];
BEGIN
    -- Get user preferences
    SELECT preferences INTO user_prefs FROM users WHERE id = user_id;
    user_location := user_prefs->'location';
    user_interests := ARRAY(SELECT jsonb_array_elements_text(user_prefs->'interests'));
    
    RETURN QUERY
    WITH bill_scores AS (
        SELECT 
            b.id as bill_id,
            (
                -- Location-based scoring (sponsor from user's state)
                CASE WHEN EXISTS(
                    SELECT 1 FROM jsonb_array_elements(b.sponsors) s 
                    WHERE s->>'state' = user_location->>'state'
                ) THEN 20 ELSE 0 END +
                
                -- Interest-based scoring
                (SELECT COUNT(*) * 15 FROM jsonb_array_elements_text(b.subjects) subject
                 WHERE subject = ANY(user_interests)) +
                
                -- GovTrack prediction scoring
                CASE WHEN (b.govtrack_data->'prognosis'->>'prediction')::NUMERIC > 0.5
                THEN 10 ELSE 0 END +
                
                -- Recency scoring
                CASE WHEN b.introduced_date > CURRENT_DATE - INTERVAL '30 days'
                THEN 10 - EXTRACT(DAYS FROM (CURRENT_DATE - b.introduced_date))::INTEGER / 3
                ELSE 0 END +
                
                -- Voting activity scoring
                CASE WHEN (b.voting_data->>'vote_count')::INTEGER > 0
                THEN 5 ELSE 0 END
            )::NUMERIC as relevance_score
        FROM bills b
        WHERE b.introduced_date > CURRENT_DATE - INTERVAL '2 years'
    )
    SELECT bs.bill_id, bs.relevance_score
    FROM bill_scores bs
    WHERE bs.relevance_score > 0
    ORDER BY bs.relevance_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get representative voting statistics
CREATE OR REPLACE FUNCTION get_representative_voting_stats(rep_bioguide_id TEXT, congress_num INTEGER DEFAULT NULL)
RETURNS TABLE(
    total_votes BIGINT,
    votes_with_party BIGINT,
    votes_against_party BIGINT,
    missed_votes BIGINT,
    party_unity_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_votes,
        COUNT(*) FILTER (WHERE 
            (vp.option = '+' AND r.party = 'D' AND v.total_plus > v.total_minus) OR
            (vp.option = '+' AND r.party = 'R' AND v.total_plus > v.total_minus) OR
            (vp.option = '-' AND r.party = 'D' AND v.total_minus > v.total_plus) OR
            (vp.option = '-' AND r.party = 'R' AND v.total_minus > v.total_plus)
        ) as votes_with_party,
        COUNT(*) FILTER (WHERE 
            (vp.option = '-' AND r.party = 'D' AND v.total_plus > v.total_minus) OR
            (vp.option = '-' AND r.party = 'R' AND v.total_plus > v.total_minus) OR
            (vp.option = '+' AND r.party = 'D' AND v.total_minus > v.total_plus) OR
            (vp.option = '+' AND r.party = 'R' AND v.total_minus > v.total_plus)
        ) as votes_against_party,
        COUNT(*) FILTER (WHERE vp.option = '0') as missed_votes,
        CASE WHEN COUNT(*) > 0 THEN
            (COUNT(*) FILTER (WHERE 
                (vp.option = '+' AND r.party = 'D' AND v.total_plus > v.total_minus) OR
                (vp.option = '+' AND r.party = 'R' AND v.total_plus > v.total_minus) OR
                (vp.option = '-' AND r.party = 'D' AND v.total_minus > v.total_plus) OR
                (vp.option = '-' AND r.party = 'R' AND v.total_minus > v.total_plus)
            )::NUMERIC / COUNT(*)::NUMERIC * 100)
        ELSE 0 END as party_unity_score
    FROM vote_positions vp
    JOIN votes v ON vp.vote_id = v.id
    JOIN representatives r ON vp.representative_bioguide_id = r.bioguide_id
    WHERE vp.representative_bioguide_id = rep_bioguide_id
    AND (congress_num IS NULL OR v.congress = congress_num);
END;
$$ LANGUAGE plpgsql;
```

This comprehensive schema provides a solid foundation for LegisTrack AI with proper indexing, security, and type safety across the entire application, including full integration with both Congress.gov and GovTrack.us data sources.