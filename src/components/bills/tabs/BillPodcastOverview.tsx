import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Loader2, AlertTriangle, Play, Pause, Download, Share2, RefreshCw, Info } from 'lucide-react';
import { Button } from '../../common/Button';
import { openaiService } from '../../../services/openaiService';
import { elevenLabsService } from '../../../services/elevenLabsService';
import { supabase } from '../../../lib/supabase';
import type { Bill } from '../../../types';

interface BillPodcastOverviewProps {
  bill: Bill;
  onUpdateBill?: (updatedBill: Bill) => void; // New prop for updating bill data
}

export const BillPodcastOverview: React.FC<BillPodcastOverviewProps> = ({ bill, onUpdateBill }) => {
  const [podcastOverview, setPodcastOverview] = useState<string | null>(bill.podcast_overview || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioGenerated, setAudioGenerated] = useState<boolean>(false);
  const [audioContentId, setAudioContentId] = useState<string | null>(null);
  const [autoGenerateAudio, setAutoGenerateAudio] = useState<boolean>(true);

  // Check if OpenAI API is available
  const isOpenAIAvailable = openaiService.isAvailable();
  
  // Check if ElevenLabs API is available
  const isElevenLabsAvailable = elevenLabsService.isAvailable();

  // Check if comprehensive analysis is available
  const hasComprehensiveAnalysis = bill.ai_analysis?.summary && 
    bill.ai_analysis?.keyProvisions && 
    bill.ai_analysis?.keyProvisions.length > 0;

  // Load podcast overview if not already available and prerequisites are met
  useEffect(() => {
    console.log('🔄 BillPodcastOverview component mounted or bill changed:', bill.id);
    console.log('📋 Current podcast_overview in bill:', bill.podcast_overview ? 'Available' : 'Not available');
    
    if (!podcastOverview) {
      console.log('🔍 No podcast overview in state, fetching...');
      fetchPodcastOverview();
    } else {
      console.log('✅ Using podcast overview from state:', podcastOverview.substring(0, 50) + '...');
      
      // If we have a podcast overview, check for existing audio
      if (!audioGenerated && !audioUrl) {
        fetchExistingAudio();
      }
    }
    
    // Cleanup function to handle component unmount
    return () => {
      // Stop audio playback when component unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      
      // Revoke any object URLs to prevent memory leaks
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [bill.id]);

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

  // Fetch podcast overview from database
  const fetchPodcastOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First check if it's already in the bill object
      if (bill.podcast_overview) {
        console.log('✅ Using podcast overview from bill object:', bill.podcast_overview.substring(0, 50) + '...');
        setPodcastOverview(bill.podcast_overview);
        
        // Check for existing audio
        await fetchExistingAudio();
        
        setLoading(false);
        return;
      }
      
      // If not, fetch it from the database
      console.log('🔍 Fetching podcast overview from database for bill:', bill.id);
      const { data, error } = await supabase
        .from('bills')
        .select('podcast_overview')
        .eq('id', bill.id)
        .single();
      
      if (error) {
        console.error('❌ Error fetching podcast overview:', error);
        // If not found, try to generate it if conditions are met
        if (isOpenAIAvailable && hasComprehensiveAnalysis) {
          console.log('🎙️ No podcast overview found, attempting to generate one...');
          generatePodcastOverview();
        } else {
          setLoading(false);
        }
        return;
      }
      
      if (data && data.podcast_overview) {
        console.log('✅ Loaded podcast overview from database:', data.podcast_overview.substring(0, 50) + '...');
        setPodcastOverview(data.podcast_overview);
        
        // Update the local bill object to include the podcast overview
        if (onUpdateBill) {
          onUpdateBill({
            ...bill,
            podcast_overview: data.podcast_overview
          });
        }
        
        // Check for existing audio
        await fetchExistingAudio();
      } else if (isOpenAIAvailable && hasComprehensiveAnalysis) {
        // If not found in database, generate it
        console.log('🎙️ No podcast overview found in database, generating one...');
        generatePodcastOverview();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error fetching podcast overview:', error);
      setLoading(false);
    }
  };

  // Fetch existing audio for this bill
  const fetchExistingAudio = async () => {
    try {
      console.log('🔍 Checking for existing audio for bill:', bill.id);
      
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      
      // Query for existing audio in generated_content table
      let query = supabase
        .from('generated_content')
        .select('*')
        .eq('content_type', 'audio')
        .eq('source_type', 'bill')
        .eq('source_id', bill.id) // Use the specific bill ID
        .eq('generator', 'elevenlabs')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (userId) {
        // If user is logged in, get their content or anonymous content
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      } else {
        // If no user, just get anonymous content
        query = query.is('user_id', null);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.warn(`Could not fetch existing audio:`, error);
        return;
      }
      
      if (data && data.length > 0) {
        const audioContent = data[0];
        console.log('✅ Found existing audio:', audioContent);
        
        // Set audio URL and metadata
        setAudioUrl(audioContent.content_url);
        setAudioDuration(audioContent.duration || 0);
        setAudioGenerated(true);
        setAudioContentId(audioContent.id);
        
        console.log('✅ Using existing audio from database');
      } else {
        console.log('⚠️ No existing audio found for this bill');
        
        // Auto-generate audio if we have podcast overview and ElevenLabs is available
        if (podcastOverview && isElevenLabsAvailable && autoGenerateAudio) {
          console.log('🎙️ Auto-generating audio for podcast overview...');
          generateAudio();
        }
      }
    } catch (error) {
      console.error('❌ Error fetching existing audio:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate podcast overview
  const generatePodcastOverview = async () => {
    if (!isOpenAIAvailable) {
      setError('OpenAI API is not available. Please check your API key configuration.');
      setLoading(false);
      return;
    }

    if (!hasComprehensiveAnalysis) {
      setError('Comprehensive analysis is required before generating a podcast overview. Please generate the AI analysis first.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🎙️ Generating podcast overview for bill:', bill.id);
      const overview = await openaiService.generatePodcastOverview(bill);
      setPodcastOverview(overview);
      
      // Update the local bill object to include the podcast overview
      if (onUpdateBill) {
        onUpdateBill({
          ...bill,
          podcast_overview: overview
        });
      }
      
      console.log('✅ Successfully generated podcast overview:', overview.substring(0, 50) + '...');
      
      // Auto-generate audio if ElevenLabs is available
      if (isElevenLabsAvailable && autoGenerateAudio) {
        console.log('🎙️ Auto-generating audio for new podcast overview...');
        await generateAudio();
      }
    } catch (error) {
      console.error('❌ Error generating podcast overview:', error);
      setError(`Failed to generate podcast overview: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle play/pause
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => {
        console.error('Error playing audio:', e);
        setError('Failed to play audio. Please try again.');
      });
    }
  };

  // Generate audio from text using ElevenLabs
  const generateAudio = async () => {
    if (!podcastOverview) return;
    if (!isElevenLabsAvailable) {
      setError('ElevenLabs API is not available. Please check your API key configuration.');
      return;
    }
    
    try {
      setGeneratingAudio(true);
      setError(null);
      
      console.log('🎙️ Generating audio for podcast overview...');
      const response = await elevenLabsService.generateBillPodcastAudio({
        ...bill,
        podcast_overview: podcastOverview
      });
      
      if (response.audio_url) {
        setAudioUrl(response.audio_url);
        setAudioDuration(response.duration || 0);
        setAudioGenerated(true);
        console.log('✅ Audio generated successfully');
      } else {
        throw new Error('No audio URL returned from ElevenLabs');
      }
    } catch (error) {
      console.error('❌ Error generating audio:', error);
      setError(`Failed to generate audio: ${error.message}`);
    } finally {
      setGeneratingAudio(false);
    }
  };

  // Format time (seconds) to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Download podcast overview as text
  const downloadText = () => {
    if (!podcastOverview) return;
    
    const element = document.createElement('a');
    const file = new Blob([podcastOverview], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${bill.bill_type}${bill.number}_podcast_overview.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Share podcast overview
  const sharePodcastOverview = () => {
    if (!podcastOverview) return;
    
    if (navigator.share) {
      navigator.share({
        title: `${bill.bill_type} ${bill.number} Podcast Overview`,
        text: podcastOverview,
        url: window.location.href
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(podcastOverview).then(() => {
        alert('Podcast overview copied to clipboard!');
      }).catch(err => {
        console.error('Error copying to clipboard:', err);
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Volume2 className="w-5 h-5 mr-2 text-purple-500" />
          Podcast Overview
        </h2>
        
        {podcastOverview && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generatePodcastOverview}
            disabled={loading || !hasComprehensiveAnalysis}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
        )}
      </div>

      {/* Prerequisite Warning */}
      {!hasComprehensiveAnalysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 mb-1">Comprehensive Analysis Required</h4>
              <p className="text-blue-700 text-sm">
                A comprehensive AI analysis must be generated first before creating a podcast overview. 
                Please visit the "Overview" tab to generate the required analysis.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-error-500 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-error-800 mb-1">Error</h4>
              <p className="text-error-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Podcast Overview</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Our AI is creating an engaging podcast-style overview of this bill. This may take a moment...
          </p>
        </div>
      ) : podcastOverview ? (
        <div className="space-y-6">
          {/* Podcast Player */}
          <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg border border-purple-200 p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {bill.bill_type} {bill.number}: {bill.short_title || bill.title}
                </h3>
                <p className="text-gray-600 text-sm">Podcast Overview</p>
              </div>
            </div>
            
            {/* Audio Player */}
            {audioGenerated && audioUrl ? (
              <div className="bg-white rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-4 mb-2">
                  <button 
                    onClick={togglePlayback}
                    className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white hover:bg-purple-700 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${audioRef.current ? (currentTime / audioRef.current.duration) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {formatTime(currentTime)} / {formatTime(audioDuration || 0)}
                  </div>
                </div>
                
                <audio 
                  ref={audioRef}
                  src={audioUrl} 
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <Button 
                  onClick={generateAudio}
                  disabled={generatingAudio || !isElevenLabsAvailable}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {generatingAudio ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Audio...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate Audio
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Podcast Text */}
            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <p className="text-gray-700 leading-relaxed">{podcastOverview}</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end mt-4 space-x-3">
              <Button variant="outline" size="sm" onClick={downloadText}>
                <Download className="w-4 h-4 mr-2" />
                Download Text
              </Button>
              <Button variant="outline" size="sm" onClick={sharePodcastOverview}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
          
          {/* About Podcast Overviews */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">About Podcast Overviews</h3>
            <p className="text-sm text-gray-600">
              Podcast overviews provide a concise, engaging summary of bills in a conversational format suitable for audio content. 
              These overviews make complex legislation more accessible and are perfect for quick consumption on the go.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Volume2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Podcast Overview Available</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Generate a podcast-style overview of this bill to make it more accessible and engaging.
          </p>
          {isOpenAIAvailable ? (
            <Button 
              onClick={generatePodcastOverview}
              disabled={!hasComprehensiveAnalysis}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Generate Podcast Overview
            </Button>
          ) : (
            <p className="text-sm text-gray-500">
              OpenAI API is not available. Please check your API key configuration.
            </p>
          )}
          
          {!hasComprehensiveAnalysis && isOpenAIAvailable && (
            <p className="text-sm text-gray-500 mt-2">
              Comprehensive analysis required. Please generate AI analysis first.
            </p>
          )}
        </div>
      )}
    </div>
  );
};