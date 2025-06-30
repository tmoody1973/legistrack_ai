import { billDataSyncService } from './billDataSyncService';
import { billSummaryService } from './billSummaryService';
import { billFullTextService } from './billFullTextService';
import { SubjectImportService } from './subjectImportService';
import { supabase } from '../lib/supabase';
import { openaiService } from './openaiService';

class BillBatchUpdateService {
  /**
   * Check if we're running in a browser environment
   * @returns true if running in browser
   */
  private isBrowserEnvironment(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Update all bills with comprehensive data
   * @param limit Maximum number of bills to update
   * @returns Object with detailed results
   */
  async updateAllBills(limit: number = 50): Promise<{
    success: boolean;
    message: string;
    details?: {
      billsUpdated: number;
      summariesUpdated: number;
      fullTextUpdated: number;
      policyAreasUpdated: number;
      podcastOverviewsUpdated: number; // NEW: Add podcast overviews count
    };
  }> {
    try {
      console.log('🚀 Starting comprehensive bill update...');
      
      const results = {
        billsUpdated: 0,
        summariesUpdated: 0,
        fullTextUpdated: 0,
        policyAreasUpdated: 0,
        podcastOverviewsUpdated: 0 // NEW: Initialize podcast overviews count
      };

      // Step 1: Update bill data (basic info, sponsors, committees, etc.)
      console.log('📊 Step 1: Updating bill data...');
      const billDataResult = await billDataSyncService.syncAllBills(limit);
      if (billDataResult.success) {
        results.billsUpdated = billDataResult.count;
        console.log(`✅ Updated ${billDataResult.count} bills with comprehensive data`);
      } else {
        console.warn('⚠️ Bill data update had issues:', billDataResult.message);
      }

      // Step 2: Update summaries for bills that don't have them
      console.log('📝 Step 2: Updating bill summaries...');
      const summariesResult = await billSummaryService.updateMissingSummaries(Math.min(limit, 20));
      if (summariesResult.success) {
        results.summariesUpdated = summariesResult.count;
        console.log(`✅ Updated ${summariesResult.count} bills with summaries`);
      } else {
        console.warn('⚠️ Summaries update had issues:', summariesResult.message);
      }

      // Step 3: Update full text (only if not in browser environment)
      if (!this.isBrowserEnvironment()) {
        console.log('📄 Step 3: Updating bill full text...');
        const fullTextResult = await billFullTextService.updateMissingFullText(Math.min(limit, 15));
        if (fullTextResult.success) {
          results.fullTextUpdated = fullTextResult.count;
          console.log(`✅ Updated ${fullTextResult.count} bills with full text`);
        } else {
          console.warn('⚠️ Full text update had issues:', fullTextResult.message);
        }
      } else {
        console.log('ℹ️ Step 3: Skipping full text update in browser environment due to CORS restrictions');
        console.log('💡 Tip: Full text updates work best when run from a server environment');
      }

      // Step 4: Update policy areas for existing bills
      console.log('🏷️ Step 4: Updating policy areas...');
      const policyAreasResult = await SubjectImportService.updatePolicyAreasForExistingBills();
      if (policyAreasResult.success) {
        results.policyAreasUpdated = policyAreasResult.count;
        console.log(`✅ Updated ${policyAreasResult.count} bills with policy areas`);
      } else {
        console.warn('⚠️ Policy areas update had issues:', policyAreasResult.message);
      }

      // NEW Step 5: Generate and update podcast overviews for bills without them
      // This should ideally run after comprehensive analysis is available
      console.log('🎙️ Step 5: Generating and updating podcast overviews...');
      const podcastOverviewResult = await this.updateMissingPodcastOverviews(Math.min(limit, 10)); // Process a smaller batch
      if (podcastOverviewResult.success) {
        results.podcastOverviewsUpdated = podcastOverviewResult.count;
        console.log(`✅ Updated ${podcastOverviewResult.count} bills with podcast overviews`);
      } else {
        console.warn('⚠️ Podcast overviews update had issues:', podcastOverviewResult.message);
      }

      // Calculate total operations
      const totalOperations = results.billsUpdated + results.summariesUpdated + 
                             results.fullTextUpdated + results.policyAreasUpdated +
                             results.podcastOverviewsUpdated; // NEW: Include podcast overviews

      let message = `Comprehensive update completed! Updated ${totalOperations} total items across all categories.`;
      
      if (this.isBrowserEnvironment()) {
        message += ' Note: Full text updates were skipped due to browser CORS restrictions.';
      }

      console.log('🎉 Comprehensive bill update completed successfully!');
      console.log('📊 Final Results:', results);

      return {
        success: true,
        message,
        details: results
      };
    } catch (error) {
      console.error('❌ Error in comprehensive bill update:', error);
      return {
        success: false,
        message: `Comprehensive update failed: ${error.message}`
      };
    }
  }

  /**
   * Get bills that need updates
   * @param limit Maximum number of bills to return
   * @returns Array of bill IDs that need updates
   */
  async getBillsNeedingUpdates(limit: number = 50): Promise<string[]> {
    try {
      // Get bills that haven't been updated recently or are missing data
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: bills, error } = await supabase
        .from('bills')
        .select('id')
        .or(`last_synced.is.null,last_synced.lt.${oneDayAgo},summary.is.null,full_text_url.is.null,policy_area.is.null`)
        .limit(limit);
      
      if (error) {
        console.error('Error fetching bills needing updates:', error);
        return [];
      }
      
      return bills ? bills.map(bill => bill.id) : [];
    } catch (error) {
      console.error('Error getting bills needing updates:', error);
      return [];
    }
  }

