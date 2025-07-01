import React, { useState, useEffect } from 'react';
import { Calendar, Users, Tag, ExternalLink, TrendingUp, Clock, MapPin, Star, Globe } from 'lucide-react';
import { trackingService } from '../../services/trackingService';
import { useAuth } from '../../hooks/useAuth';
import type { Bill } from '../../types';

interface BillCardProps {
  bill: Bill;
  onClick?: () => void;
  showTrackButton?: boolean;
  onTrack?: (billId: string) => void;
  isTracked?: boolean;
  isFromAPI?: boolean; // Flag for bills from API search
}

export const BillCard: React.FC<BillCardProps> = ({
  bill,
  onClick,
  showTrackButton = true,
  onTrack,
  isTracked: initialIsTracked = false,
  isFromAPI = false, // Default to false
}) => {
  const { authState } = useAuth();
  const [isTracked, setIsTracked] = useState(initialIsTracked);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Check if bill is tracked when component mounts
  useEffect(() => {
    if (authState.user && showTrackButton) {
      checkTrackingStatus();
    }
  }, [authState.user, bill.id]);

  const checkTrackingStatus = async () => {
    try {
      const tracked = await trackingService.isBillTracked(bill.id);
      setIsTracked(tracked);
    } catch (error) {
      console.error('Error checking tracking status:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date not available';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('passed') || lowerStatus.includes('enacted')) {
      return 'bg-success-100 text-success-700';
    }
    if (lowerStatus.includes('failed') || lowerStatus.includes('rejected')) {
      return 'bg-error-100 text-error-700';
    }
    if (lowerStatus.includes('committee')) {
      return 'bg-warning-100 text-warning-700';
    }
    return 'bg-primary-100 text-primary-700';
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 30) return `${diffDays} days ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch (e) {
      return '';
    }
  };

  const handleTrackClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!authState.user) {
      // Could show a login modal here
      console.log('User must be logged in to track bills');
      return;
    }

    setTrackingLoading(true);
    
    try {
      if (isTracked) {
        await trackingService.untrackBill(bill.id);
        setIsTracked(false);
        console.log('✅ Bill untracked successfully');
      } else {
        await trackingService.trackBill(bill.id, {
          notification_settings: {
            statusChanges: true,
            votingUpdates: true,
            aiInsights: false,
            majorMilestones: true,
          },
          user_tags: [],
        });
        setIsTracked(true);
        console.log('✅ Bill tracked successfully');
      }
      
      // Call the parent callback if provided
      onTrack?.(bill.id);
    } catch (error) {
      console.error('❌ Error toggling bill tracking:', error);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCardClick = async () => {
    // Record bill view for analytics
    if (authState.user) {
      try {
        await trackingService.recordBillView(bill.id);
      } catch (error) {
        console.warn('Could not record bill view:', error);
      }
    }
    
    onClick?.();
  };

  return (
    <div
      className={`bg-white rounded-xl border hover:border-primary-300 hover:shadow-lg transition-all duration-300 cursor-pointer group ${
        isFromAPI ? 'border-blue-200' : 'border-gray-200'
      }`}
      onClick={handleCardClick}
    >
      <div className="p-6">
        {/* Header with Bill Number and Track Button */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isFromAPI ? 'bg-blue-100 text-blue-700' : 'bg-primary-100 text-primary-700'
              }`}>
                {bill.bill_type} {bill.number}
              </span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">
                {bill.congress}th Congress
              </span>
              {bill.introduced_date && (
                <>
                  <span className="text-sm text-gray-500">•</span>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTimeAgo(bill.introduced_date)}
                  </div>
                </>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
              {bill.title}
            </h3>
            {bill.short_title && bill.short_title !== bill.title && (
              <p className="text-sm text-gray-600 mb-2 italic">
                "{bill.short_title}"
              </p>
            )}
          </div>
          
          {showTrackButton && authState.user && (
            <button
              onClick={handleTrackClick}
              disabled={trackingLoading}
              className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                isTracked
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200 border border-primary-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 hover:border-primary-300'
              } ${trackingLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Star className={`w-4 h-4 ${isTracked ? 'fill-current' : ''}`} />
              <span>
                {trackingLoading ? 'Loading...' : isTracked ? 'Tracking' : 'Track'}
              </span>
            </button>
          )}
        </div>

        {/* API Source Indicator */}
        {isFromAPI && (
          <div className="mb-3 flex items-center">
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full flex items-center">
              <Globe className="w-3 h-3 mr-1" />
              From Congress.gov API
            </span>
          </div>
        )}

        {/* Summary */}
        {bill.summary && (
          <p className="text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed">
            {bill.summary}
          </p>
        )}

        {/* Sponsors */}
        {bill.sponsors && bill.sponsors.length > 0 && (
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              <span className="font-medium">{bill.sponsors[0].full_name}</span>
              <span className="text-gray-500"> ({bill.sponsors[0].party}-{bill.sponsors[0].state})</span>
              {bill.cosponsors_count > 0 && (
                <span className="text-gray-500">
                  {' '}+ {bill.cosponsors_count} cosponsor{bill.cosponsors_count !== 1 ? 's' : ''}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Status and Date */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {bill.introduced_date ? `Introduced ${formatDate(bill.introduced_date)}` : 'Introduction date not available'}
            </span>
          </div>
          
          {bill.status && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
              {bill.status.length > 30 ? `${bill.status.substring(0, 30)}...` : bill.status}
            </span>
          )}
        </div>

        {/* Policy Area */}
        {bill.policy_area && (
          <div className="flex items-center space-x-2 mb-4">
            <Tag className="w-4 h-4 text-blue-500" />
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
              Policy Area: {bill.policy_area}
            </span>
          </div>
        )}

        {/* Subjects */}
        {bill.subjects && bill.subjects.length > 0 && (
          <div className="flex items-start space-x-2 mb-4">
            <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {bill.subjects.slice(0, 3).map((subject, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200 transition-colors"
                >
                  {subject}
                </span>
              ))}
              {bill.subjects.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  +{bill.subjects.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis Preview */}
        {bill.ai_analysis?.passagePrediction?.probability && (
          <div className="flex items-center space-x-2 mb-4 p-3 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-100">
            <TrendingUp className="w-4 h-4 text-primary-600" />
            <span className="text-sm text-primary-700">
              <span className="font-medium">
                {Math.round(bill.ai_analysis.passagePrediction.probability * 100)}%
              </span>{' '}
              passage probability
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {bill.voting_data?.vote_count > 0 && (
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                {bill.voting_data.vote_count} votes
              </span>
            )}
            {bill.committees && bill.committees.length > 0 && (
              <span className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                {bill.committees.length} committee{bill.committees.length !== 1 ? 's' : ''}
              </span>
            )}
            {bill.sponsors && bill.sponsors.length > 0 && (
              <span className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {bill.sponsors[0].state}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {bill.congress_url && (
              <a
                href={bill.congress_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-gray-400 hover:text-primary-500 transition-colors p-1 rounded"
                title="View on Congress.gov"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <div className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to view details
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};