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

## Step 2: Get Supabase Project Configuration

**🚨 CRITICAL STEP: You MUST get your Supabase project configuration for Edge Functions to work.**

1. **Go to your Supabase Dashboard**
2. **Navigate to Project Settings** (gear icon) > **API**
3. **Copy your Project URL** (e.g., `https://your-project-id.supabase.co`)
4. **Copy your Service Role Key** (under 'Project API keys', find the `service_role` key - it's marked as `secret`)

## Step 3: Deploy Edge Functions

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
   ```

### Option B: Manual Deployment via Dashboard

1. Go to your Supabase dashboard
2. Navigate to "Edge Functions" in the sidebar
3. Click "Create Function"
4. Copy and paste each function code from the `supabase/functions/` directory

## Step 4: Set Edge Function Secrets

**🚨 CRITICAL STEP: You MUST set ALL these secrets for the Edge Functions to work.**

Set your configuration and API keys as secrets (not environment variables):

```bash
# REQUIRED: Supabase Configuration (replace with your actual values)
supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# REQUIRED: Congress.gov API Key
supabase secrets set CONGRESS_API_KEY=your_congress_api_key_here

# Optional: Google Gemini API Key  
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here

# Future AI services
supabase secrets set TAVUS_API_KEY=your_tavus_api_key_here
supabase secrets set ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

Or set them via the Supabase dashboard:
1. Go to Edge Functions > Manage secrets
2. Add each secret key-value pair:
   - **Key**: `SUPABASE_URL`, **Value**: Your Project URL
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`, **Value**: Your service role key
   - **Key**: `CONGRESS_API_KEY`, **Value**: Your Congress.gov API key
   - **Key**: `GEMINI_API_KEY`, **Value**: Your Gemini API key (optional)

## Step 5: Get API Keys

### Congress.gov API Key (REQUIRED)
1. Visit: https://api.congress.gov/sign-up
2. Create a free account
3. Wait for email confirmation
4. Copy your API key
5. Set as secret: `CONGRESS_API_KEY`

### Google Gemini API Key (Optional)
1. Visit: https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key
4. Set as secret: `GEMINI_API_KEY`

### Future Services (Optional)
- **Tavus**: For personalized video generation
- **ElevenLabs**: For text-to-speech conversion

## Step 6: Redeploy Functions After Setting Secrets

**⚠️ CRITICAL: After setting secrets, you MUST redeploy ALL functions for changes to take effect.**

```bash
supabase functions deploy congress-api
supabase functions deploy ai-analysis
supabase functions deploy bill-data-processor
```

## Step 7: Update Client Environment

Your `.env` file now only needs:

```env
# Supabase Configuration (Client-side only)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# No API keys needed here - they're secure in Edge Functions!
```

## Step 8: Test the Setup

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Test authentication**:
   - Create a new account
   - Login successfully

3. **Test bill syncing**:
   - Go to Bills page
   - Click "Sync Latest Bills"
   - Verify bills are loaded from Congress.gov

4. **Test AI analysis** (if Gemini key is set):
   - Click on a bill to view details
   - AI analysis should generate automatically

## Edge Function Endpoints

Your functions are available at:

- **Congress API**: `https://your-project.supabase.co/functions/v1/congress-api`
- **AI Analysis**: `https://your-project.supabase.co/functions/v1/ai-analysis`
- **Bill Data Processor**: `https://your-project.supabase.co/functions/v1/bill-data-processor`

## Function Usage Examples

### Congress API Function
```typescript
// Get bills
const bills = await edgeFunctions.getCongressBills({
  congress: 118,
  limit: 20
});

// Get specific bill
const bill = await edgeFunctions.getCongressBill(118, 'HR', 1234);

// Search bills
const results = await edgeFunctions.searchCongressBills('healthcare');
```

### AI Analysis Function
```typescript
// Generate analysis for a bill
const analysis = await edgeFunctions.generateBillAnalysis(
  '118-HR-1234',
  { location: { state: 'CA' } }
);
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

## Troubleshooting

### "TypeError: Failed to fetch" Error

This error means the Edge Functions cannot make network requests, usually because Supabase configuration secrets are missing:

1. **Verify ALL required secrets are set**:
   - Go to Supabase Dashboard > Edge Functions > Manage secrets
   - Ensure these are present:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `CONGRESS_API_KEY`

2. **Set missing secrets**:
   ```bash
   supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   supabase secrets set CONGRESS_API_KEY=your_congress_api_key
   ```

3. **Redeploy ALL functions after setting secrets**:
   ```bash
   supabase functions deploy congress-api
   supabase functions deploy bill-data-processor
   supabase functions deploy ai-analysis
   ```

### Common Issues

1. **Function not found**:
   - Verify function is deployed
   - Check function name spelling

2. **Authentication errors**:
   - Ensure user is logged in
   - Check token is being passed correctly

3. **API key errors**:
   - Verify secrets are set correctly
   - Check API key validity in service dashboard

4. **CORS errors**:
   - Verify CORS headers in function
   - Check request origin

5. **Missing Supabase configuration**:
   - Edge Functions need `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - These are NOT automatically available and must be set as secrets

### Debug Steps

1. **Check function logs** in Supabase dashboard
2. **Verify ALL secrets** are set correctly (including SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
3. **Test API keys** directly in service dashboards
4. **Check network tab** in browser dev tools
5. **Redeploy functions** after setting secrets

## Cost Optimization

### Edge Function Pricing
- First 500,000 invocations per month: Free
- Additional invocations: $2 per million

### API Usage Monitoring
- Monitor Congress.gov API usage (1000 requests/hour limit)
- Track Gemini API token usage
- Set up alerts for usage thresholds

## Next Steps

1. **Set ALL required secrets** (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CONGRESS_API_KEY)
2. **Deploy and redeploy all functions**
3. **Test all functions** with real data
4. **Monitor performance** and usage
5. **Add error handling** for production
6. **Set up monitoring alerts**
7. **Scale as needed** based on usage

This secure architecture ensures your API keys are never exposed while providing a scalable, maintainable solution for your legislative tracking platform.