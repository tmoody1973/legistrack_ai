import { congressApiService } from './congressApiService';
import { supabase } from '../lib/supabase';
import { openaiService } from './openaiService';
import { aiTaggingService } from './aiTaggingService'; // Import the new service
import type { Bill, BillSearchParams, PaginatedResponse, BillSubject, BillTag } from '../types';

class BillService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private subjectsCache: BillSubject[] = [];
  private subjectsCacheTimestamp = 0;
  private readonly SUBJECTS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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

  // Get all available subjects for filtering
  async getAllSubjects(): Promise<BillSubject[]> {
    try {
      // Check if we have cached subjects that are still valid
      if (this.subjectsCache.length > 0 && 
          (Date.now() - this.subjectsCacheTimestamp) < this.SUBJECTS_CACHE_DURATION) {
        console.log('📦 Using cached subjects list');
        return this.subjectsCache;
      }

      console.log('🔍 Fetching all available subjects...');

      // First check if we have subjects in the database
      const { data: dbSubjects, error: dbError } = await supabase
        .from('bill_subjects')
        .select('*')
        .order('name');

      if (!dbError && dbSubjects && dbSubjects.length > 0) {
        console.log(`📊 Found ${dbSubjects.length} subjects in database`);
        this.subjectsCache = dbSubjects;
        this.subjectsCacheTimestamp = Date.now();
        return dbSubjects;
      }

      // If not in database, fetch from API and store
      console.log('🌐 Fetching subjects from Congress.gov API...');
      
      // Get a sample of bills to extract subjects
      const bills = await this.getBills({ limit: 100 });
      
      // Extract unique subjects from bills
      const subjectsSet = new Set<string>();
      const policyAreasSet = new Set<string>();
      
      bills.data.forEach(bill => {
        if (bill.subjects) {
          bill.subjects.forEach(subject => subjectsSet.add(subject));
        }
        if (bill.policy_area) {
          policyAreasSet.add(bill.policy_area);
        }
      });

      // Create subject objects
      const subjects: BillSubject[] = Array.from(subjectsSet).map(name => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        type: 'legislative',
        count: 0
      }));

      const policyAreas: BillSubject[] = Array.from(policyAreasSet).map(name => ({
        id: `policy-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        type: 'policy',
        count: 0
      }));

      const allSubjects = [...subjects, ...policyAreas].filter(s => s.name);
      
      // Store subjects in database for future use
      if (allSubjects.length > 0) {
        const { error: insertError } = await supabase
          .from('bill_subjects')
          .upsert(allSubjects, { onConflict: 'id' });

        if (insertError) {
          console.warn('Could not store subjects in database:', insertError);
        }
      }

      console.log(`📊 Extracted ${allSubjects.length} unique subjects`);
      
      this.subjectsCache = allSubjects;
      this.subjectsCacheTimestamp = Date.now();
      return allSubjects;

    } catch (error) {
      console.error('❌ Error fetching subjects:', error);
      return [];
    }
  }

  // Get subjects for a specific bill
  async getBillSubjects(billId: string): Promise<BillSubject[]> {
    try {
      const [congress, billType, number] = billId.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }

      const cacheKey = `bill-subjects-${billId}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        console.log(`🔍 Fetching subjects for bill: ${billId}`);
        
        const response = await congressApiService.getBillSubjects(
          parseInt(congress),
          billType,
          parseInt(number)
        );

        if (!response?.subjects) {
          return [];
        }

        const subjects: BillSubject[] = [];

        // Add legislative subjects
        if (response.subjects.legislativeSubjects) {
          const legislativeSubjects = Array.isArray(response.subjects.legislativeSubjects) 
            ? response.subjects.legislativeSubjects 
            : [response.subjects.legislativeSubjects];
          
          legislativeSubjects.forEach(subject => {
            if (subject && subject.name) {
              subjects.push({
                id: subject.name.toLowerCase().replace(/\s+/g, '-'),
                name: subject.name,
                type: 'legislative',
                updateDate: subject.updateDate
              });
            }
          });
        }

        // Add policy area
        if (response.subjects.policyArea && response.subjects.policyArea.name) {
          subjects.push({
            id: `policy-${response.subjects.policyArea.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: response.subjects.policyArea.name,
            type: 'policy'
          });
        }

        // Update bill in database with subjects
        this.updateBillSubjects(billId, subjects);

        return subjects;
      });
    } catch (error) {
      console.error(`❌ Error fetching subjects for bill ${billId}:`, error);
      return [];
    }
  }

  // Update bill subjects in database
  private async updateBillSubjects(billId: string, subjects: BillSubject[]): Promise<void> {
    try {
      // Extract subject names and policy area
      const subjectNames = subjects
        .filter(s => s.type === 'legislative')
        .map(s => s.name);
      
      const policyArea = subjects
        .find(s => s.type === 'policy')?.name;

      // Update bill in database
      const { error } = await supabase
        .from('bills')
        .update({ 
          subjects: subjectNames,
          policy_area: policyArea,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (error) {
        console.warn(`Could not update bill subjects for ${billId}:`, error);
      }
    } catch (error) {
      console.warn(`Error updating bill subjects for ${billId}:`, error);
    }
  }

  // Search bills from Congress.gov API with intelligent caching
  async searchBillsFromAPI(query: string, filters: {
    congress?: number;
    billType?: string;
    limit?: number;
    offset?: number;
    subjects?: string[];
  } = {}): Promise<{ bills: Bill[]; total: number; fromAPI: boolean }> {
    try {
      console.log('🔍 Searching bills from Congress.gov API:', query, filters);

      // First check database for existing results
      const dbResults = await this.searchBillsInDatabase(query, filters);
      
      // If we have good database results and it's a simple query, return those first
      if (dbResults.data.length >= 10 && !filters.congress) {
        console.log('📦 Found sufficient results in database, returning cached data');
        return {
          bills: dbResults.data,
          total: dbResults.pagination.total,
          fromAPI: false
        };
      }

      // Search via Congress.gov API
      const cacheKey = `api-search-${query}-${JSON.stringify(filters)}`;
      
      const apiResponse = await this.getCachedOrFetch(cacheKey, async () => {
        const searchParams = {
          query: query,
          congress: filters.congress || 118, // Default to current congress
          limit: Math.min(filters.limit || 20, 50),
          offset: filters.offset || 0,
          sort: 'updateDate+desc'
        };

        // Add bill type filter if specified
        if (filters.billType) {
          searchParams['bill-type'] = filters.billType;
        }

        return await congressApiService.searchBills(query, searchParams);
      });

      if (!apiResponse?.bills) {
        console.log('⚠️ No bills returned from API search');
        return { bills: [], total: 0, fromAPI: true };
      }

      console.log(`📊 Found ${apiResponse.bills.length} bills from API search`);

      // Transform API results to our format
      const transformedBills = apiResponse.bills.map(this.transformCongressBill);

      // Store search results in database for future use (but don't wait for it)
      this.cacheSearchResults(transformedBills).catch(error => {
        console.warn('Could not cache search results:', error);
      });

      return {
        bills: transformedBills,
        total: apiResponse.pagination?.count || transformedBills.length,
        fromAPI: true
      };

    } catch (error) {
      console.error('❌ Error searching bills from API:', error);
      
      // Fallback to database search if API fails
      console.log('🔄 Falling back to database search...');
      const dbResults = await this.searchBillsInDatabase(query, filters);
      return {
        bills: dbResults.data,
        total: dbResults.pagination.total,
        fromAPI: false
      };
    }
  }

  // Search bills in database
  private async searchBillsInDatabase(query: string, filters: any = {}): Promise<PaginatedResponse<Bill>> {
    try {
      let dbQuery = supabase
        .from('bills')
        .select('*', { count: 'exact' });

      // Apply text search
      if (query) {
        dbQuery = dbQuery.textSearch('search_vector', query);
      }

      // Apply filters
      if (filters.congress) {
        dbQuery = dbQuery.eq('congress', filters.congress);
      }

      if (filters.billType) {
        dbQuery = dbQuery.eq('bill_type', filters.billType);
      }

      // Apply subject filters
      if (filters.subjects && filters.subjects.length > 0) {
        // Check if any are policy areas (prefixed with 'policy-')
        const policyAreas = filters.subjects
          .filter(s => s.startsWith('policy-'))
          .map(s => s.replace('policy-', ''));
        
        const legislativeSubjects = filters.subjects
          .filter(s => !s.startsWith('policy-'));
        
        if (policyAreas.length > 0) {
          dbQuery = dbQuery.in('policy_area', policyAreas);
        }
        
        if (legislativeSubjects.length > 0) {
          dbQuery = dbQuery.overlaps('subjects', legislativeSubjects);
        }
      }

      // Pagination
      const limit = Math.min(filters.limit || 20, 50);
      const offset = filters.offset || 0;
      dbQuery = dbQuery.range(offset, offset + limit - 1);

      // Sort by relevance for search
      dbQuery = dbQuery.order('updated_at', { ascending: false });

      const { data, error, count } = await dbQuery;

      if (error) {
        throw error;
      }

      return {
        data: data || [],
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('❌ Error searching database:', error);
      return {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      };
    }
  }

  // Cache search results in database for future use
  private async cacheSearchResults(bills: Bill[]): Promise<void> {
    try {
      if (bills.length === 0) return;

      console.log(`💾 Caching ${bills.length} search results in database...`);

      const { error } = await supabase
        .from('bills')
        .upsert(bills, { 
          onConflict: 'id',
          ignoreDuplicates: true // Don't overwrite existing bills
        });

      if (error) {
        console.warn('Could not cache search results:', error);
      } else {
        console.log('✅ Search results cached successfully');
      }
    } catch (error) {
      console.warn('Error caching search results:', error);
    }
  }

  // Ensure bill exists in database (for tracking)
  async ensureBillInDatabase(billId: string): Promise<Bill | null> {
    try {
      console.log('🔍 Ensuring bill exists in database:', billId);

      // First check if bill already exists
      const { data: existingBill, error: fetchError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingBill) {
        console.log('✅ Bill already exists in database');
        return existingBill;
      }

      // Bill doesn't exist, fetch from API and store
      console.log('📥 Bill not in database, fetching from Congress.gov...');
      
      const [congress, billType, number] = billId.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }

      const congressResponse = await congressApiService.getBill(
        parseInt(congress),
        billType,
        parseInt(number)
      );

      if (!congressResponse?.bill) {
        console.log('❌ Bill not found in Congress.gov API');
        return null;
      }

      // Transform and store the bill
      const transformedBill = this.transformCongressBill(congressResponse.bill);

      const { data: storedBill, error: storeError } = await supabase
        .from('bills')
        .upsert(transformedBill, { onConflict: 'id' })
        .select()
        .single();

      if (storeError) {
        console.error('❌ Error storing bill in database:', storeError);
        throw storeError;
      }

      // Fetch and store subjects for this bill
      this.getBillSubjects(billId).catch(error => {
        console.warn(`Could not fetch subjects for bill ${billId}:`, error);
      });

      // Generate and store tags for this bill
      this.generateAndStoreTagsForBill(storedBill).catch(error => {
        console.warn(`Could not generate tags for bill ${billId}:`, error);
      });

      console.log('✅ Bill fetched from API and stored in database');
      return storedBill;

    } catch (error) {
      console.error('❌ Error ensuring bill in database:', error);
      return null;
    }
  }

  // Generate and store tags for a bill
  private async generateAndStoreTagsForBill(bill: Bill): Promise<void> {
    try {
      // Check if bill already has tags
      const { data: existingTags, error: tagError } = await supabase
        .from('bill_tags')
        .select('id')
        .eq('bill_id', bill.id);
      
      if (!tagError && existingTags && existingTags.length > 0) {
        console.log(`Bill ${bill.id} already has ${existingTags.length} tags, skipping tag generation`);
        return;
      }
      
      // Generate tags for the bill
      const tags = await aiTaggingService.generateTagsForBill(bill);
      
      // Save tags to database
      await aiTaggingService.saveTagsForBill(bill.id, tags);
    } catch (error) {
      console.warn(`Error generating and storing tags for bill ${bill.id}:`, error);
    }
  }

  // Get bill with auto-fetch from API if not in database
  async getBillWithAutoFetch(billId: string): Promise<Bill | null> {
    try {
      // Try to get from database first
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        console.log('📦 Bill found in database');
        
        // Get tags for the bill
        const tags = await aiTaggingService.getTagsForBill(billId);
        
        // NEW: Fetch comprehensive analysis and attach it to the bill
        try {
          const analysis = await openaiService.getComprehensiveAnalysis(billId);
          if (analysis) {
            data.comprehensive_analysis = analysis;
            console.log('✅ Attached comprehensive analysis to bill');
          }
          
          // Add tags to the bill
          if (tags && tags.length > 0) {
            data.tags = tags;
            console.log('✅ Attached tags to bill');
          }
        } catch (analysisError) {
          console.warn('⚠️ Could not fetch comprehensive analysis:', analysisError);
        }
        
        return data;
      }

      // Not in database, fetch from API
      console.log('🔄 Bill not in database, fetching from API...');
      const bill = await this.ensureBillInDatabase(billId);
      
      // NEW: If bill was found, fetch comprehensive analysis and tags
      if (bill) {
        try {
          const analysis = await openaiService.getComprehensiveAnalysis(billId);
          if (analysis) {
            bill.comprehensive_analysis = analysis;
            console.log('✅ Attached comprehensive analysis to bill');
          }
          
          // Get tags for the bill
          const tags = await aiTaggingService.getTagsForBill(billId);
          if (tags && tags.length > 0) {
            bill.tags = tags;
            console.log('✅ Attached tags to bill');
          }
        } catch (analysisError) {
          console.warn('⚠️ Could not fetch comprehensive analysis:', analysisError);
        }
      }
      
      return bill;

    } catch (error) {
      console.error('❌ Error getting bill with auto-fetch:', error);
      return null;
    }
  }

  // Sync bills with intelligent batching and caching
  async syncBillsFromCongress(params: {
    congress?: number;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      console.log('🔄 Starting optimized bill sync with params:', params);
      
      // Check authentication once
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('You must be logged in to sync bills');
      }

      // Use smaller, more efficient batch sizes
      const optimizedParams = {
        congress: params.congress || 118,
        limit: Math.min(params.limit || 20, 50), // Reduced from 250 to 50
        offset: params.offset || 0
      };

      console.log('👤 User authenticated, fetching bills with optimized params:', optimizedParams);
      
      // Check if we have recent data in database first
      const recentCutoff = new Date();
      recentCutoff.setHours(recentCutoff.getHours() - 1); // 1 hour ago
      
      const { data: recentBills, error: recentError } = await supabase
        .from('bills')
        .select('id, updated_at')
        .eq('congress', optimizedParams.congress)
        .gte('updated_at', recentCutoff.toISOString())
        .limit(optimizedParams.limit);

      if (!recentError && recentBills && recentBills.length >= optimizedParams.limit) {
        console.log('📦 Using recent database data, skipping API call');
        return {
          success: true,
          count: recentBills.length,
          bills: recentBills,
          message: 'Using recent cached data to minimize API usage'
        };
      }

      // Create cache key for this request
      const cacheKey = `bills-${optimizedParams.congress}-${optimizedParams.limit}-${optimizedParams.offset}`;
      
      // Get bills with caching
      const response = await this.getCachedOrFetch(cacheKey, () => 
        congressApiService.getBills(optimizedParams)
      );
      
      if (!response || !response.bills) {
        throw new Error('No bills returned from Congress API');
      }

      console.log(`📊 Received ${response.bills.length} bills from Congress.gov`);
      
      const bills = response.bills;

      if (bills.length === 0) {
        console.warn('⚠️ No bills found with current parameters');
        return {
          success: true,
          count: 0,
          bills: [],
          message: 'No bills found with current parameters'
        };
      }

      // Transform bills efficiently
      const transformedBills = bills.map(this.transformCongressBill);
      
      console.log(`💾 Storing ${transformedBills.length} bills in database...`);
      
      // Use batch upsert with conflict resolution
      const { data, error } = await supabase
        .from('bills')
        .upsert(transformedBills, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select('id, title, congress, bill_type, number'); // Only select needed fields

      if (error) {
        console.error('❌ Error storing bills:', error);
        throw error;
      }

      console.log(`✅ Successfully stored ${data?.length || 0} bills`);

      // Fetch subjects for these bills (in background)
      this.fetchSubjectsForBills(transformedBills.map(bill => bill.id));

      // Generate tags for these bills (in background)
      this.generateTagsForBills(transformedBills);

      return {
        success: true,
        count: data?.length || 0,
        bills: data || [],
        errors: []
      };
    } catch (error) {
      console.error('❌ Error syncing bills from Congress:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
        throw new Error('Unable to connect to Congress.gov API. Please check your internet connection and try again.');
      } else if (error.message.includes('Unauthorized') || error.message.includes('Invalid')) {
        throw new Error('Congress API key issue. Please verify your VITE_CONGRESS_API_KEY in .env file.');
      } else {
        throw error;
      }
    }
  }

  // Fetch subjects for multiple bills in background
  private async fetchSubjectsForBills(billIds: string[]): Promise<void> {
    try {
      console.log(`🔍 Fetching subjects for ${billIds.length} bills in background...`);
      
      // Process in smaller batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < billIds.length; i += batchSize) {
        const batch = billIds.slice(i, i + batchSize);
        
        // Process each bill in the batch
        await Promise.all(batch.map(async (billId) => {
          try {
            await this.getBillSubjects(billId);
          } catch (error) {
            console.warn(`Could not fetch subjects for bill ${billId}:`, error);
          }
        }));
        
        // Small delay between batches
        if (i + batchSize < billIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log('✅ Finished fetching subjects for bills');
    } catch (error) {
      console.warn('Error fetching subjects for bills:', error);
    }
  }

  // Generate tags for multiple bills in background
  private async generateTagsForBills(bills: Bill[]): Promise<void> {
    try {
      console.log(`🏷️ Generating tags for ${bills.length} bills in background...`);
      
      // Process bills in batches
      const batchSize = 5;
      for (let i = 0; i < bills.length; i += batchSize) {
        const batch = bills.slice(i, i + batchSize);
        
        // Process each bill in the batch
        await aiTaggingService.processBillBatch(batch);
        
        // Add a delay between batches
        if (i + batchSize < bills.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log('✅ Finished generating tags for bills');
    } catch (error) {
      console.warn('Error generating tags for bills:', error);
    }
  }

  // Optimized getBills with better database queries and tag support
  async getBills(params: BillSearchParams = {}): Promise<PaginatedResponse<Bill>> {
    try {
      // Create cache key for this query
      const cacheKey = `query-${JSON.stringify(params)}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        let query = supabase
          .from('bills')
          .select('*', { count: 'exact' });

        // Apply filters efficiently
        if (params.congress) {
          query = query.eq('congress', params.congress);
        }

        if (params.bill_type) {
          query = query.eq('bill_type', params.bill_type);
        }

        if (params.status) {
          query = query.ilike('status', `%${params.status}%`);
        }

        // Optimized sponsor filtering
        if (params.sponsor_state) {
          query = query.contains('sponsors', `[{"state":"${params.sponsor_state}"}]`);
        }

        if (params.sponsor_party) {
          query = query.contains('sponsors', `[{"party":"${params.sponsor_party}"}]`);
        }

        // Subject filtering
        if (params.subjects && params.subjects.length > 0) {
          // Check if any are policy areas (prefixed with 'policy-')
          const policyAreas = params.subjects
            .filter(s => s.startsWith('policy-'))
            .map(s => s.replace('policy-', ''));
          
          const legislativeSubjects = params.subjects
            .filter(s => !s.startsWith('policy-'));
          
          if (policyAreas.length > 0) {
            query = query.in('policy_area', policyAreas);
          }
          
          if (legislativeSubjects.length > 0) {
            query = query.overlaps('subjects', legislativeSubjects);
          }
        }

        // NEW: Policy interest filtering using bill_tags table
        if (params.policy_interests && params.policy_interests.length > 0) {
          // First, find subject IDs that match the user's interests
          const { data: matchingSubjects, error: subjectError } = await supabase
            .from('bill_subjects')
            .select('id, name')
            .or(params.policy_interests.map(interest => `name.ilike.%${interest}%`).join(','));
          
          if (!subjectError && matchingSubjects && matchingSubjects.length > 0) {
            const subjectIds = matchingSubjects.map(subject => subject.id);
            
            // Get bill IDs with these subjects that meet the confidence threshold
            const minConfidence = params.min_confidence_score || 50;
            
            const { data: tagData, error: tagError } = await supabase
              .from('bill_tags')
              .select('bill_id, subject_id')
              .in('subject_id', subjectIds)
              .gte('confidence_score', minConfidence);
            
            if (!tagError && tagData && tagData.length > 0) {
              // If we need to match all interests (AND logic)
              if (params.match_all_interests) {
                // Group by bill_id and count unique subject_ids
                const billSubjectCounts = new Map<string, Set<string>>();
                
                tagData.forEach(tag => {
                  if (!billSubjectCounts.has(tag.bill_id)) {
                    billSubjectCounts.set(tag.bill_id, new Set([tag.subject_id]));
                  } else {
                    billSubjectCounts.get(tag.bill_id)!.add(tag.subject_id);
                  }
                });
                
                // Filter bills that have tags for all matching subjects
                const matchingBillIds = Array.from(billSubjectCounts.entries())
                  .filter(([_, subjectSet]) => {
                    // Check if the bill has at least one tag for each interest
                    return subjectIds.every(subjectId => 
                      Array.from(subjectSet).some(s => s === subjectId)
                    );
                  })
                  .map(([billId, _]) => billId);
                
                if (matchingBillIds.length > 0) {
                  query = query.in('id', matchingBillIds);
                } else {
                  // No bills match all interests, return empty result
                  return {
                    data: [],
                    pagination: {
                      page: params.page || 1,
                      limit: params.limit || 20,
                      total: 0,
                      pages: 0,
                    },
                  };
                }
              } else {
                // OR logic: Any bill that matches any interest
                const billIds = tagData.map(tag => tag.bill_id);
                query = query.in('id', billIds);
              }
            } else {
              // No tags found for these subjects, return empty result
              return {
                data: [],
                pagination: {
                  page: params.page || 1,
                  limit: params.limit || 20,
                  total: 0,
                  pages: 0,
                },
              };
            }
          } else {
            // No matching subjects found, return empty result
            return {
              data: [],
              pagination: {
                page: params.page || 1,
                limit: params.limit || 20,
                total: 0,
                pages: 0,
              },
            };
          }
        }

        if (params.introduced_after) {
          query = query.gte('introduced_date', params.introduced_after);
        }

        if (params.introduced_before) {
          query = query.lte('introduced_date', params.introduced_before);
        }

        // Optimized text search
        if (params.query) {
          query = query.textSearch('search_vector', params.query);
        }

        // Efficient sorting
        const sortField = params.sort || 'introduced_date';
        const sortOrder = params.order === 'asc' ? { ascending: true } : { ascending: false };
        
        if (sortField === 'relevance' && params.query) {
          query = query.order('introduced_date', { ascending: false });
        } else if (sortField === 'confidence' && params.policy_interests && params.policy_interests.length > 0) {
          // For confidence sorting, we need to handle this after fetching the data
          // as it requires joining with the bill_tags table
          query = query.order('updated_at', { ascending: false });
        } else {
          query = query.order(sortField, sortOrder);
        }

        // Optimized pagination
        const page = params.page || 1;
        const limit = Math.min(params.limit || 20, 50); // Reduced max limit
        const offset = (page - 1) * limit;

        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          throw error;
        }

        // NEW: Fetch tags for each bill
        const billsWithTags = await Promise.all((data || []).map(async (bill) => {
          try {
            const tags = await aiTaggingService.getTagsForBill(bill.id);
            return {
              ...bill,
              tags
            };
          } catch (error) {
            console.warn(`Could not fetch tags for bill ${bill.id}:`, error);
            return bill;
          }
        }));

        // NEW: If sorting by confidence score, sort the results
        let sortedBills = billsWithTags;
        if (sortField === 'confidence' && params.policy_interests && params.policy_interests.length > 0) {
          // Sort by highest confidence score for any matching tag
          sortedBills = billsWithTags.sort((a, b) => {
            const aMaxConfidence = a.tags ? Math.max(...a.tags.map(t => t.confidence_score), 0) : 0;
            const bMaxConfidence = b.tags ? Math.max(...b.tags.map(t => t.confidence_score), 0) : 0;
            return sortOrder.ascending ? aMaxConfidence - bMaxConfidence : bMaxConfidence - aMaxConfidence;
          });
        }

        // NEW: Fetch comprehensive analysis for each bill
        const billsWithAnalysis = await Promise.all(sortedBills.map(async (bill) => {
          try {
            const analysis = await openaiService.getComprehensiveAnalysis(bill.id);
            if (analysis) {
              return {
                ...bill,
                comprehensive_analysis: analysis
              };
            }
          } catch (error) {
            console.warn(`Could not fetch comprehensive analysis for bill ${bill.id}:`, error);
          }
          return bill;
        }));

        return {
          data: billsWithAnalysis || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            pages: Math.ceil((count || 0) / limit),
          },
        };
      });
    } catch (error) {
      console.error('❌ Error fetching bills:', error);
      throw error;
    }
  }

  // Optimized single bill retrieval
  async getBill(billId: string): Promise<Bill | null> {
    try {
      const cacheKey = `bill-${billId}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await supabase
          .from('bills')
          .select('*')
          .eq('id', billId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Bill not found in cache, try to fetch from Congress.gov only if really needed
            console.log('📋 Bill not in database, checking if fetch is necessary...');
            return await this.fetchAndCacheBill(billId);
          }
          throw error;
        }

        // NEW: Fetch tags for the bill
        const tags = await aiTaggingService.getTagsForBill(billId);
        
        // NEW: Fetch comprehensive analysis and attach it to the bill
        try {
          const analysis = await openaiService.getComprehensiveAnalysis(billId);
          if (analysis) {
            return {
              ...data,
              comprehensive_analysis: analysis,
              tags: tags
            };
          }
        } catch (analysisError) {
          console.warn(`Could not fetch comprehensive analysis for bill ${billId}:`, analysisError);
        }

        return {
          ...data,
          tags: tags
        };
      });
    } catch (error) {
      console.error('❌ Error fetching bill:', error);
      throw error;
    }
  }

  // More conservative bill fetching
  private async fetchAndCacheBill(billId: string): Promise<Bill | null> {
    try {
      // Parse bill ID: {congress}-{type}-{number}
      const [congress, billType, number] = billId.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }

      // Only fetch if it's a recent congress to avoid unnecessary API calls
      const congressNum = parseInt(congress);
      if (congressNum < 117) { // Don't fetch very old bills
        console.log('📋 Skipping fetch for old congress:', congressNum);
        return null;
      }

      console.log('🔄 Fetching individual bill from Congress.gov:', billId);

      const congressResponse = await congressApiService.getBill(
        congressNum,
        billType,
        parseInt(number)
      );

      if (!congressResponse?.bill) {
        return null;
      }

      const transformedBill = this.transformCongressBill(congressResponse.bill);

      // Store in database for future use
      const { data, error } = await supabase
        .from('bills')
        .upsert(transformedBill, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('❌ Error caching bill:', error);
        return null;
      }

      // Fetch subjects for this bill (in background)
      this.getBillSubjects(billId).catch(error => {
        console.warn(`Could not fetch subjects for bill ${billId}:`, error);
      });

      // Generate tags for this bill (in background)
      aiTaggingService.generateTagsForBill(data).then(tags => {
        aiTaggingService.saveTagsForBill(billId, tags);
      }).catch(error => {
        console.warn(`Could not generate tags for bill ${billId}:`, error);
      });

      // NEW: Fetch tags for the bill
      const tags = await aiTaggingService.getTagsForBill(billId);

      // NEW: Fetch comprehensive analysis and attach it to the bill
      try {
        const analysis = await openaiService.getComprehensiveAnalysis(billId);
        if (analysis) {
          return {
            ...data,
            comprehensive_analysis: analysis,
            tags: tags
          };
        }
      } catch (analysisError) {
        console.warn(`Could not fetch comprehensive analysis for bill ${billId}:`, analysisError);
      }

      return {
        ...data,
        tags: tags
      };
    } catch (error) {
      console.error('❌ Error fetching and caching bill:', error);
      return null;
    }
  }

  // Updated search with hybrid approach (database + API)
  async searchBills(query: string, filters: Partial<BillSearchParams> = {}): Promise<PaginatedResponse<Bill>> {
    try {
      // For search, use the new hybrid search that checks API
      const searchResults = await this.searchBillsFromAPI(query, {
        congress: filters.congress,
        billType: filters.bill_type,
        limit: filters.limit,
        offset: ((filters.page || 1) - 1) * (filters.limit || 20),
        subjects: filters.subjects
      });

      return {
        data: searchResults.bills,
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          total: searchResults.total,
          pages: Math.ceil(searchResults.total / (filters.limit || 20)),
        },
      };
    } catch (error) {
      console.error('❌ Error searching bills:', error);
      throw error;
    }
  }

  // Efficient bill transformation
  private transformCongressBill(congressBill: any): Bill {
    const billType = congressBill.type || '';
    const number = congressBill.number || 0;
    const congress = congressBill.congress || 118;

    // Extract policy area if available
    let policyArea = null;
    if (congressBill.subjects?.policyArea?.name) {
      policyArea = congressBill.subjects.policyArea.name;
    }

    // Extract subjects if available
    let subjects: string[] = [];
    if (congressBill.subjects?.legislativeSubjects) {
      const legislativeSubjects = Array.isArray(congressBill.subjects.legislativeSubjects) 
        ? congressBill.subjects.legislativeSubjects 
        : [congressBill.subjects.legislativeSubjects];
      
      subjects = legislativeSubjects
        .filter(subject => subject && subject.name)
        .map(subject => subject.name);
    }

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
      subjects: subjects,
      policy_area: policyArea,
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

  // Get trending bills from database only
  async getTrendingBills(limit: number = 10): Promise<Bill[]> {
    try {
      const cacheKey = `trending-${limit}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await supabase
          .from('bills')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(limit);

        if (error) {
          throw error;
        }

        // NEW: Fetch tags for each bill
        const billsWithTags = await Promise.all((data || []).map(async (bill) => {
          try {
            const tags = await aiTaggingService.getTagsForBill(bill.id);
            return {
              ...bill,
              tags
            };
          } catch (error) {
            console.warn(`Could not fetch tags for bill ${bill.id}:`, error);
            return bill;
          }
        }));

        // NEW: Fetch comprehensive analysis for each bill
        const billsWithAnalysis = await Promise.all(billsWithTags.map(async (bill) => {
          try {
            const analysis = await openaiService.getComprehensiveAnalysis(bill.id);
            if (analysis) {
              return {
                ...bill,
                comprehensive_analysis: analysis
              };
            }
          } catch (error) {
            console.warn(`Could not fetch comprehensive analysis for bill ${bill.id}:`, error);
          }
          return bill;
        }));

        return billsWithAnalysis || [];
      });
    } catch (error) {
      console.error('❌ Error fetching trending bills:', error);
      throw error;
    }
  }

  // Get bills by user interests
  async getBillsByUserInterests(
    interests: string[],
    limit: number = 10,
    requireAllInterests: boolean = false
  ): Promise<Bill[]> {
    try {
      if (!interests || interests.length === 0) {
        return this.getTrendingBills(limit);
      }
      
      console.log(`🔍 Finding bills matching user interests: ${interests.join(', ')}`);
      
      return await aiTaggingService.getBillsByUserInterests(
        interests,
        70, // Minimum confidence score
        limit,
        requireAllInterests
      );
    } catch (error) {
      console.error('❌ Error fetching bills by user interests:', error);
      return this.getTrendingBills(limit); // Fallback to trending bills
    }
  }

  // Clear cache when needed
  clearCache(): void {
    this.cache.clear();
    this.subjectsCache = [];
    this.subjectsCacheTimestamp = 0;
    console.log('🧹 Cache cleared');
  }
}

export const billService = new BillService();