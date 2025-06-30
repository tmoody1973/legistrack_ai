import React, { useState, useEffect } from 'react';
import { Clock, FileText, Star, Users, Search, Calendar, Loader2 } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { useAuth } from '../../hooks/useAuth';

interface ActivityItem {
  id: string;
  activity_type: string;
  target_id?: string;
  target_type?: string;
  details?: any;
  created_at: string;
}

interface UserActivityHistoryProps {
  limit?: number;
}

export const UserActivityHistory: React.FC<UserActivityHistoryProps> = ({ limit = 20 }) => {
  const { authState } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    if (authState.user) {
      loadActivities();
    } else {
      setLoading(false);
    }
  }, [authState.user]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      const userActivities = await analyticsService.getUserActivityHistory(limit);
      setActivities(userActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        return <Search className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
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

  // Filter activities
  const filteredActivities = activeFilter
    ? activities.filter(activity => activity.activity_type === activeFilter)
    : activities;

  if (!authState.user) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to see your activity</h3>
          <p className="text-gray-600">Create an account or sign in to track your activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Activity History</h3>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveFilter(null)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
            activeFilter === null
              ? 'bg-primary-100 text-primary-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Activities
        </button>
        <button
          onClick={() => setActiveFilter('view_bill')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
            activeFilter === 'view_bill'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-1" />
          Views
        </button>
        <button
          onClick={() => setActiveFilter('track_bill')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
            activeFilter === 'track_bill'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Star className="w-4 h-4 inline mr-1" />
          Tracking
        </button>
        <button
          onClick={() => setActiveFilter('contact_rep')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
            activeFilter === 'contact_rep'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1" />
          Contacts
        </button>
        <button
          onClick={() => setActiveFilter('search')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
            activeFilter === 'search'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Search className="w-4 h-4 inline mr-1" />
          Searches
        </button>
      </div>
      
      {/* Activity List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mr-3" />
          <p className="text-gray-600">Loading your activity history...</p>
        </div>
      ) : filteredActivities.length > 0 ? (
        <div className="space-y-4">
          {filteredActivities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-start p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${getActivityColor(activity.activity_type)}`}>
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{getActivityText(activity)}</p>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(activity.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activity found</h3>
          <p className="text-gray-600">
            {activeFilter 
              ? `You haven't performed any ${activeFilter.replace('_', ' ')} activities yet.` 
              : 'You haven\'t performed any activities yet.'}
          </p>
        </div>
      )}
    </div>
  );
};