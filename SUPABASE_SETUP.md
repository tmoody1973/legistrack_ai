# Supabase Project Setup Guide for LegisTrack AI

## Step 1: Create Supabase Account and Project

1. **Go to Supabase**: Visit [https://supabase.com](https://supabase.com)
2. **Sign Up/Login**: Create an account or login with GitHub
3. **Create New Project**: 
   - Click "New Project"
   - Choose your organization
   - Name: `legistrack-ai`
   - Database Password: Generate a strong password (save this!)
   - Region: Choose closest to your location
   - Click "Create new project"

## Step 2: Get Your Project Credentials

Once your project is created:

1. **Go to Settings**: Click the gear icon in the sidebar
2. **API Settings**: Click on "API" in the settings menu
3. **Copy these values**:
   - Project URL (looks like: `https://your-project-id.supabase.co`)
   - Anon/Public Key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)

## Step 3: Configure Environment Variables

Create a `.env` file in your project root with these values:

```env
# Replace with your actual Supabase project values
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Congress.gov API (get free key at api.congress.gov)
VITE_CONGRESS_API_KEY=your-congress-api-key

# AI Services (for future use)
GEMINI_API_KEY=your-gemini-api-key
TAVUS_API_KEY=your-tavus-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

## Step 4: Set Up Database Schema

1. **Go to SQL Editor**: In your Supabase dashboard, click "SQL Editor" in the sidebar
2. **Create New Query**: Click "New Query"
3. **Copy and Paste**: Copy the entire SQL migration below and paste it into the editor
4. **Run the Query**: Click "Run" to execute the migration

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users) with complete schema
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
    
    -- Engagement tracking with default values
    engagement_stats JSONB DEFAULT '{
        "billsViewed": 0,
        "billsTracked": 0,
        "searchesPerformed": 0,
        "representativesContacted": 0,
        "contentShared": 0,
        "timeOnPlatform": 0
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
    search_vector TSVECTOR,
    
    -- Additional fields from current schema
    policy_area TEXT,
    full_text_url TEXT,
    full_text_content TEXT,
    podcast_overview TEXT
);

-- Bill subjects table
CREATE TABLE bill_subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type = ANY (ARRAY['legislative'::text, 'policy'::text])),
    count INTEGER DEFAULT 0,
    update_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Representatives table
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

-- Generated content cache
CREATE TABLE generated_content (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- 'video', 'audio', 'analysis', 'summary'
    source_type TEXT NOT NULL, -- 'bill', 'representative', 'topic'
    generator TEXT NOT NULL, -- 'tavus', 'elevenlabs', 'gemini'
    generation_params JSONB DEFAULT '{}'::jsonb,
    content_url TEXT,
    content_data JSONB DEFAULT '{}'::jsonb,
    title TEXT,
    description TEXT,
    duration INTEGER, -- seconds for audio/video
    file_size INTEGER, -- bytes
    status TEXT DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
    error_message TEXT,
    view_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    source_id TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_preferences_location ON users USING GIN((preferences->'location'));

CREATE INDEX idx_bills_congress ON bills(congress);
CREATE INDEX idx_bills_type ON bills(bill_type);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_introduced_date ON bills(introduced_date);
CREATE INDEX idx_bills_updated_at ON bills(updated_at);
CREATE INDEX idx_bills_subjects ON bills USING GIN(subjects);
CREATE INDEX idx_bills_sponsors ON bills USING GIN(sponsors);
CREATE INDEX idx_bills_search ON bills USING GIN(search_vector);
CREATE INDEX idx_bills_compound_lookup ON bills(congress, bill_type, number);
CREATE INDEX idx_bills_policy_area ON bills(policy_area);
CREATE INDEX idx_bills_full_text_url ON bills(full_text_url);
CREATE INDEX idx_bills_has_full_text ON bills(((full_text_content IS NOT NULL)));

CREATE INDEX idx_bill_subjects_name ON bill_subjects(name);
CREATE INDEX idx_bill_subjects_type ON bill_subjects(type);

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

CREATE INDEX idx_generated_content_id ON generated_content(id);
CREATE INDEX idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX idx_generated_content_source ON generated_content(source_type);
CREATE INDEX idx_generated_content_type ON generated_content(content_type);
CREATE INDEX idx_generated_content_status ON generated_content(status);
CREATE INDEX idx_generated_content_created_at ON generated_content(created_at);

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

-- Function to handle user creation with proper error handling
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
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth.users insertion
        RAISE LOG 'Error creating user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tracked_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
-- Note: No INSERT policy needed - the handle_new_user trigger (SECURITY DEFINER) handles user creation
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for bills
CREATE POLICY "Bills are publicly readable" ON bills
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage bills" ON bills
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for bill_subjects
CREATE POLICY "Bill subjects are publicly readable" ON bill_subjects
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage bill subjects" ON bill_subjects
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for representatives
CREATE POLICY "Representatives are publicly readable" ON representatives
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert representatives" ON representatives
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update representatives" ON representatives
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for user_tracked_bills
CREATE POLICY "Users can manage own tracking" ON user_tracked_bills
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_activities
CREATE POLICY "Users can view own activities" ON user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" ON user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for generated_content (FIXED)
-- Allow all reads for generated content
CREATE POLICY "Allow all reads" ON generated_content
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update any generated content
CREATE POLICY "Allow authenticated write" ON generated_content
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anonymous users to insert/update content where user_id is NULL
CREATE POLICY "Allow anonymous write" ON generated_content
    FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);
```

