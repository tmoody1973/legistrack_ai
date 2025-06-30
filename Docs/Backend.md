# Backend Operations - LegisTrack AI
## Architecture & Implementation Guide

---

## Overview

LegisTrack AI uses a serverless backend architecture centered around Supabase, complemented by multiple API integrations. This approach provides scalability, reduces infrastructure complexity, and enables rapid development while maintaining professional-grade capabilities.

---

## Architecture Design

### Core Backend Services

#### 1. Supabase Platform
**Role**: Primary backend infrastructure
- **Database**: PostgreSQL for user data, preferences, and application state
- **Authentication**: User registration, login, and session management
- **Edge Functions**: Serverless functions for API orchestration and business logic
- **Real-time**: WebSocket connections for live updates
- **Storage**: File storage for user-generated content

#### 2. API Orchestration Layer
**Role**: Coordinate multiple external APIs
- **Congress.gov API**: Official legislative data
- **GovTrack.us API**: Enhanced voting records and historical analysis
- **Google Gemini 2.5 Flash**: AI analysis and conversational interface  
- **Tavus API**: Personalized video generation
- **ElevenLabs API**: Text-to-speech conversion
- **Rate Limiting**: Intelligent request management across services

---

## Database Schema Design

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    profile JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{
        "notifications": "daily",
        "interests": [],
        "location": {}
    }'::jsonb
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data (no INSERT policy needed - handled by trigger)
CREATE POLICY "Users can access own data" ON users
    FOR SELECT USING (auth.uid() = id);
    
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);
```

#### Bills Table (Cache)
```sql
CREATE TABLE bills (
    id TEXT PRIMARY KEY, -- Format: {congress}-{type}-{number}
    congress INTEGER NOT NULL,
    bill_type TEXT NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    introduced_date DATE,
    latest_action JSONB,
    sponsors JSONB DEFAULT '[]',
    committees JSONB DEFAULT '[]',
    subjects JSONB DEFAULT '[]',
    url TEXT,
    govtrack_url TEXT,
    ai_analysis JSONB,
    voting_data JSONB DEFAULT '{}', -- GovTrack voting information
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_bills_congress ON bills(congress);
CREATE INDEX idx_bills_subjects ON bills USING GIN(subjects);
CREATE INDEX idx_bills_updated ON bills(updated_at);
```

#### User Bill Tracking
```sql
CREATE TABLE user_tracked_bills (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bill_id TEXT REFERENCES bills(id) ON DELETE CASCADE,
    tracked_at TIMESTAMPTZ DEFAULT now(),
    notification_preferences JSONB DEFAULT '{
        "status_changes": true,
        "voting_updates": true,
        "ai_insights": false
    }'::jsonb,
    PRIMARY KEY (user_id, bill_id)
);

-- Enable RLS
ALTER TABLE user_tracked_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tracking" ON user_tracked_bills
    FOR ALL USING (auth.uid() = user_id);
