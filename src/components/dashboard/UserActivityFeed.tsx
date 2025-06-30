import React, { useState, useEffect } from 'react';
import { Clock, Star, FileText, Users, Zap, Calendar, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { AnalyticsService } from '../../services/analyticsService';
import { useAuth } from '../../hooks/useAuth';

interface ActivityItem {
  id: string;
  activity_type: string;
  target_id?: string;
  target_type?: string;
  details?: any;
  created_at: string;
}

interface UserActivityFeedProps {
  limit?: number;
  onViewAll?: () => void;
}

export const UserActivityFeed: React.FC<UserActivityFeedProps> = ({ 
  limit = 5,
  onViewAll
}) => {
  const { authState } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (authState.user) {
      loadActivities();
    } else {
      setLoading(false);
    }
  }, [authState.user]);

  const loadActivities = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const userActivities = await AnalyticsService.getUserActivityHistory(authState.user!.id, limit);
      setActivities(userActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadActivities(true);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'view_bill':
        return <FileText className="w-5 h-5" />;
      case 'track_bill':
        return <Star className="w-5 h-5" />;
      case 'contact_rep':
        return <Users className="w-5 h-5" />;
      case 'search':
        return <Zap className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'view_bill':
        return 'bg-blue-100 text-blue-600';
      case 'track_bill':
        return 'bg-green-100 text-green-600';
      case 'contact_rep':
        return 'bg-purple-100 text-purple-600';
      case 'search':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.activity_type) {
      case 'view_bill':
        return `Viewed bill ${activity.target_id || ''}`;
      case 'track_bill':
        return `Started tracking bill ${activity.target_id || ''}`;
      case 'contact_rep':
        return `Contacted representative ${activity.target_id || ''}`;
      case 'search':
        return `Searched for "${activity.details?.query || 'bills'}"`;
      default:
        return 'Performed an action';
    }
  };

  if (!authState.user) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Sign in to see your activity</h4>
          <p className="text-gray-600 mb-4">Create an account or sign in to track your activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-4 p-4 rounded-2xl">
              <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="flex-1">
                <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="w-1/4 h-3 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start space-x-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActivityColor(activity.activity_type)}`}>
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{getActivityText(activity)}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500">{formatTimeAgo(activity.created_at)}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h4>
              <p className="text-gray-600 mb-4">Start tracking bills to see your activity here</p>
              <Button variant="primary" size="sm">
                Browse Bills
              </Button>
            </div>
          )}
          
          {activities.length > 0 && onViewAll && (
            <div className="pt-4 text-center">
              <Button variant="ghost" size="sm" onClick={onViewAll}>
                View All Activity
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};