import { supabase } from '../lib/supabase';
import { openaiService } from './openaiService';
import type { Bill } from '../types';

class PodcastOverviewService {
  /**
   * Generate podcast overviews for bills that have comprehensive analysis but no podcast overview
   * @param limit Maximum number of bills to process
   * @returns Object with success status, count, and message
   */
  async generateMissingPodcastOverviews(limit: number = 10): Promise<{ 
    success: boolean; 
    count: number; 
    message: string;
  }> {
    try {
      console.log('🎙️ Generating missing podcast overviews...');
      
      // Get bills that have comprehensive analysis but no podcast overview
      const { data: bills, error } = await supabase
        .from('bills')
        .select('*')
        .not('ai_analysis', 'is', null) // Ensure comprehensive analysis exists
        .is('podcast_overview', null)
        .limit(limit);
      
      if (error) {
        throw error;
      }
      
      if (!bills || bills.length === 0) {
        return {
          success: true,
          count: 0,
          message: 'No bills found that need podcast overviews'
        };
      }
      
      console.log(`📊 Found ${bills.length} bills that need podcast overviews`);
      
      let successCount = 0;
      
      // Process bills in batches to avoid overwhelming the API
      const batchSize = 3;
      for (let i = 0; i < bills.length; i += batchSize) {
        const batch = bills.slice(i, i + batchSize);
        
        // Process each bill in the batch
        await Promise.all(batch.map(async (bill) => {
          try {
            await openaiService.generatePodcastOverview(bill);
            successCount++;
          } catch (error) {
            console.warn(`Could not generate podcast overview for bill ${bill.id}:`, error);
          }
        }));
        
        // Add a small delay between batches
        if (i + batchSize < bills.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return {
        success: true,
        count: successCount,
        message: `Generated podcast overviews for ${successCount} of ${bills.length} bills`
      };
    } catch (error) {
      console.error('Error generating podcast overviews:', error);
      return {
        success: false,
        count: 0,
        message: `Error generating podcast overviews: ${error.message}`
      };
    }
  }

  /**
   * Generate podcast overviews from generated_content table
   * @param limit Maximum number of items to process
   * @returns Object with success status, count, and message
   */
  async generatePodcastOverviewsFromGeneratedContent(limit: number = 10): Promise<{
    success: boolean;
    count: number;
    message: string;
  }> {
    try {
      console.log('🎙️ Generating podcast overviews from generated_content table...');
      
      // Get comprehensive analyses from generated_content table
      const { data: contentItems, error } = await supabase
        .from('generated_content')
        .select('id, source_id, content_data')
        .eq('content_type', 'analysis')
        .eq('source_type', 'bill')
        .eq('status', 'completed')
        .limit(limit);
      
      if (error) {
        throw error;
      }
      
      if (!contentItems || contentItems.length === 0) {
        return {
          success: true,
          count: 0,
          message: 'No comprehensive analyses found in generated_content table'
        };
      }
      
      console.log(`📊 Found ${contentItems.length} comprehensive analyses in generated_content table`);
      
      let successCount = 0;
      
      // Process items in batches
      const batchSize = 3;
      for (let i = 0; i < contentItems.length; i += batchSize) {
        const batch = contentItems.slice(i, i + batchSize);
        
        // Process each item in the batch
        await Promise.all(batch.map(async (item) => {
          try {
            // Check if bill already has a podcast overview
            const { data: bill, error: billError } = await supabase
              .from('bills')
              .select('id, podcast_overview')
              .eq('id', item.source_id)
              .single();
            
            if (billError || !bill) {
              console.warn(`Could not find bill ${item.source_id}:`, billError);
              return;
            }
            
            // Skip if bill already has a podcast overview
            if (bill.podcast_overview) {
              console.log(`Bill ${bill.id} already has a podcast overview, skipping`);
              return;
            }
            
            // Get the full bill data
            const { data: fullBill, error: fullBillError } = await supabase
              .from('bills')
              .select('*')
              .eq('id', item.source_id)
              .single();
            
            if (fullBillError || !fullBill) {
              console.warn(`Could not get full bill data for ${item.source_id}:`, fullBillError);
              return;
            }
            
            // Generate podcast overview
            await openaiService.generatePodcastOverview(fullBill);
            successCount++;
          } catch (error) {
            console.warn(`Could not process item ${item.id}:`, error);
          }
        }));
        
        // Add a small delay between batches
        if (i + batchSize < contentItems.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return {
        success: true,
        count: successCount,
        message: `Generated podcast overviews for ${successCount} of ${contentItems.length} bills from generated_content table`
      };
    } catch (error) {
      console.error('Error generating podcast overviews from generated_content:', error);
      return {
        success: false,
        count: 0,
        message: `Error generating podcast overviews from generated_content: ${error.message}`
      };
    }
  }

  /**
   * Get bills with podcast overviews
   * @param limit Maximum number of bills to return
   * @returns Array of bills with podcast overviews
   */
  async getBillsWithPodcastOverviews(limit: number = 10): Promise<Bill[]> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .not('podcast_overview', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting bills with podcast overviews:', error);
      return [];
    }
  }
}

export const podcastOverviewService = new PodcastOverviewService();