import { congressApiService } from './congressApiService';
import { billFullTextService } from './billFullTextService';
import { supabase } from '../lib/supabase';

class BillTextFetcherService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  /**
   * Fetch and store the full text of a bill
   * @param congress Congress number (e.g., 117)
   * @param billType Bill type (e.g., hr)
   * @param billNumber Bill number (e.g., 3076)
   * @returns Object with success status and message
   */
  async fetchAndStoreBillText(
    congress: number,
    billType: string,
    billNumber: number
  ): Promise<{ success: boolean; message: string; data?: any }> {
    let retryCount = 0;
    
    while (retryCount < this.MAX_RETRIES) {
      try {
        console.log(`🔍 Fetching bill text for ${congress}-${billType}-${billNumber} (attempt ${retryCount + 1})...`);
        
        const billId = `${congress}-${billType.toUpperCase()}-${billNumber}`;
        
        // Use billFullTextService to get the full text URL with proper CORS handling
        const urlResult = await billFullTextService.getFullTextUrl(billId);
        
        if (!urlResult.success) {
          console.warn(`⚠️ ${urlResult.message} for bill ${billId}`);
          
          // Update the bill to indicate no text is available
          await this.updateBillWithNoTextAvailable(billId, urlResult.message);
          
          return {
            success: false,
            message: urlResult.message
          };
        }
        
        console.log(`📄 Found text URL: ${urlResult.url}`);
        
        // Use billFullTextService to get formatted text content with proper CORS handling
        const contentResult = await billFullTextService.getFormattedTextContent(billId);
        
        if (!contentResult.success) {
          console.warn(`⚠️ ${contentResult.message} for bill ${billId}`);
          
          // Update the bill to indicate text content could not be retrieved
          await this.updateBillWithNoTextAvailable(billId, contentResult.message);
          
          return {
            success: false,
            message: contentResult.message
          };
        }
        
        // Step 6: Store in database
        const { data, error } = await supabase
          .from('bills')
          .update({
            full_text_url: urlResult.url,
            full_text_content: contentResult.content,
            updated_at: new Date().toISOString()
          })
          .eq('id', billId)
          .select();
        
        if (error) {
          throw new Error(`Failed to store bill text in database: ${error.message}`);
        }
        
        console.log(`✅ Successfully stored bill text for ${billId}`);
        
        return {
          success: true,
          message: `Successfully fetched and stored text for bill ${billId}`,
          data: {
            billId,
            contentLength: contentResult.content.length,
            url: urlResult.url
          }
        };
      } catch (error) {
        console.error(`❌ Error fetching bill text (attempt ${retryCount + 1}):`, error);
        
        retryCount++;
        
        if (retryCount >= this.MAX_RETRIES) {
          // Update the bill to indicate text fetching failed
          const billId = `${congress}-${billType.toUpperCase()}-${billNumber}`;
          await this.updateBillWithNoTextAvailable(billId, `Failed after ${this.MAX_RETRIES} attempts: ${error.message}`);
          
          return {
            success: false,
            message: `Failed to fetch bill text after ${this.MAX_RETRIES} attempts: ${error.message}`
          };
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * retryCount));
      }
    }
    
    // This should never be reached due to the return in the catch block
    return {
      success: false,
      message: `Failed to fetch bill text after ${this.MAX_RETRIES} attempts due to unknown error`
    };
  }

  /**
   * Update bill record to indicate no text is available
   * @param billId Bill ID
   * @param reason Optional reason why text is not available
   */
  private async updateBillWithNoTextAvailable(billId: string, reason: string = "No text available"): Promise<void> {
    try {
      const message = `Text has not been received for ${billId}. Reason: ${reason}`;
      console.log(`📝 Updating bill ${billId} with message: ${message}`);
      
      const { error } = await supabase
        .from('bills')
        .update({
          full_text_content: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);
      
      if (error) {
        console.warn(`⚠️ Failed to update bill ${billId} with no-text message:`, error);
      } else {
        console.log(`✅ Updated bill ${billId} with no-text message`);
      }
    } catch (error) {
      console.warn(`⚠️ Error updating bill with no-text message:`, error);
    }
  }

  /**
   * Batch process multiple bills to fetch and store their text
   * @param bills Array of bill objects with congress, billType, and billNumber
   * @returns Object with success count, failure count, and details
   */
  async batchProcessBillText(
    bills: Array<{ congress: number; billType: string; billNumber: number }>
  ): Promise<{ 
    success: boolean; 
    successCount: number; 
    failureCount: number;
    details: Array<{ billId: string; success: boolean; message: string }>;
  }> {
    console.log(`🔄 Starting batch processing of ${bills.length} bills...`);
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    // Process bills sequentially to avoid rate limiting
    for (const bill of bills) {
      const billId = `${bill.congress}-${bill.billType.toUpperCase()}-${bill.billNumber}`;
      console.log(`🔄 Processing bill ${billId}...`);
      
      try {
        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const result = await this.fetchAndStoreBillText(
          bill.congress,
          bill.billType,
          bill.billNumber
        );
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
        
        results.push({
          billId,
          success: result.success,
          message: result.message
        });
      } catch (error) {
        console.error(`❌ Unexpected error processing bill ${billId}:`, error);
        
        failureCount++;
        results.push({
          billId,
          success: false,
          message: `Unexpected error: ${error.message}`
        });
      }
    }
    
    console.log(`✅ Batch processing complete. Success: ${successCount}, Failure: ${failureCount}`);
    
    return {
      success: failureCount === 0,
      successCount,
      failureCount,
      details: results
    };
  }

  /**
   * Process bills that don't have full text content yet
   * @param limit Maximum number of bills to process
   * @returns Object with success count, failure count, and details
   */
  async processMissingBillText(limit: number = 10): Promise<{
    success: boolean;
    successCount: number;
    failureCount: number;
    details: Array<{ billId: string; success: boolean; message: string }>;
  }> {
    try {
      console.log(`🔍 Finding bills without full text content (limit: ${limit})...`);
      
      // Get bills without full text content
      const { data: bills, error } = await supabase
        .from('bills')
        .select('id, congress, bill_type, number')
        .is('full_text_content', null)
        .limit(limit);
      
      if (error) {
        throw new Error(`Failed to fetch bills without text: ${error.message}`);
      }
      
      if (!bills || bills.length === 0) {
        console.log('✅ No bills found without full text content');
        return {
          success: true,
          successCount: 0,
          failureCount: 0,
          details: []
        };
      }
      
      console.log(`📊 Found ${bills.length} bills without full text content`);
      
      // Convert to the format expected by batchProcessBillText
      const billsToProcess = bills.map(bill => ({
        congress: bill.congress,
        billType: bill.bill_type,
        billNumber: bill.number
      }));
      
      // Process the bills
      return await this.batchProcessBillText(billsToProcess);
    } catch (error) {
      console.error('❌ Error processing missing bill text:', error);
      
      return {
        success: false,
        successCount: 0,
        failureCount: 1,
        details: [{
          billId: 'batch',
          success: false,
          message: `Failed to process missing bill text: ${error.message}`
        }]
      };
    }
  }

  /**
   * Fetch and store text for a specific bill by ID
   * @param billId Bill ID in format {congress}-{type}-{number}
   * @returns Object with success status and message
   */
  async fetchSpecificBillText(billId: string): Promise<{ 
    success: boolean; 
    message: string; 
    content?: string;
  }> {
    try {
      console.log(`🔍 Fetching text for specific bill: ${billId}`);
      
      // Parse bill ID
      const parts = billId.split('-');
      if (parts.length !== 3) {
        throw new Error(`Invalid bill ID format: ${billId}`);
      }
      
      const congress = parseInt(parts[0]);
      const billType = parts[1];
      const billNumber = parseInt(parts[2]);
      
      // Special case for HR 1 "One Big Beautiful Bill Act"
      if (congress === 119 && billType === 'HR' && billNumber === 1) {
        console.log('🔍 Detected HR 1 "One Big Beautiful Bill Act" - using direct URL');
        
        try {
          // Use the direct URL provided
          const directUrl = 'https://www.congress.gov/119/bills/hr1/BILLS-119hr1eas.htm';
          
          // Fetch the content
          const response = await fetch(directUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch HR 1 text: ${response.status} ${response.statusText}`);
          }
          
          const textContent = await response.text();
          
          if (!textContent || textContent.trim().length === 0) {
            throw new Error('Empty content received for HR 1');
          }
          
          // Store in database
          const { error } = await supabase
            .from('bills')
            .update({
              full_text_url: directUrl,
              full_text_content: textContent,
              updated_at: new Date().toISOString()
            })
            .eq('id', billId);
          
          if (error) {
            throw new Error(`Failed to store HR 1 text in database: ${error.message}`);
          }
          
          console.log(`✅ Successfully stored HR 1 text (${textContent.length} characters)`);
          
          return {
            success: true,
            message: `Successfully fetched and stored text for HR 1`,
            content: textContent
          };
        } catch (error) {
          console.error('❌ Error fetching HR 1 text:', error);
          return {
            success: false,
            message: `Failed to fetch HR 1 text: ${error.message}`
          };
        }
      }
      
      // For other bills, use the standard process
      const result = await this.fetchAndStoreBillText(congress, billType, billNumber);
      
      if (!result.success) {
        return {
          success: false,
          message: result.message
        };
      }
      
      // Get the stored content
      const { data, error } = await supabase
        .from('bills')
        .select('full_text_content')
        .eq('id', billId)
        .single();
      
      if (error) {
        return {
          success: true,
          message: `Text stored but could not retrieve: ${error.message}`
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched and stored text for bill ${billId}`,
        content: data.full_text_content
      };
    } catch (error) {
      console.error(`❌ Error fetching specific bill text:`, error);
      
      return {
        success: false,
        message: `Failed to fetch specific bill text: ${error.message}`
      };
    }
  }
}

export const billTextFetcherService = new BillTextFetcherService();