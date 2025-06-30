import React from 'react';
import { Play, Calendar, Clock, User, Video } from 'lucide-react';
import { Button } from '../common/Button';

interface VideoBriefingCardProps {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed' | 'ready';
  onClick: () => void;
}

export const VideoBriefingCard: React.FC<VideoBriefingCardProps> = ({
  id,
  title,
  thumbnailUrl,
  duration,
  createdAt,
  status,
  onClick
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <Video className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-primary-500 rounded-full p-3">
            <Play className="w-6 h-6 text-white" fill="white" />
          </div>
        </div>
        
        {/* Status Badge */}
        {(status === 'processing') && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
            Processing
          </div>
        )}
        
        {/* Duration */}
        {(status === 'completed' || status === 'ready') && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {formatDuration(duration)}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{title}</h3>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(createdAt)}</span>
          </div>
          
          <div className="flex items-center">
            <User className="w-4 h-4 mr-1" />
            <span>Policy Expert</span>
          </div>
        </div>
      </div>
    </div>
  );
};