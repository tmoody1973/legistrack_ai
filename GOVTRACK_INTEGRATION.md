# GovTrack.us Integration Guide
## Using Bulk Data and Direct JSON Access

## Overview

GovTrack.us doesn't provide a traditional REST API, but they do provide:
- **Direct JSON access** to individual bill and member data
- **Bulk data downloads** for comprehensive datasets
- **XML/JSON endpoints** for specific data types

This integration uses their direct JSON access patterns for real-time data.

## GovTrack Data Access Patterns

### 1. Direct JSON Access

GovTrack provides direct JSON access to their data using predictable URL patterns:

```
# Bill data
https://www.govtrack.us/congress/bills/{congress}/{bill_type}{number}/data.json

# Member data  
https://www.govtrack.us/congress/members/{govtrack_id}/data.json

# Voting data
https://www.govtrack.us/congress/votes/{congress}/{bill_type}{number}/data.json
```

### 2. Search and Browse Endpoints

```
# Browse bills with filters
https://www.govtrack.us/congress/bills/browse?congress=118&q=healthcare&format=json

# Current members
https://www.govtrack.us/congress/members/current.json
```

## Implementation Strategy

### 1. Real-time Data Enhancement

Our implementation fetches data from Congress.gov first (official source), then enhances it with GovTrack data:

```typescript
// Get official data from Congress.gov
const congressBill = await congressApi.getBill(congress, type, number);

// Enhance with GovTrack voting data and analysis
const govtrackData = await govtrackService.getBillData(congress, type, number);
const govtrackVotes = await govtrackService.getBillVotes(congress, type, number);

// Combine for comprehensive bill data
const enhancedBill = {
  ...transformCongressBill(congressBill),
  ...transformGovTrackData(govtrackData),
  voting_data: govtrackVotes
};
```

### 2. Data Transformation

GovTrack data is transformed to match our schema:

```typescript
transformBillData(govtrackBill: any): Partial<Bill> {
  return {
    govtrack_id: govtrackBill.id,
    govtrack_url: `https://www.govtrack.us${govtrackBill.link}`,
    govtrack_data: {
      prognosis: govtrackBill.prognosis,
      sponsor_analysis: {
        ideology_score: govtrackBill.sponsor?.ideology_score,
        leadership_score: govtrackBill.sponsor?.leadership_score
      }
    },
    voting_data: {
      votes: govtrackBill.votes || [],
      passage_probability: govtrackBill.prognosis?.prediction
    }
  };
}
```

## Key GovTrack Data Features

### 1. Bill Prognosis
GovTrack provides passage predictions:
```json
{
  "prognosis": {
    "prediction": 0.65,
    "factors": ["Bipartisan support", "Committee backing"]
  }
}
```

### 2. Voting Records
Comprehensive voting data:
```json
{
  "votes": [
    {
      "id": 12345,
      "date": "2024-01-25",
      "question": "On Passage",
      "result": "Passed",
      "total_votes": 435
    }
  ]
}
```

### 3. Member Analysis
Representative ideology and performance scores:
```json
{
  "ideology_score": 0.25,
  "leadership_score": 0.78,
  "missed_votes_pct": 1.2,
  "votes_with_party_pct": 92.5
}
```

## Error Handling

Since GovTrack doesn't require API keys, we handle errors gracefully:

```typescript
async getBillData(congress: number, billType: string, number: number) {
  try {
    const endpoint = `/congress/bills/${congress}/${billType.toLowerCase()}${number}/data.json`;
    return await this.fetchGovTrackData(endpoint);
  } catch (error) {
    console.error('Error fetching GovTrack bill data:', error);
    return null; // Graceful degradation
  }
}
```

## Caching Strategy

1. **Primary Source**: Congress.gov (official, authoritative)
2. **Enhancement**: GovTrack (voting data, analysis, predictions)
3. **Caching**: Store combined data in Supabase
4. **Refresh**: Update GovTrack data every 24 hours

## Rate Limiting

GovTrack doesn't have published rate limits, but we implement:
- Reasonable delays between requests
- Graceful error handling
- Fallback to cached data

## Data Quality

### Advantages of This Approach:
- ✅ **Official data first**: Congress.gov is authoritative
- ✅ **Enhanced insights**: GovTrack adds valuable analysis
- ✅ **No API keys needed**: GovTrack is freely accessible
- ✅ **Comprehensive coverage**: Both sources complement each other

### Considerations:
- ⚠️ **Data freshness**: GovTrack may lag behind Congress.gov
- ⚠️ **Availability**: No SLA guarantees from GovTrack
- ⚠️ **Format changes**: JSON structure may change without notice

## Testing the Integration

1. **Test bill data fetching**:
   ```bash
   curl "https://www.govtrack.us/congress/bills/118/hr1/data.json"
   ```

2. **Test member data**:
   ```bash
   curl "https://www.govtrack.us/congress/members/current.json"
   ```

3. **Test voting data**:
   ```bash
   curl "https://www.govtrack.us/congress/votes/118/hr1/data.json"
   ```

## Future Enhancements

1. **Bulk Data Processing**: Download GovTrack's bulk datasets for comprehensive analysis
2. **Historical Data**: Access historical voting patterns and trends
3. **Committee Data**: Enhanced committee information and schedules
4. **Amendment Tracking**: Track bill amendments and modifications

This integration provides the best of both worlds: official, authoritative data from Congress.gov enhanced with GovTrack's valuable analysis and voting insights.