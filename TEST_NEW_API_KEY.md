# Testing Your New Congress API Key

## Quick Test Steps

### 1. First, let's test your API key directly

Open a terminal and run this command (replace `YOUR_NEW_API_KEY` with your actual key):

```bash
curl "https://api.congress.gov/v3/bill?api_key=YOUR_NEW_API_KEY&format=json&limit=1"
```

**Expected Result**: You should see JSON data with bill information
**If you get an error**: Your API key may not be activated yet

### 2. Check Supabase Secrets

Make sure ALL these secrets are set in your Supabase project:

1. Go to **Supabase Dashboard** > **Edge Functions** > **Manage secrets**
2. Verify these secrets exist:
   - `SUPABASE_URL` (your project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (from Settings > API)
   - `CONGRESS_API_KEY` (your new API key)

### 3. Redeploy Edge Functions

**CRITICAL**: After updating the API key, you must redeploy the functions:

```bash
supabase functions deploy congress-api
supabase functions deploy bill-data-processor
supabase functions deploy ai-analysis
```

### 4. Test in Your App

1. **Go to Debug page** in your app
2. **Click "Test Congress API"**
3. **Should see success message** with bill data

If it works, then:
4. **Go to Bills page**
5. **Click "Sync Latest Bills"**
6. **Should load bills successfully**

## If You're Still Getting Errors

### "CONGRESS_API_KEY not configured"
- The secret isn't set in Supabase
- Set it: `supabase secrets set CONGRESS_API_KEY=your_key_here`
- Redeploy: `supabase functions deploy congress-api`

### "TypeError: Failed to fetch"
- Missing Supabase configuration secrets
- Set: `supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co`
- Set: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`
- Redeploy all functions

### "Invalid Congress API key"
- API key not activated yet (check email)
- Wrong API key format
- Test the key directly with curl command above

## Need Help?

Let me know:
1. What happens when you test the API key with curl?
2. Are all the secrets set in Supabase?
3. What error messages do you see in the app?

I can help troubleshoot any specific issues!