# API Documentation - LegisTrack AI
## Complete API Reference & Integration Guide

---

## API Overview

LegisTrack AI provides a comprehensive REST API built on Supabase Edge Functions, integrating multiple external services to deliver legislative data, AI analysis, and multimedia content generation.

**Base URL**: `https://your-project.supabase.co/functions/v1`  
**Authentication**: Bearer tokens via Supabase Auth  
**Content Type**: `application/json`  
**Rate Limiting**: Varies by endpoint (documented per endpoint)

---

## Authentication

### Auth Endpoints

#### POST /auth/signup
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

#### POST /auth/signin
Authenticate existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** Same as signup response.

#### POST /auth/signout
Invalidate user session.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "message": "Successfully signed out"
}
```

---

## Bill Endpoints

### GET /bills
Retrieve bills with optional filtering and pagination.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Items per page
- `congress` (integer): Filter by Congress number
- `type` (string): Filter by bill type (HR, S, HJRES, etc.)
- `status` (string): Filter by bill status
- `sponsor_state` (string): Filter by sponsor's state
- `sponsor_party` (string): Filter by sponsor's party (D, R, I)
- `subjects` (array): Filter by subject tags
- `introduced_after` (date): Bills introduced after date (YYYY-MM-DD)
- `introduced_before` (date): Bills introduced before date (YYYY-MM-DD)
- `search` (string): Full-text search query
- `sort` (string): Sort by (date, title, relevance)
- `order` (string): Sort order (asc, desc)

**Example Request:**
```
GET /bills?congress=118&type=HR&sponsor_state=CA&limit=10&page=1
```

**Response:**
```json
{
  "data": [
    {
      "id": "118-HR-1234",
      "congress": 118,
      "bill_type": "HR",
      "number": 1234,
      "title": "Healthcare Access Enhancement Act",
      "short_title": "Healthcare Access Act",
      "introduced_date": "2024-01-15",
      "status": "Referred to Committee",
      "latest_action": {
        "date": "2024-01-20",
        "text": "Referred to the Committee on Energy and Commerce",
        "actionCode": "H11100"
      },
      "summary": "A bill to improve healthcare access for underserved communities...",
      "sponsors": [
        {
          "bioguide_id": "D000001",
          "full_name": "Jane Doe",
          "party": "D",
          "state": "CA",
          "district": 12
        }
      ],
      "cosponsors_count": 15,
      "committees": [
        {
          "name": "Committee on Energy and Commerce",
          "chamber": "house"
        }
      ],
      "subjects": ["Healthcare", "Public Health", "Insurance"],
      "govtrack_url": "https://www.govtrack.us/congress/bills/118/hr1234",
      "voting_data": {
        "votes": [],
        "vote_count": 0,
        "last_vote_date": null,
        "passage_probability": 65
      },
      "ai_analysis": {
        "summary": "This bill aims to expand healthcare access...",
        "keyProvisions": [
          "Establishes community health centers",
          "Provides funding for rural hospitals",
          "Creates insurance subsidy program"
        ],
        "impactAssessment": {
          "economic": "Moderate positive impact on healthcare spending",
          "social": "Significant improvement in access to care",
          "regional": "Particularly beneficial for rural areas",
          "demographic": "Positive impact on low-income families"
        },
        "passagePrediction": {
          "probability": 65,
          "reasoning": "Bipartisan support and committee backing",
          "keyFactors": ["Committee support", "Healthcare priority", "Election year"],
          "timeline": "Expected committee markup in 6-8 weeks"
        }
      },
      "created_at": "2024-01-15T08:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "pages": 16
  }
}
```

### GET /bills/:billId
Retrieve detailed information for a specific bill.

**Headers:** `Authorization: Bearer <access_token>`

**Path Parameters:**
- `billId` (string): Bill ID in format `{congress}-{type}-{number}`

**Response:** Single bill object (same structure as bills array item above)

### POST /bills/:billId/track
Track a bill for the authenticated user.

**Headers:** `Authorization: Bearer <access_token>`

**Path Parameters:**
- `billId` (string): Bill ID to track

**Request Body:**
```json
{
  "notification_settings": {
    "statusChanges": true,
    "votingUpdates": true,
    "aiInsights": false,
    "majorMilestones": true
  },
  "user_notes": "Important healthcare legislation",
  "user_tags": ["healthcare", "priority"]
}
```

**Response:**
```json
{
  "message": "Bill tracked successfully",
  "tracking": {
    "bill_id": "118-HR-1234",
    "tracked_at": "2024-01-20T15:30:00Z",
    "notification_settings": {
      "statusChanges": true,
      "votingUpdates": true,
      "aiInsights": false,
      "majorMilestones": true
    }
  }
}
```

### DELETE /bills/:billId/track
Stop tracking a bill.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "message": "Bill untracked successfully"
}
```

### GET /bills/:billId/analysis
Get AI analysis for a specific bill.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `user_context` (boolean, default: true): Include user's location and interests in analysis
- `regenerate` (boolean, default: false): Force regeneration of analysis

**Response:**
```json
{
  "analysis": {
    "generated_at": "2024-01-20T16:00:00Z",
    "summary": "This healthcare bill focuses on expanding access...",
    "keyProvisions": [
      "Establishes 500 new community health centers",
      "Allocates $2B for rural hospital infrastructure",
      "Creates sliding-scale insurance subsidies"
    ],
    "impactAssessment": {
      "economic": "Estimated $15B economic impact over 5 years",
      "social": "Could provide healthcare access to 2M additional Americans",
      "regional": "Particularly beneficial for rural and underserved areas",
      "demographic": "Targets low-income families and elderly populations"
    },
    "passagePrediction": {
      "probability": 65,
      "reasoning": "Strong bipartisan support in committee, healthcare is priority issue",
      "keyFactors": [
        "Bipartisan committee support",
        "Healthcare as election priority",
        "Rural healthcare crisis urgency"
      ],
      "timeline": "Committee markup expected in 6-8 weeks, floor vote in 3-4 months"
    },
    "personalRelevance": {
      "relevanceScore": 85,
      "reasons": [
        "User located in underserved area",
        "User expressed interest in healthcare policy",
        "Bill affects user's demographic group"
      ]
    }
  }
}
```

### GET /bills/:billId/votes
Get voting information for a specific bill from GovTrack.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "votes": [
    {
      "vote_id": 12345,
      "date": "2024-01-25",
      "chamber": "house",
      "question": "On Passage",
      "result": "Passed",
      "total_votes": 435,
      "votes_by_party": {
        "Democratic": {"yes": 220, "no": 0, "not_voting": 5},
        "Republican": {"yes": 180, "no": 25, "not_voting": 5}
      },
      "govtrack_url": "https://www.govtrack.us/congress/votes/118-2024/h123"
    }
  ],
  "vote_summary": {
    "total_votes": 1,
    "latest_vote_date": "2024-01-25",
    "passage_status": "passed_house"
  }
}
```

---

## Representative Endpoints

### GET /representatives
Get congressional representatives.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `state` (string): Filter by state abbreviation
- `chamber` (string): Filter by chamber (house, senate)
- `party` (string): Filter by party (D, R, I)
- `district` (integer): Filter by district number (House only)

**Response:**
```json
{
  "data": [
    {
      "bioguide_id": "D000001",
      "full_name": "Jane Doe",
      "party": "D",
      "state": "CA",
      "district": 12,
      "chamber": "house",
      "contact_info": {
        "office": "123 Rayburn House Office Building",
        "phone": "(202) 225-1234",
        "website": "https://doe.house.gov",
        "socialMedia": {
          "twitter": "@RepJaneDoe",
          "facebook": "RepJaneDoe"
        }
      },
      "committees": [
        {
          "name": "Committee on Energy and Commerce",
          "role": "Member"
        }
      ],
      "voting_record": {
        "totalVotes": 256,
        "missedVotes": 3,
        "partyUnity": 92.5,
        "govtrack_stats": {
          "ideology_score": 0.25,
          "leadership_score": 0.78
        }
      },
      "govtrack_id": 412345,
      "govtrack_url": "https://www.govtrack.us/congress/members/jane_doe/412345"
    }
  ]
}
```

### GET /representatives/user
Get representatives for the current user based on their location.

**Headers:** `Authorization: Bearer <access_token>`

**Response:** Array of representative objects for user's state/district

### GET /representatives/:repId/votes
Get voting record for a specific representative from GovTrack.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `congress` (integer): Filter by Congress number
- `limit` (integer, default: 50): Number of votes to return

**Response:**
```json
{
  "votes": [
    {
      "vote_id": 12345,
      "date": "2024-01-25",
      "question": "On Passage of HR 1234",
      "vote": "Yea",
      "bill": {
        "id": "118-HR-1234",
        "title": "Healthcare Access Enhancement Act"
      },
      "govtrack_url": "https://www.govtrack.us/congress/votes/118-2024/h123"
    }
  ],
  "voting_stats": {
    "total_votes": 256,
    "missed_votes": 3,
    "party_unity_score": 92.5,
    "votes_with_party": 237,
    "votes_against_party": 16
  }
}
```

### POST /representatives/:repId/contact
Facilitate contacting a representative.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "subject": "Healthcare Access Enhancement Act",
  "message": "I urge you to support HR 1234...",
  "contact_method": "email",
  "bill_id": "118-HR-1234"
}
```

