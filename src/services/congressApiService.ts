// Optimized Congress.gov API service with intelligent caching and rate limiting
class CongressApiService {
  private apiKey: string;
  private baseUrl = 'https://api.congress.gov/v3';
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 100; // 100ms between requests
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.apiKey = import.meta.env.VITE_CONGRESS_API_KEY || '';
    if (!this.apiKey) {
      console.error('❌ VITE_CONGRESS_API_KEY not found in environment variables');
      console.log('📝 Please add your Congress.gov API key to your .env file:');
      console.log('   VITE_CONGRESS_API_KEY=your_api_key_here');
    }
  }

  // Check if cached data is still valid
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  // Get from cache or make request
  private async getCachedOrFetch(cacheKey: string, requestFn: () => Promise<any>): Promise<any> {
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('📦 Using cached Congress API data for:', cacheKey);
      return cached.data;
    }

    console.log('🔄 Making fresh Congress API request for:', cacheKey);
    const data = await requestFn();
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  // Rate-limited request queue
  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  // Process request queue with rate limiting
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => 
          setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
        );
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        await request();
      }
    }

    this.isProcessingQueue = false;
  }

  // Optimized request method with caching and rate limiting
  async makeRequest(endpoint: string, params: Record<string, any> = {}) {
    if (!this.apiKey) {
      throw new Error('Congress API key not configured. Please add VITE_CONGRESS_API_KEY to your .env file.');
    }

    // Create cache key from endpoint and params
    const cacheKey = `${endpoint}-${JSON.stringify(params)}`;

    return this.getCachedOrFetch(cacheKey, () => 
      this.queueRequest(async () => {
        try {
          const url = new URL(`${this.baseUrl}${endpoint}`);
          
          // Add required parameters
          url.searchParams.append('api_key', this.apiKey);
          url.searchParams.append('format', 'json');
          
          // Add other parameters
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.append(key, value.toString());
            }
          });

          console.log('🔍 Making Congress API request:', endpoint);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // Reduced timeout

          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'User-Agent': 'LegisTrack-AI/1.0',
              'Accept': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Congress API error: ${response.status} ${response.statusText}`, errorText);
            
            switch (response.status) {
              case 401:
                throw new Error('Invalid Congress API key. Please verify your VITE_CONGRESS_API_KEY is correct.');
              case 403:
                throw new Error('Congress API key not activated. Check your email for activation instructions.');
              case 429:
                throw new Error('Rate limit exceeded. Please try again in a few minutes.');
              case 500:
              case 502:
              case 503:
              case 504:
                throw new Error('Congress.gov API is temporarily unavailable. Please try again later.');
              default:
                throw new Error(`Congress API error ${response.status}: ${response.statusText}`);
            }
          }
          
          const data = await response.json();
          console.log('✅ Congress API request successful');
          return data;
        } catch (error) {
          console.error('❌ Error in Congress API request:', error);
          
          if (error.name === 'AbortError') {
            throw new Error('Request timed out. The Congress.gov API may be slow - please try again.');
          } else if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            throw new Error('Unable to connect to Congress.gov API. Please check your internet connection.');
          } else {
            throw error;
          }
        }
      })
    );
  }

  // Optimized methods with better defaults
  async getBills(params: {
    congress?: number;
    limit?: number;
    offset?: number;
    sort?: string;
    [key: string]: any;
  } = {}) {
    const defaultParams = {
      limit: Math.min(params.limit || 20, 50), // Reduced default and max
      offset: params.offset || 0,
      sort: params.sort || 'updateDate+desc',
      ...params,
    };

    return this.makeRequest('/bill', defaultParams);
  }

  async getBill(congress: number, billType: string, billNumber: number) {
    const lowerBillType = billType.toLowerCase();
    return this.makeRequest(`/bill/${congress}/${lowerBillType}/${billNumber}`);
  }

  async searchBills(query: string, params: any = {}) {
    const searchParams = {
      query,
      limit: Math.min(params.limit || 20, 30), // Reduced for search
      offset: params.offset || 0,
      ...params,
    };
    
    return this.makeRequest('/bill', searchParams);
  }

  // Batch methods for efficiency
  async getBillActions(congress: number, billType: string, billNumber: number) {
    const lowerBillType = billType.toLowerCase();
    return this.makeRequest(`/bill/${congress}/${lowerBillType}/${billNumber}/actions`);
  }

  async getBillSummaries(congress: number, billType: string, billNumber: number) {
    const lowerBillType = billType.toLowerCase();
    return this.makeRequest(`/bill/${congress}/${lowerBillType}/${billNumber}/summaries`);
  }

  async getBillSubjects(congress: number, billType: string, billNumber: number) {
    const lowerBillType = billType.toLowerCase();
    return this.makeRequest(`/bill/${congress}/${lowerBillType}/${billNumber}/subjects`);
  }

  async getBillCosponsors(congress: number, billType: string, billNumber: number) {
    const lowerBillType = billType.toLowerCase();
    return this.makeRequest(`/bill/${congress}/${lowerBillType}/${billNumber}/cosponsors`);
  }

  async getBillCommittees(congress: number, billType: string, billNumber: number) {
    const lowerBillType = billType.toLowerCase();
    return this.makeRequest(`/bill/${congress}/${lowerBillType}/${billNumber}/committees`);
  }

  // Get bill text
  async getBillText(congress: number, billType: string, billNumber: number) {
    const lowerBillType = billType.toLowerCase();
    return this.makeRequest(`/bill/${congress}/${lowerBillType}/${billNumber}/text`);
  }

  // Get amendment text
  async getAmendmentText(congress: number, amendmentType: string, amendmentNumber: number) {
    const lowerAmendmentType = amendmentType.toLowerCase();
    return this.makeRequest(`/amendment/${congress}/${lowerAmendmentType}/${amendmentNumber}/text`);
  }

  // Get all available subjects (for reference)
  async getAllAvailableSubjects() {
    return this.makeRequest('/bill/subjects');
  }

  // Get comprehensive bill details in a single call
  async getBillDetails(congress: number, billType: string, billNumber: number) {
    try {
      console.log(`🔍 Fetching comprehensive details for bill: ${congress}-${billType}-${billNumber}`);
      
      // Create a cache key for this specific bill
      const cacheKey = `bill-details-${congress}-${billType}-${billNumber}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        // Make parallel requests for all bill data
        const [
          billResponse,
          summariesResponse,
          subjectsResponse,
          cosponsorsResponse,
          actionsResponse,
          committeesResponse,
          textResponse
        ] = await Promise.all([
          this.getBill(congress, billType, billNumber),
          this.getBillSummaries(congress, billType, billNumber).catch(e => ({ summaries: [] })),
          this.getBillSubjects(congress, billType, billNumber).catch(e => ({ subjects: {} })),
          this.getBillCosponsors(congress, billType, billNumber).catch(e => ({ cosponsors: [] })),
          this.getBillActions(congress, billType, billNumber).catch(e => ({ actions: [] })),
          this.getBillCommittees(congress, billType, billNumber).catch(e => ({ committees: [] })),
          this.getBillText(congress, billType, billNumber).catch(e => ({ textVersions: [] }))
        ]);
        
        // Extract policy area
        let policyArea = null;
        if (subjectsResponse?.subjects?.policyArea?.name) {
          policyArea = subjectsResponse.subjects.policyArea.name;
        }
        
        // Extract subjects
        let subjects = [];
        if (subjectsResponse?.subjects?.legislativeSubjects) {
          const legislativeSubjects = Array.isArray(subjectsResponse.subjects.legislativeSubjects)
            ? subjectsResponse.subjects.legislativeSubjects
            : [subjectsResponse.subjects.legislativeSubjects];
          
          subjects = legislativeSubjects
            .filter(subject => subject && subject.name)
            .map(subject => subject.name);
        }
        
        // Extract sponsors
        let sponsors = [];
        if (billResponse?.bill?.sponsors) {
          sponsors = billResponse.bill.sponsors.map((sponsor: any) => ({
            bioguideId: sponsor.bioguideId,
            fullName: sponsor.fullName,
            party: sponsor.party,
            state: sponsor.state,
            district: sponsor.district
          }));
        }
        
        // Extract committees
        let committees = [];
        if (committeesResponse?.committees) {
          committees = committeesResponse.committees.map((committee: any) => ({
            name: committee.name,
            chamber: committee.chamber,
            url: committee.url
          }));
        }
        
        // Get text URLs
        let textUrls = [];
        if (textResponse?.textVersions) {
          const versions = Array.isArray(textResponse.textVersions)
            ? textResponse.textVersions
            : [textResponse.textVersions];
          
          versions.forEach(version => {
            if (version.formats) {
              version.formats.forEach((format: any) => {
                textUrls.push({
                  type: format.type,
                  url: format.url
                });
              });
            }
          });
        }
        
        // Combine all data
        return {
          id: `${congress}-${billType}-${billNumber}`,
          congress,
          billType,
          number: billNumber,
          title: billResponse?.bill?.title,
          shortTitle: billResponse?.bill?.shortTitle,
          introducedDate: billResponse?.bill?.introducedDate,
          latestAction: billResponse?.bill?.latestAction,
          summaries: summariesResponse?.summaries || [],
          subjects,
          policyArea,
          sponsors,
          cosponsors: cosponsorsResponse?.cosponsors || [],
          committees,
          actions: actionsResponse?.actions || [],
          textUrls,
          congressUrl: billResponse?.bill?.url
        };
      });
    } catch (error) {
      console.error(`❌ Error fetching bill details for ${congress}-${billType}-${billNumber}:`, error);
      throw error;
    }
  }

  // Optimized test connection
  async testConnection() {
    try {
      const result = await this.getBills({ limit: 1 });
      return {
        success: true,
        message: 'Congress.gov API connection successful',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Congress.gov API connection failed',
        error: error.message
      };
    }
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Congress API cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const congressApiService = new CongressApiService();