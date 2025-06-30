import { supabase } from '../lib/supabase';
import type { Bill, Vote } from '../types';

class GovtrackApiService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  // Check if cached data is still valid
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  // Get from cache or fetch new data
  private async getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('📦 Using cached GovTrack data for:', key);
      return cached.data;
    }

    console.log('🔄 Fetching fresh GovTrack data for:', key);
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  // Make request through Supabase Edge Function
  private async makeEdgeFunctionRequest(action: string, params: any): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/govtrack-integration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action,
          params
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Edge Function error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Edge Function error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ Error making Edge Function request:`, error);
      throw error;
    }
  }

  /**
   * Get votes for a specific bill
   * @param congress Congress number
   * @param billType Bill type (hr, s, etc.)
   * @param billNumber Bill number
   * @returns Array of votes for the bill
   */
  async getBillVotes(congress: number, billType: string, billNumber: number): Promise<any> {
    try {
      console.log(`🔍 Fetching votes for bill: ${congress}-${billType}-${billNumber} from GovTrack`);
      
      const cacheKey = `bill-votes-${congress}-${billType}-${billNumber}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        // Convert bill type to GovTrack format (lowercase)
        const govtrackBillType = billType.toLowerCase();
        
        console.log(`🌐 Making Edge Function request for bill votes`);
        
        const data = await this.makeEdgeFunctionRequest('getBillVotes', {
          congress,
          billType: govtrackBillType,
          billNumber
        });
        
        console.log(`✅ Edge Function request successful, found ${data.objects?.length || 0} votes`);
        
        // Transform GovTrack votes to our format
        const votes = this.transformGovtrackVotes(data.objects || []);
        
        // Update bill in database with voting data
        await this.updateBillVotingData(congress, billType, billNumber, votes);
        
        return {
          votes,
          total: data.meta?.total_count || 0
        };
      });
    } catch (error) {
      console.error(`❌ Error fetching bill votes from GovTrack:`, error);
      throw error;
    }
  }

  /**
   * Get vote details from GovTrack
   * @param voteId GovTrack vote ID
   * @returns Vote details
   */
  async getVoteDetails(voteId: number): Promise<any> {
    try {
      console.log(`🔍 Fetching vote details for vote ID: ${voteId} from GovTrack`);
      
      const cacheKey = `vote-details-${voteId}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        console.log(`🌐 Making Edge Function request for vote details`);
        
        const data = await this.makeEdgeFunctionRequest('getVoteDetails', {
          voteId
        });
        
        console.log(`✅ Edge Function request successful`);
        
        return data;
      });
    } catch (error) {
      console.error(`❌ Error fetching vote details from GovTrack:`, error);
      throw error;
    }
  }

  /**
   * Get vote voters (how members voted)
   * @param voteId GovTrack vote ID
   * @returns Vote voters
   */
  async getVoteVoters(voteId: number): Promise<any> {
    try {
      console.log(`🔍 Fetching vote voters for vote ID: ${voteId} from GovTrack`);
      
      const cacheKey = `vote-voters-${voteId}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        console.log(`🌐 Making Edge Function request for vote voters`);
        
        const data = await this.makeEdgeFunctionRequest('getVoteVoters', {
          voteId
        });
        
        console.log(`✅ Edge Function request successful, found ${data.objects?.length || 0} voters`);
        
        return data.objects || [];
      });
    } catch (error) {
      console.error(`❌ Error fetching vote voters from GovTrack:`, error);
      throw error;
    }
  }

  /**
   * Get member votes (how a specific member voted)
   * @param personId GovTrack person ID
   * @param congress Congress number (optional)
   * @returns Member votes
   */
  async getMemberVotes(personId: number, congress?: number): Promise<any> {
    try {
      console.log(`🔍 Fetching votes for member ID: ${personId} from GovTrack`);
      
      const cacheKey = `member-votes-${personId}-${congress || 'all'}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        console.log(`🌐 Making Edge Function request for member votes`);
        
        const data = await this.makeEdgeFunctionRequest('getMemberVotes', {
          personId,
          congress
        });
        
        console.log(`✅ Edge Function request successful, found ${data.objects?.length || 0} votes`);
        
        return {
          votes: data.objects || [],
          total: data.meta?.total_count || 0
        };
      });
    } catch (error) {
      console.error(`❌ Error fetching member votes from GovTrack:`, error);
      throw error;
    }
  }

  /**
   * Transform GovTrack votes to our format
   * @param govtrackVotes Array of GovTrack votes
   * @returns Transformed votes
   */
  private transformGovtrackVotes(govtrackVotes: any[]): Vote[] {
    return govtrackVotes.map(vote => ({
      id: vote.id,
      govtrack_vote_id: vote.id,
      congress: vote.congress,
      chamber: vote.chamber === 'h' ? 'house' : 'senate',
      session: vote.session,
      number: vote.number,
      question: vote.question || vote.category || 'Unknown question',
      created: vote.created,
      result: vote.result || 'Unknown',
      total_votes: vote.total_plus + vote.total_minus + vote.total_other,
      total_plus: vote.total_plus || 0,
      total_minus: vote.total_minus || 0,
      total_other: vote.total_other || 0,
      govtrack_url: `https://www.govtrack.us/congress/votes/${vote.congress}/${vote.chamber}/${vote.number}`
    }));
  }

  /**
   * Update bill in database with voting data
   * @param congress Congress number
   * @param billType Bill type
   * @param billNumber Bill number
   * @param votes Transformed votes
   */
  private async updateBillVotingData(
    congress: number, 
    billType: string, 
    billNumber: number, 
    votes: Vote[]
  ): Promise<void> {
    try {
      if (votes.length === 0) return;
      
      console.log(`💾 Updating voting data for bill ${congress}-${billType}-${billNumber} in database...`);
      
      // Get the bill ID
      const billId = `${congress}-${billType.toUpperCase()}-${billNumber}`;
      
      // Calculate vote summary
      const lastVoteDate = votes.length > 0 ? votes[0].created : null;
      
      // Prepare voting data
      const votingData = {
        votes,
        vote_count: votes.length,
        last_vote_date: lastVoteDate,
        vote_summary: this.calculateVoteSummary(votes)
      };

      // Update bill in database
      const { error } = await supabase
        .from('bills')
        .update({ 
          voting_data: votingData,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (error) {
        console.warn(`Could not update voting data for bill ${billId}:`, error);
      } else {
        console.log(`✅ Successfully updated voting data for bill ${billId}`);
      }
    } catch (error) {
      console.warn(`Error updating voting data for bill:`, error);
    }
  }

  /**
   * Calculate vote summary by chamber
   * @param votes Array of votes
   * @returns Vote summary by chamber
   */
  private calculateVoteSummary(votes: Vote[]): any {
    const summary: any = {};
    
    // Group votes by chamber
    const houseVotes = votes.filter(vote => vote.chamber === 'house');
    const senateVotes = votes.filter(vote => vote.chamber === 'senate');
    
    // Add house summary if there are house votes
    if (houseVotes.length > 0) {
      const latestHouseVote = houseVotes[0]; // Assuming votes are sorted by date desc
      summary.house = {
        result: latestHouseVote.result,
        date: latestHouseVote.created,
        vote_count: houseVotes.length
      };
    }
    
    // Add senate summary if there are senate votes
    if (senateVotes.length > 0) {
      const latestSenateVote = senateVotes[0]; // Assuming votes are sorted by date desc
      summary.senate = {
        result: latestSenateVote.result,
        date: latestSenateVote.created,
        vote_count: senateVotes.length
      };
    }
    
    return summary;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 GovTrack API cache cleared');
  }
}

export const govtrackApiService = new GovtrackApiService();