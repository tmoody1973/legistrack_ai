import React, { useState, useEffect } from 'react';
import { Video, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { VideoBriefingCard } from './VideoBriefingCard';
import { VideoBriefingPlayer } from './VideoBriefingPlayer';
import { tavusService } from '../../services/tavusService';

interface VideoBriefingListProps {
  title?: string;
  limit?: number;
}

export const VideoBriefingList: React.FC<VideoBriefingListProps> = ({
  title = 'Video Briefings',
  limit = 6
}) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userVideos = await tavusService.getUserVideos();
      setVideos(userVideos.slice(0, limit));
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Check status of processing videos
      const updatedVideos = [...videos];
      let hasChanges = false;
      
      for (let i = 0; i < updatedVideos.length; i++) {
        if (updatedVideos[i].status === 'processing') {
          try {
            const updatedStatus = await tavusService.getVideoStatus(updatedVideos[i].video_id);
            if (updatedStatus.status !== updatedVideos[i].status) {
              updatedVideos[i] = updatedStatus;
              hasChanges = true;
            }
          } catch (error) {
            console.warn(`Error updating video ${updatedVideos[i].video_id}:`, error);
          }
        }
      }
      
      if (hasChanges) {
        setVideos(updatedVideos);
      }
      
      // Also load any new videos
      await loadVideos();
    } catch (err) {
      console.error('Error refreshing videos:', err);
      setError('Failed to refresh videos. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleVideoClick = (video: any) => {
    if (video.status === 'completed' || video.status === 'ready') {
      setSelectedVideo(video);
    }
  };

  const handleClosePlayer = () => {
    setSelectedVideo(null);
  };

  // If Tavus API is not available, don't show this section
  if (!tavusService.isAvailable()) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Video className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 text-lg">{title}</h3>
            <p className="text-gray-600 text-sm">Personalized video briefings from policy experts</p>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">Tavus API Not Configured</h4>
              <p className="text-yellow-700 text-sm">
                To enable personalized video briefings, please add your Tavus API key to your environment variables.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Video className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 text-lg">{title}</h3>
            <p className="text-gray-600 text-sm">Personalized video briefings from policy experts</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Video Player (when a video is selected) */}
      {selectedVideo && (
        <div className="mb-6">
          <VideoBriefingPlayer
            videoUrl={selectedVideo.stream_url || selectedVideo.hosted_url || selectedVideo.download_url}
            title={selectedVideo.video_name || 'Video Briefing'}
            transcript={selectedVideo.data?.script}
            thumbnailUrl={selectedVideo.still_image_thumbnail_url || selectedVideo.gif_thumbnail_url}
            onEnded={handleClosePlayer}
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClosePlayer}
            className="mt-4"
          >
            Close Player
          </Button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-error-50 border border-error-200 rounded-lg p-4 flex items-center">
          <AlertTriangle className="w-5 h-5 text-error-500 mr-3 flex-shrink-0" />
          <p className="text-error-700">{error}</p>
        </div>
      )}

      {/* Video Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading video briefings...</p>
          </div>
        </div>
      ) : videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoBriefingCard
              key={video.video_id}
              id={video.video_id}
              title={video.video_name || `Video Briefing - ${new Date(video.created_at).toLocaleDateString()}`}
              thumbnailUrl={video.still_image_thumbnail_url || video.gif_thumbnail_url}
              duration={video.duration}
              createdAt={video.created_at}
              status={video.status}
              onClick={() => handleVideoClick(video)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Video Briefings Yet</h3>
          <p className="text-gray-600 mb-6">
            Generate your first personalized video briefing to get started.
          </p>
          <Button 
            variant="primary"
            onClick={() => window.location.href = '/video/create'}
          >
            <Video className="w-4 h-4 mr-2" />
            Create Video Briefing
          </Button>
        </div>
      )}
    </div>
  );
};