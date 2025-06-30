import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Users, Eye, Star, Loader2, ChevronRight } from 'lucide-react';
import { billService } from '../../services/billService';
import { trackingService } from '../../services/trackingService';
import { useAuth } from '../../hooks/useAuth';
import type { Bill } from '../../types';

interface TrendingBillProps {
  bill: Bill;
  rank: number;
  onClick?: () => void;
}

const TrendingBill: React.FC<TrendingBillProps> = ({ bill, rank, onClick }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div 
      className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold mr-3">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">
          {bill.bill_type} {bill.number}: {bill.short_title || bill.title}
        </h4>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <Calendar className="w-3 h-3 mr-1" />
          <span>{formatDate(bill.introduced_date)}</span>
          {bill.sponsors && bill.sponsors.length > 0 && (
            <>
              <span className="mx-1">•</span>
              <Users className="w-3 h-3 mr-1" />
              <span>{bill.sponsors[0].party}-{bill.sponsors[0].state}</span>
            </>
          )}
        </div>
      </div>
      {bill.ai_analysis?.passagePrediction?.probability !== undefined && (
        <div className="ml-2 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
          {Math.round(bill.ai_analysis.passagePrediction.probability * 100)}%
        </div>
      )}
    </div>
  );
};

interface TrendingLegislationProps {
  onBillClick?: (bill: Bill) => void;
}

export const TrendingLegislation: React.FC<TrendingLegislationProps> = ({ onBillClick }) => {
  const { authState } = useAuth();
  const [trendingBills, setTrendingBills] = useState<Bill[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [upcomingVotes, setUpcomingVotes] = useState<Bill[]>([]);
  const [recommendedBills, setRecommendedBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'recent' | 'upcoming' | 'recommended'>('trending');

  useEffect(() => {
    loadTrendingData();
  }, []);

  const loadTrendingData = async () => {
    try {
      setLoading(true);
      
      // Load trending bills (most viewed/tracked)
      const trending = await billService.getTrendingBills(10);
      setTrendingBills(trending);
      
      // Load recently introduced bills
      const recent = await billService.getBills({
        sort: 'introduced_date',
        order: 'desc',
        limit: 10
      });
      setRecentBills(recent.data);
      
      // Load bills with upcoming votes (simulated with high passage probability)
      const upcoming = await billService.getBills({
        limit: 10,
        congress: 118 // Current congress
      });
      setUpcomingVotes(upcoming.data);
      
      // Load recommended bills based on user interests
      if (authState.user) {
        // In a real app, this would use a recommendation algorithm
        // For now, we'll just use the trending bills as a placeholder
        setRecommendedBills(trending);
      }
      
    } catch (error) {
      console.error('Error loading trending data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    let bills: Bill[] = [];
    let emptyMessage = '';
    
    switch (activeTab) {
      case 'trending':
        bills = trendingBills;
        emptyMessage = 'No trending bills available';
        break;
      case 'recent':
        bills = recentBills;
        emptyMessage = 'No recent bills available';
        break;
      case 'upcoming':
        bills = upcomingVotes;
        emptyMessage = 'No upcoming votes available';
        break;
      case 'recommended':
        bills = recommendedBills;
        emptyMessage = 'No recommended bills available';
        break;
    }
    
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      );
    }
    
    if (bills.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        {bills.map((bill, index) => (
          <TrendingBill
            key={bill.id}
            bill={bill}
            rank={index + 1}
            onClick={() => onBillClick?.(bill)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-primary-500" />
          Trending Legislation
        </h3>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'trending'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('trending')}
        >
          <TrendingUp className="w-4 h-4 inline mr-1" />
          Trending
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'recent'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('recent')}
        >
          <Calendar className="w-4 h-4 inline mr-1" />
          Recent
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'upcoming'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('upcoming')}
        >
          <Calendar className="w-4 h-4 inline mr-1" />
          Upcoming
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'recommended'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('recommended')}
        >
          <Star className="w-4 h-4 inline mr-1" />
          For You
        </button>
      </div>
      
      {/* Tab Content */}
      {renderTabContent()}
      
      {/* View All Link */}
      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <button
          className="text-primary hover:text-primary-700 text-sm font-medium flex items-center justify-center mx-auto"
          onClick={() => window.location.href = '/bills'}
        >
          View All Legislation
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};