**Response:**
```json
{
  "message": "Contact information provided",
  "contact_info": {
    "method": "email",
    "address": "jane.doe@mail.house.gov",
    "subject_line": "Healthcare Access Enhancement Act - Constituent Input"
  },
  "tracking_id": "contact_789"
}
```

---

## GovTrack Integration Endpoints

### GET /govtrack/bill-search
Search bills using GovTrack's enhanced search capabilities.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `q` (string): Search query
- `congress` (integer): Congress number
- `status` (string): Bill status
- `sponsor_party` (string): Sponsor party
- `limit` (integer, default: 20): Results limit

**Response:**
```json
{
  "bills": [
    {
      "govtrack_id": 123456,
      "congress": 118,
      "bill_type": "hr",
      "number": 1234,
      "title": "Healthcare Access Enhancement Act",
      "sponsor": {
        "name": "Jane Doe",
        "party": "Democrat",
        "state": "CA"
      },
      "prognosis": {
        "prediction": 0.65,
        "factors": ["Committee support", "Bipartisan backing"]
      },
      "govtrack_url": "https://www.govtrack.us/congress/bills/118/hr1234"
    }
  ],
  "meta": {
    "total_count": 45,
    "page": 1,
    "per_page": 20
  }
}
```

### GET /govtrack/member-analysis
Get detailed member analysis from GovTrack.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `bioguide_id` (string): Member's Bioguide ID
- `include_votes` (boolean): Include recent votes
- `include_stats` (boolean): Include statistical analysis

