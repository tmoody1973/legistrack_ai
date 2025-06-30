import React, { useState, useEffect } from 'react';
import { UserEngagementStats } from './UserEngagementStats';
import { BillFeed } from './BillFeed';
import { TrendingLegislation } from './TrendingLegislation';
import { ActivityFeed } from './ActivityFeed';
import { AIInsights } from './AIInsights';
import { VideoBriefingSection } from './VideoBriefingSection';
import { CongressionalNews } from './CongressionalNews';
import { UserRepresentatives } from './UserRepresentatives';
import { useAuth } from '../../hooks/useAuth';
import type { Bill } from '../../types';

interface UserDashboardProps {
  onBillClick?: (bill: Bill) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onBillClick }) => {
  const { authState } = useAuth();
  const [showVideoSection, setShowVideoSection] = useState(false);

  // Check if Tavus API is configured
  useEffect(() => {
    const tavusApiKey = import.meta.env.VITE_TAVUS_API_KEY;
    setShowVideoSection(!!tavusApiKey);
  }, []);

  if (!authState.user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* User Engagement Stats */}
      <UserEngagementStats />
      
      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Bill Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Congressional News */}
          <CongressionalNews />
          
          {/* Bill Feed */}
          <BillFeed onBillClick={onBillClick} />
        </div>
        
        {/* Right Column - Personalized Content */}
        <div className="space-y-6">
          {/* Representatives Section */}
          <UserRepresentatives />
          
          {/* Video Briefings (if available) */}
          {showVideoSection && <VideoBriefingSection />}
          
          {/* AI Insights */}
          <AIInsights />
          
          {/* Trending Legislation */}
          <TrendingLegislation onBillClick={onBillClick} />
          
          {/* Activity Feed */}
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};