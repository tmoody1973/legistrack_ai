import { congressApiService } from './congressApiService';
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
        
        // Step 1: Get available text versions
        const textVersionsResponse = await congressApiService.makeRequest(
          `/bill/${congress}/${billType.toLowerCase()}/${billNumber}/text`
        );
        
        if (!textVersionsResponse?.textVersions) {
          throw new Error('No text versions found for this bill');
        }
        
        // Get text versions as array
        const textVersions = Array.isArray(textVersionsResponse.textVersions) 
          ? textVersionsResponse.textVersions 
          : [textVersionsResponse.textVersions];
        
        if (textVersions.length === 0) {
          throw new Error('No text versions found for this bill');
        }
        
        console.log(`📊 Found ${textVersions.length} text versions for bill`);
        
        // Step 2: Choose the most recent version (first in array)
        const latestVersion = textVersions[0];
        console.log(`📄 Using latest version: ${latestVersion.type} from ${latestVersion.date}`);
        
        // Step 3: Find the XML formatted version
        const xmlFormat = latestVersion.formats?.find((format: any) => 
          format.type === 'Formatted XML' || format.type === 'XML'
        );
        
        // Fallback to other formats if XML not available
        const textFormat = xmlFormat || latestVersion.formats?.find((format: any) => 
          format.type === 'Formatted Text' || format.type === 'Text'
        );
        
        // Last resort: PDF
        const pdfFormat = textFormat || latestVersion.formats?.find((format: any) => 
          format.type === 'PDF'
        );
        
        // Use the best available format
        const selectedFormat = xmlFormat || textFormat || pdfFormat;
        
        if (!selectedFormat) {
          throw new Error('No suitable text format found for this bill');
        }
        
        console.log(`🔍 Using format: ${selectedFormat.type}, URL: ${selectedFormat.url}`);
        
        // Step 4: Fetch the actual bill text content
        const textResponse = await fetch(selectedFormat.url, {
          headers: {
            'Accept': 'application/xml, text/xml, text/html, application/pdf, */*',
            'User-Agent': 'LegisTrack-AI/1.0'
          },
          timeout: 30000 // 30 second timeout
        });
        
        if (!textResponse.ok) {
          throw new Error(`Failed to fetch bill text: ${textResponse.status} ${textResponse.statusText}`);
        }
        
        // Get content based on format
        let textContent: string;
        
        if (selectedFormat.type === 'PDF') {
          // For PDF, we can't extract text directly in the browser
          // Just store the URL and indicate it's a PDF
          textContent = `PDF format available at: ${selectedFormat.url}`;
        } else {
          // For XML and Text formats, get the text content
          textContent = await textResponse.text();
        }
        
        // Step 5: Validate the content
        if (!this.validateTextContent(textContent, selectedFormat.type)) {
          throw new Error('Invalid or empty bill text content');
        }
        
        // Step 6: Store in database
        const billId = `${congress}-${billType.toUpperCase()}-${billNumber}`;
        
        const { data, error } = await supabase
          .from('bills')
          .update({
            full_text_url: selectedFormat.url,
            full_text_content: textContent,
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
          message: `Successfully fetched and stored ${selectedFormat.type} text for bill ${billId}`,
          data: {
            billId,
            format: selectedFormat.type,
            versionType: latestVersion.type,
            versionDate: latestVersion.date,
            contentLength: textContent.length,
            url: selectedFormat.url
          }
        };
      } catch (error) {
        console.error(`❌ Error fetching bill text (attempt ${retryCount + 1}):`, error);
        
        retryCount++;
        
        if (retryCount >= this.MAX_RETRIES) {
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
   * Validate text content based on format
   * @param content Text content to validate
   * @param format Format of the content
   * @returns True if content is valid, false otherwise
   */
  private validateTextContent(content: string, format: string): boolean {
    if (!content || content.trim().length === 0) {
      return false;
    }
    
    // For XML, check if it's valid XML
    if (format === 'Formatted XML' || format === 'XML') {
      try {
        // Check for basic XML structure
        return content.includes('<?xml') || content.includes('<') && content.includes('>');
      } catch (error) {
        console.warn('Invalid XML content:', error);
        return false;
      }
    }
    
    // For HTML, check if it's valid HTML
    if (format === 'Formatted Text' || format === 'Text') {
      return content.includes('<html') || content.includes('<body') || content.includes('<div');
    }
    
    // For PDF URL reference, just check if it's not empty
    if (format === 'PDF') {
      return content.includes('PDF format available at:');
    }
    
    // Default validation: content must be at least 100 characters
    return content.length > 100;
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
        failureCount: 0,
        details: [{
          billId: 'batch',
          success: false,
          message: `Failed to process missing bill text: ${error.message}`
        }]
      };
    }
  }
}

export const billTextFetcherService = new BillTextFetcherService();