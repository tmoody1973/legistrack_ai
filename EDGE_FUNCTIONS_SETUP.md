# Supabase Edge Functions Setup Guide
## Secure API Key Management

## Overview

This setup uses Supabase Edge Functions to securely handle API keys on the server side, eliminating the need to expose sensitive keys in client-side environment variables.

## Benefits of Edge Functions for API Security

✅ **Secure**: API keys never exposed to client-side code  
✅ **Scalable**: Automatic scaling and global distribution  
✅ **Authenticated**: Built-in user authentication verification  
✅ **Cost-effective**: Pay only for what you use  
✅ **Maintainable**: Centralized API logic  

## Step 1: Set Up Supabase Project

Follow the main SUPABASE_SETUP.md guide first to:
1. Create your Supabase project
2. Set up the database schema
3. Configure basic authentication

## Step 2: Get Required API Keys

### Congress.gov API Key (REQUIRED)
**⚠️ CRITICAL: The app will NOT work without this API key!**

1. Visit: https://api.congress.gov/sign-up
2. Create a free account with your email
3. **Wait for email confirmation** - this can take a few minutes
4. Once confirmed, log in to get your API key
5. Copy your API key (it will look like: `abcd1234-efgh-5678-ijkl-9012mnop3456`)

**Test your API key immediately:**
```bash
curl "https://api.congress.gov/v3/bill?api_key=YOUR_ACTUAL_KEY_HERE&format=json&limit=1"
```

If this returns JSON data, your key is valid. If you get an error, the key is invalid or not activated yet.

### Google Gemini API Key (Optional for AI features)
1. Visit: https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key

### Tavus API Key (Optional for video generation)
1. Visit: https://www.tavus.io/
2. Create an account and complete onboarding
3. Get your API key from the dashboard
4. Copy the key (starts with `tvs_`)

## Step 3: Get Supabase Project Configuration

**🚨 CRITICAL STEP: You MUST get your Supabase project configuration for Edge Functions to work.**

