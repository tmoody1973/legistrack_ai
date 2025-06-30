import { supabase } from '../lib/supabase';
import type { Bill } from '../types';

interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

interface ElevenLabsResponse {
  audio_url?: string;
  audio_data?: string; // base64 encoded audio
  duration?: number;
  error?: string;
}

interface PodcastItem {
  id: string;
  title: string;
  description: string;
  content_url: string;
  duration: number;
  created_at: string;
  bills: Bill;
}

class ElevenLabsService {
  private apiKey: string;
  private voiceId: string;
  private readonly API_URL = 'https://api.elevenlabs.io/v1';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
    this.voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '56AoDkrOh6qfVPDXZ7Pt'; // Default to NPR-style voice
    
    if (!this.apiKey) {
      console.warn('⚠️ VITE_ELEVENLABS_API_KEY not found in environment variables');
    }
    
    if (!this.voiceId) {
      console.warn('⚠️ VITE_ELEVENLABS_VOICE_ID not found in environment variables, using default NPR-style voice');
    }
  }

  /**
   * Check if the ElevenLabs API is available
   * @returns True if the API is available, false otherwise
   */
  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
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
      console.log('📦 Using cached ElevenLabs data for:', key);
      return cached.data;
    }

    console.log('🔄 Fetching fresh ElevenLabs data for:', key);
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Generate audio from text using ElevenLabs API
   * @param text Text to convert to speech
   * @param voiceId Voice ID to use (defaults to NPR-style voice)
   * @returns Object with audio URL and metadata
   */
  async generateAudio(text: string, voiceId?: string): Promise<ElevenLabsResponse> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API is not available. Please check your API key configuration.');
    }

    try {
      console.log('🎙️ Generating audio with ElevenLabs...');
      
      // Use provided voice ID or default
      const voice = voiceId || this.voiceId;
      
      // Voice settings for NPR-style narration
      const voiceSettings: ElevenLabsVoiceSettings = {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true
      };
      
      // Make request to ElevenLabs API
      const response = await fetch(`${this.API_URL}/text-to-speech/${voice}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: voiceSettings
        })
      });
      
      if (!response.ok) {
        let errorMessage = `ElevenLabs API error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use the default error message
        }
        throw new Error(errorMessage);
      }
      
      // Get audio data as blob
      const audioBlob = await response.blob();
      
      // Convert blob to base64 data URL
      const audioUrl = await this.blobToDataUrl(audioBlob);
      
      // Get duration and convert to integer for database storage
      const audioDuration = await this.getAudioDuration(audioBlob);
      
      // Store in database
      const contentId = await this.storeAudioInDatabase(text, audioUrl, audioDuration);
      
      console.log('✅ Successfully generated audio with ElevenLabs');
      
      return {
        audio_url: audioUrl,
        duration: audioDuration
      };
    } catch (error) {
      console.error('❌ Error generating audio with ElevenLabs:', error);
      throw error;
    }
  }

  /**
   * Convert blob to data URL
   * @param blob Audio blob
   * @returns Data URL
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get the duration of an audio blob
   * @param audioBlob Audio blob
   * @returns Duration in seconds as integer
   */
  private async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioBlob);
      
      audio.addEventListener('loadedmetadata', () => {
        // Convert to integer seconds for database storage
        const durationInSeconds = Math.floor(audio.duration);
        resolve(durationInSeconds);
        URL.revokeObjectURL(audio.src); // Clean up the temporary URL
      });
      
      // If there's an error or it takes too long, return a default duration
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(audio.src);
        resolve(0);
      });
      setTimeout(() => {
        URL.revokeObjectURL(audio.src);
        resolve(0);
      }, 5000);
    });
  }

  /**
   * Generate audio for a bill's podcast overview
   * @param bill Bill with podcast overview
   * @returns Object with audio URL and metadata
   */
  async generateBillPodcastAudio(bill: Bill): Promise<ElevenLabsResponse> {
    if (!bill.podcast_overview) {
      throw new Error('Bill does not have a podcast overview');
    }

    try {
      console.log(`🎙️ Generating podcast audio for bill ${bill.id}...`);
      
      // Generate audio
      const audioResponse = await this.generateAudio(bill.podcast_overview);
      
      return audioResponse;
    } catch (error) {
      console.error('❌ Error generating bill podcast audio:', error);
      throw error;
    }
  }

  /**
   * Store audio in database
   * @param text Podcast overview text
   * @param audioUrl Audio data URL
   * @param duration Audio duration in seconds (integer)
   * @returns Content ID
   */
  private async storeAudioInDatabase(
    text: string,
    audioUrl: string,
    duration: number,
    billId?: string
  ): Promise<string> {
    try {
      // Get current session to ensure consistent user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      
      // Generate a unique ID for this audio content
      const contentId = `podcast-audio-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Ensure duration is an integer for database storage
      const durationInt = Math.floor(duration);
      
      console.log(`🔢 Converting audio duration to integer: ${duration} → ${durationInt}`);
      
      // Store in generated_content table
      const { error } = await supabase
        .from('generated_content')
        .insert({
          id: contentId,
          user_id: userId, // Use session user ID for consistency with RLS
          content_type: 'audio',
          source_type: 'bill',
          source_id: billId || 'podcast-overview', // Use bill ID if provided
          generator: 'elevenlabs',
          generation_params: {
            voice_id: this.voiceId,
            model: 'eleven_turbo_v2'
          },
          content_url: audioUrl,
          content_data: {
            text,
            duration: durationInt
          },
          title: `Podcast Overview${billId ? ` - ${billId}` : ''}`,
          description: `Audio version of podcast overview${billId ? ` for ${billId}` : ''}`,
          duration: durationInt, // Ensure this is an integer
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing audio in database:', error);
        throw error;
      } else {
        console.log('✅ Audio stored in database successfully');
      }
      
      return contentId;
    } catch (error) {
      console.error('Error storing audio in database:', error);
      throw error;
    }
  }

  /**
   * Get latest podcast audios for a user
   * @param limit Maximum number of audios to return
   * @returns Array of podcast items with bill details
   */
  async getLatestPodcastAudios(limit: number = 3): Promise<PodcastItem[]> {
    try {
      // Get current session to ensure consistent user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      
      // First, query for generated content
      let query = supabase
        .from('generated_content')
        .select('*')
        .eq('content_type', 'audio')
        .eq('source_type', 'bill')
        .eq('generator', 'elevenlabs')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (userId) {
        // If user is logged in, get their content or anonymous content
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      } else {
        // If no user, just get anonymous content
        query = query.is('user_id', null);
      }
      
      const { data: generatedContent, error: contentError } = await query;
      
      if (contentError) {
        throw contentError;
      }
      
      if (!generatedContent || generatedContent.length === 0) {
        return [];
      }
      
      // Get bills for the source IDs
      const billIds = generatedContent
        .filter(item => item.source_id !== 'podcast-overview')
        .map(item => item.source_id);
      
      let bills: any[] = [];
      
      if (billIds.length > 0) {
        const { data: billsData, error: billsError } = await supabase
          .from('bills')
          .select('*')
          .in('id', billIds);
        
        if (!billsError) {
          bills = billsData || [];
        }
      }
      
      // Create a map of bill ID to bill data for easy lookup
      const billsMap = new Map();
      bills.forEach(bill => billsMap.set(bill.id, bill));
      
      // Create mock bill for generic podcast overviews
      const mockBill = {
        id: 'podcast-overview',
        bill_type: 'PODCAST',
        number: 0,
        title: 'Podcast Overview',
        congress: 0
      };
      
      // Combine generated content with bill details
      const podcastItems: PodcastItem[] = generatedContent
        .map(item => {
          const bill = item.source_id === 'podcast-overview' 
            ? mockBill 
            : billsMap.get(item.source_id) || mockBill;
          
          return {
            id: item.id,
            title: item.title || `Podcast Overview: ${bill.title}`,
            description: item.description || `Audio version of ${bill.title}`,
            content_url: item.content_url,
            duration: item.duration || 0,
            created_at: item.created_at,
            bills: bill
          };
        });
      
      return podcastItems;
    } catch (error) {
      console.error('Error getting latest podcast audios:', error);
      throw error;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 ElevenLabs service cache cleared');
  }
}

export const elevenLabsService = new ElevenLabsService();