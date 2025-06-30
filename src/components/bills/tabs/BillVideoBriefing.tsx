import React, { useState, useEffect } from 'react';
import { Video, Loader2, AlertTriangle, CheckCircle, Calendar, Clock, User, RefreshCw } from 'lucide-react';
import { Button } from '../../common/Button';
import { VideoBriefingPlayer } from '../../video/VideoBriefingPlayer';
import { tavusService } from '../../../services/tavusService';
import { openaiService } from '../../../services/openaiService';
import { useAuth } from '../../../hooks/useAuth';
import type { Bill } from '../../../types';

interface BillVideoBriefingProps {
  bill: Bill;
}

export const BillVideoBriefing: React.FC<BillVideoBriefingProps> = ({ bill }) => {
  const { authState } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<any | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Check if Tavus API is available
  const isTavusAvailable = tavusService.isAvailable();

  // Check if there's an existing video for this bill
  useEffect(() => {
    const checkExistingVideo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const videos = await tavusService.getUserVideos();
        const billVideo = videos.find(video => 
          video.generation_params?.billId === bill.id && 
          (video.status === 'completed' || video.status === 'ready')
        );
        
        if (billVideo) {
          setVideoId(billVideo.video_id);
          setVideoData(billVideo);
        }
      } catch (error) {
        console.error('Error checking existing videos:', error);
        // Don't show error for checking existing videos as it's not critical
      } finally {
        setLoading(false);
      }
    };
    
    // Load comprehensive analysis
    const fetchComprehensiveAnalysis = async () => {
      try {
        setLoadingAnalysis(true);
        
        // First check if we have the analysis in local storage
        const storageKey = `bill-analysis-${bill.id}`;
        const storedAnalysis = localStorage.getItem(storageKey);
        
        if (storedAnalysis) {
          try {
            const parsedAnalysis = JSON.parse(storedAnalysis);
            setComprehensiveAnalysis(parsedAnalysis);
            console.log('✅ Loaded comprehensive analysis from local storage');
          } catch (parseError) {
            console.warn('Error parsing stored analysis, fetching from database:', parseError);
            // Continue to fetch from database if parsing fails
          }
        }
        
        if (!comprehensiveAnalysis) {
          // Try to get from database
          const analysis = await openaiService.getComprehensiveAnalysis(bill.id);
          
          if (analysis) {
            setComprehensiveAnalysis(analysis);
            
            // Store in local storage for future sessions
            localStorage.setItem(storageKey, JSON.stringify(analysis));
            console.log('✅ Loaded comprehensive analysis from database and cached locally');
          }
        }
      } catch (error) {
        console.error('Error fetching comprehensive analysis:', error);
      } finally {
        setLoadingAnalysis(false);
      }
    };
    
    if (isTavusAvailable && authState.user) {
      checkExistingVideo();
      fetchComprehensiveAnalysis();
    }
  }, [bill.id, isTavusAvailable, authState.user]);

  const generateVideoScript = (analysis: any): string => {
    // Create a script based on the comprehensive analysis
    let script = `Hi ${authState.user?.user_metadata?.full_name || 'there'}, I'm your legislative policy expert with an important update on ${bill.bill_type} ${bill.number}.`;
    
    // Add executive summary
    if (analysis?.executiveSummary) {
      script += `\n\nHere's what you need to know: ${analysis.executiveSummary}`;
    }
    
    // Add key provisions summary
    if (analysis?.keyProvisions && analysis.keyProvisions.length > 0) {
      script += "\n\nThe bill contains these key provisions:";
      analysis.keyProvisions.slice(0, 2).forEach((provision: any, index: number) => {
        script += `\n${index + 1}. ${provision.title}: ${provision.description.substring(0, 100)}...`;
      });
    }
    
    // Add stakeholder impact
    if (analysis?.stakeholderImpact?.citizens) {
      script += `\n\nFor citizens like you, this means: ${analysis.stakeholderImpact.citizens.substring(0, 150)}...`;
    }
    
    // Add political landscape summary
    if (analysis?.politicalLandscape) {
      script += "\n\nPolitically, this bill ";
      if (analysis.politicalLandscape.keyFactors && analysis.politicalLandscape.keyFactors.length > 0) {
        script += analysis.politicalLandscape.keyFactors[0];
      }
    }
    
    // Add potential outcomes
    if (analysis?.potentialOutcomes?.ifPassed) {
      script += `\n\nIf passed, ${analysis.potentialOutcomes.ifPassed.substring(0, 100)}...`;
    }
    
    // Add closing
    script += "\n\nThis legislation could have significant implications, and I'll keep you updated as it progresses through Congress.";
    script += "\n\nThanks for staying engaged with LegisTrack AI. I'm here to help you understand the legislation that matters to you.";
    
    return script;
  };

  const handleGenerateVideo = async () => {
    if (!authState.user) {
      setError('You must be logged in to generate video briefings.');
      return;
    }

    if (!isTavusAvailable) {
      setError('Tavus API is not available. Please check your API key configuration.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setSuccess(null);

      // Validate required data
      if (!bill.id || !bill.title) {
        throw new Error('Bill information is incomplete. Cannot generate video briefing.');
      }

      // Generate script based on comprehensive analysis if available
      let script = '';
      if (comprehensiveAnalysis) {
        script = generateVideoScript(comprehensiveAnalysis);
      } else {
        // Fallback to basic script if no analysis is available
        script = `
Hi ${authState.user?.user_metadata?.full_name || 'there'}, I'm your legislative policy expert with an important update on a bill you're tracking.

Today, I want to brief you on "${bill.bill_type} ${bill.number}: ${bill.short_title || bill.title}".

Here's what you need to know: ${bill.summary || 'This bill is currently being analyzed for its key provisions and potential impact.'}

This legislation could have significant implications, and I'll keep you updated as it progresses through Congress.

Thanks for staying engaged with LegisTrack AI. I'm here to help you understand the legislation that matters to you.
        `.trim();
      }

      const response = await tavusService.generateBillBriefing(
        bill.id,
        bill.short_title || bill.title,
        script,
        authState.user?.user_metadata?.full_name || 'there'
      );

      // Validate the response has a valid video ID
      if (!response.video_id || typeof response.video_id !== 'string' || response.video_id.trim() === '') {
        throw new Error('Invalid video ID received from Tavus API: ' + response.video_id);
      }

      setVideoId(response.video_id);
      setSuccess(`Video generation initiated! Video ID: ${response.video_id}`);
      
      // Poll for video status
      const checkVideoStatus = async () => {
        try {
          // Ensure we have a valid video ID before checking status
          if (!response.video_id || typeof response.video_id !== 'string' || response.video_id.trim() === '') {
            setError('Cannot check video status: Invalid video ID');
            setIsGenerating(false);
            return;
          }

          const status = await tavusService.getVideoStatus(response.video_id);
          
          if (status.status === 'completed' || status.status === 'ready') {
            setVideoData(status);
            setIsGenerating(false);
            setSuccess('Video generation completed successfully!');
          } else if (status.status === 'failed') {
            setError('Video generation failed. Please try again.');
            setIsGenerating(false);
          } else {
            // Continue polling
            setTimeout(checkVideoStatus, 5000);
          }
        } catch (error) {
          console.error('Error checking video status:', error);
          setError(`Error checking video status: ${error.message}`);
          setIsGenerating(false);
        }
      };
      
      // Start polling after a delay
      setTimeout(checkVideoStatus, 5000);
    } catch (error) {
      console.error('Error generating video:', error);
      
      let errorMessage = 'Failed to generate video. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setSuccess(null);
    setVideoId(null);
    setVideoData(null);
    handleGenerateVideo();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!authState.user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Video Briefing</h2>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-blue-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800 text-lg mb-2">Authentication Required</h3>
              <p className="text-blue-700">
                Please log in to generate personalized video briefings for this bill.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isTavusAvailable) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Video Briefing</h2>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800 text-lg mb-2">Tavus API Not Configured</h3>
              <p className="text-yellow-700 mb-4">
                To enable personalized video briefings, please add your Tavus API key to your environment variables:
              </p>
              <div className="bg-yellow-100 p-3 rounded-md font-mono text-sm mb-4">
                VITE_TAVUS_API_KEY=your_tavus_api_key<br />
                VITE_TAVUS_REPLICA_ID=r6ca16dbe104
              </div>
              <p className="text-yellow-700">
                You can get your API key from the <a href="https://app.tavus.io/settings/api" target="_blank" rel="noopener noreferrer" className="text-yellow-800 underline">Tavus dashboard</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Video Briefing</h2>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-700">{error}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            className="ml-4"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {success && !videoData && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Analysis Status */}
      {loadingAnalysis && !comprehensiveAnalysis && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-3 flex-shrink-0" />
          <p className="text-blue-700">Loading comprehensive analysis for video generation...</p>
        </div>
      )}

      {/* Video Player or Generation UI */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : videoData ? (
        <div className="space-y-4">
          <VideoBriefingPlayer
            videoUrl={videoData.stream_url || videoData.hosted_url || videoData.download_url}
            title={`${bill.bill_type} ${bill.number} - Video Briefing`}
            thumbnailUrl={videoData.still_image_thumbnail_url || videoData.gif_thumbnail_url}
          />
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-2">{videoData.video_name || `${bill.bill_type} ${bill.number} - Video Briefing`}</h3>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                <span>{formatDate(videoData.created_at)}</span>
              </div>
              
              {videoData.duration && (
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{Math.floor(videoData.duration / 60)}:{(videoData.duration % 60).toString().padStart(2, '0')}</span>
                </div>
              )}
              
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                <span>Policy Expert</span>
              </div>
            </div>
          </div>
        </div>
      ) : isGenerating ? (
        <VideoBriefingPlayer
          videoUrl=""
          title={`Generating Video Briefing for ${bill.bill_type} ${bill.number}`}
          isLoading={true}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Video Briefing Available</h3>
          <p className="text-gray-600 mb-6">
            Generate a personalized video briefing based on the comprehensive analysis of this bill.
          </p>
          <Button 
            variant="primary"
            onClick={handleGenerateVideo}
            disabled={isGenerating || (loadingAnalysis && !comprehensiveAnalysis)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : loadingAnalysis && !comprehensiveAnalysis ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading Analysis...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Generate Video Briefing
              </>
            )}
          </Button>
          
          {comprehensiveAnalysis && (
            <p className="text-sm text-green-600 mt-4">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Comprehensive analysis available for video generation
            </p>
          )}
        </div>
      )}

      {/* About Video Briefings */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-2">About Video Briefings</h3>
        <p className="text-sm text-gray-600 mb-4">
          Video briefings provide personalized explanations of legislation from AI policy experts. 
          These videos help you understand complex bills in a more engaging format.
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-1">Personalized Content</h4>
            <p className="text-gray-600">Videos are customized based on comprehensive bill analysis</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-1">Expert Analysis</h4>
            <p className="text-gray-600">Get insights from AI policy experts on legislative impact</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-1">Shareable</h4>
            <p className="text-gray-600">Share briefings with colleagues, friends, or on social media</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-1">Accessible Format</h4>
            <p className="text-gray-600">Visual and audio format makes complex legislation easier to understand</p>
          </div>
        </div>
      </div>
    </div>
  );
};