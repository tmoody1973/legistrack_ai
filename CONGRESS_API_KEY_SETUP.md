# Congress API Key Setup Guide
## Setting Up Your New Congress.gov API Key

## Step 1: Test Your New API Key

First, let's verify your new Congress API key works:

```bash
# Replace YOUR_NEW_API_KEY with your actual key
curl "https://api.congress.gov/v3/bill?api_key=YOUR_NEW_API_KEY&format=json&limit=1"
```

**Expected Response**: JSON data with bill information
**Error Response**: HTML error page or authentication error

## Step 2: Set the API Key as a Supabase Secret

### Option A: Using Supabase CLI (Recommended)

```bash
# Replace YOUR_NEW_API_KEY with your actual Congress.gov API key
supabase secrets set CONGRESS_API_KEY=YOUR_NEW_API_KEY
```

### Option B: Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** in the sidebar
3. Click **"Manage secrets"**
4. Find the existing `CONGRESS_API_KEY` entry and update it, or add a new one:
   - **Key**: `CONGRESS_API_KEY`
   - **Value**: Your new Congress.gov API key
5. Click **Save**

## Step 3: Verify Required Secrets Are Set

Make sure ALL these secrets are configured in Supabase:

```bash
# Check that these are all set in Supabase Dashboard > Edge Functions > Manage secrets
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CONGRESS_API_KEY=your_new_congress_api_key
```

**To get your Supabase configuration:**
1. Go to Supabase Dashboard > Settings > API
2. Copy your **Project URL** (for SUPABASE_URL)
3. Copy your **service_role** key (for SUPABASE_SERVICE_ROLE_KEY)

## Step 4: Redeploy Edge Functions

**⚠️ CRITICAL**: After updating secrets, you MUST redeploy ALL Edge Functions:

```bash
# Redeploy all functions to pick up the new API key
supabase functions deploy congress-api
supabase functions deploy bill-data-processor
supabase functions deploy ai-analysis
```

## Step 5: Test the Setup

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Test the Congress API**:
   - Go to the Debug page in your app
   - Click **"Test Congress API"**
   - Should see success message with bill data

3. **Test bill syncing**:
   - Go to the Bills page
   - Click **"Sync Latest Bills"**
   - Should successfully load bills from Congress.gov

## Troubleshooting

### If you get "CONGRESS_API_KEY not configured" error:

1. **Verify the secret is set**:
   - Go to Supabase Dashboard > Edge Functions > Manage secrets
   - Confirm `CONGRESS_API_KEY` is listed

2. **Redeploy the function**:
   ```bash
   supabase functions deploy congress-api
   ```

### If you get "Invalid Congress API key" error:

1. **Test your key directly**:
   ```bash
   curl "https://api.congress.gov/v3/bill?api_key=YOUR_KEY&format=json&limit=1"
   ```

2. **Check if key needs activation**:
   - Check your email for activation instructions
   - Some keys take up to 30 minutes to activate

### If you get "TypeError: Failed to fetch" error:

This usually means Supabase configuration secrets are missing:

1. **Set all required secrets**:
   ```bash
   supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   supabase secrets set CONGRESS_API_KEY=your_congress_api_key
   ```

2. **Redeploy ALL functions**:
   ```bash
   supabase functions deploy congress-api
   supabase functions deploy bill-data-processor
   supabase functions deploy ai-analysis
   ```

## Quick Setup Checklist

- [ ] Test new Congress API key with curl command
- [ ] Set `CONGRESS_API_KEY` secret in Supabase
- [ ] Verify `SUPABASE_URL` secret is set
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` secret is set
- [ ] Redeploy all Edge Functions
- [ ] Test Congress API in Debug page
- [ ] Test bill sync in Bills page

## Next Steps

Once your new API key is working:

1. **Monitor usage**: Check your Congress.gov account for API usage
2. **Test all features**: Try searching, filtering, and viewing bills
3. **Check logs**: Monitor Edge Function logs for any issues
4. **Set up alerts**: Consider setting up usage alerts for your API key

Your new Congress API key should now be working with the LegisTrack AI application!