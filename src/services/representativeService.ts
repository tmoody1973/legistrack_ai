import { supabase } from '../lib/supabase';
import { congressApiService } from './congressApiService';
import type { Representative } from '../types';

class RepresentativeService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for representatives

  // State abbreviation to full name mapping
  private stateMapping: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  };

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  private async getCachedOrFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('📦 Using cached representatives data for:', key);
      return cached.data;
    }

    console.log('🔄 Fetching fresh representatives data for:', key);
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  private getFullStateName(state: string): string {
    if (state.length === 2) {
      return this.stateMapping[state.toUpperCase()] || state;
    }
    return state;
  }

  // Optimized location-based representative lookup
  async getRepresentativesByLocation(state?: string, district?: number): Promise<Representative[]> {
    try {
      if (!state) {
        console.log('❌ No state provided to getRepresentativesByLocation');
        return [];
      }

      const cacheKey = `reps-${state}-${district || 'all'}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        const fullStateName = this.getFullStateName(state);
        console.log(`🔍 Looking for representatives in state: ${state} -> ${fullStateName}, district: ${district}`);

        // Try both state formats efficiently with a single query
        const statesToTry = [state, fullStateName];
        
        // Log the query we're about to make
        console.log(`🔍 Querying representatives table with states: ${statesToTry.join(', ')}`);
        
        const { data: allStateReps, error: stateError } = await supabase
          .from('representatives')
          .select('*')
          .in('state', statesToTry)
          .eq('is_active', true);

        if (stateError) {
          console.error(`❌ Error fetching representatives:`, stateError);
          return [];
        }

        if (!allStateReps || allStateReps.length === 0) {
          console.log(`❌ No representatives found for any variation of state: ${statesToTry.join(', ')}`);
          return [];
        }

        console.log(`📊 Found ${allStateReps.length} total representatives`);

        // Filter efficiently
        const senators = allStateReps.filter(rep => rep.chamber === 'senate');
        console.log(`👥 Found ${senators.length} senators`);

        let houseRep = null;
        if (district) {
          houseRep = allStateReps.find(rep => 
            rep.chamber === 'house' && rep.district === district
          );
          console.log(`🏛️ House rep for district ${district}:`, houseRep ? houseRep.full_name : 'Not found');
        }

        const representatives = [...senators];
        if (houseRep) {
          representatives.push(houseRep);
        }

        console.log(`✅ Final representatives list (${representatives.length})`);
        return representatives;
      });
    } catch (error) {
      console.error('❌ Error fetching representatives:', error);
      throw error;
    }
  }

  // Optimized general representative fetching
  async getRepresentatives(filters: {
    state?: string;
    chamber?: 'house' | 'senate';
    party?: string;
    limit?: number;
  } = {}): Promise<Representative[]> {
    try {
      const cacheKey = `reps-filter-${JSON.stringify(filters)}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        let query = supabase
          .from('representatives')
          .select('*')
          .eq('is_active', true);

        if (filters.state) {
          const fullStateName = this.getFullStateName(filters.state);
          if (filters.state !== fullStateName) {
            query = query.or(`state.eq.${filters.state},state.eq.${fullStateName}`);
          } else {
            query = query.eq('state', filters.state);
          }
        }

        if (filters.chamber) {
          query = query.eq('chamber', filters.chamber);
        }

        if (filters.party) {
          query = query.eq('party', filters.party);
        }

        if (filters.limit) {
          query = query.limit(filters.limit);
        }

        query = query.order('last_name');

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        return data || [];
      });
    } catch (error) {
      console.error('Error fetching representatives:', error);
      throw error;
    }
  }

  // Database content check (cached)
  async checkDatabaseContents(): Promise<{ total: number; byState: Record<string, number>; sampleData: any[]; stateFormats: string[] }> {
    try {
      const cacheKey = 'db-contents';
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        // Get sample data efficiently
        const { data, error } = await supabase
          .from('representatives')
          .select('state, chamber, full_name')
          .eq('is_active', true)
          .limit(10);

        if (error) {
          throw error;
        }

        // Get count by state efficiently
        const { data: allReps, error: countError } = await supabase
          .from('representatives')
          .select('state')
          .eq('is_active', true);

        if (countError) {
          throw countError;
        }

        const byState: Record<string, number> = {};
        const uniqueStates = new Set<string>();
        
        allReps?.forEach(rep => {
          byState[rep.state] = (byState[rep.state] || 0) + 1;
          uniqueStates.add(rep.state);
        });

        const stateFormats = Array.from(uniqueStates).slice(0, 10);

        return {
          total: allReps?.length || 0,
          byState,
          sampleData: data || [],
          stateFormats
        };
      });
    } catch (error) {
      console.error('Error checking database contents:', error);
      throw error;
    }
  }

  // Optimized sync with better batching
  async syncRepresentativesFromCongress(): Promise<{ success: boolean; count: number; errors: any[] }> {
    try {
      console.log('🔄 Starting optimized representatives sync...');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('You must be logged in to sync representatives');
      }

      // Check if we have recent data to avoid unnecessary API calls
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - 7); // 1 week ago
      
      const { data: recentReps, error: recentError } = await supabase
        .from('representatives')
        .select('bioguide_id')
        .eq('is_active', true)
        .gte('updated_at', recentCutoff.toISOString());

      if (!recentError && recentReps && recentReps.length > 500) {
        console.log('📦 Using recent database data, skipping API sync');
        return {
          success: true,
          count: recentReps.length,
          errors: []
        };
      }

      console.log('👤 User authenticated, fetching representatives...');

      // Fetch with optimized pagination
      const allMembers = await this.fetchAllMembersOptimized();
      
      console.log(`📊 Total members fetched: ${allMembers.length}`);

      // Filter for current members only
      const currentMembers = allMembers.filter(member => {
        if (!member.terms?.item) return false;
        
        const terms = Array.isArray(member.terms.item) ? member.terms.item : [member.terms.item];
        const currentTerm = terms[terms.length - 1];
        
        const currentYear = new Date().getFullYear();
        return !currentTerm.endYear || parseInt(currentTerm.endYear) >= currentYear;
      });

      console.log(`📊 Filtered to ${currentMembers.length} current members`);

      if (currentMembers.length === 0) {
        return { success: true, count: 0, errors: [] };
      }

      const transformedReps = currentMembers.map(member => this.transformCongressMember(member));
      
      console.log(`💾 Storing ${transformedReps.length} representatives...`);

      // Use efficient batch upsert
      const { data, error } = await supabase
        .from('representatives')
        .upsert(transformedReps, { 
          onConflict: 'bioguide_id',
          ignoreDuplicates: false 
        })
        .select('bioguide_id, full_name, chamber'); // Only select needed fields

      if (error) {
        console.error('❌ Error storing representatives:', error);
        throw error;
      }

      console.log(`✅ Successfully stored ${data?.length || 0} representatives`);

      // Clear cache after successful sync
      this.clearCache();

      return {
        success: true,
        count: data?.length || 0,
        errors: []
      };
    } catch (error) {
      console.error('❌ Error syncing representatives:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
        throw new Error('Unable to connect to Congress.gov API. Please check your internet connection and try again.');
      } else if (error.message.includes('Unauthorized') || error.message.includes('Invalid')) {
        throw new Error('Congress API key issue. Please verify your VITE_CONGRESS_API_KEY in .env file.');
      } else {
        throw error;
      }
    }
  }

  // More efficient member fetching with reduced API calls
  private async fetchAllMembersOptimized(): Promise<any[]> {
    const allMembers: any[] = [];
    
    console.log('📄 Starting optimized fetch of Congress members...');

    try {
      // Strategy: Fetch current members only with larger batch size
      console.log('📄 Fetching current congress members with optimized pagination...');
      const currentMembers = await this.fetchMembersWithOptimizedPagination('/member', {
        currentMember: 'true'
      });
      console.log(`📊 Current members found: ${currentMembers.length}`);
      allMembers.push(...currentMembers);

    } catch (error) {
      console.error('❌ Error in optimized fetch:', error);
      
      if (allMembers.length > 0) {
        console.log(`⚠️ Continuing with ${allMembers.length} members already fetched`);
      } else {
        throw error;
      }
    }

    console.log(`✅ Optimized fetch complete! Total unique members: ${allMembers.length}`);
    return allMembers;
  }

  // Optimized pagination with larger batch sizes and fewer requests
  private async fetchMembersWithOptimizedPagination(endpoint: string, extraParams: Record<string, any> = {}): Promise<any[]> {
    const allMembers: any[] = [];
    let offset = 0;
    const limit = 250; // Use maximum allowed batch size
    let hasMore = true;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 2; // Reduced error tolerance

    console.log(`📄 Starting optimized pagination for: ${endpoint}`);

    while (hasMore && consecutiveErrors < maxConsecutiveErrors) {
      try {
        console.log(`📄 Fetching batch: offset=${offset}, limit=${limit}`);
        
        const response = await congressApiService.makeRequest(endpoint, {
          limit,
          offset,
          ...extraParams
        });

        if (!response?.members) {
          console.log('❌ No members in response, stopping pagination');
          break;
        }

        const members = response.members;
        console.log(`📊 Received ${members.length} members in this batch`);
        
        allMembers.push(...members);
        consecutiveErrors = 0;

        // Check if we got fewer members than requested
        if (members.length < limit) {
          console.log('📄 Received fewer members than requested, this is the last page');
          hasMore = false;
        } else {
          offset += limit;
          
          // Reduced delay for faster processing
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Safety check with higher limit
        if (offset > 10000) {
          console.warn('⚠️ Safety limit reached, stopping pagination');
          break;
        }

      } catch (error) {
        consecutiveErrors++;
        console.error(`❌ Error fetching page at offset ${offset} (attempt ${consecutiveErrors}):`, error);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(`❌ Too many consecutive errors, stopping pagination for ${endpoint}`);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Optimized pagination complete for ${endpoint}! Total: ${allMembers.length}`);
    return allMembers;
  }

  private transformCongressMember(congressMember: any): Representative {
    const terms = congressMember.terms?.item || [];
    const termsArray = Array.isArray(terms) ? terms : [terms];
    const currentTerm = termsArray[termsArray.length - 1] || {};
    
    let chamber = 'house';
    if (currentTerm?.chamber) {
      const chamberStr = currentTerm.chamber.toString().toLowerCase();
      chamber = chamberStr === 'senate' ? 'senate' : 'house';
    }
    
    let party = 'Unknown';
    if (congressMember.partyName) {
      const partyName = congressMember.partyName.toLowerCase();
      if (partyName.includes('democrat')) {
        party = 'D';
      } else if (partyName.includes('republican')) {
        party = 'R';
      } else if (partyName.includes('independent')) {
        party = 'I';
      } else {
        party = congressMember.partyName.charAt(0).toUpperCase();
      }
    }

    const fullName = congressMember.name || '';
    const nameParts = fullName.split(', ');
    let firstName = '';
    let lastName = '';
    
    if (nameParts.length >= 2) {
      lastName = nameParts[0];
      firstName = nameParts[1];
    } else {
      const parts = fullName.split(' ');
      firstName = parts[0] || '';
      lastName = parts[parts.length - 1] || '';
    }
    
    let district = null;
    if (chamber === 'house') {
      if (congressMember.district) {
        district = parseInt(congressMember.district.toString());
      } else if (currentTerm?.district) {
        district = parseInt(currentTerm.district.toString());
      }
    }
    
    // IMPORTANT: Store state in the SAME FORMAT as user profile (abbreviation)
    // This is a key fix - we want to store the state abbreviation, not the full name
    let state = congressMember.state || currentTerm?.state || '';
    
    // Log the state format we're using
    console.log(`🔍 Representative state format: ${state} (original from API)`);
    
    // If state is a full name, convert to abbreviation
    if (state.length > 2) {
      // Find the abbreviation for this state name
      const stateAbbr = Object.entries(this.stateMapping)
        .find(([abbr, name]) => name.toLowerCase() === state.toLowerCase())?.[0];
      
      if (stateAbbr) {
        console.log(`🔄 Converting state name "${state}" to abbreviation "${stateAbbr}"`);
        state = stateAbbr;
      }
    }
    
    console.log(`✅ Final state format for representative: ${state}`);
    
    return {
      bioguide_id: congressMember.bioguideId,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      party: party,
      state: state,
      district: district,
      chamber: chamber,
      contact_info: {
        office: null,
        phone: null,
        email: null,
        website: null,
        socialMedia: {
          twitter: null,
          facebook: null,
        },
      },
      voting_record: {
        totalVotes: 0,
        missedVotes: 0,
        partyUnity: null,
        recentPositions: [],
      },
      govtrack_id: null,
      govtrack_data: {
        ideology_score: null,
        leadership_score: null,
        missed_votes_pct: null,
        votes_with_party_pct: null
      },
      committees: [],
      congress_url: congressMember.url || null,
      govtrack_url: null,
      photo_url: congressMember.depiction?.imageUrl || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    };
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Representatives cache cleared');
  }
}

export const representativeService = new RepresentativeService();