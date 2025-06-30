import { congressApiService } from './congressApiService';
import { govtrackApiService } from './govtrackApiService';

class CongressVotingService {
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
      console.log('📦 Using cached voting data for:', key);
      return cached.data;
    }

    console.log('🔄 Fetching fresh voting data for:', key);
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Get votes for a specific bill
   * @param congress Congress number
   * @param billType Bill type (HR, S, etc.)
   * @param billNumber Bill number
   * @returns Array of votes for the bill
   */
  async getBillVotes(congress: number, billType: string, billNumber: number): Promise<any> {
    try {
      console.log(`🔍 Fetching votes for bill: ${congress}-${billType}-${billNumber}`);
      
      const cacheKey = `bill-votes-${congress}-${billType}-${billNumber}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        // Use GovTrack API to get bill votes since Congress.gov API doesn't provide this
        return await govtrackApiService.getBillVotes(congress, billType, billNumber);
      });
    } catch (error) {
      console.error(`❌ Error fetching bill votes:`, error);
      throw error;
    }
  }

  /**
   * Get votes for a specific Congress
   * @param congress Congress number
   * @param chamber Chamber (house or senate)
   * @param limit Maximum number of votes to return
   * @returns Array of votes for the Congress
   */
  async getCongressVotes(congress: number, chamber: 'house' | 'senate' = 'house', limit: number = 20): Promise<any> {
    try {
      console.log(`🔍 Fetching votes for ${congress}th Congress, ${chamber} chamber`);
      
      const cacheKey = `congress-votes-${congress}-${chamber}-${limit}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        // Fetch votes from Congress.gov API
        const response = await congressApiService.makeRequest(`/congress/${congress}/votes`, {
          chamber: chamber,
          limit: limit
        });
        
        if (!response?.votes) {
          return { votes: [], total: 0 };
        }
        
        return {
          votes: response.votes,
          total: response.pagination?.count || 0
        };
      });
    } catch (error) {
      console.error(`❌ Error fetching Congress votes:`, error);
      throw error;
    }
  }

  /**
   * Get votes for a specific Congress and session
   * @param congress Congress number
   * @param session Session number
   * @param chamber Chamber (house or senate)
   * @param limit Maximum number of votes to return
   * @returns Array of votes for the Congress and session
   */
  async getCongressSessionVotes(
    congress: number, 
    session: number, 
    chamber: 'house' | 'senate' = 'house', 
    limit: number = 20
  ): Promise<any> {
    try {
      console.log(`🔍 Fetching votes for ${congress}th Congress, session ${session}, ${chamber} chamber`);
      
      const cacheKey = `congress-session-votes-${congress}-${session}-${chamber}-${limit}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        // Fetch votes from Congress.gov API
        const response = await congressApiService.makeRequest(`/congress/${congress}/votes`, {
          chamber: chamber,
          session: session,
          limit: limit
        });
        
        if (!response?.votes) {
          return { votes: [], total: 0 };
        }
        
        return {
          votes: response.votes,
          total: response.pagination?.count || 0
        };
      });
    } catch (error) {
      console.error(`❌ Error fetching Congress session votes:`, error);
      throw error;
    }
  }

  /**
   * Get details for a specific vote
   * @param congress Congress number
   * @param chamber Chamber (house or senate)
   * @param voteNumber Vote number
   * @returns Vote details
   */
  async getVoteDetails(congress: number, chamber: 'house' | 'senate', voteNumber: number): Promise<any> {
    try {
      console.log(`🔍 Fetching details for vote: ${congress}-${chamber}-${voteNumber}`);
      
      const cacheKey = `vote-details-${congress}-${chamber}-${voteNumber}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        // Fetch vote details from Congress.gov API
        const response = await congressApiService.makeRequest(`/congress/${congress}/votes/${chamber}/${voteNumber}`);
        
        if (!response?.vote) {
          throw new Error('Vote details not found');
        }
        
        return response.vote;
      });
    } catch (error) {
      console.error(`❌ Error fetching vote details:`, error);
      throw error;
    }
  }

  /**
   * Get member voting record
   * @param bioguideId Member's bioguide ID
   * @param congress Congress number (optional)
   * @param limit Maximum number of votes to return
   * @returns Member's voting record
   */
  async getMemberVotingRecord(bioguideId: string, congress?: number, limit: number = 20): Promise<any> {
    try {
      console.log(`🔍 Fetching voting record for member: ${bioguideId}`);
      
      const cacheKey = `member-voting-record-${bioguideId}-${congress || 'all'}-${limit}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        // First get the member's GovTrack ID
        const { data: representative, error } = await supabase
          .from('representatives')
          .select('govtrack_id')
          .eq('bioguide_id', bioguideId)
          .single();
        
        if (error || !representative || !representative.govtrack_id) {
          throw new Error('Representative not found or missing GovTrack ID');
        }
        
        // Use GovTrack API to get member votes
        return await govtrackApiService.getMemberVotes(representative.govtrack_id, congress);
      });
    } catch (error) {
      console.error(`❌ Error fetching member voting record:`, error);
      throw error;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Congress voting service cache cleared');
  }
}

export const congressVotingService = new CongressVotingService();