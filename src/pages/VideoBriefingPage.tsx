import React, { useState, useEffect } from 'react';
import { Video, Loader2, ArrowLeft, Calendar, Clock, User, AlertTriangle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { VideoBriefingPlayer } from '../components/video/VideoBriefingPlayer';
import { VideoBriefingGenerator } from '../components/video/VideoBriefingGenerator';
import { tavusService } from '../services/tavusService';
import { billService } from '../services/billService';
import { useAuth } from '../hooks/useAuth';
import type { Bill } from '../types';

export const VideoBriefingPage: React.FC = () => {
  const { authState } = useAuth();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [generatedVideoId, setGeneratedVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecentBills();
    loadRecentVideos();
    
    // Check for video ID in URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');
    if (videoId) {
      loadVideoById(videoId);
    }
  }, []);

  // Load video by ID
  const loadVideoById = async (videoId: string) => {
    try {
      const status = await tavusService.getVideoStatus(videoId);
      if (status.status === 'completed' || status.status === 'ready') {
        setSelectedVideo(status);
      }
    } catch (error) {
      console.error('Error loading video by ID:', error);
    }
  };

  // Load recent bills for selection
  const loadRecentBills = async () => {
    try {
      setLoadingBills(true);
      
      const response = await billService.getBills({
        limit: 10,
        sort: 'updated_at',
        order: 'desc'
      });
      
      setRecentBills(response.data);
    } catch (error) {
      console.error('Error loading recent bills:', error);
    } finally {
      setLoadingBills(false);
    }
  };

  // Load recent videos
  const loadRecentVideos = async () => {
    try {
      setLoadingVideos(true);
      
      const userVideos = await tavusService.getUserVideos();
      setRecentVideos(userVideos.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  // Handle bill selection
  const handleBillSelect = (bill: Bill) => {
    setSelectedBill(bill);
  };

  // Handle video generation
  const handleVideoGenerated = (videoId: string) => {
    setGeneratedVideoId(videoId);
    setGeneratingVideo(true);
    
    // Poll for video status
    const checkVideoStatus = async () => {
      try {
        const status = await tavusService.getVideoStatus(videoId);
        
        if (status.status === 'completed' || status.status === 'ready') {
          setGeneratingVideo(false);
          setSelectedVideo(status);
          loadRecentVideos(); // Refresh video list
        } else if (status.status === 'failed') {
          setGeneratingVideo(false);
          setError('Video generation failed. Please try again.');
        } else {
          // Continue polling
          setTimeout(checkVideoStatus, 5000);
        }
      } catch (error) {
        console.error('Error checking video status:', error);
        setGeneratingVideo(false);
        setError('Error checking video status. Please check your videos list.');
      }
    };
    
    // Start polling
    setTimeout(checkVideoStatus, 5000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // If Tavus API is not available, show a message
  if (!tavusService.isAvailable()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => window.history.back()}
              className="flex items-center text-primary hover:text-primary-700 font-medium mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Video Briefings</h1>
            <p className="text-gray-600 mt-1">
              Personalized updates from policy experts
            </p>
          </div>
          
          <Button 
            variant="primary"
            onClick={() => {
              setSelectedBill(null);
              setSelectedVideo(null);
            }}
          >
            <Video className="w-4 h-4 mr-2" />
            New Video Briefing
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-error-50 border border-error-200 rounded-lg p-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-error-500 mr-3 flex-shrink-0" />
            <p className="text-error-700">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Video Player or Generator */}
          <div className="lg:col-span-2">
            {generatingVideo ? (
              <VideoBriefingPlayer
                videoUrl=""
                title="Generating Your Video Briefing"
                isLoading={true}
              />
            ) : selectedVideo ? (
              <div className="space-y-4">
                <VideoBriefingPlayer
                  videoUrl={selectedVideo.stream_url || selectedVideo.hosted_url || selectedVideo.download_url}
                  title={selectedVideo.video_name || 'Video Briefing'}
                  transcript={selectedVideo.data?.script}
                  thumbnailUrl={selectedVideo.still_image_thumbnail_url || selectedVideo.gif_thumbnail_url}
                />
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-medium text-gray-900 mb-2">{selectedVideo.video_name || 'Video Briefing'}</h3>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{formatDate(selectedVideo.created_at)}</span>
                    </div>
                    
                    {selectedVideo.duration && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{Math.floor(selectedVideo.duration / 60)}:{(selectedVideo.duration % 60).toString().padStart(2, '0')}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      <span>Policy Expert</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <VideoBriefingGenerator
                bill={selectedBill}
                onVideoGenerated={handleVideoGenerated}
              />
            )}
          </div>
          
          {/* Right Column - Bills and Recent Videos */}
          <div className="space-y-6">
            {/* Bill Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Select a Bill for Briefing</h3>
              
              {loadingBills ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentBills.map(bill => (
                    <div
                      key={bill.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedBill?.id === bill.id
                          ? 'bg-primary-50 border border-primary-200'
                          : 'bg-gray-50 border border-gray-200 hover:border-primary-200'
                      }`}
                      onClick={() => handleBillSelect(bill)}
                    >
                      <h4 className="font-medium text-gray-900 text-sm">
                        {bill.bill_type} {bill.number}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {bill.short_title || bill.title}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Recent Videos */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Your Recent Briefings</h3>
              
              {loadingVideos ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : recentVideos.length > 0 ? (
                <div className="space-y-3">
                  {recentVideos.map(video => (
                    <div
                      key={video.video_id}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedVideo?.video_id === video.video_id
                          ? 'bg-primary-50 border border-primary-200'
                          : 'bg-gray-50 border border-gray-200 hover:border-primary-200'
                      }`}
                      onClick={() => (video.status === 'completed' || video.status === 'ready') && setSelectedVideo(video)}
                    >
                      <div className="w-16 h-12 bg-gray-200 rounded flex-shrink-0 mr-3 flex items-center justify-center">
                        {video.still_image_thumbnail_url || video.gif_thumbnail_url ? (
                          <img 
                            src={video.still_image_thumbnail_url || video.gif_thumbnail_url} 
                            alt="" 
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Video className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {video.video_name || `Video Briefing - ${formatDate(video.created_at)}`}
                        </h4>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{formatDate(video.created_at)}</span>
                          
                          {video.status === 'processing' && (
                            <span className="ml-2 bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-xs">
                              Processing
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No video briefings yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};