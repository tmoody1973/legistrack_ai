import { congressApiService } from './congressApiService';
import { supabase } from '../lib/supabase';
import { billFullTextService } from './billFullTextService';
import { billSummaryService } from './billSummaryService';
import type { Bill } from '../types';

/**
 * Comprehensive service for synchronizing bill data from Congress.gov API
 * Handles initial data collection, ongoing synchronization, and error handling
 */
class BillSyncService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds
  private readonly BATCH_SIZE = 10;

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Get from cache or fetch new data
   */
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
   */
  private isBrowserEnvironment(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Perform initial data collection for all bills in a congress
   * @param congress Congress number (e.g., 118)
   * @param limit Maximum number of bills to fetch
   * @param offset Starting offset for pagination
   */
  async initialDataCollection(congress: number = 118, limit: number = 100, offset: number = 0): Promise<{
    success: boolean;
    count: number;
    message: string;
    errors: any[];
  }> {
    try {
      console.log(`🚀 Starting initial data collection for ${congress}th Congress...`);
      
      // Check authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      // Get bills with optimized parameters
      const response = await congressApiService.getBills({
        congress,
        limit,
        offset
      });
      
      if (!response || !response.bills) {
        throw new Error('No bills returned from Congress API');
      }

      console.log(`📊 Received ${response.bills.length} bills from Congress.gov`);
      
      const bills = response.bills;
      const errors: any[] = [];
      let successCount = 0;

      // Process bills in batches to avoid overwhelming the API
      for (let i = 0; i < bills.length; i += this.BATCH_SIZE) {
        const batch = bills.slice(i, i + this.BATCH_SIZE);
        console.log(`🔄 Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1} of ${Math.ceil(bills.length / this.BATCH_SIZE)}...`);
        
        // Process each bill in the batch with comprehensive data collection
        const results = await Promise.all(batch.map(async (bill) => {
          try {
            const billId = `${bill.congress}-${bill.type}-${bill.number}`;
            const transformedBill = this.transformCongressBill(bill);
            
            // Store basic bill data
            const { error: upsertError } = await supabase
              .from('bills')
              .upsert(transformedBill, { onConflict: 'id' });
            
            if (upsertError) {
              throw upsertError;
            }
            
            // Fetch and store additional data in parallel
            await Promise.all([
              this.fetchAndStoreSummary(billId),
              this.fetchAndStoreSubjects(billId),
              this.fetchAndStoreFullText(billId),
              this.fetchAndStoreCommittees(billId),
              this.fetchAndStoreCosponsors(billId)
            ]);
            
            successCount++;
            return { success: true, billId };
          } catch (error) {
            errors.push({ bill: `${bill.congress}-${bill.type}-${bill.number}`, error: error.message });
            return { success: false, error };
          }
        }));
        
        // Add a delay between batches to respect API rate limits
        if (i + this.BATCH_SIZE < bills.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: true,
        count: successCount,
        message: `Successfully collected data for ${successCount} of ${bills.length} bills`,
        errors
      };
    } catch (error) {
      console.error('❌ Error in initial data collection:', error);
      return {
        success: false,
        count: 0,
        message: `Error in initial data collection: ${error.message}`,
        errors: [error]
      };
    }
  }

  /**
   * Perform ongoing synchronization to update existing bills
   * @param congress Congress number (e.g., 118)
   * @param daysBack Number of days to look back for updates
   * @param limit Maximum number of bills to update
   */
  async ongoingSynchronization(congress: number = 118, daysBack: number = 7, limit: number = 50): Promise<{
    success: boolean;
    count: number;
    message: string;
    errors: any[];
  }> {
    try {
      console.log(`🔄 Starting ongoing synchronization for ${congress}th Congress...`);
      
      // Calculate date range for updates
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      // Format dates for API
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Get recently updated bills
      const response = await congressApiService.getBills({
        congress,
        limit,
        sort: 'updateDate+desc',
        fromDateTime: startDateStr,
        toDateTime: endDateStr
      });
      
      if (!response || !response.bills) {
        throw new Error('No bills returned from Congress API');
      }

      console.log(`📊 Found ${response.bills.length} recently updated bills`);
      
      const bills = response.bills;
      const errors: any[] = [];
      let successCount = 0;

      // Process bills in batches
      for (let i = 0; i < bills.length; i += this.BATCH_SIZE) {
        const batch = bills.slice(i, i + this.BATCH_SIZE);
        console.log(`🔄 Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1} of ${Math.ceil(bills.length / this.BATCH_SIZE)}...`);
        
        // Process each bill in the batch
        const results = await Promise.all(batch.map(async (bill) => {
          try {
            const billId = `${bill.congress}-${bill.type}-${bill.number}`;
            
            // Check if bill exists and when it was last updated
            const { data: existingBill, error: fetchError } = await supabase
              .from('bills')
              .select('id, updated_at, last_synced')
              .eq('id', billId)
              .maybeSingle();
            
            // If bill doesn't exist or needs update
            if (fetchError || !existingBill || this.needsUpdate(existingBill, bill)) {
              const transformedBill = this.transformCongressBill(bill);
              
              // Update bill data
              const { error: upsertError } = await supabase
                .from('bills')
                .upsert({
                  ...transformedBill,
                  last_synced: new Date().toISOString()
                }, { onConflict: 'id' });
              
              if (upsertError) {
                throw upsertError;
              }
              
              // Update additional data in parallel
              await Promise.all([
                this.fetchAndStoreSummary(billId),
                this.fetchAndStoreSubjects(billId),
                this.fetchAndStoreFullText(billId),
                this.fetchAndStoreCommittees(billId),
                this.fetchAndStoreCosponsors(billId)
              ]);
              
              successCount++;
              return { success: true, billId, updated: true };
            } else {
              // Bill exists and doesn't need update
              return { success: true, billId, updated: false };
            }
          } catch (error) {
            errors.push({ bill: `${bill.congress}-${bill.type}-${bill.number}`, error: error.message });
            return { success: false, error };
          }
        }));
        
        // Add a delay between batches
        if (i + this.BATCH_SIZE < bills.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: true,
        count: successCount,
        message: `Successfully updated ${successCount} of ${bills.length} bills`,
        errors
      };
    } catch (error) {
      console.error('❌ Error in ongoing synchronization:', error);
      return {
        success: false,
        count: 0,
        message: `Error in ongoing synchronization: ${error.message}`,
        errors: [error]
      };
    }
  }

  /**
   * Check if a bill needs to be updated based on update date
   */
  private needsUpdate(existingBill: any, newBill: any): boolean {
    // If no last_synced date, always update
    if (!existingBill.last_synced) {
      return true;
    }
    
    // If bill has updateDate, compare with last_synced
    if (newBill.updateDate) {
      const lastSynced = new Date(existingBill.last_synced);
      const updateDate = new Date(newBill.updateDate);
      return updateDate > lastSynced;
    }
    
    // If no updateDate, check if it's been more than a day since last sync
    const lastSynced = new Date(existingBill.last_synced);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return lastSynced < oneDayAgo;
  }

  /**
   * Fetch and store bill summary
   */
  private async fetchAndStoreSummary(billId: string): Promise<void> {
    try {
      const [congress, billType, number] = billId.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }
      
      // Fetch summaries
      const response = await congressApiService.makeRequest(
        `/bill/${congress}/${billType.toLowerCase()}/${number}/summaries`,
        { format: 'json' }
      );
      
      if (!response?.summaries) {
        return; // No summaries available
      }
      
      const summaries = Array.isArray(response.summaries) 
        ? response.summaries 
        : [response.summaries];
      
      if (summaries.length === 0) {
        return;
      }
      
      // Get the most recent summary
      const latestSummary = summaries[0];
      
      // Update bill with summary
      const { error } = await supabase
        .from('bills')
        .update({ 
          summary: latestSummary.text,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);
      
      if (error) {
        console.warn(`Could not update summary for bill ${billId}:`, error);
      }
    } catch (error) {
      console.warn(`Error fetching summary for bill ${billId}:`, error);
    }
  }

  /**
   * Fetch and store bill subjects and policy area
   */
  private async fetchAndStoreSubjects(billId: string): Promise<void> {
    try {
      const [congress, billType, number] = billId.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }
      
      // Fetch subjects
      const response = await congressApiService.makeRequest(
        `/bill/${congress}/${billType.toLowerCase()}/${number}/subjects`,
        { format: 'json' }
      );
      
      if (!response?.subjects) {
        return; // No subjects available
      }
      
      // Extract subjects
      const subjects: string[] = [];
      let policyArea: string | null = null;
      
      // Extract legislative subjects
      if (response.subjects.legislativeSubjects) {
        const legislativeSubjects = Array.isArray(response.subjects.legislativeSubjects) 
          ? response.subjects.legislativeSubjects 
          : [response.subjects.legislativeSubjects];
        
        legislativeSubjects.forEach((subject: any) => {
          if (subject && subject.name) {
            subjects.push(subject.name);
          }
        });
      }
      
      // Extract policy area
      if (response.subjects.policyArea && response.subjects.policyArea.name) {
        policyArea = response.subjects.policyArea.name;
      }
      
      // Update bill with subjects and policy area
      const { error } = await supabase
        .from('bills')
        .update({ 
          subjects,
          policy_area: policyArea,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);
      
      if (error) {
        console.warn(`Could not update subjects for bill ${billId}:`, error);
      }
    } catch (error) {
      console.warn(`Error fetching subjects for bill ${billId}:`, error);
    }
  }

  /**
   * Fetch and store bill full text
   */
  private async fetchAndStoreFullText(billId: string): Promise<void> {
    try {
      // Skip in browser environment due to CORS issues
      if (this.isBrowserEnvironment()) {
        return;
      }
      
      // Use billFullTextService to handle full text
      const textUrl = await billFullTextService.getFullTextUrl(billId);
      
      if (textUrl) {
        await billFullTextService.updateBillWithTextUrl(billId, textUrl);
        
        // Try to get full text content
        try {
          const textContent = await billFullTextService.getFormattedTextContent(billId);
          
          if (textContent) {
            await billFullTextService.updateBillWithTextContent(billId, textContent);
          }
        } catch (textError) {
          console.warn(`Could not fetch text content for bill ${billId}:`, textError);
        }
      }
    } catch (error) {
      console.warn(`Error fetching full text for bill ${billId}:`, error);
    }
  }

  /**
   * Fetch and store bill committees
   */
  private async fetchAndStoreCommittees(billId: string): Promise<void> {
    try {
      const [congress, billType, number] = billId.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }
      
      // Fetch committees
      const response = await congressApiService.makeRequest(
        `/bill/${congress}/${billType.toLowerCase()}/${number}/committees`,
        { format: 'json' }
      );
      
      if (!response?.committees) {
        return; // No committees available
      }
      
      const committees = Array.isArray(response.committees) 
        ? response.committees 
        : [response.committees];
      
      if (committees.length === 0) {
        return;
      }
      
      // Transform committees
      const transformedCommittees = committees.map((committee: any) => ({
        name: committee.name,
        chamber: committee.chamber,
        url: committee.url
      }));
      
      // Update bill with committees
      const { error } = await supabase
        .from('bills')
        .update({ 
          committees: transformedCommittees,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);
      
      if (error) {
        console.warn(`Could not update committees for bill ${billId}:`, error);
      }
    } catch (error) {
      console.warn(`Error fetching committees for bill ${billId}:`, error);
    }
  }

  /**
   * Fetch and store bill cosponsors
   */
  private async fetchAndStoreCosponsors(billId: string): Promise<void> {
    try {
      const [congress, billType, number] = billId.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }
      
      // Fetch cosponsors
      const response = await congressApiService.makeRequest(
        `/bill/${congress}/${billType.toLowerCase()}/${number}/cosponsors`,
        { format: 'json' }
      );
      
      if (!response?.cosponsors) {
        return; // No cosponsors available
      }
      
      const cosponsors = Array.isArray(response.cosponsors) 
        ? response.cosponsors 
        : [response.cosponsors];
      
      // Update bill with cosponsor count
      const { error } = await supabase
        .from('bills')
        .update({ 
          cosponsors_count: cosponsors.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);
      
      if (error) {
        console.warn(`Could not update cosponsors for bill ${billId}:`, error);
      }
    } catch (error) {
      console.warn(`Error fetching cosponsors for bill ${billId}:`, error);
    }
  }

  /**
   * Transform Congress.gov bill to our format
   */
  private transformCongressBill(congressBill: any): Bill {
    const billType = congressBill.type || '';
    const number = congressBill.number || 0;
    const congress = congressBill.congress || 118;

    return {
      id: `${congress}-${billType}-${number}`,
      congress,
      bill_type: billType,
      number,
      title: congressBill.title || '',
      short_title: congressBill.shortTitle,
      introduced_date: congressBill.introducedDate,
      status: congressBill.latestAction?.text || 'Unknown',
      latest_action: {
        date: congressBill.latestAction?.actionDate,
        text: congressBill.latestAction?.text,
        actionCode: congressBill.latestAction?.actionCode,
      },
      summary: congressBill.summaries?.[0]?.text,
      ai_analysis: undefined,
      sponsors: congressBill.sponsors?.map((sponsor: any) => ({
        bioguide_id: sponsor.bioguideId,
        full_name: sponsor.fullName,
        party: sponsor.party,
        state: sponsor.state,
        district: sponsor.district,
      })) || [],
      cosponsors_count: congressBill.cosponsors?.length || 0,
      committees: congressBill.committees?.map((committee: any) => ({
        name: committee.name,
        chamber: committee.chamber,
        url: committee.url,
      })) || [],
      subjects: [],
      policy_area: null,
      congress_url: congressBill.url,
      govtrack_url: undefined,
      voting_data: {
        votes: [],
        vote_count: 0,
        last_vote_date: undefined,
        passage_probability: undefined,
        vote_summary: {}
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_synced: new Date().toISOString()
    };
  }

  /**
   * Sync a specific bill by ID
   * @param billId Bill ID in format {congress}-{type}-{number}
   * @param retryCount Current retry attempt
   */
  async syncBillById(billId: string, retryCount: number = 0): Promise<Bill | null> {
    try {
      console.log(`🔄 Syncing bill: ${billId}`);
      
      // Parse bill ID
      const [congress, billType, number] = billId.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }
      
      // Fetch bill data
      const response = await congressApiService.getBill(
        parseInt(congress),
        billType,
        parseInt(number)
      );
      
      if (!response?.bill) {
        throw new Error('Bill not found in Congress.gov API');
      }
      
      // Transform and store bill
      const transformedBill = this.transformCongressBill(response.bill);
      
      const { data, error } = await supabase
        .from('bills')
        .upsert(transformedBill, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Fetch and store additional data in parallel
      await Promise.all([
        this.fetchAndStoreSummary(billId),
        this.fetchAndStoreSubjects(billId),
        this.fetchAndStoreFullText(billId),
        this.fetchAndStoreCommittees(billId),
        this.fetchAndStoreCosponsors(billId)
      ]);
      
      console.log(`✅ Successfully synced bill: ${billId}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Error syncing bill ${billId}:`, error);
      
      // Retry logic
      if (retryCount < this.MAX_RETRIES) {
        console.log(`🔄 Retrying (${retryCount + 1}/${this.MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.syncBillById(billId, retryCount + 1);
      }
      
      return null;
    }
  }

  /**
   * Sync multiple bills by ID
   * @param billIds Array of bill IDs
   */
  async syncMultipleBills(billIds: string[]): Promise<{
    success: boolean;
    count: number;
    message: string;
    errors: any[];
  }> {
    try {
      console.log(`🔄 Syncing ${billIds.length} bills...`);
      
      const errors: any[] = [];
      let successCount = 0;
      
      // Process bills in batches
      for (let i = 0; i < billIds.length; i += this.BATCH_SIZE) {
        const batch = billIds.slice(i, i + this.BATCH_SIZE);
        console.log(`🔄 Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1} of ${Math.ceil(billIds.length / this.BATCH_SIZE)}...`);
        
        // Process each bill in the batch
        const results = await Promise.all(batch.map(async (billId) => {
          try {
            const bill = await this.syncBillById(billId);
            if (bill) {
              successCount++;
              return { success: true, billId };
            } else {
              errors.push({ billId, error: 'Failed to sync bill' });
              return { success: false, billId, error: 'Failed to sync bill' };
            }
          } catch (error) {
            errors.push({ billId, error: error.message });
            return { success: false, billId, error };
          }
        }));
        
        // Add a delay between batches
        if (i + this.BATCH_SIZE < billIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return {
        success: true,
        count: successCount,
        message: `Successfully synced ${successCount} of ${billIds.length} bills`,
        errors
      };
    } catch (error) {
      console.error('❌ Error syncing multiple bills:', error);
      return {
        success: false,
        count: 0,
        message: `Error syncing multiple bills: ${error.message}`,
        errors: [error]
      };
    }
  }

  /**
   * Sync all bills that need updating
   * @param limit Maximum number of bills to update
   */
  async syncAllBills(limit: number = 50): Promise<{
    success: boolean;
    count: number;
    message: string;
    errors?: any[];
  }> {
    try {
      console.log(`🔄 Syncing up to ${limit} bills that need updating...`);
      
      // Get bills that need updating (haven't been synced recently)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { data: bills, error: fetchError } = await supabase
        .from('bills')
        .select('id')
        .or(`last_synced.is.null,last_synced.lt.${oneDayAgo.toISOString()}`)
        .order('updated_at', { ascending: true }) // Update oldest bills first
        .limit(limit);
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!bills || bills.length === 0) {
        return {
          success: true,
          count: 0,
          message: 'No bills found that need updating'
        };
      }
      
      console.log(`📊 Found ${bills.length} bills that need updating`);
      
      // Extract bill IDs
      const billIds = bills.map(bill => bill.id);
      
      // Sync the bills
      return await this.syncMultipleBills(billIds);
    } catch (error) {
      console.error('❌ Error syncing all bills:', error);
      return {
        success: false,
        count: 0,
        message: `Error syncing all bills: ${error.message}`
      };
    }
  }

  /**
   * Get bills that need updates
   * @param limit Maximum number of bills to return
   */
  async getBillsNeedingUpdates(limit: number = 50): Promise<string[]> {
    try {
      // Get bills that haven't been updated recently or are missing data
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { data: bills, error } = await supabase
        .from('bills')
        .select('id')
        .or(`last_synced.is.null,last_synced.lt.${oneDayAgo.toISOString()},summary.is.null,full_text_url.is.null,policy_area.is.null`)
        .order('updated_at', { ascending: true }) // Update oldest bills first
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
   * Schedule regular synchronization
   * @param intervalMinutes Minutes between sync runs
   * @param batchSize Number of bills to update per run
   */
  scheduleRegularSync(intervalMinutes: number = 60, batchSize: number = 20): NodeJS.Timeout {
    console.log(`📅 Scheduling regular sync every ${intervalMinutes} minutes, ${batchSize} bills per run`);
    
    // Run initial sync immediately
    this.syncAllBills(batchSize).catch(error => {
      console.error('Error in scheduled sync:', error);
    });
    
    // Schedule regular sync
    return setInterval(() => {
      this.syncAllBills(batchSize).catch(error => {
        console.error('Error in scheduled sync:', error);
      });
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Bill sync cache cleared');
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalBills: number;
    recentlySynced: number;
    needsUpdate: number;
    lastSyncTime: string | null;
  }> {
    try {
      // Get total bill count
      const { count: totalBills, error: countError } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw countError;
      }
      
      // Get recently synced count (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { count: recentlySynced, error: recentError } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .gte('last_synced', oneDayAgo.toISOString());
      
      if (recentError) {
        throw recentError;
      }
      
      // Get count of bills needing update
      const { data: needsUpdateData, error: needsUpdateError } = await supabase
        .from('bills')
        .select('id')
        .or(`last_synced.is.null,last_synced.lt.${oneDayAgo.toISOString()},summary.is.null,full_text_url.is.null,policy_area.is.null`);
      
      if (needsUpdateError) {
        throw needsUpdateError;
      }
      
      // Get most recent sync time
      const { data: lastSyncData, error: lastSyncError } = await supabase
        .from('bills')
        .select('last_synced')
        .order('last_synced', { ascending: false })
        .limit(1)
        .single();
      
      if (lastSyncError && lastSyncError.code !== 'PGRST116') {
        throw lastSyncError;
      }
      
      return {
        totalBills: totalBills || 0,
        recentlySynced: recentlySynced || 0,
        needsUpdate: needsUpdateData?.length || 0,
        lastSyncTime: lastSyncData?.last_synced || null
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      return {
        totalBills: 0,
        recentlySynced: 0,
        needsUpdate: 0,
        lastSyncTime: null
      };
    }
  }
}

export const billSyncService = new BillSyncService();