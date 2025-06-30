import { supabase } from '../lib/supabase';
import { billService } from './billService';
import type { Bill } from '../types';

class RecommendationService {
  private cache = new Map<string, { data: Bill[]; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Get personalized bill recommendations based on user preferences
   * @param forceRefresh Force refresh recommendations
   * @returns Array of recommended bills
   */
  async getPersonalizedRecommendations(forceRefresh = false): Promise<Bill[]> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to get recommendations');
      }

      const cacheKey = `recommendations-${user.id}`;
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
          console.log('📦 Using cached recommendations');
          return cached.data;
        }
      }

      console.log('🔍 Generating personalized recommendations...');
      
      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('preferences, profile')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        throw profileError;
      }

      // Extract user preferences
      const userState = userProfile?.preferences?.location?.state;
      const userInterests = userProfile?.preferences?.interests || [];
      
      // Build query based on user preferences
      let query = supabase
        .from('bills')
        .select('*');
      
      // Build conditions array for OR clause
      const conditions: string[] = [];
      
      // Add state-based sponsor filtering
      if (userState) {
        conditions.push(`sponsors.cs.[{"state":"${userState}"}]`);
      }
      
      // Add interest-based filtering
      if (userInterests.length > 0) {
        // Add policy area conditions
        userInterests.forEach(interest => {
          conditions.push(`policy_area.ilike.%${interest.toLowerCase()}%`);
        });
        
        // Add subject conditions (JSONB array containment)
        userInterests.forEach(interest => {
          conditions.push(`subjects.cs.${JSON.stringify([interest])}`);
        });
      }
      
      // Apply OR conditions if any exist
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }
      
      // Get recent bills
      query = query.order('updated_at', { ascending: false }).limit(10);
      
      const { data: bills, error: billsError } = await query;
      
      if (billsError) {
        throw billsError;
      }

      // If we don't have enough recommendations, get trending bills
      if (!bills || bills.length < 5) {
        const trendingBills = await billService.getTrendingBills(10);
        
        // Combine and deduplicate
        const allBills = [...(bills || []), ...trendingBills];
        const uniqueBills = Array.from(new Map(allBills.map(bill => [bill.id, bill])).values());
        
        // Cache and return
        this.cache.set(cacheKey, { data: uniqueBills, timestamp: Date.now() });
        return uniqueBills;
      }

      // Cache and return recommendations
      this.cache.set(cacheKey, { data: bills, timestamp: Date.now() });
      return bills;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      
      // Fallback to trending bills
      try {
        console.log('⚠️ Falling back to trending bills...');
        return await billService.getTrendingBills(10);
      } catch (fallbackError) {
        console.error('Error getting trending bills:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Get similar bills to a given bill
   * @param billId Bill ID to find similar bills for
   * @param limit Maximum number of similar bills to return
   * @returns Array of similar bills
   */
  async getSimilarBills(billId: string, limit = 5): Promise<Bill[]> {
    try {
      console.log(`🔍 Finding bills similar to ${billId}...`);
      
      // Get the original bill
      const { data: originalBill, error: billError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();
      
      if (billError) {
        throw billError;
      }

      // Extract subjects and policy area
      const subjects = originalBill.subjects || [];
      const policyArea = originalBill.policy_area;
      
      // Build query for similar bills
      let query = supabase
        .from('bills')
        .select('*')
        .neq('id', billId); // Exclude the original bill
      
      // Filter by policy area if available
      if (policyArea) {
        query = query.eq('policy_area', policyArea);
      }
      
      // Filter by subjects if available (JSONB array overlap)
      if (subjects.length > 0) {
        query = query.overlaps('subjects', subjects);
      }
      
      // Get recent similar bills
      query = query.order('updated_at', { ascending: false }).limit(limit);
      
      const { data: similarBills, error: similarError } = await query;
      
      if (similarError) {
        throw similarError;
      }

      return similarBills || [];
    } catch (error) {
      console.error('Error getting similar bills:', error);
      return [];
    }
  }

  /**
   * Clear the recommendations cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Recommendations cache cleared');
  }
}

export const recommendationService = new RecommendationService();