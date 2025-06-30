import { congressApiService } from './congressApiService';
import { supabase } from '../lib/supabase';
import { openaiService } from './openaiService';
import type { Bill } from '../types';

class BillSummaryService {
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
      console.log('📦 Using cached data for:', key);
      return cached.data;
    }

    console.log('🔄 Fetching fresh data for:', key);
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Fetch bill summaries from Congress.gov API
   * @param billId Bill ID in format {congress}-{type}-{number}
   * @returns Array of summaries with their metadata
   */
  async getBillSummaries(billId: string): Promise<any[]> {
    try {
      console.log('🔍 Fetching summaries for bill:', billId);
      
      // Parse bill ID
      const [congress, billType, number] = billId.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }

      const cacheKey = `bill-summaries-${billId}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        // Fetch summaries from Congress.gov API
        const response = await congressApiService.getBillSummaries(
          parseInt(congress),
          billType,
          parseInt(number)
        );

        if (!response?.summaries) {
          console.log('⚠️ No summaries found for bill:', billId);
          return [];
        }

        const summaries = Array.isArray(response.summaries) 
          ? response.summaries 
          : [response.summaries];
        
        console.log(`📊 Found ${summaries.length} summaries for bill:`, billId);
        
        // Update bill in database with the latest summary
        if (summaries.length > 0) {
          await this.updateBillSummary(billId, summaries[0].text);
        }
        
        return summaries;
      });
    } catch (error) {
      console.error(`❌ Error fetching summaries for bill ${billId}:`, error);
      return [];
    }
  }

  /**
   * Update bill summary in database
   * @param billId Bill ID
   * @param summary Summary text
   */
  private async updateBillSummary(billId: string, summary: string): Promise<void> {
    try {
      if (!summary) return;
      
      console.log(`💾 Updating summary for bill ${billId} in database...`);

      const { error } = await supabase
        .from('bills')
        .update({ 
          summary,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (error) {
        console.warn(`Could not update summary for bill ${billId}:`, error);
      } else {
        console.log(`✅ Successfully updated summary for bill ${billId}`);
      }
    } catch (error) {
      console.warn(`Error updating summary for bill ${billId}:`, error);
    }
  }

  /**
   * Generate enhanced summary with web search for a bill
   * @param billId Bill ID
   * @returns Success status and message
   */
  async generateEnhancedSummary(billId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔍 Generating enhanced comprehensive summary with web search for bill:', billId);
      
      // Get bill data
      const { data: bill, error } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!bill) {
        throw new Error(`Bill not found: ${billId}`);
      }
      
      // Generate enhanced summary with web search
      const summary = await openaiService.generateBillFullTextSummary(bill);
      
      // Update bill in database with enhanced summary
      await this.updateBillSummary(billId, summary);
      
      return {
        success: true,
        message: `Successfully generated enhanced summary for bill ${billId}`
      };
    } catch (error) {
      console.error(`❌ Error generating enhanced summary for bill ${billId}:`, error);
      return {
        success: false,
        message: `Error generating enhanced summary: ${error.message}`
      };
    }
  }

  /**
   * Fetch and update summaries for multiple bills
   * @param billIds Array of bill IDs
   * @returns Object with success status, count, and message
   */
  async updateSummariesForBills(billIds: string[]): Promise<{ success: boolean; count: number; message: string }> {
    try {
      console.log(`🔄 Updating summaries for ${billIds.length} bills...`);
      
      let updatedCount = 0;
      
      // Process bills in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < billIds.length; i += batchSize) {
        const batch = billIds.slice(i, i + batchSize);
        
        // Process each bill in the batch
        await Promise.all(batch.map(async (billId) => {
          try {
            const summaries = await this.getBillSummaries(billId);
            if (summaries.length > 0) {
              updatedCount++;
            } else {
              // If no official summaries, try to generate one with web search
              try {
                const result = await this.generateEnhancedSummary(billId);
                if (result.success) {
                  updatedCount++;
                }
              } catch (genError) {
                console.warn(`Could not generate enhanced summary for bill ${billId}:`, genError);
              }
            }
          } catch (error) {
            console.warn(`Could not update summary for bill ${billId}:`, error);
          }
        }));
        
        // Add a small delay between batches
        if (i + batchSize < billIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return {
        success: true,
        count: updatedCount,
        message: `Updated summaries for ${updatedCount} of ${billIds.length} bills`
      };
    } catch (error) {
      console.error('Error updating bill summaries:', error);
      return {
        success: false,
        count: 0,
        message: `Error updating bill summaries: ${error.message}`
      };
    }
  }

  /**
   * Update summaries for bills that don't have them
   * @param limit Maximum number of bills to update
   * @returns Object with success status, count, and message
   */
  async updateMissingSummaries(limit: number = 20): Promise<{ success: boolean; count: number; message: string }> {
    try {
      console.log('🔄 Updating missing summaries for bills...');
      
      // Get bills without summaries
      const { data: bills, error: fetchError } = await supabase
        .from('bills')
        .select('id')
        .is('summary', null)
        .limit(limit);
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!bills || bills.length === 0) {
        return {
          success: true,
          count: 0,
          message: 'No bills found without summaries'
        };
      }
      
      console.log(`📊 Found ${bills.length} bills without summaries`);
      
      // Extract bill IDs
      const billIds = bills.map(bill => bill.id);
      
      // Update summaries
      return await this.updateSummariesForBills(billIds);
    } catch (error) {
      console.error('Error updating missing summaries:', error);
      return {
        success: false,
        count: 0,
        message: `Error updating missing summaries: ${error.message}`
      };
    }
  }

  /**
   * Get the latest summary for a bill
   * @param billId Bill ID
   * @returns The latest summary text or null if not found
   */
  async getLatestSummary(billId: string): Promise<string | null> {
    try {
      const summaries = await this.getBillSummaries(billId);
      
      if (summaries.length > 0) {
        return summaries[0].text || null;
      }
      
      // If no official summaries, try to generate one with web search
      try {
        const { data: bill, error } = await supabase
          .from('bills')
          .select('*')
          .eq('id', billId)
          .single();
        
        if (error || !bill) {
          return null;
        }
        
        const summary = await openaiService.generateBillFullTextSummary(bill);
        return summary;
      } catch (error) {
        console.warn(`Could not generate enhanced summary for bill ${billId}:`, error);
        return null;
      }
    } catch (error) {
      console.error(`Error getting latest summary for bill ${billId}:`, error);
      return null;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Bill summary cache cleared');
  }
}

export const billSummaryService = new BillSummaryService();