1. **Go to your Supabase Dashboard**
2. **Navigate to Project Settings** (gear icon) > **API**
3. **Copy your Project URL** (e.g., `https://your-project-id.supabase.co`)
4. **Copy your Service Role Key** (under 'Project API keys', find the `service_role` key - it's marked as `secret`)

## Step 4: Set Edge Function Secrets

**🚨 CRITICAL STEP: You MUST set ALL these secrets for the Edge Functions to work.**

### Option A: Using Supabase CLI (Recommended)

```bash
# REQUIRED: Supabase Configuration (replace with your actual values)
supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# REQUIRED: Congress.gov API Key (replace with your actual key)
supabase secrets set CONGRESS_API_KEY=your_actual_congress_api_key_here

# Optional: Google Gemini API Key for AI features
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Tavus API Key for video generation
supabase secrets set TAVUS_API_KEY=your_tavus_api_key_here

# Optional: ElevenLabs API Key for future audio features
supabase secrets set ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### Option B: Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** > **Manage secrets**
3. Add the following secrets:
   - **Key**: `SUPABASE_URL`, **Value**: Your Project URL
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`, **Value**: Your service role key
   - **Key**: `CONGRESS_API_KEY`, **Value**: your Congress.gov API key
   - **Key**: `GEMINI_API_KEY`, **Value**: your Gemini API key (optional)
   - **Key**: `TAVUS_API_KEY`, **Value**: your Tavus API key (optional)

**⚠️ Important:** Make sure to use your actual values, not placeholder text!

## Step 5: Deploy Edge Functions

### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   supabase link --project-ref your-project-id
   ```

4. **Deploy the functions**:
   ```bash
   supabase functions deploy congress-api
   supabase functions deploy ai-analysis
   supabase functions deploy bill-data-processor
   supabase functions deploy tavus-video
   ```

### Option B: Manual Deployment via Dashboard

1. Go to your Supabase dashboard
2. Navigate to "Edge Functions" in the sidebar
3. Click "Create Function"
4. Copy and paste each function code from the `supabase/functions/` directory

## Step 6: Verify Setup

### Check Secrets Are Set
1. Go to Supabase dashboard > Edge Functions > Manage secrets
2. Verify ALL these secrets are listed:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CONGRESS_API_KEY`
   - `TAVUS_API_KEY` (if using video features)

### Test the Functions
1. Go to your app's Debug page (`/debug`)
2. Click "Test Congress API"
3. If you see an error about missing secrets, they are not set correctly

## Step 7: Update Client Environment

Your `.env` file now only needs:

```env
# Supabase Configuration (Client-side only)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Tavus Replica ID for video generation
VITE_TAVUS_REPLICA_ID=r6ca16dbe104

# No API keys needed here - they're secure in Edge Functions!
```

## Troubleshooting

### "TypeError: Failed to fetch" Error

This error means the Edge Functions cannot make network requests, usually because Supabase configuration secrets are missing:

1. **Verify ALL required secrets are set**:
   - Go to Supabase Dashboard > Edge Functions > Manage secrets
   - Ensure these are present:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `CONGRESS_API_KEY`
     - `TAVUS_API_KEY` (if using video features)

2. **Set missing secrets**:
   ```bash
   supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   supabase secrets set CONGRESS_API_KEY=your_congress_api_key
   supabase secrets set TAVUS_API_KEY=your_tavus_api_key
   ```

3. **Redeploy ALL functions after setting secrets**:
   ```bash
   supabase functions deploy congress-api
   supabase functions deploy bill-data-processor
   supabase functions deploy ai-analysis
   supabase functions deploy tavus-video
   ```

### "CONGRESS_API_KEY not configured" Error

This error means the API key secret is not set in Supabase:

1. **Verify you have a Congress.gov API key**:
   - Go to https://api.congress.gov/sign-up
   - Create account and get your key
   - **Test the key works:**
     ```bash
     curl "https://api.congress.gov/v3/bill?api_key=YOUR_KEY&format=json&limit=1"
     ```

2. **Set the secret in Supabase**:
   ```bash
   supabase secrets set CONGRESS_API_KEY=your_actual_key_here
   ```

3. **Redeploy the function**:
   ```bash
   supabase functions deploy congress-api
   ```

### "TAVUS_API_KEY not configured" Error

This error means the Tavus API key secret is not set:

1. **Get your Tavus API key**:
   - Go to https://www.tavus.io/
   - Create account and get your API key
   - **Test the key works:**
     ```bash
     curl -X GET "https://api.tavus.io/v2/replicas" \
       -H "Authorization: Bearer your_tavus_api_key" \
       -H "Content-Type: application/json"
     ```

2. **Set the secret in Supabase**:
   ```bash
   supabase secrets set TAVUS_API_KEY=your_tavus_api_key
   ```

3. **Redeploy the function**:
   ```bash
   supabase functions deploy tavus-video
   ```

### "Network error connecting to Tavus API" Error

This specific error occurs when the Tavus API key is missing or invalid:

1. **Verify the Tavus API key is set**:
   - Go to Supabase Dashboard > Edge Functions > Manage secrets
   - Confirm `TAVUS_API_KEY` is present

2. **Test your Tavus API key**:
   ```bash
   curl -X GET "https://api.tavus.io/v2/replicas" \
     -H "Authorization: Bearer your_tavus_api_key" \
     -H "Content-Type: application/json"
   ```

3. **Set/update the secret and redeploy**:
   ```bash
   supabase secrets set TAVUS_API_KEY=your_tavus_api_key
   supabase functions deploy tavus-video
   ```

### "Edge Function is not deployed or not responding" Error

This error indicates the Edge Function itself is not working:

1. **Check if the Edge Function is deployed**:
   - Go to Supabase Dashboard > Edge Functions
   - Verify `congress-api`, `bill-data-processor`, `ai-analysis`, and `tavus-video` functions exist

2. **Check function logs**:
   - Click on each function name
   - View "Logs" tab for detailed errors

3. **Verify ALL secrets are set**:
   - Go to Edge Functions > Manage secrets
   - Ensure all required secrets are present

4. **Redeploy functions**:
   ```bash
   supabase functions deploy congress-api
   supabase functions deploy bill-data-processor
   supabase functions deploy ai-analysis
   supabase functions deploy tavus-video
   ```

### Function Logs

To view detailed error logs:
1. Go to Supabase dashboard
2. Navigate to "Edge Functions"
3. Click on function name (e.g., "tavus-video")
4. View "Logs" tab

### Testing API Keys Directly

Test your Congress.gov API key:
```bash
curl "https://api.congress.gov/v3/bill?api_key=YOUR_KEY&format=json&limit=1"
```

Test your Tavus API key:
```bash
curl -X GET "https://api.tavus.io/v2/replicas" \
  -H "Authorization: Bearer your_tavus_api_key" \
  -H "Content-Type: application/json"
```

**Expected response**: JSON data
**Error response**: HTML error page or authentication error

## Common Setup Issues

### 1. Missing Supabase Configuration
- Edge Functions need `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to work
- These are NOT automatically available and must be set as secrets
- Get these from your Supabase Dashboard > Settings > API

### 2. API Key Not Activated
- Congress.gov API keys require email confirmation
- Tavus API keys may need account verification
- Check your email for activation links
- Wait up to 30 minutes for activation

### 3. Wrong API Key Format
- Congress keys should be UUID format: `abcd1234-efgh-5678-ijkl-9012mnop3456`
- Tavus keys typically start with `tvs_`
- Don't include extra spaces or characters

### 4. Secrets Not Updating
- After setting secrets, always redeploy ALL affected functions
- Secrets are only loaded when the function is deployed

### 5. Network Issues
- Some networks block external API calls
- Try from a different network if issues persist

## Edge Function Endpoints

Your functions are available at:

- **Congress API**: `https://your-project.supabase.co/functions/v1/congress-api`
- **AI Analysis**: `https://your-project.supabase.co/functions/v1/ai-analysis`
- **Bill Data Processor**: `https://your-project.supabase.co/functions/v1/bill-data-processor`
- **Tavus Video**: `https://your-project.supabase.co/functions/v1/tavus-video`

## Function Usage Examples

### Congress API Function
```typescript
// Get bills
const bills = await edgeFunctionService.getCongressBills({
  congress: 118,
  limit: 20
});

// Get specific bill
const bill = await edgeFunctionService.getCongressBill(118, 'HR', 1234);

// Search bills
const results = await edgeFunctionService.searchCongressBills('healthcare');
```

### AI Analysis Function
```typescript
// Generate analysis for a bill
const analysis = await edgeFunctionService.generateBillAnalysis(
  '118-HR-1234',
  { location: { state: 'CA' } }
);
```

### Tavus Video Function
```typescript
// Generate video briefing
const video = await tavusService.generateBillBriefing(
  '118-HR-1234',
  'Healthcare Reform Bill Summary...'
);

// Check video status
const status = await tavusService.getVideoStatus(video.id);
```

## Security Features

### Authentication Verification
All functions verify user authentication:
```typescript
const { data: { user }, error } = await supabase.auth.getUser(token);
if (authError || !user) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Rate Limiting
Built-in Supabase rate limiting protects against abuse.

### CORS Configuration
Proper CORS headers for secure cross-origin requests.

## Monitoring and Debugging

### View Function Logs
1. Go to Supabase dashboard
2. Navigate to "Edge Functions"
3. Click on a function name
4. View "Logs" tab for debugging

### Monitor Usage
1. Check "Usage" tab for function invocation metrics
2. Monitor API key usage in respective service dashboards

## Cost Optimization

### Edge Function Pricing
- First 500,000 invocations per month: Free
- Additional invocations: $2 per million

### API Usage Monitoring
- Monitor Congress.gov API usage (1000 requests/hour limit)
- Track Gemini API token usage
- Monitor Tavus video generation costs
- Set up alerts for usage thresholds

## Quick Setup Checklist

- [ ] Create Congress.gov account at https://api.congress.gov/sign-up
- [ ] Confirm email and get API key
- [ ] Test API key with curl command
- [ ] Get Supabase project URL and service role key from dashboard
- [ ] Set `SUPABASE_URL` secret in Supabase
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` secret in Supabase
- [ ] Set `CONGRESS_API_KEY` secret in Supabase
- [ ] Set `TAVUS_API_KEY` secret in Supabase (if using video features)
- [ ] Deploy ALL Edge Functions
- [ ] Test functions in app's Debug page
- [ ] Verify bills can be synced in the app
- [ ] Test video generation (if using Tavus)

## Next Steps

1. **Set ALL required secrets** (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CONGRESS_API_KEY, TAVUS_API_KEY)
2. **Deploy all edge functions**
3. **Test all functions** with real data
4. **Monitor performance** and usage
5. **Add error handling** for production
6. **Set up monitoring alerts**
7. **Scale as needed** based on usage

This secure architecture ensures your API keys are never exposed while providing a scalable, maintainable solution for your legislative tracking platform with video generation capabilities.