  /**
   * Update specific bills by ID
   * @param billIds Array of bill IDs to update
   * @returns Object with detailed results
   */
  async updateSpecificBills(billIds: string[]): Promise<{
    success: boolean;
    message: string;
    details?: {
      billsUpdated: number;
      summariesUpdated: number;
      fullTextUpdated: number;
      podcastOverviewsUpdated: number; // NEW: Add podcast overviews count
    };
  }> {
    try {
      console.log(`🎯 Updating ${billIds.length} specific bills...`);
      
      const results = {
        billsUpdated: 0,
        summariesUpdated: 0,
        fullTextUpdated: 0,
        podcastOverviewsUpdated: 0 // NEW: Initialize podcast overviews count
      };

      // Update bill data
      const billDataResult = await billDataSyncService.syncMultipleBills(billIds);
      if (billDataResult.success) {
        results.billsUpdated = billDataResult.count;
      }

      // Update summaries (only for bills that don't have them)
      const billsNeedingSummaries = await this.getBillsWithoutSummaries(billIds);
      if (billsNeedingSummaries.length > 0) {
        const summariesResult = await billSummaryService.updateSummariesForBills(billsNeedingSummaries);
        if (summariesResult.success) {
          results.summariesUpdated = summariesResult.count;
        }
      }

      // Update full text (only if not in browser environment)
      if (!this.isBrowserEnvironment()) {
        const billsNeedingFullText = await this.getBillsWithoutFullText(billIds);
        if (billsNeedingFullText.length > 0) {
          const fullTextResult = await billFullTextService.updateFullTextForBills(billsNeedingFullText);
          if (fullTextResult.success) {
            results.fullTextUpdated = fullTextResult.count;
          }
        }
      }

      // NEW: Generate and update podcast overviews for these specific bills
      const billsNeedingPodcastOverview = await this.getBillsWithoutPodcastOverview(billIds);
      if (billsNeedingPodcastOverview.length > 0) {
        const podcastOverviewResult = await this.updatePodcastOverviewsForBills(billsNeedingPodcastOverview);
        if (podcastOverviewResult.success) {
          results.podcastOverviewsUpdated = podcastOverviewResult.count;
        }
      }

      const totalUpdated = results.billsUpdated + results.summariesUpdated + results.fullTextUpdated + results.podcastOverviewsUpdated; // NEW: Include podcast overviews
      
      return {
        success: true,
        message: `Updated ${totalUpdated} items across ${billIds.length} bills`,
        details: results
      };
    } catch (error) {
      console.error('Error updating specific bills:', error);
      return {
        success: false,
        message: `Error updating specific bills: ${error.message}`
      };
    }
  }

  /**
   * Get bills without summaries from a list of bill IDs
   * @param billIds Array of bill IDs to check
   * @returns Array of bill IDs without summaries
   */
  private async getBillsWithoutSummaries(billIds: string[]): Promise<string[]> {
    try {
      const { data: bills, error } = await supabase
        .from('bills')
        .select('id')
        .in('id', billIds)
        .is('summary', null);
      
      if (error) {
        console.error('Error fetching bills without summaries:', error);
        return [];
      }
      
      return bills ? bills.map(bill => bill.id) : [];
    } catch (error) {
      console.error('Error getting bills without summaries:', error);
      return [];
    }
  }