```

#### Representatives Cache
```sql
CREATE TABLE representatives (
    bioguide_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    party TEXT,
    state TEXT,
    district INTEGER,
    chamber TEXT CHECK (chamber IN ('house', 'senate')),
    contact_info JSONB,
    voting_record JSONB,
    govtrack_id INTEGER, -- GovTrack person ID
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_representatives_state ON representatives(state);
CREATE INDEX idx_representatives_chamber ON representatives(chamber);
```

---

## Edge Functions

### Critical Configuration Requirements

**🚨 IMPORTANT: All Edge Functions require these Supabase secrets to be set:**

```bash
# Required for all Edge Functions to work
supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Required for Congress API functionality
supabase secrets set CONGRESS_API_KEY=your_congress_api_key

# Optional for AI features
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

**Note**: These secrets are NOT automatically available in Edge Functions and must be explicitly set. Without them, functions will fail with "TypeError: Failed to fetch" errors.

### 1. Bill Analysis Function
**Purpose**: Generate AI-powered bill analysis using Google Gemini

```typescript
// supabase/functions/analyze-bill/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get Supabase configuration from secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration not found in secrets')
    }

    const { billId, userContext } = await req.json()
    
    // Get bill data from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: bill } = await supabase
      .from('bills')
      .select('*')
      .eq('id', billId)
      .single()
    
    if (!bill) {
      return new Response('Bill not found', { status: 404, headers: corsHeaders })
    }
    
    // Generate AI analysis
    const analysis = await generateBillAnalysis(bill, userContext)
    
    // Update bill with analysis
    await supabase
      .from('bills')
      .update({ 
        ai_analysis: analysis,
        updated_at: new Date().toISOString()
      })
      .eq('id', billId)
    
    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateBillAnalysis(bill: any, userContext: any) {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }
  
  const prompt = `
    Analyze this bill for a citizen audience:
    
    Title: ${bill.title}
    Summary: ${bill.summary || 'No summary available'}
    
    User Context: ${JSON.stringify(userContext)}
    
    Provide:
    1. Plain English summary (2-3 sentences)
    2. Key provisions (3-5 points)
    3. Impact assessment (economic, social, personal)
    4. Passage prediction with reasoning
    
    Format as JSON.
  `
  
  // Call Gemini API (implementation details)
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  })
  
  const result = await response.json()
  return parseAnalysisFromGemini(result)
}
```

### 2. Data Sync Function
**Purpose**: Periodically sync legislative data from Congress.gov and GovTrack

```typescript
// supabase/functions/sync-legislative-data/index.ts
serve(async (req) => {
  // Verify this is a scheduled function call
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Get Supabase configuration from secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration not found in secrets')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Sync from Congress.gov
    const congressData = await fetchRecentBillsFromCongress()
    
    // Sync from GovTrack for additional data
    const govtrackData = await fetchVotingDataFromGovTrack()
    
    // Merge and update database
    for (const bill of congressData.bills) {
      const govtrackInfo = govtrackData.find(gt => 
        gt.congress === bill.congress && 
        gt.bill_type === bill.type && 
        gt.number === bill.number
      )
      
      await supabase
        .from('bills')
        .upsert({
          id: `${bill.congress}-${bill.type}-${bill.number}`,
          ...transformBillData(bill),
          govtrack_url: govtrackInfo?.url,
          voting_data: govtrackInfo?.voting_data || {}
        })
    }
    
    return new Response('Sync completed', { status: 200 })
    
  } catch (error) {
    console.error('Sync error:', error)
    return new Response('Sync failed', { status: 500 })
  }
})

async function fetchRecentBillsFromCongress() {
  const congressApiKey = Deno.env.get('CONGRESS_API_KEY')
  
  if (!congressApiKey) {
    throw new Error('CONGRESS_API_KEY not configured')
  }
  
  const response = await fetch(`https://api.congress.gov/v3/bill?api_key=${congressApiKey}&format=json&limit=250`)
  return await response.json()
}

async function fetchVotingDataFromGovTrack() {
  // GovTrack API doesn't require authentication for basic data
  const response = await fetch('https://www.govtrack.us/api/v2/bill?congress=118&limit=250')
  return await response.json()
}
```

### 3. GovTrack Integration Function
**Purpose**: Enhanced data fetching from GovTrack for voting records and analysis

```typescript
// supabase/functions/govtrack-integration/index.ts
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get Supabase configuration from secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration not found in secrets')
    }

    const { action, params } = await req.json()
    
    let result;
    switch (action) {
      case 'get_voting_records':
        result = await getVotingRecords(params.personId, params.congress)
        break
      case 'get_bill_votes':
        result = await getBillVotes(params.billId)
        break
      case 'get_member_stats':
        result = await getMemberStats(params.personId)
        break
      default:
        throw new Error('Invalid action')
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})

async function getVotingRecords(personId: number, congress: number) {
  const response = await fetch(
    `https://www.govtrack.us/api/v2/vote_voter?person=${personId}&vote__congress=${congress}&limit=100`
  )
  return await response.json()
}

async function getBillVotes(billId: string) {
  // Parse bill ID to get GovTrack format
  const [congress, type, number] = billId.split('-')
  
  const response = await fetch(
    `https://www.govtrack.us/api/v2/vote?related_bill__congress=${congress}&related_bill__bill_type=${type.toLowerCase()}&related_bill__number=${number}`
  )
  return await response.json()
}

async function getMemberStats(personId: number) {
  const response = await fetch(
    `https://www.govtrack.us/api/v2/person/${personId}?include_analysis=true`
  )
  return await response.json()
}
```

---

## API Integration Layer

### Congress.gov API Service

#### Rate Limiting Strategy
```typescript
class CongressApiService {
  private rateLimiter = new Map<string, { count: number; resetTime: number }>()
  private readonly RATE_LIMIT = 1000 // requests per hour
  
