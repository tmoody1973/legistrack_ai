import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Pause, Loader2, Clock, Calendar, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '../common/Button';
import { elevenLabsService } from '../../services/elevenLabsService';
import { podcastOverviewService } from '../../services/podcastOverviewService';
import { useAuth } from '../../hooks/useAuth';

interface PodcastItem {
  id: string;
  content_url: string;
  content_data?: {
    text: string;
    duration: number;
  };
  title: string;
  description?: string;
  duration?: number;
  created_at: string;
  bills: {
    id: string;
    bill_type: string;
    number: number;
    title: string;
    short_title?: string;
  };
}

export const LatestPodcasts: React.FC = () => {
  const { authState } = useAuth();
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Load latest podcasts
  useEffect(() => {
    loadLatestPodcasts();
    
    // Cleanup function to handle component unmount
    return () => {
      // Stop audio playback when component unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        setCurrentlyPlaying(null);
      }
    };
  }, [authState.user]);

  // Update audio time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    audio.addEventListener('timeupdate', updateTime);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
    };
  }, [audioRef.current]);

  const loadLatestPodcasts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if ElevenLabs is available
      if (!elevenLabsService.isAvailable()) {
        console.log('⚠️ ElevenLabs API not available, showing podcast overviews without audio');
        setError('ElevenLabs API not configured. Showing podcast overviews without audio.');
        
        // Try to get bills with podcast overviews
        try {
          const bills = await podcastOverviewService.getBillsWithPodcastOverviews(3);
          
          if (bills.length > 0) {
            // Create mock podcast items from bills
            const mockPodcasts = bills.map(bill => ({
              id: `mock-podcast-${bill.id}`,
              content_url: '', // No audio URL
              content_data: {
                text: bill.podcast_overview || '',
                duration: 120 // Default duration
              },
              title: `${bill.bill_type} ${bill.number}: ${bill.short_title || bill.title}`,
              created_at: bill.updated_at,
              bills: {
                id: bill.id,
                bill_type: bill.bill_type,
                number: bill.number,
                title: bill.title,
                short_title: bill.short_title
              }
            }));
            
            setPodcasts(mockPodcasts);
          } else {
            setError('No podcast overviews available. Generate some in the bill details page.');
            setPodcasts([]);
          }
        } catch (err) {
          console.error('Error loading bills with podcast overviews:', err);
          setError('Failed to load podcast overviews. Please try again later.');
          setPodcasts([]);
        }
        
        setLoading(false);
        return;
      }
      
      // Get latest podcast audios from ElevenLabs service
      const latestAudios = await elevenLabsService.getLatestPodcastAudios(3);
      
      if (latestAudios.length === 0) {
        setError('No podcast audios found. Generate some in the bill details page.');
      }
      
      setPodcasts(latestAudios);
    } catch (err) {
      console.error('Error loading latest podcasts:', err);
      setError('Failed to load podcasts. Please try again later.');
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle play/pause for a podcast
  const togglePlayback = (podcastId: string, audioUrl: string) => {
    // Validate audioUrl before attempting to load
    if (!audioUrl || audioUrl.trim() === '') {
      console.warn('Cannot play audio: URL is empty or invalid');
      setError('Audio not available for this podcast.');
      return;
    }

    if (currentlyPlaying === podcastId) {
      // Already playing this podcast, pause it
      if (audioRef.current) {
        audioRef.current.pause();
        setCurrentlyPlaying(null);
      }
    } else {
      // Play this podcast
      if (audioRef.current) {
        audioRef.current.pause(); // Pause any currently playing audio
      }
      
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play().catch(e => {
        console.error('Error playing audio:', e);
        setError(`Failed to play audio: ${e.message}`);
      });
      
      // Set up event listeners
      audioRef.current.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
      });
      
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setError('Error playing audio: Failed to load because no supported source was found.');
        setCurrentlyPlaying(null);
      });
      
      setCurrentlyPlaying(podcastId);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time (seconds) to MM:SS
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if ElevenLabs is available
  const isElevenLabsAvailable = elevenLabsService.isAvailable();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Volume2 className="w-5 h-5 mr-2 text-purple-500" />
            Latest Podcasts
          </h3>
          <p className="text-gray-600 text-sm">
            Listen to bill overviews in podcast format
          </p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadLatestPodcasts}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>
      
      {/* ElevenLabs API Not Configured Warning */}
      {!isElevenLabsAvailable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">ElevenLabs API Not Configured</h4>
              <p className="text-yellow-700 text-sm">
                To enable audio playback for podcast overviews, please add your ElevenLabs API key to your environment variables:
              </p>
              <div className="bg-yellow-100 p-2 rounded-md font-mono text-xs mt-2 mb-2">
                VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key<br />
                VITE_ELEVENLABS_VOICE_ID=56AoDkrOh6qfVPDXZ7Pt
              </div>
              <p className="text-yellow-700 text-sm">
                You can get your API key from the <a href="https://elevenlabs.io/app/account" target="_blank" rel="noopener noreferrer" className="text-yellow-800 underline">ElevenLabs dashboard</a>.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && error !== 'ElevenLabs API not configured. Showing podcast overviews without audio.' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-yellow-700 text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mr-3" />
          <p className="text-gray-600">Loading podcasts...</p>
        </div>
      ) : podcasts.length > 0 ? (
        <div className="space-y-4">
          {podcasts.map((podcast) => (
            <div key={podcast.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100 p-4 hover:shadow-md transition-all">
              <div className="flex items-center space-x-3 mb-3">
                <button
                  onClick={() => isElevenLabsAvailable && podcast.content_url ? togglePlayback(podcast.id, podcast.content_url) : null}
                  disabled={!isElevenLabsAvailable || !podcast.content_url}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isElevenLabsAvailable && podcast.content_url 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } transition-colors`}
                  aria-label={currentlyPlaying === podcast.id ? "Pause" : "Play"}
                >
                  {currentlyPlaying === podcast.id ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm truncate">
                    {podcast.title || `${podcast.bills.bill_type} ${podcast.bills.number}: ${podcast.bills.short_title || podcast.bills.title}`}
                  </h4>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>{formatDate(podcast.created_at)}</span>
                    {(podcast.duration || podcast.content_data?.duration) && (
                      <>
                        <span className="mx-1">•</span>
                        <Clock className="w-3 h-3 mr-1" />
                        <span>{formatTime(podcast.duration || podcast.content_data?.duration || 0)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Progress Bar (only show if this podcast is playing) */}
              {currentlyPlaying === podcast.id && audioRef.current && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                  <div 
                    className="bg-purple-600 h-1.5 rounded-full" 
                    style={{ width: `${(currentTime / audioRef.current.duration) * 100}%` }}
                  ></div>
                </div>
              )}
              
              {/* Preview Text */}
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {podcast.content_data?.text?.substring(0, 150) || podcast.description?.substring(0, 150)}...
              </p>
              
              {/* View Bill Link */}
              <div className="text-right">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.location.href = `/bills/${podcast.bills.id}`}
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  View Bill
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Volume2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Podcasts Available</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Generate podcast overviews for bills to listen to them here.
          </p>
          <Button 
            variant="primary"
            onClick={() => window.location.href = '/bills'}
          >
            Browse Bills
          </Button>
        </div>
      )}
      
      {/* About Podcasts */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <h4 className="font-medium text-gray-900 text-sm mb-2">About Bill Podcasts</h4>
        <p className="text-xs text-gray-600">
          Bill podcasts provide concise, engaging audio summaries of legislation. 
          They're perfect for staying informed on the go. Generate them from any bill's detail page.
        </p>
      </div>
    </div>
  );
};