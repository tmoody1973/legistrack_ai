import React, { useState, useEffect } from 'react';
import { BarChart, Eye, Star, MessageSquare, Clock } from 'lucide-react';
import { AnalyticsService } from '../../services/analyticsService';
import { useAuth } from '../../hooks/useAuth';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, color }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border ${color} p-4 hover:shadow-md transition-shadow group`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color.replace('border-', 'bg-').replace('-200', '-100')}`}>
          {icon}
        </div>
        {change && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-success-50 text-success-700">
            {change}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
          {value}
        </h3>
        <p className="text-sm font-medium text-gray-600">{title}</p>
      </div>
    </div>
  );
};

export const UserEngagementStats: React.FC = () => {
  const { authState } = useAuth();
  const [stats, setStats] = useState({
    billsViewed: 0,
    billsTracked: 0,
    representativesContacted: 0,
    timeOnPlatform: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState.user) {
      loadEngagementStats();
    } else {
      setLoading(false);
    }
  }, [authState.user]);

  const loadEngagementStats = async () => {
    try {
      setLoading(true);
      
      const userStats = await AnalyticsService.getUserEngagementStats(authState.user!.id);
      setStats(userStats);
    } catch (error) {
      console.error('Error loading engagement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format time on platform
  const formatTimeOnPlatform = (minutes: number) => {
    // Ensure minutes is a valid number
    if (isNaN(minutes) || minutes === undefined || minutes === null) {
      return '0 min';
    }
    
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours} hr${hours !== 1 ? 's' : ''}`;
  };

  if (!authState.user) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Bills Viewed"
        value={stats.billsViewed}
        icon={<Eye className="w-5 h-5 text-blue-600" />}
        color="border-blue-200"
        change={stats.billsViewed > 0 ? `+${Math.min(stats.billsViewed, 5)} this week` : undefined}
      />
      
      <StatCard
        title="Bills Tracked"
        value={stats.billsTracked}
        icon={<Star className="w-5 h-5 text-primary-600" />}
        color="border-primary-200"
      />
      
      <StatCard
        title="Reps Contacted"
        value={stats.representativesContacted}
        icon={<MessageSquare className="w-5 h-5 text-green-600" />}
        color="border-green-200"
      />
      
      <StatCard
        title="Time on Platform"
        value={formatTimeOnPlatform(stats.timeOnPlatform)}
        icon={<Clock className="w-5 h-5 text-purple-600" />}
        color="border-purple-200"
      />
    </div>
  );
};