  async makeRequest(endpoint: string, params?: any) {
    await this.checkRateLimit()
    
    const congressApiKey = Deno.env.get('CONGRESS_API_KEY')
    if (!congressApiKey) {
      throw new Error('CONGRESS_API_KEY not configured')
    }
    
    const response = await fetch(`https://api.congress.gov/v3${endpoint}`, {
      headers: {
        'X-API-Key': congressApiKey,
        'Content-Type': 'application/json'
      },
      ...params
    })
    
    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status}`)
    }
    
    return response.json()
  }
  
  private async checkRateLimit() {
    const now = Date.now()
    const limit = this.rateLimiter.get('congress') || { count: 0, resetTime: now + 3600000 }
    
    if (now > limit.resetTime) {
      limit.count = 0
      limit.resetTime = now + 3600000
    }
    
    if (limit.count >= this.RATE_LIMIT) {
      const waitTime = limit.resetTime - now
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds.`)
    }
    
    limit.count++
    this.rateLimiter.set('congress', limit)
  }
}
```

### GovTrack API Service

```typescript
class GovTrackApiService {
  private baseUrl = 'https://www.govtrack.us/api/v2'
  
  async getBillDetails(congress: number, billType: string, number: number) {
    const response = await fetch(
      `${this.baseUrl}/bill?congress=${congress}&bill_type=${billType.toLowerCase()}&number=${number}`
    )
    
    if (!response.ok) {
      throw new Error(`GovTrack API error: ${response.status}`)
    }
    
    return response.json()
  }
  
  async getPersonVotes(personId: number, congress?: number) {
    let url = `${this.baseUrl}/vote_voter?person=${personId}&limit=100`
    if (congress) {
      url += `&vote__congress=${congress}`
    }
    
    const response = await fetch(url)
    return response.json()
  }
  
  async getVoteDetails(voteId: number) {
    const response = await fetch(`${this.baseUrl}/vote/${voteId}`)
    return response.json()
  }
  
  async searchMembers(query: string) {
    const response = await fetch(
      `${this.baseUrl}/person?name__icontains=${encodeURIComponent(query)}&limit=20`
    )
    return response.json()
  }
}
```

#### Data Transformation
```typescript
function transformBillData(rawBill: any): any {
  return {
    congress: rawBill.congress,
    bill_type: rawBill.type,
    number: rawBill.number,
    title: rawBill.title,
    summary: rawBill.summaries?.[0]?.text,
    introduced_date: rawBill.introducedDate,
    latest_action: {
      date: rawBill.latestAction?.actionDate,
      text: rawBill.latestAction?.text
    },
    sponsors: rawBill.sponsors?.map((sponsor: any) => ({
      bioguide_id: sponsor.bioguideId,
      full_name: sponsor.fullName,
      party: sponsor.party,
      state: sponsor.state
    })) || [],
    committees: rawBill.committees?.map((committee: any) => ({
      name: committee.name,
      chamber: committee.chamber
    })) || [],
    subjects: rawBill.subjects?.legislativeSubjects?.map((subject: any) => subject.name) || [],
    url: rawBill.url
  }
}

function transformGovTrackData(govtrackBill: any): any {
  return {
    govtrack_id: govtrackBill.id,
    govtrack_url: `https://www.govtrack.us${govtrackBill.link}`,
    voting_data: {
      votes: govtrackBill.votes || [],
      vote_count: govtrackBill.vote_count || 0,
      last_vote_date: govtrackBill.last_vote_date,
      passage_probability: govtrackBill.prognosis?.prediction || null
    },
    sponsor_analysis: {
      ideology_score: govtrackBill.sponsor?.ideology_score,
      leadership_score: govtrackBill.sponsor?.leadership_score
    }
  }
}
```

---

## Caching Strategy

### Multi-Layer Caching
1. **Database Cache**: Store frequently accessed bills and analysis
2. **Edge Function Cache**: Cache API responses in memory
3. **CDN Cache**: Static assets and generated content
4. **Browser Cache**: Client-side caching for user data

### Cache Invalidation
```typescript
class CacheManager {
  // Invalidate bill cache when new data is available
  async invalidateBillCache(billId: string) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration not found in secrets')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    await supabase
      .from('bills')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', billId)
    
    // Notify connected clients
    await supabase.channel('bill-updates')
      .send({
        type: 'broadcast',
        event: 'bill-updated',
        payload: { billId }
      })
  }
}
```

---

## Security Implementation

### Row Level Security (RLS)
```sql
-- Ensure users can only access their own data
-- Note: No INSERT policy for users table - handled by SECURITY DEFINER trigger
CREATE POLICY "Users own data policy" ON users
    FOR SELECT USING (auth.uid() = id);
    
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users own tracking data" ON user_tracked_bills
    FOR ALL USING (auth.uid() = user_id);

