import { congressApiService } from './congressApiService';
import { supabase } from '../lib/supabase';
import { geminiService } from './geminiService';
import type { Bill } from '../types';

class BillFullTextService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  private readonly FETCH_TIMEOUT = 30000; // 30 seconds

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

  // Helper function to fetch with timeout
  private async fetchWithTimeout(url: string, timeoutMs: number = this.FETCH_TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'User-Agent': 'Mozilla/5.0 (compatible; BillTracker/1.0)'
        }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
      }
      throw error;
    }
  }

  /**
   * Check if we're running in a browser environment and if the URL is from govinfo.gov
   * @param url The URL to check
   * @returns true if we should skip the fetch due to CORS restrictions
   */
  private shouldSkipCorsRequest(url: string): boolean {
    // Check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined';
    
    // Check if the URL is from govinfo.gov or other problematic domains
    const isGovinfoUrl = url.includes('govinfo.gov');
    const isCongressGovUrl = url.includes('congress.gov') && !url.includes('api.congress.gov');
    const isGpoUrl = url.includes('gpo.gov');
    
    return isBrowser && (isGovinfoUrl || isCongressGovUrl || isGpoUrl);
  }

  /**
   * Fetch bill text versions from Congress.gov API
   * @param billId Bill ID in format {congress}-{type}-{number}
   * @returns Array of text versions with their metadata
   */
  async getBillTextVersions(billId: string): Promise<any[]> {
    try {
      console.log('🔍 Fetching text versions for bill:', billId);
      
      // Parse bill ID
      const [congress, billType, number] = billId.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }

      const cacheKey = `bill-text-versions-${billId}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        // Fetch text versions from Congress.gov API
        const response = await congressApiService.getBillText(
          parseInt(congress),
          billType,
          parseInt(number)
        );

        if (!response?.textVersions) {
          console.log('⚠️ No text versions found for bill:', billId);
          return [];
        }

        const textVersions = Array.isArray(response.textVersions) 
          ? response.textVersions 
          : [response.textVersions];
        
        console.log(`📊 Found ${textVersions.length} text versions for bill:`, billId);
        
        return textVersions;
      });
    } catch (error) {
      console.error(`❌ Error fetching text versions for bill ${billId}:`, error);
      return [];
    }
  }

  /**
   * Get the latest text version for a bill
   * @param billId Bill ID
   * @returns The latest text version or null if not found
   */
  async getLatestTextVersion(billId: string): Promise<any | null> {
    try {
      const textVersions = await this.getBillTextVersions(billId);
      
      if (textVersions.length === 0) {
        return null;
      }
      
      // Return the most recent text version (first in the array)
      return textVersions[0];
    } catch (error) {
      console.error(`Error getting latest text version for bill ${billId}:`, error);
      return null;
    }
  }

  /**
   * Get the full text URL for a bill, prioritizing Formatted XML over PDF
   * @param billId Bill ID
   * @param preferredFormat Preferred format (Formatted XML, PDF, etc.)
   * @returns URL to the full text or null if not found
   */
  async getFullTextUrl(billId: string, preferredFormat: string = 'Formatted XML'): Promise<string | null> {
    try {
      console.log(`🔍 Fetching full text URL for bill: ${billId}`);
      
      // Get the latest text version
      const latestVersion = await this.getLatestTextVersion(billId);
      
      if (!latestVersion || !latestVersion.formats || latestVersion.formats.length === 0) {
        return null;
      }
      
      // Try to find the preferred format
      const preferredFormatUrl = latestVersion.formats.find(
        format => format.type.toUpperCase() === preferredFormat.toUpperCase()
      )?.url;
      
      if (preferredFormatUrl) {
        return preferredFormatUrl;
      }
      
      // If Formatted XML not found, try to find PDF
      const pdfUrl = latestVersion.formats.find(
        format => format.type.toUpperCase() === 'PDF'
      )?.url;
      
      if (pdfUrl) {
        return pdfUrl;
      }
      
      // Fall back to any available format
      return latestVersion.formats[0].url;
    } catch (error) {
      console.error(`❌ Error getting full text URL for bill ${billId}:`, error);
      return null;
    }
  }

  /**
   * Update bill in database with full text URL
   * @param billId Bill ID
   * @param textUrl URL to the full text
   */
  async updateBillWithTextUrl(billId: string, textUrl: string): Promise<void> {
    try {
      if (!textUrl) return;
      
      console.log(`💾 Updating bill ${billId} with full text URL...`);

      const { error } = await supabase
        .from('bills')
        .update({ 
          full_text_url: textUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (error) {
        console.warn(`Could not update bill ${billId} with full text URL:`, error);
      } else {
        console.log(`✅ Successfully updated bill ${billId} with full text URL`);
      }
    } catch (error) {
      console.warn(`Error updating bill ${billId} with full text URL:`, error);
    }
  }

  /**
   * Update bill in database with full text content
   * @param billId Bill ID
   * @param textContent Full text content
   */
  async updateBillWithTextContent(billId: string, textContent: string): Promise<void> {
    try {
      if (!textContent) return;
      
      console.log(`💾 Updating bill ${billId} with full text content (${textContent.length} characters)...`);

      const { error } = await supabase
        .from('bills')
        .update({ 
          full_text_content: textContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (error) {
        console.warn(`Could not update bill ${billId} with full text content:`, error);
      } else {
        console.log(`✅ Successfully updated bill ${billId} with full text content`);
      }
    } catch (error) {
      console.warn(`Error updating bill ${billId} with full text content:`, error);
    }
  }

  /**
   * Get all available formats for a bill's text
   * @param billId Bill ID
   * @returns Array of available formats with their URLs
   */
  async getAvailableFormats(billId: string): Promise<{type: string; url: string}[]> {
    try {
      const latestVersion = await this.getLatestTextVersion(billId);
      
      if (!latestVersion || !latestVersion.formats) {
        return [];
      }
      
      return latestVersion.formats;
    } catch (error) {
      console.error(`Error getting available formats for bill ${billId}:`, error);
      return [];
    }
  }

  /**
   * Update full text URLs for multiple bills
   * @param billIds Array of bill IDs
   * @returns Object with success status, count, and message
   */
  async updateFullTextForBills(billIds: string[]): Promise<{ success: boolean; count: number; message: string }> {
    try {
      console.log(`🔄 Updating full text for ${billIds.length} bills...`);
      
      let updatedCount = 0;
      
      // Process bills in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < billIds.length; i += batchSize) {
        const batch = billIds.slice(i, i + batchSize);
        
        // Process each bill in the batch
        await Promise.all(batch.map(async (billId) => {
          try {
            // Prioritize Formatted XML over PDF
            const textUrl = await this.getFullTextUrl(billId, 'Formatted XML');
            if (textUrl) {
              await this.updateBillWithTextUrl(billId, textUrl);
              
              // Try to fetch and store the full text content
              try {
                const textContent = await this.getFormattedTextContent(billId);
                if (textContent) {
                  await this.updateBillWithTextContent(billId, textContent);
                  updatedCount++;
                }
              } catch (textError) {
                // Log the error but don't fail the entire batch
                console.warn(`Could not fetch text content for bill ${billId}:`, textError.message);
                
                // If we get a CORS error, try to generate a summary with web search instead
                if (textError.message.includes('CORS restrictions')) {
                  try {
                    console.log(`🔍 Attempting to generate summary with web search for bill ${billId} due to CORS restrictions`);
                    const { data: bill } = await supabase
                      .from('bills')
                      .select('*')
                      .eq('id', billId)
                      .single();
                    
                    if (bill) {
                      const summary = await geminiService.generateBillFullTextSummary(bill);
                      if (summary) {
                        console.log(`✅ Generated summary with web search for bill ${billId}`);
                        updatedCount++;
                      }
                    }
                  } catch (searchError) {
                    console.warn(`Could not generate summary with web search for bill ${billId}:`, searchError);
                  }
                }
                
                // Still count as updated since we got the URL
                updatedCount++;
              }
            }
          } catch (error) {
            console.warn(`Could not update full text for bill ${billId}:`, error);
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
        message: `Updated full text for ${updatedCount} of ${billIds.length} bills`
      };
    } catch (error) {
      console.error('Error updating bill full text:', error);
      return {
        success: false,
        count: 0,
        message: `Error updating bill full text: ${error.message}`
      };
    }
  }

  /**
   * Update full text for bills that don't have it
   * @param limit Maximum number of bills to update
   * @returns Object with success status, count, and message
   */
  async updateMissingFullText(limit: number = 20): Promise<{ success: boolean; count: number; message: string }> {
    try {
      console.log('🔄 Updating missing full text for bills...');
      
      // Get bills without full text content
      const { data: bills, error: fetchError } = await supabase
        .from('bills')
        .select('id')
        .is('full_text_content', null)
        .limit(limit);
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!bills || bills.length === 0) {
        return {
          success: true,
          count: 0,
          message: 'No bills found without full text content'
        };
      }
      
      console.log(`📊 Found ${bills.length} bills without full text content`);
      
      // Extract bill IDs
      const billIds = bills.map(bill => bill.id);
      
      // Update full text
      return await this.updateFullTextForBills(billIds);
    } catch (error) {
      console.error('Error updating missing full text:', error);
      return {
        success: false,
        count: 0,
        message: `Error updating missing full text: ${error.message}`
      };
    }
  }

  /**
   * Fetch and parse the formatted XML content for a bill
   * @param billId Bill ID
   * @returns The formatted text content or null if not found
   */
  async getFormattedTextContent(billId: string): Promise<string | null> {
    try {
      console.log(`🔍 Fetching formatted text content for bill: ${billId}`);
      
      // Get the Formatted XML URL
      const xmlUrl = await this.getFullTextUrl(billId, 'Formatted XML');
      
      if (!xmlUrl) {
        console.log(`⚠️ No XML URL found for bill: ${billId}`);
        return null;
      }

      // Check if we should skip this request due to CORS restrictions
      if (this.shouldSkipCorsRequest(xmlUrl)) {
        console.log(`⚠️ Skipping CORS-restricted request to: ${xmlUrl}`);
        
        // Try to get content from database first
        const { data, error } = await supabase
          .from('bills')
          .select('full_text_content')
          .eq('id', billId)
          .single();
        
        if (!error && data && data.full_text_content) {
          console.log(`✅ Using cached full text content from database for bill: ${billId}`);
          return data.full_text_content;
        }
        
        // If not in database, try to generate a summary with web search
        try {
          console.log(`🔍 Attempting to generate summary with web search for bill ${billId} due to CORS restrictions`);
          const { data: bill } = await supabase
            .from('bills')
            .select('*')
            .eq('id', billId)
            .single();
          
          if (bill) {
            const summary = await geminiService.generateBillFullTextSummary(bill);
            if (summary) {
              console.log(`✅ Generated summary with web search for bill ${billId}`);
              // Store the summary in the database
              await this.updateBillWithTextContent(billId, summary);
              return summary;
            }
          }
        } catch (searchError) {
          console.warn(`Could not generate summary with web search for bill ${billId}:`, searchError);
        }
        
        // If not in database and couldn't generate summary, throw a more helpful error
        throw new Error(`Cannot fetch bill text directly from browser due to CORS restrictions. The bill text is available at: ${xmlUrl}`);
      }
      
      console.log(`📡 Fetching XML content from: ${xmlUrl}`);
      
      // Fetch the XML content with timeout
      const response = await this.fetchWithTimeout(xmlUrl);
      
      if (!response.ok) {
        const errorMessage = `Failed to fetch XML content: ${response.status} ${response.statusText}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      // Get the text content
      const textContent = await response.text();
      
      if (!textContent || textContent.trim().length === 0) {
        console.warn(`⚠️ Empty content received for bill: ${billId}`);
        return null;
      }
      
      console.log(`✅ Successfully fetched XML content for bill: ${billId} (${textContent.length} characters)`);
      return textContent;
    } catch (error) {
      console.error(`❌ Error getting formatted text content for bill ${billId}:`, error);
      
      // Provide more specific error messages for different types of errors
      if (error.message.includes('timed out')) {
        throw new Error(`Request timed out while fetching bill text. Please try again.`);
      } else if (error.message.includes('CORS restrictions')) {
        // Re-throw CORS-specific errors as-is
        throw error;
      } else if (error.message === 'Failed to fetch') {
        // This is the main error we're fixing - provide a clear CORS-related message
        throw new Error(`Cannot access bill text due to browser security restrictions (CORS). This is common when accessing government websites directly from the browser. You can view the full text at Congress.gov instead.`);
      } else if (error.message.includes('Failed to fetch XML content:')) {
        throw error; // Re-throw HTTP errors as-is
      } else {
        throw new Error(`Unable to fetch bill text: ${error.message}`);
      }
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Bill full text cache cleared');
  }
}

export const billFullTextService = new BillFullTextService();