**Response:**
```json
{
  "member": {
    "govtrack_id": 412345,
    "bioguide_id": "D000001",
    "name": "Jane Doe",
    "party": "Democrat",
    "ideology_score": 0.25,
    "leadership_score": 0.78,
    "committee_assignments": [
      {
        "committee": "Energy and Commerce",
        "role": "Member",
        "subcommittees": ["Health", "Environment"]
      }
    ],
    "voting_statistics": {
      "votes_with_party": 92.5,
      "missed_votes": 1.2,
      "bills_sponsored": 15,
      "bills_cosponsored": 234
    },
    "recent_votes": [
      {
        "vote_id": 12345,
        "date": "2024-01-25",
        "position": "Yea",
        "bill_title": "Healthcare Access Enhancement Act"
      }
    ]
  }
}
```

---

## AI and Content Generation Endpoints

### POST /ai/chat
Interactive chat with AI assistant about legislation.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "message": "Can you explain HR 1234 in simple terms?",
  "session_id": "chat_session_123",
  "context": {
    "bill_id": "118-HR-1234",
    "user_location": "CA"
  }
}
```

**Response:**
```json
{
  "response": "HR 1234, the Healthcare Access Enhancement Act, is designed to make healthcare more accessible...",
  "session_id": "chat_session_123",
  "suggestions": [
    "What are the key provisions?",
    "How does this affect California?",
    "What are the chances of passage?"
  ]
}
```

### POST /content/video-briefing
Generate personalized video briefing.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "bill_id": "118-HR-1234",
  "briefing_type": "summary",
  "personalization": {
    "include_location_impact": true,
    "focus_areas": ["healthcare", "economics"]
  }
}
```

**Response:**
```json
{
  "generation_id": "video_gen_456",
  "status": "queued",
  "estimated_completion": "2024-01-20T17:00:00Z",
  "message": "Video briefing generation started"
}
```

### GET /content/video-briefing/:generationId
Check video generation status.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": "video_gen_456",
  "status": "completed",
  "video_url": "https://cdn.example.com/briefings/video_gen_456.mp4",
  "duration": 180,
  "title": "Healthcare Access Enhancement Act - Personalized Briefing",
  "created_at": "2024-01-20T16:45:00Z"
}
```

### POST /content/audio-summary
Generate audio summary of a bill.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "bill_id": "118-HR-1234",
  "voice": "professional_female",
  "speed": "normal",
  "format": "mp3"
}
```