## Step 5: Create Storage Bucket for Audio Files

**CRITICAL**: This step is required for audio generation to work. The application will fail with "Bucket not found" errors if this is not completed.

1. **Go to Storage**: In your Supabase dashboard, click "Storage" in the sidebar
2. **Create New Bucket**: Click "New bucket"
3. **Bucket Configuration**:
   - Name: `podcast-audios` (EXACTLY this name - case sensitive)
   - Public bucket: ✅ (checked)
   - File size limit: 50 MB (or as needed)
   - Allowed MIME types: `audio/mpeg, audio/mp3, audio/wav, audio/ogg`
4. **Click "Save"**

### Configure Storage Policies

After creating the bucket, set up Row Level Security policies:

1. **Go to Storage Policies**: Click on the `podcast-audios` bucket, then "Policies"
2. **Add the following policies by running this SQL in the SQL Editor**:

```sql
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to audio files
CREATE POLICY "Public can view audio files" ON storage.objects
FOR SELECT USING (bucket_id = 'podcast-audios');

-- Allow authenticated users to upload audio files
CREATE POLICY "Authenticated users can upload audio" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'podcast-audios');

-- Allow anonymous users to upload audio files (for anonymous content)
CREATE POLICY "Anonymous users can upload audio" ON storage.objects
FOR INSERT TO anon WITH CHECK (bucket_id = 'podcast-audios');

-- Allow users to update their own audio files
CREATE POLICY "Users can update own audio files" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'podcast-audios' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own audio files
CREATE POLICY "Users can delete own audio files" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'podcast-audios' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Step 6: Get Congress.gov API Key

1. **Visit**: [https://api.congress.gov/sign-up](https://api.congress.gov/sign-up)
2. **Sign Up**: Create a free account
3. **Get API Key**: Copy your API key
4. **Add to .env**: Update your `.env` file with the Congress API key

## Step 7: Test the Setup

1. **Install Dependencies**: Make sure all packages are installed
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Test Authentication**:
   - Try creating a new account
   - Try logging in
   - Check that the dashboard loads

4. **Test Bills Page**:
   - Navigate to the Bills section
   - Try the "Sync Latest Bills" button
   - Search and filter bills

5. **Test Audio Generation**:
   - Generate a comprehensive analysis for a bill
   - Try generating a podcast overview
   - Test audio generation functionality

## Step 8: Verify Database Setup

In your Supabase dashboard:

1. **Check Tables**: Go to "Table Editor" and verify all tables are created
2. **Check RLS**: Go to "Authentication" > "Policies" to see Row Level Security policies
3. **Check Storage**: Go to "Storage" and verify the `podcast-audios` bucket exists
4. **Test Data**: Try creating a user account and see if it appears in the `users` table

## Step 9: Fix RLS Policies (If You Already Have Data)

If you already have a Supabase project with data and are experiencing RLS errors, run this SQL to update the generated_content policies:

```sql
-- Drop existing policies for generated_content
DROP POLICY IF EXISTS "Public can view anonymous content" ON generated_content;
DROP POLICY IF EXISTS "Public can insert anonymous content" ON generated_content;
DROP POLICY IF EXISTS "Public can update anonymous content" ON generated_content;
DROP POLICY IF EXISTS "Public can update insertable content" ON generated_content;
DROP POLICY IF EXISTS "Users can view own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can insert own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can update own generated content" ON generated_content;
DROP POLICY IF EXISTS "Users can delete own generated content" ON generated_content;

-- Create new simplified policies
CREATE POLICY "Allow all reads" ON generated_content
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated write" ON generated_content
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous write" ON generated_content
    FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);
```

## Troubleshooting

### Common Issues:

1. **Environment Variables Not Loading**:
   - Make sure `.env` file is in project root
   - Restart development server after adding variables
   - Check that variable names start with `VITE_` for client-side access

2. **Database Connection Issues**:
   - Verify Supabase URL and anon key are correct
   - Check that your Supabase project is active
   - Ensure database migration ran successfully

3. **Storage Bucket Issues**:
   - Verify the `podcast-audios` bucket was created with EXACT name
   - Check that storage policies are properly configured
   - Ensure bucket is set to public if needed
   - Run the storage policies SQL in the SQL Editor

4. **Authentication Issues**:
   - Check that the `handle_new_user` function was created
   - Verify RLS policies are enabled
   - Make sure email confirmation is disabled in Supabase Auth settings

5. **API Issues**:
   - Verify Congress.gov API key is valid
   - Check browser network tab for API errors
   - Ensure CORS is properly configured

6. **RLS Policy Violations**:
   - Run the Step 9 SQL to fix generated_content policies
   - Ensure all policies are created correctly
   - Check that authenticated users can write to all tables they need

### Next Steps After Setup:

1. **Test User Registration**: Create a test account
2. **Sync Bills**: Use the "Sync Latest Bills" button to populate data
3. **Test Search**: Try searching and filtering bills
4. **Test Audio Generation**: Generate podcast overviews and audio
5. **Check Database**: Verify data is being stored correctly

## Security Notes:

- Never commit your `.env` file to version control
- Keep your Supabase service role key secure (not used in frontend)
- Regularly rotate API keys
- Monitor usage in Supabase dashboard
- Review storage policies to ensure appropriate access controls

## Support:

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Ensure database migration completed successfully
5. Verify storage bucket and policies are configured correctly
6. Run the RLS policy fixes if you have existing data