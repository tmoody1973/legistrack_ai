import React, { useState, useEffect } from 'react';
import { Video, Loader2, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Button } from '../common/Button';
import { tavusService } from '../../services/tavusService';
import { useAuth } from '../../hooks/useAuth';

export const VideoBriefingSection: React.FC = () => {
  const { authState } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);

  useEffect(() => {
    if (authState.user) {
      loadVideos();
    }
  }, [authState.user]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      const userVideos = await tavusService.getUserVideos();
      setVideos(userVideos.slice(0, 3)); // Show only the 3 most recent videos
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // If Tavus API is not available, don't show this section
  if (!tavusService.isAvailable()) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Video className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Video Briefings</h3>
            <p className="text-gray-600 text-sm">Personalized updates from policy experts</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.href = '/video'}
          className="text-primary hover:text-primary-700"
        >
          View All
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : videos.length > 0 ? (
        <div className="space-y-4">
          {videos.map(video => (
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
        <div className="text-center py-8">
          <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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