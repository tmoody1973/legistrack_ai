import React, { useState, useEffect } from 'react';
import { Clock, Star, FileText, Users, Zap, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '../common/Button';
import { trackingService } from '../../services/trackingService';
import { useAuth } from '../../hooks/useAuth';

interface ActivityItem {
  id: string;
  action: string;
  time: string;
  type: 'track' | 'view' | 'contact' | 'ai';
  billTitle?: string;
  billId?: string;
}

interface ActivityFeedProps {
  activities?: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities: providedActivities }) => {
  const { authState } = useAuth();
  const [realActivities, setRealActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState.user) {
      loadRealActivities();
    } else {
      setLoading(false);
    }
  }, [authState.user]);

  const loadRealActivities = async () => {
    try {
      setLoading(true);
      
      // Get tracked bills to create activity feed
      const trackedBills = await trackingService.getTrackedBills();
      
      // Convert tracked bills to activity items
      const activities: ActivityItem[] = trackedBills.map((bill, index) => ({
        id: `track-${bill.id}`,
        action: `Tracked ${bill.bill_type} ${bill.number} - ${bill.title.substring(0, 50)}${bill.title.length > 50 ? '...' : ''}`,
        time: formatTimeAgo(bill.tracking.tracked_at),
        type: 'track',
        billTitle: bill.title,
        billId: bill.id
      }));

      // Add view activities for tracked bills
      trackedBills.forEach((bill) => {
        if (bill.tracking.last_viewed && bill.tracking.view_count > 1) {
          activities.push({
            id: `view-${bill.id}`,
            action: `Viewed ${bill.bill_type} ${bill.number} (${bill.tracking.view_count} times)`,
            time: formatTimeAgo(bill.tracking.last_viewed),
            type: 'view',
            billTitle: bill.title,
            billId: bill.id
          });
        }
      });

      // Sort by most recent first and limit to 10
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRealActivities(activities.slice(0, 10));
      
    } catch (error) {
      console.error('Error loading activities:', error);
      setRealActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const defaultActivities: ActivityItem[] = [
    {
      id: '1',
      action: 'Welcome to LegisTrack AI! Start by tracking your first bill.',
      time: '1 hour ago',
      type: 'ai'
    },
    {
      id: '2',
      action: 'Complete your profile to get personalized recommendations',
      time: '2 hours ago',
      type: 'ai'
    }
  ];

  const activitiesToShow = realActivities.length > 0 ? realActivities : (providedActivities || defaultActivities);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'track':
        return <Star className="w-5 h-5" />;
      case 'view':
        return <FileText className="w-5 h-5" />;
      case 'contact':
        return <Users className="w-5 h-5" />;
      case 'ai':
        return <Zap className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'track':
        return 'bg-green-100 text-green-600';
      case 'view':
        return 'bg-blue-100 text-blue-600';
      case 'contact':
        return 'bg-purple-100 text-purple-600';
      case 'ai':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-primary-500" />
          Recent Activity
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => window.location.href = '/activity'}
          className="text-primary hover:text-primary-700"
        >
          View All
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-4 p-4 rounded-xl">
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
          {activitiesToShow.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-start space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            </div>
          ))}
          
          {activitiesToShow.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h4>
              <p className="text-gray-600 mb-4">Start tracking bills to see your activity here</p>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/bills'}>
                Browse Bills
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};