**Response:**
```json
{
  "audio_url": "https://cdn.example.com/audio/bill_summary_456.mp3",
  "duration": 120,
  "transcript": "The Healthcare Access Enhancement Act, House Resolution 1234...",
  "file_size": 2048576
}
```

### POST /bills/compare
Compare multiple bills with AI analysis.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "bill_ids": ["118-HR-1234", "118-S-567"],
  "comparison_type": "comprehensive",
  "focus_areas": ["policy_approach", "cost_analysis", "political_viability"]
}
```

**Response:**
```json
{
  "comparison": {
    "bills": [
      {
        "id": "118-HR-1234",
        "title": "Healthcare Access Enhancement Act"
      },
      {
        "id": "118-S-567",
        "title": "Universal Healthcare Coverage Act"
      }
    ],
    "similarities": [
      "Both focus on expanding healthcare access",
      "Both include rural healthcare provisions",
      "Both propose federal funding increases"
    ],
    "differences": [
      "HR 1234 uses market-based approach, S 567 uses single-payer",
      "Different funding mechanisms",
      "HR 1234 focuses on existing infrastructure, S 567 creates new system"
    ],
    "analysis": {
      "policy_approach": "HR 1234 builds on existing system while S 567 proposes fundamental restructuring",
      "cost_analysis": "HR 1234 estimated at $15B, S 567 at $200B over 10 years",
      "political_viability": "HR 1234 has higher bipartisan support probability"
    },
    "recommendation": "HR 1234 may have better passage prospects due to incremental approach"
  },
  "generated_at": "2024-01-20T17:15:00Z"
}
```

---

## User Endpoints

### GET /user/profile
Get current user's profile information.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "preferences": {
      "notifications": {
        "frequency": "daily",
        "email": true,
        "push": false,
        "sms": false
      },
      "interests": ["healthcare", "education", "environment"],
      "location": {
        "state": "CA",
        "district": 12,
        "zipCode": "90210"
      },
      "contentTypes": ["text", "video"],
      "politicalBalance": "neutral"
    },
    "profile": {
      "demographics": {
        "ageGroup": "25-34",
        "occupation": "teacher",
        "incomeLevel": "middle"
      },
      "civicEngagement": {
        "votingFrequency": "always",
        "organizationMemberships": ["PTA", "Local Environmental Group"],
        "issueAdvocacy": ["education", "environment"]
      }
    },
    "engagement_stats": {
      "billsViewed": 45,
      "billsTracked": 8,
      "searchesPerformed": 23,
      "representativesContacted": 3,
      "contentShared": 12,
      "timeOnPlatform": 7200
    }
  }
}
```

### PUT /user/profile
Update user profile information.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** Partial user object with fields to update

**Response:** Updated user object

### GET /user/tracked-bills
Get bills tracked by the current user.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by bill status
- `sort`: Sort by (tracked_date, bill_date, title)

**Response:**
```json
{
  "data": [
    {
      "bill": {
        "id": "118-HR-1234",
        "title": "Healthcare Access Enhancement Act",
        "status": "Referred to Committee",
        "latest_action": {
          "date": "2024-01-20",
          "text": "Referred to committee"
        }
      },
      "tracking": {
        "tracked_at": "2024-01-15T10:00:00Z",
        "notification_settings": {
          "statusChanges": true,
          "votingUpdates": true,
          "aiInsights": false
        },
        "user_notes": "Important for my district",
        "user_tags": ["healthcare", "priority"],
        "view_count": 5,
        "last_viewed": "2024-01-20T08:30:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1
  }
}
```

### GET /user/recommendations
Get personalized bill recommendations.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `limit` (integer, default: 20): Number of recommendations
- `refresh` (boolean, default: false): Force refresh of recommendations

**Response:**
```json
{
  "recommendations": [
    {
      "bill": {
        "id": "118-HR-5678",
        "title": "Education Funding Enhancement Act",
        "summary": "Increases federal education funding..."
      },
      "relevance": {
        "score": 92,
        "reasons": [
          "Matches your interest in education",
          "Sponsored by your state representative",
          "Affects your demographic group"
        ]
      }
    }
  ],
  "generated_at": "2024-01-20T16:30:00Z"
}
```

---

