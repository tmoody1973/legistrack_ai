const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface TavusVideoRequest {
  action: 'generate' | 'status' | 'list';
  videoId?: string;
  script?: string;
  metadata?: Record<string, any>;
}

interface TavusVideoResponse {
  video_id: string;
  video_name?: string;
  status: 'processing' | 'completed' | 'failed' | 'ready';
  data?: {
    script?: string;
  };
  download_url?: string;
  stream_url?: string;
  hosted_url?: string;
  status_details?: string;
  created_at: string;
  updated_at?: string;
  still_image_thumbnail_url?: string;
  gif_thumbnail_url?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const tavusApiKey = Deno.env.get('TAVUS_API_KEY')
    const replicaId = Deno.env.get('VITE_TAVUS_REPLICA_ID') || 'r6ca16dbe104'

    if (!tavusApiKey) {
      console.error('TAVUS_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Tavus API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { action, videoId, script, metadata }: TavusVideoRequest = await req.json()

    // Corrected header from Authorization to x-api-key
    const tavusHeaders = {
      'x-api-key': tavusApiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    let response: Response
    let result: any

    switch (action) {
      case 'generate':
        if (!script) {
          return new Response(
            JSON.stringify({ error: 'Script is required for video generation' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log('Generating video with script length:', script.length)
        
        try {
          // Corrected URL from api.tavus.io to tavusapi.com
          response = await fetch('https://tavusapi.com/v2/videos', {
            method: 'POST',
            headers: tavusHeaders,
            body: JSON.stringify({
              replica_id: replicaId,
              script,
              metadata: metadata || {}
            })
          })
        } catch (fetchError) {
          console.error('Network error calling Tavus API:', fetchError)
          return new Response(
            JSON.stringify({ 
              error: 'Network error connecting to Tavus API',
              details: fetchError.message 
            }),
            { 
              status: 503, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Tavus API error:', response.status, errorText)
          return new Response(
            JSON.stringify({ 
              error: `Tavus API error: ${response.status}`,
              details: errorText 
            }),
            { 
              status: response.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        result = await response.json()
        console.log('Video generation successful:', result.video_id)
        break

      case 'status':
        if (!videoId) {
          return new Response(
            JSON.stringify({ error: 'Video ID is required for status check' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        try {
          // Corrected URL from api.tavus.io to tavusapi.com
          response = await fetch(`https://tavusapi.com/v2/videos/${videoId}`, {
            method: 'GET',
            headers: tavusHeaders
          })
        } catch (fetchError) {
          console.error('Network error calling Tavus API:', fetchError)
          return new Response(
            JSON.stringify({ 
              error: 'Network error connecting to Tavus API',
              details: fetchError.message 
            }),
            { 
              status: 503, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Tavus API error:', response.status, errorText)
          return new Response(
            JSON.stringify({ 
              error: `Tavus API error: ${response.status}`,
              details: errorText 
            }),
            { 
              status: response.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        result = await response.json()
        break

      case 'list':
        try {
          // Corrected URL from api.tavus.io to tavusapi.com
          response = await fetch('https://tavusapi.com/v2/videos', {
            method: 'GET',
            headers: tavusHeaders
          })
        } catch (fetchError) {
          console.error('Network error calling Tavus API:', fetchError)
          return new Response(
            JSON.stringify({ 
              error: 'Network error connecting to Tavus API',
              details: fetchError.message 
            }),
            { 
              status: 503, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Tavus API error:', response.status, errorText)
          return new Response(
            JSON.stringify({ 
              error: `Tavus API error: ${response.status}`,
              details: errorText 
            }),
            { 
              status: response.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        result = await response.json()
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})