  /**
   * Get bills without full text from a list of bill IDs
   * @param billIds Array of bill IDs to check
   * @returns Array of bill IDs without full text
   */
  private async getBillsWithoutFullText(billIds: string[]): Promise<string[]> {
    try {
      const { data: bills, error } = await supabase
        .from('bills')
        .select('id')
        .in('id', billIds)
        .is('full_text_content', null);
      
      if (error) {
        console.error('Error fetching bills without full text:', error);
        return [];
      }
      
      return bills ? bills.map(bill => bill.id) : [];
    } catch (error) {
      console.error('Error getting bills without full text:', error);
      return [];
    }
  }

  /**
   * Get bills without podcast overview from a list of bill IDs
   * @param billIds Array of bill IDs to check
   * @returns Array of bill IDs without podcast overview
   */
  private async getBillsWithoutPodcastOverview(billIds: string[]): Promise<string[]> {
    try {
      const { data: bills, error } = await supabase
        .from('bills')
        .select('id')
        .in('id', billIds)
        .is('podcast_overview', null);
      
      if (error) {
        console.error('Error fetching bills without podcast overview:', error);
        return [];
      }
      
      return bills ? bills.map(bill => bill.id) : [];
    } catch (error) {
      console.error('Error getting bills without podcast overview:', error);
      return [];
    }
  }

  /**
   * Update podcast overviews for bills that don't have them
   * @param limit Maximum number of bills to update
   * @returns Object with success status, count, and message
   */
  async updateMissingPodcastOverviews(limit: number = 10): Promise<{ success: boolean; count: number; message: string }> {
    try {
      console.log('🎙️ Updating missing podcast overviews for bills...');
      
      // Get bills that have comprehensive analysis but no podcast overview
      const { data: bills, error: fetchError } = await supabase
        .from('bills')
        .select('id')
        .not('ai_analysis', 'is', null) // Ensure comprehensive analysis exists
        .is('podcast_overview', null)
        .limit(limit);
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!bills || bills.length === 0) {
        return {
          success: true,
          count: 0,
          message: 'No bills found without podcast overviews'
        };
      }
      
      console.log(`📊 Found ${bills.length} bills without podcast overviews`);
      
      // Extract bill IDs
      const billIds = bills.map(bill => bill.id);
      
      // Update podcast overviews
      return await this.updatePodcastOverviewsForBills(billIds);
    } catch (error) {
      console.error('Error updating missing podcast overviews:', error);
      return {
        success: false,
        count: 0,
        message: `Error updating missing podcast overviews: ${error.message}`
      };
    }
  }

  /**
   * Update podcast overviews for a list of bill IDs
   * @param billIds Array of bill IDs to update
   * @returns Object with success status, count, and message
   */
  async updatePodcastOverviewsForBills(billIds: string[]): Promise<{ success: boolean; count: number; message: string }> {
    try {
      console.log(`🎙️ Generating and updating podcast overviews for ${billIds.length} bills...`);
      
      let updatedCount = 0;
      
      // Process bills in batches
      const batchSize = 3; // Smaller batch size for AI generation
      for (let i = 0; i < billIds.length; i += batchSize) {
        const batch = billIds.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (billId) => {
          try {
            const { data: bill, error } = await supabase
              .from('bills')
              .select('*')
              .eq('id', billId)
              .single();
            
            if (error || !bill) {
              console.warn(`Could not fetch bill ${billId} for podcast overview generation:`, error);
              return;
            }
            
            // Generate and save podcast overview
            await openaiService.generatePodcastOverview(bill);
            updatedCount++;
          } catch (error) {
            console.warn(`Could not generate podcast overview for bill ${billId}:`, error);
          }
        }));
        
        // Add a delay between batches to respect API limits
        if (i + batchSize < billIds.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
        }
      }
      
      return {
        success: true,
        count: updatedCount,
        message: `Generated podcast overviews for ${updatedCount} of ${billIds.length} bills`
      };
    } catch (error) {
      console.error('Error updating podcast overviews for bills:', error);
      return {
        success: false,
        count: 0,
        message: `Error updating podcast overviews: ${error.message}`
      };
    }
  }
}

export const billBatchUpdateService = new BillBatchUpdateService();