## Search and Discovery Endpoints

### GET /search
Comprehensive search across bills, representatives, and topics.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `q` (string, required): Search query
- `type` (string): Search type (bills, representatives, all)
- `page`, `limit`: Pagination
- `filters`: Additional filters based on type

**Response:**
```json
{
  "query": "healthcare",
  "results": {
    "bills": {
      "data": [
        {
          "id": "118-HR-1234",
          "title": "Healthcare Access Enhancement Act",
          "relevance_score": 0.95,
          "highlight": "This <mark>healthcare</mark> bill aims to expand access..."
        }
      ],
      "total": 45
    },
    "representatives": {
      "data": [
        {
          "bioguide_id": "D000001",
          "full_name": "Dr. Jane Doe",
          "relevance_score": 0.82,
          "highlight": "Committee on <mark>Healthcare</mark> Reform"
        }
      ],
      "total": 12
    }
  },
  "suggestions": ["health insurance", "medicare", "medicaid"],
  "filters": {
    "available": {
      "congress": [118, 117],
      "bill_types": ["HR", "S"],
      "subjects": ["Healthcare", "Public Health", "Insurance"]
    }
  }
}
```

---

## Analytics and Metrics Endpoints

### GET /analytics/dashboard
Get user analytics dashboard data.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "user_stats": {
    "bills_tracked": 8,
    "bills_viewed_this_month": 23,
    "representatives_contacted": 3,
    "time_saved_hours": 12.5
  },
  "trending_topics": [
    {
      "topic": "Healthcare Reform",
      "bill_count": 15,
      "activity_increase": "+25%"
    }
  ],
  "recent_activity": [
    {
      "type": "bill_tracked",
      "bill_title": "Healthcare Access Enhancement Act",
      "timestamp": "2024-01-20T15:30:00Z"
    }
  ],
  "impact_metrics": {
    "bills_influenced": 2,
    "representative_responses": 1,
    "community_engagement": 85
  }
}
```

---

## Webhook Endpoints

### POST /webhooks/congress-updates
Receive updates from Congress.gov API (internal use).

### POST /webhooks/govtrack-updates
Receive updates from GovTrack (internal use).

### POST /webhooks/ai-generation-complete
Receive completion notifications from AI services (internal use).

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": {
    "code": "BILL_NOT_FOUND",
    "message": "The requested bill could not be found",
    "details": {
      "bill_id": "118-HR-9999",
      "timestamp": "2024-01-20T17:30:00Z"
    }
  }
}
```

### Common Error Codes:
- `UNAUTHORIZED`: Authentication required or invalid
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `VALIDATION_ERROR`: Invalid request data
- `EXTERNAL_API_ERROR`: Third-party service error
- `GENERATION_FAILED`: AI content generation failed

---

## Rate Limits

| Endpoint Category | Rate Limit | Reset Period |
|------------------|------------|--------------|
| Authentication | 10 requests | 1 minute |
| Bills (read) | 100 requests | 1 minute |
| Bills (track/untrack) | 20 requests | 1 minute |
| GovTrack Integration | 60 requests | 1 minute |
| AI Chat | 50 messages | 1 hour |
| Video Generation | 5 requests | 1 hour |
| Audio Generation | 20 requests | 1 hour |
| Search | 60 requests | 1 minute |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Request limit per time period
- `X-RateLimit-Remaining`: Requests remaining in current period
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

// Get bills
const { data: bills } = await supabase.functions.invoke('bills', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
})

// Track a bill
const { data } = await supabase.functions.invoke('bills/118-HR-1234/track', {
  method: 'POST',
  body: {
    notification_settings: {
      statusChanges: true,
      votingUpdates: true
    }
  }
})

// Get GovTrack voting data
const { data: votes } = await supabase.functions.invoke('bills/118-HR-1234/votes', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
})
```

### Python
```python
import requests

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

# Get bills
response = requests.get(
    'https://your-project.supabase.co/functions/v1/bills',
    headers=headers,
    params={'congress': 118, 'limit': 10}
)

bills = response.json()

# Get representative voting record
response = requests.get(
    'https://your-project.supabase.co/functions/v1/representatives/D000001/votes',
    headers=headers,
    params={'congress': 118, 'limit': 50}
)

voting_record = response.json()
```

This comprehensive API documentation provides everything needed to integrate with LegisTrack AI's backend services, including the enhanced GovTrack integration for comprehensive voting data and legislative analysis.