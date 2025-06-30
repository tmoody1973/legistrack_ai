# Tavus API Setup Guide
## Setting Up Video Generation with Tavus

## Overview

The Tavus video generation feature requires proper API key configuration. This guide will help you set up the Tavus API integration.

## Step 1: Get Your Tavus API Key

1. **Sign up for Tavus** (if you haven't already):
   - Visit: https://www.tavus.io/
   - Create an account and complete the onboarding process

2. **Get your API Key**:
   - Log in to your Tavus dashboard
   - Navigate to the API section or Settings
   - Copy your API key (it should look like: `tvs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

3. **Test your API key** (optional but recommended):
   ```bash
   curl -X GET "https://api.tavus.io/v2/replicas" \
     -H "Authorization: Bearer your_tavus_api_key_here" \
     -H "Content-Type: application/json"
   ```

## Step 2: Add the API Key to Your .env File

1. **Create or edit your .env file** in the project root:
   ```
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Tavus API Configuration
   VITE_TAVUS_API_KEY=your_tavus_api_key_here
   VITE_TAVUS_REPLICA_ID=r6ca16dbe104
   ```

2. **Replace `your_tavus_api_key_here`** with your actual Tavus API key

3. **Restart your development server** to apply the changes:
   ```bash
   npm run dev
   ```

## Step 3: Verify the Setup

1. **Test video generation**:
   - Go to any bill detail page in your app
   - Click on the "Video Briefing" tab
   - Try generating a video briefing
   - Should see success instead of network error

## Troubleshooting

### If you get "Tavus API is not available" error:

1. **Check your .env file**:
   - Make sure `VITE_TAVUS_API_KEY` is set correctly
   - Ensure there are no typos or extra spaces
   - Verify the API key format (should start with `tvs_`)

2. **Restart your development server**:
   ```bash
   npm run dev
   ```

3. **Check browser console** for any errors

### If you get "Failed to generate video" error:

1. **Check your API key is valid**:
   ```bash
   curl -X GET "https://api.tavus.io/v2/replicas" \
     -H "Authorization: Bearer your_tavus_api_key_here" \
     -H "Content-Type: application/json"
   ```

2. **Verify your Tavus account status**:
   - Make sure your Tavus account is active
   - Check if you have sufficient credits/quota

3. **Check browser network tab** for detailed error responses

## Environment Variables Checklist

Make sure these environment variables are set in your `.env` file:

- [ ] `VITE_SUPABASE_URL` - Your Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- [ ] `VITE_CONGRESS_API_KEY` - Your Congress.gov API key
- [ ] `VITE_TAVUS_API_KEY` - Your Tavus API key
- [ ] `VITE_TAVUS_REPLICA_ID` - Your Tavus replica ID (default: r6ca16dbe104)

## Benefits of Direct API Integration

By using direct API integration instead of Edge Functions:

1. **Simplified Setup**: No need to deploy Edge Functions or set secrets
2. **Easier Debugging**: All API calls happen in the browser where you can inspect them
3. **Faster Development**: Changes take effect immediately without redeploying functions
4. **Reduced Complexity**: Fewer moving parts in your architecture

## Security Considerations

The Tavus API key is used client-side in this implementation. This is generally acceptable for:

- Development and testing environments
- Personal projects
- Applications where the API key is not highly sensitive

For production applications with sensitive API keys or high usage volumes, consider:
- Using Edge Functions to keep the API key server-side
- Implementing proper rate limiting and monitoring
- Setting up appropriate CORS and referrer restrictions in your Tavus account

## Next Steps

Once your Tavus API is working:

1. **Configure your replica** (optional):
   - Create a custom replica in your Tavus dashboard
   - Update `VITE_TAVUS_REPLICA_ID` in your environment if needed

2. **Monitor usage**:
   - Check your Tavus dashboard for API usage
   - Monitor video generation costs

3. **Set up error handling**:
   - The system will gracefully handle API failures
   - Users will see appropriate error messages

Your Tavus video generation should now be working properly!