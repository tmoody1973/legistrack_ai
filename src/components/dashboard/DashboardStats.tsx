import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Star, Users, Eye, MessageCircle } from 'lucide-react';
import { trackingService } from '../../services/trackingService';
import { useAuth } from '../../hooks/useAuth';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, color, loading = false }) => {
  const getChangeIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case 'increase':
        return <TrendingUp className="w-3 h-3" />;
      case 'decrease':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const getChangeColor = () => {
    if (!change) return '';
    
    switch (change.type) {
      case 'increase':
        return 'text-green-600 bg-green-50';
      case 'decrease':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`bg-white rounded-2xl p-6 border-2 ${color} hover:shadow-lg transition-all duration-300 group`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
        {change && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getChangeColor()}`}>
            {getChangeIcon()}
            <span>{change.value}</span>
          </div>
        )}
      </div>
      
      <div>
        <p className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
          {loading ? (
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            value
          )}
        </p>
        <p className="text-sm font-medium text-gray-600">{title}</p>
      </div>
    </div>
  );
};

interface DashboardStatsProps {
  stats?: Array<{
    title: string;
    value: string | number;
    change?: {
      value: string;
      type: 'increase' | 'decrease' | 'neutral';
    };
    icon: React.ReactNode;
    color: string;
  }>;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats: providedStats }) => {
  const { authState } = useAuth();
  const [realStats, setRealStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState.user) {
      loadRealStats();
    } else {
      setLoading(false);
    }
  }, [authState.user]);

  const loadRealStats = async () => {
    try {
      setLoading(true);
      
      // Get tracked bills count
      const trackedBills = await trackingService.getTrackedBills();
      const trackedCount = trackedBills.length;
      
      // Calculate total views from tracked bills
      const totalViews = trackedBills.reduce((sum, bill) => sum + (bill.tracking?.view_count || 0), 0);
      
      // Create real stats
      const stats = [
        {
          title: 'Bills Tracked',
          value: trackedCount,
          change: trackedCount > 0 ? { value: `${trackedCount} active`, type: 'increase' as const } : undefined,
          icon: <Star className="w-6 h-6 text-primary-500" />,
          color: 'border-primary-200 bg-primary-50'
        },
        {
          title: 'Bills Viewed',
          value: totalViews,
          change: totalViews > 0 ? { value: `${totalViews} total`, type: 'increase' as const } : undefined,
          icon: <Eye className="w-6 h-6 text-blue-500" />,
          color: 'border-blue-200 bg-blue-50'
        },
        {
          title: 'Representatives',
          value: '3', // This would come from user's location
          icon: <Users className="w-6 h-6 text-green-500" />,
          color: 'border-green-200 bg-green-50'
        },
        {
          title: 'Civic Actions',
          value: trackedCount, // Using tracked bills as a proxy for civic engagement
          change: trackedCount > 0 ? { value: 'Active', type: 'increase' as const } : undefined,
          icon: <MessageCircle className="w-6 h-6 text-purple-500" />,
          color: 'border-purple-200 bg-purple-50'
        }
      ];
      
      setRealStats(stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Fall back to provided stats or defaults
      setRealStats(providedStats || []);
    } finally {
      setLoading(false);
    }
  };

  const statsToShow = realStats.length > 0 ? realStats : (providedStats || []);

  return (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Activity</h2>
          <p className="text-gray-600">Track your civic engagement</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statsToShow.map((stat, index) => (
          <StatCard key={index} {...stat} loading={loading} />
        ))}
      </div>
    </div>
  );
};