-- Bills are public but analysis may be user-specific
CREATE POLICY "Bills are publicly readable" ON bills
    FOR SELECT USING (true);

CREATE POLICY "Only system can modify bills" ON bills
    FOR INSERT, UPDATE, DELETE USING (false);
```

### API Key Protection
```typescript
// All API keys stored as Supabase secrets
const secrets = {
  SUPABASE_URL: await getSecret('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: await getSecret('SUPABASE_SERVICE_ROLE_KEY'),
  CONGRESS_API_KEY: await getSecret('CONGRESS_API_KEY'),
  GEMINI_API_KEY: await getSecret('GEMINI_API_KEY'),
  TAVUS_API_KEY: await getSecret('TAVUS_API_KEY'),
  ELEVENLABS_API_KEY: await getSecret('ELEVENLABS_API_KEY')
}

// Never expose keys to client
function getSecret(name: string): string {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`Required secret ${name} not found`)
  }
  return value
}
```

---

## Monitoring & Logging

### Performance Monitoring
```typescript
class MonitoringService {
  async logApiCall(service: string, endpoint: string, duration: number, success: boolean) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration not found for logging')
      return
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    await supabase.from('api_logs').insert({
      service,
      endpoint,
      duration,
      success,
      timestamp: new Date().toISOString()
    })
    
    // Alert if performance degrades
    if (duration > 5000) {
      await this.sendAlert(`Slow API call: ${service}/${endpoint} took ${duration}ms`)
    }
  }
}
```

### Error Handling
```typescript
class ErrorHandler {
  static async handleApiError(error: any, context: string) {
    console.error(`Error in ${context}:`, error)
    
    // Log to monitoring service
    await this.logError({
      context,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    
    // Return user-friendly error
    return {
      error: this.getUserFriendlyMessage(error),
      code: this.getErrorCode(error)
    }
  }
  
  private static getUserFriendlyMessage(error: any): string {
    if (error.message.includes('rate limit')) {
      return 'Service temporarily unavailable. Please try again in a few minutes.'
    }
    
    if (error.message.includes('network')) {
      return 'Connection error. Please check your internet connection.'
    }
    
    if (error.message.includes('not configured')) {
      return 'Service configuration error. Please contact support.'
    }
    
    return 'An unexpected error occurred. Please try again.'
  }
}
```

---

## Deployment & Scaling

### Supabase Configuration
```sql
-- Database optimization
ALTER DATABASE postgres SET shared_preload_libraries = 'pg_stat_statements';
ALTER DATABASE postgres SET track_activity_query_size = 2048;

-- Connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
```

### Edge Function Deployment
```bash
# Deploy functions to Supabase
supabase functions deploy analyze-bill
supabase functions deploy sync-legislative-data
supabase functions deploy govtrack-integration
supabase functions deploy congress-api
supabase functions deploy bill-data-processor

# Set up secrets (CRITICAL for functions to work)
supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set CONGRESS_API_KEY=your_key_here
supabase secrets set GEMINI_API_KEY=your_key_here
supabase secrets set TAVUS_API_KEY=your_key_here
supabase secrets set ELEVENLABS_API_KEY=your_key_here
```

### Scheduled Jobs
```sql
-- Set up cron job for data synchronization
SELECT cron.schedule(
  'sync-legislative-data',
  '0 */6 * * *', -- Every 6 hours
  'SELECT net.http_post(
    url:=''https://your-project.supabase.co/functions/v1/sync-legislative-data'',
    headers:=jsonb_build_object(''Authorization'', ''Bearer '' || ''your-cron-secret'')
  );'
);
```

## Critical Setup Requirements

### Required Secrets for Edge Functions

**🚨 CRITICAL: All Edge Functions require these secrets to be set in Supabase:**

1. **SUPABASE_URL**: Your project URL from Supabase Dashboard > Settings > API
2. **SUPABASE_SERVICE_ROLE_KEY**: Your service role key from Supabase Dashboard > Settings > API
3. **CONGRESS_API_KEY**: Your Congress.gov API key from https://api.congress.gov/sign-up

**Without these secrets, Edge Functions will fail with "TypeError: Failed to fetch" errors.**

### Setup Steps:
1. Get your Supabase project URL and service role key from the dashboard
2. Get your Congress.gov API key and verify it works
3. Set all secrets using `supabase secrets set` command
4. Deploy all Edge Functions after setting secrets
5. Test functionality in the application

This backend architecture provides a scalable, secure, and maintainable foundation for LegisTrack AI while leveraging modern serverless technologies and comprehensive legislative data from both Congress.gov and GovTrack.us.