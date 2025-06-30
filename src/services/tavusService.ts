import { supabase } from '../lib/supabase';

interface TavusVideoOptions {
  script: string;
  replicaId?: string;
  metadata?: Record<string, any>;
  webhookUrl?: string;
}

interface TavusVideoResponse {
  video_id: string;
  video_name?: string;
  status: 'processing' | 'completed' | 'failed' | 'ready';
  data?: {
    script?: string;
  };
  download_url?: string;
  stream_url?: string;
  hosted_url?: string;
  status_details?: string;
  created_at: string;
  updated_at?: string;
  still_image_thumbnail_url?: string;
  gif_thumbnail_url?: string;
}

class TavusService {
  private apiKey: string;
  private replicaId: string;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.apiKey = import.meta.env.VITE_TAVUS_API_KEY || '';
    this.replicaId = import.meta.env.VITE_TAVUS_REPLICA_ID || 'r6ca16dbe104';
    
    if (!this.apiKey) {
      console.warn('⚠️ VITE_TAVUS_API_KEY not found in environment variables');
    }
    
    if (!this.replicaId) {
      console.warn('⚠️ VITE_TAVUS_REPLICA_ID not found in environment variables');
    }
  }

  /**
   * Check if the Tavus API is available
   * @returns True if the API is available, false otherwise
   */
  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  /**
   * Validate video ID format
   * @param videoId Video ID to validate
   * @returns True if valid, false otherwise
   */
  private isValidVideoId(videoId: any): videoId is string {
    return typeof videoId === 'string' && videoId.trim() !== '' && videoId !== 'null' && videoId !== 'undefined';
  }

  /**
   * Check if cached data is still valid
   * @param timestamp Timestamp of cached data
   * @returns True if cache is valid, false otherwise
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Get from cache or fetch new data
   * @param key Cache key
   * @param fetchFn Function to fetch data
   * @returns Cached or fresh data
   */
  private async getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('📦 Using cached Tavus data for:', key);
      return cached.data;
    }

    console.log('🔄 Fetching fresh Tavus data for:', key);
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Make a direct request to the Tavus API
   * @param endpoint API endpoint
   * @param method HTTP method
   * @param body Request body
   * @returns Response data
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<T> {
    try {
      if (!this.apiKey || this.apiKey.trim() === '') {
        throw new Error('Tavus API key not configured. Please add VITE_TAVUS_API_KEY to your .env file.');
      }

      // Corrected API URL from api.tavus.io to tavusapi.com
      const url = `https://tavusapi.com/v2${endpoint}`;
      
      const headers = {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const options: RequestInit = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      };

      console.log(`🔄 Making ${method} request to Tavus API: ${endpoint}`);
      
      const response = await fetch(url, options);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = JSON.stringify(errorData);
        } catch {
          errorMessage = await response.text() || errorMessage;
        }
        
        console.error('Tavus API error:', response.status, errorMessage);
        
        if (response.status === 401) {
          throw new Error('Invalid Tavus API key. Please check your VITE_TAVUS_API_KEY in the .env file.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Please verify your Tavus API key permissions.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`Tavus API error: ${errorMessage}`);
        }
      }

      return await response.json();
    } catch (error) {
      console.error('Error making Tavus API request:', error);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to Tavus API. Please check your internet connection and API configuration.');
      }
      
      throw error;
    }
  }

  /**
   * Generate a personalized video using Tavus
   * @param options Video generation options
   * @returns Video generation response
   */
  async generateVideo(options: TavusVideoOptions): Promise<TavusVideoResponse> {
    try {
      console.log('🎬 Generating personalized video with Tavus...');
      
      if (!options.script || options.script.trim() === '') {
        throw new Error('Script is required for video generation');
      }

      // Send only the fields that Tavus API expects
      const requestBody = {
        replica_id: options.replicaId || this.replicaId,
        script: options.script.trim(),
        video_name: `Video Briefing - ${new Date().toLocaleDateString()}`
      };

      const response = await this.makeRequest<TavusVideoResponse>(
        '/videos',
        'POST',
        requestBody
      );

      // Validate the response has a valid video ID
      if (!this.isValidVideoId(response.video_id)) {
        throw new Error(`Invalid video ID received from Tavus API: ${response.video_id}`);
      }

      console.log('✅ Video generation initiated:', response.video_id);
      
      // Store video in database for tracking with internal metadata
      await this.storeVideoInDatabase(response, options.script, options.metadata);
      
      return response;
    } catch (error) {
      console.error('Error generating Tavus video:', error);
      throw error;
    }
  }

  /**
   * Store video information in database
   * @param video Video response
   * @param script Video script
   * @param internalMetadata Internal metadata for tracking
   */
  private async storeVideoInDatabase(
    video: TavusVideoResponse, 
    script: string, 
    internalMetadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user, skipping video storage');
        return;
      }

      // Validate video ID before storing
      if (!this.isValidVideoId(video.video_id)) {
        throw new Error(`Cannot store video with invalid ID: ${video.video_id}`);
      }

      // Determine source_type and source_id based on metadata
      let sourceType = 'topic'; // Default source type
      let sourceId = video.video_id; // Default to video ID as source ID

      // If metadata contains a billId, this is a bill-related video
      if (internalMetadata?.billId) {
        sourceType = 'bill';
        sourceId = internalMetadata.billId;
      }

      const { error } = await supabase
        .from('generated_content')
        .insert({
          id: video.video_id, // Now storing as TEXT instead of UUID
          content_type: 'video',
          source_type: sourceType,
          source_id: sourceId, // This ensures source_id is never null
          generator: 'tavus',
          generation_params: {
            replicaId: this.replicaId,
            script,
            ...internalMetadata // Store internal metadata in generation_params
          },
          content_url: video.stream_url || video.hosted_url || video.download_url,
          content_data: video,
          status: video.status,
          user_id: user.id,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing video in database:', error);
        throw new Error(`Failed to store video in database: ${error.message}`);
      }

      console.log('✅ Video stored in database successfully:', video.video_id);
    } catch (error) {
      console.error('Error storing video in database:', error);
      throw error; // Re-throw to handle in calling function
    }
  }

  /**
   * Get the status of a video
   * @param videoId Video ID
   * @returns Video status
   */
  async getVideoStatus(videoId: string): Promise<TavusVideoResponse> {
    try {
      console.log('🔍 Checking status of Tavus video:', videoId);
      
      // Validate video ID
      if (!this.isValidVideoId(videoId)) {
        throw new Error('Video ID is required and must be a valid string');
      }
      
      const response = await this.makeRequest<TavusVideoResponse>(
        `/videos/${videoId}`,
        'GET'
      );

      // Validate the response has a valid video ID
      if (!this.isValidVideoId(response.video_id)) {
        throw new Error(`Invalid video ID in response: ${response.video_id}`);
      }

      console.log('📊 Video status:', response.status);
      
      // Update video in database
      await this.updateVideoInDatabase(response);
      
      return response;
    } catch (error) {
      console.error('Error checking Tavus video status:', error);
      throw error;
    }
  }

  /**
   * Update video information in database
   * @param video Video response
   */
  private async updateVideoInDatabase(video: TavusVideoResponse): Promise<void> {
    try {
      // Validate video ID before updating
      if (!this.isValidVideoId(video.video_id)) {
        console.warn('Cannot update video with invalid ID:', video.video_id);
        return;
      }

      const { error } = await supabase
        .from('generated_content')
        .update({
          content_url: video.stream_url || video.hosted_url || video.download_url,
          content_data: video,
          status: video.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', video.video_id);

      if (error) {
        console.warn('Error updating video in database:', error);
      } else {
        console.log('✅ Video updated in database successfully:', video.video_id);
      }
    } catch (error) {
      console.warn('Error updating video in database:', error);
    }
  }

  /**
   * Get all videos for the current user
   * @returns Array of videos
   */
  async getUserVideos(): Promise<TavusVideoResponse[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to get videos');
      }

      const cacheKey = `user-videos-${user.id}`;
      
      return await this.getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await supabase
          .from('generated_content')
          .select('content_data, content_url, generation_params')
          .eq('user_id', user.id)
          .eq('content_type', 'video')
          .eq('generator', 'tavus')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Filter out any videos with invalid IDs and map to proper format
        return data?.map(item => {
          const videoData = item.content_data;
          // Ensure the video has the required fields
          if (videoData && this.isValidVideoId(videoData.video_id)) {
            // Add content_url from our database if it's not in the video data
            if (!videoData.stream_url && !videoData.hosted_url && !videoData.download_url && item.content_url) {
              videoData.stream_url = item.content_url;
            }
            
            // Add generation_params to the video data
            videoData.generation_params = item.generation_params;
            
            return videoData;
          }
          return null;
        }).filter(Boolean) || [];
      });
    } catch (error) {
      console.error('Error getting user videos:', error);
      return [];
    }
  }

  /**
   * Generate a bill briefing video
   * @param billId Bill ID
   * @param billTitle Bill title
   * @param billSummary Bill summary
   * @param userName User's name
   * @returns Video generation response
   */
  async generateBillBriefing(
    billId: string,
    billTitle: string,
    billSummary: string,
    userName: string = 'there'
  ): Promise<TavusVideoResponse> {
    try {
      console.log('🎬 Generating bill briefing video for:', billId);
      
      if (!billId || !billTitle) {
        throw new Error('Bill ID and title are required for briefing generation');
      }
      
      // Create personalized script
      const script = this.createBillBriefingScript(billTitle, billSummary, userName);
      
      // Generate video with internal metadata
      return await this.generateVideo({
        replicaId: this.replicaId,
        script,
        metadata: {
          billId,
          type: 'bill_briefing'
        }
      });
    } catch (error) {
      console.error('Error generating bill briefing:', error);
      throw error;
    }
  }

  /**
   * Create a script for a bill briefing
   * @param billTitle Bill title
   * @param billSummary Bill summary
   * @param userName User's name
   * @returns Formatted script
   */
  private createBillBriefingScript(
    billTitle: string,
    billSummary: string,
    userName: string
  ): string {
    // Limit summary length for better video generation
    const truncatedSummary = billSummary && billSummary.length > 400 
      ? billSummary.substring(0, 400) + '...'
      : billSummary || 'This bill is currently being analyzed for its key provisions and potential impact.';
    
    return `
Hi ${userName}, I'm your legislative policy expert with an important update on a bill you're tracking.

Today, I want to brief you on "${billTitle}".

Here's what you need to know: ${truncatedSummary}

This legislation could have significant implications, and I'll keep you updated as it progresses through Congress.

Thanks for staying engaged with LegisTrack AI. I'm here to help you understand the legislation that matters to you.
    `.trim();
  }

  /**
   * Generate a daily briefing video
   * @param userName User's name
   * @param trackedBills Array of tracked bill titles
   * @param upcomingVotes Array of upcoming votes
   * @returns Video generation response
   */
  async generateDailyBriefing(
    userName: string = 'there',
    trackedBills: string[] = [],
    upcomingVotes: string[] = []
  ): Promise<TavusVideoResponse> {
    try {
      console.log('🎬 Generating daily briefing video');
      
      // Create personalized script
      const script = this.createDailyBriefingScript(userName, trackedBills, upcomingVotes);
      
      // Generate video with internal metadata
      return await this.generateVideo({
        replicaId: this.replicaId,
        script,
        metadata: {
          type: 'daily_briefing',
          date: new Date().toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('Error generating daily briefing:', error);
      throw error;
    }
  }

  /**
   * Create a script for a daily briefing
   * @param userName User's name
   * @param trackedBills Array of tracked bill titles
   * @param upcomingVotes Array of upcoming votes
   * @returns Formatted script
   */
  private createDailyBriefingScript(
    userName: string,
    trackedBills: string[],
    upcomingVotes: string[]
  ): string {
    let script = `
Good morning ${userName}, I'm your legislative policy expert with your daily briefing for ${new Date().toLocaleDateString()}.
    `.trim();

    // Add tracked bills section
    if (trackedBills.length > 0) {
      script += `\n\nHere's an update on bills you're tracking:`;
      
      trackedBills.slice(0, 3).forEach((bill, index) => {
        script += `\n${index + 1}. ${bill}`;
      });
      
      if (trackedBills.length > 3) {
        script += `\n...and ${trackedBills.length - 3} more bills have updates.`;
      }
    }

    // Add upcoming votes section
    if (upcomingVotes.length > 0) {
      script += `\n\nUpcoming votes to watch:`;
      
      upcomingVotes.slice(0, 2).forEach((vote, index) => {
        script += `\n${index + 1}. ${vote}`;
      });
      
      if (upcomingVotes.length > 2) {
        script += `\n...and ${upcomingVotes.length - 2} more votes scheduled.`;
      }
    }

    // Add closing
    script += `\n\nCheck your LegisTrack AI dashboard for more details and personalized insights. I'll be back tomorrow with another update.`;

    return script;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Tavus service cache cleared');
  }
}

export const tavusService = new TavusService();