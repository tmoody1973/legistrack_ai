const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface RequestPayload {
  action: string;
  params: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { action, params }: RequestPayload = await req.json();
    
    console.log(`🔍 GovTrack Integration - Action: ${action}`, params);
    
    const baseUrl = 'https://www.govtrack.us/api/v2';
    let url = '';
    
    switch (action) {
      case 'getBillVotes':
        url = `${baseUrl}/vote?related_bill__congress=${params.congress}&related_bill__bill_type=${params.billType}&related_bill__number=${params.billNumber}&limit=100&sort=-created`;
        break;
        
      case 'getVoteDetails':
        url = `${baseUrl}/vote/${params.voteId}`;
        break;
        
      case 'getVoteVoters':
        url = `${baseUrl}/vote_voter?vote=${params.voteId}&limit=500`;
        break;
        
      case 'getMemberVotes':
        url = `${baseUrl}/vote_voter?person=${params.personId}&limit=100&sort=-created`;
        if (params.congress) {
          url += `&vote__congress=${params.congress}`;
        }
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    console.log(`🌐 Making request to GovTrack: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ GovTrack API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`GovTrack API error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ GovTrack API request successful`);
    
    return new Response(
      JSON.stringify(data),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error(`❌ Error in GovTrack integration:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});