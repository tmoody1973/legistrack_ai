import { congressApiService } from './congressApiService';
import { billFullTextService } from './billFullTextService';
import { supabase } from '../lib/supabase';
import type { Bill } from '../types';

class BillDataSyncService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

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
   * Check if we're running in a browser environment
   * @returns true if running in browser
   */
  private isBrowserEnvironment(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Sync comprehensive data for a single bill
   * @param billId Bill ID in format {congress}-{type}-{number}
   * @returns Updated bill data or null if failed
   */
  async syncBillData(billId: string): Promise<any | null> {
    try {
      console.log('🔄 Syncing comprehensive data for bill:', billId);
      
      // Parse bill ID
      const [congress, billType, number] = billId.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }

      const cacheKey = `bill-sync-${billId}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        // Fetch comprehensive bill data from Congress.gov API
        const billData = await congressApiService.getBillDetails(
          parseInt(congress),
          billType,
          parseInt(number)
        );

        if (!billData) {
          console.warn(`⚠️ No data found for bill: ${billId}`);
          return null;
        }

        // Update bill in database with comprehensive data
        await this.updateBillInDatabase(billId, billData);

        // Try to get full text URL (this should work without CORS issues)
        try {
          const fullTextUrl = await billFullTextService.getFullTextUrl(billId);
          if (fullTextUrl) {
            await billFullTextService.updateBillWithTextUrl(billId, fullTextUrl);
            console.log(`✅ Updated full text URL for bill: ${billId}`);
          }
        } catch (urlError) {
          console.warn(`Could not update full text URL for bill ${billId}:`, urlError.message);
        }

        // Only try to fetch full text content if not in browser environment
        if (!this.isBrowserEnvironment()) {
          try {
            const fullTextContent = await billFullTextService.getFormattedTextContent(billId);
            if (fullTextContent) {
              await billFullTextService.updateBillWithTextContent(billId, fullTextContent);
              console.log(`✅ Updated full text content for bill: ${billId}`);
            }
          } catch (textError) {
            console.warn(`Could not update full text content for bill ${billId}:`, textError.message);
            // This is expected in browser environments due to CORS
            if (textError.message.includes('CORS restrictions')) {
              console.log(`ℹ️ Skipping full text content update due to browser CORS restrictions for bill: ${billId}`);
            }
          }
        } else {
          console.log(`ℹ️ Skipping full text content fetch in browser environment for bill: ${billId}`);
        }

        console.log(`✅ Successfully synced comprehensive data for bill: ${billId}`);
        return billData;
      });
    } catch (error) {
      console.error(`❌ Error syncing bill data for ${billId}:`, error);
      return null;
    }
  }

  /**
   * Update bill in database with comprehensive data
   * @param billId Bill ID
   * @param billData Bill data from API
   */
  private async updateBillInDatabase(billId: string, billData: any): Promise<void> {
    try {
      console.log(`💾 Updating bill ${billId} in database...`);

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString(),
        last_synced: new Date().toISOString()
      };

      // Update basic information
      if (billData.title) {
        updateData.title = billData.title;
      }
      
      if (billData.shortTitle) {
        updateData.short_title = billData.shortTitle;
      }

      // Update summary if available
      if (billData.summaries && billData.summaries.length > 0) {
        // Get the most recent summary
        const latestSummary = billData.summaries[0];
        if (latestSummary.text) {
          updateData.summary = latestSummary.text;
        }
      }

      // Update sponsors
      if (billData.sponsors && billData.sponsors.length > 0) {
        updateData.sponsors = JSON.stringify(billData.sponsors);
      }

      // Update cosponsors count
      if (billData.cosponsors) {
        updateData.cosponsors_count = Array.isArray(billData.cosponsors) 
          ? billData.cosponsors.length 
          : billData.cosponsors.count || 0;
      }

      // Update committees
      if (billData.committees && billData.committees.length > 0) {
        updateData.committees = JSON.stringify(billData.committees);
      }

      // Update subjects
      if (billData.subjects && billData.subjects.length > 0) {
        updateData.subjects = JSON.stringify(billData.subjects);
      }

      // Update policy area
      if (billData.policyArea) {
        updateData.policy_area = billData.policyArea;
      }

      // Update latest action
      if (billData.latestAction) {
        updateData.latest_action = JSON.stringify({
          date: billData.latestAction.actionDate,
          text: billData.latestAction.text,
          actionCode: billData.latestAction.actionCode
        });
      }

      // Update status
      if (billData.latestAction && billData.latestAction.text) {
        // Derive status from latest action
        const actionText = billData.latestAction.text.toLowerCase();
        if (actionText.includes('passed') || actionText.includes('agreed to')) {
          updateData.status = 'passed';
        } else if (actionText.includes('failed') || actionText.includes('rejected')) {
          updateData.status = 'failed';
        } else if (actionText.includes('introduced')) {
          updateData.status = 'introduced';
        } else {
          updateData.status = 'in_progress';
        }
      }

      // Update URLs
      if (billData.congressUrl) {
        updateData.congress_url = billData.congressUrl;
      }
      
      if (billData.govtrackUrl) {
        updateData.govtrack_url = billData.govtrackUrl;
      }

      // Perform the update
      const { error } = await supabase
        .from('bills')
        .update(updateData)
        .eq('id', billId);

      if (error) {
        console.warn(`Could not update bill ${billId} in database:`, error);
      } else {
        console.log(`✅ Successfully updated bill ${billId} in database`);
      }
    } catch (error) {
      console.warn(`Error updating bill ${billId} in database:`, error);
    }
  }

  /**
   * Sync data for multiple bills
   * @param billIds Array of bill IDs
   * @returns Object with success status, count, and message
   */
  async syncMultipleBills(billIds: string[]): Promise<{ success: boolean; count: number; message: string }> {
    try {
      console.log(`🔄 Syncing data for ${billIds.length} bills...`);
      
      let syncedCount = 0;
      
      // Process bills in batches to avoid overwhelming the API
      const batchSize = 3;
      for (let i = 0; i < billIds.length; i += batchSize) {
        const batch = billIds.slice(i, i + batchSize);
        
        // Process each bill in the batch
        const results = await Promise.all(batch.map(async (billId) => {
          try {
            const result = await this.syncBillData(billId);
            return result !== null;
          } catch (error) {
            console.warn(`Could not sync bill ${billId}:`, error);
            return false;
          }
        }));
        
        // Count successful syncs
        syncedCount += results.filter(success => success).length;
        
        // Add a small delay between batches
        if (i + batchSize < billIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return {
        success: true,
        count: syncedCount,
        message: `Successfully synced ${syncedCount} of ${billIds.length} bills`
      };
    } catch (error) {
      console.error('Error syncing multiple bills:', error);
      return {
        success: false,
        count: 0,
        message: `Error syncing bills: ${error.message}`
      };
    }
  }

  /**
   * Sync all bills in the database
   * @param limit Maximum number of bills to sync
   * @returns Object with success status, count, and message
   */
  async syncAllBills(limit: number = 50): Promise<{ success: boolean; count: number; message: string }> {
    try {
      console.log('🔄 Syncing all bills...');
      
      // Get bills that need syncing (haven't been synced recently)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: bills, error: fetchError } = await supabase
        .from('bills')
        .select('id')
        .or(`last_synced.is.null,last_synced.lt.${oneDayAgo}`)
        .limit(limit);
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!bills || bills.length === 0) {
        return {
          success: true,
          count: 0,
          message: 'No bills found that need syncing'
        };
      }
      
      console.log(`📊 Found ${bills.length} bills that need syncing`);
      
      // Extract bill IDs
      const billIds = bills.map(bill => bill.id);
      
      // Sync the bills
      return await this.syncMultipleBills(billIds);
    } catch (error) {
      console.error('Error syncing all bills:', error);
      return {
        success: false,
        count: 0,
        message: `Error syncing all bills: ${error.message}`
      };
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Bill data sync cache cleared');
  }
}

export const billDataSyncService = new BillDataSyncService();