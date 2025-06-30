import React, { useState } from 'react';
import { FileText, Star, Clock, MessageSquare, Video, Volume2 } from 'lucide-react';
import { BillOverview } from './tabs/BillOverview';
import { BillFullText } from './tabs/BillFullText';
import { BillVotingRecord } from './tabs/BillVotingRecord';
import { BillTimeline } from './tabs/BillTimeline';
import { BillChat } from './tabs/BillChat';
import { BillVideoBriefing } from './tabs/BillVideoBriefing';
import { BillPodcastOverview } from './tabs/BillPodcastOverview';
import { Button } from '../common/Button';
import type { Bill } from '../../types';

interface BillDetailTabsProps {
  bill: Bill;
  onTrackBill?: () => void;
  isTracked?: boolean;
  trackingLoading?: boolean;
  onUpdateBill?: (updatedBill: Bill) => void; // New prop for updating bill data
}

export const BillDetailTabs: React.FC<BillDetailTabsProps> = ({ 
  bill, 
  onTrackBill,
  isTracked = false,
  trackingLoading = false,
  onUpdateBill // New prop
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'fullText' | 'voting' | 'timeline' | 'chat' | 'video' | 'podcast'>('overview');

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Track Button */}
      <div className="p-4 border-b border-gray-200 flex justify-end">
        <Button 
          variant={isTracked ? "outline" : "primary"}
          onClick={onTrackBill}
          disabled={trackingLoading}
          className="flex items-center"
        >
          <Star className={`w-4 h-4 mr-2 ${isTracked ? "fill-current" : ""}`} />
          {trackingLoading ? "Loading..." : isTracked ? "Tracking" : "Track Bill"}
        </Button>
      </div>
      
      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Overview
        </button>
        <button
          className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'fullText'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('fullText')}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Full Text
        </button>
        <button
          className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'voting'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('voting')}
        >
          <Star className="w-4 h-4 inline mr-2" />
          Voting Record
        </button>
        <button
          className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('timeline')}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Timeline
        </button>
        <button
          className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'podcast'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('podcast')}
        >
          <Volume2 className="w-4 h-4 inline mr-2" />
          Podcast
        </button>
        <button
          className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'video'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('video')}
        >
          <Video className="w-4 h-4 inline mr-2" />
          Video Briefing
        </button>
        <button
          className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'chat'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          AI Chat
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <BillOverview 
            bill={bill} 
            onTrackBill={onTrackBill}
            isTracked={isTracked}
            trackingLoading={trackingLoading}
            onUpdateBill={onUpdateBill} // Pass the callback
          />
        )}
        
        {activeTab === 'fullText' && (
          <BillFullText bill={bill} />
        )}
        
        {activeTab === 'voting' && (
          <BillVotingRecord bill={bill} />
        )}
        
        {activeTab === 'timeline' && (
          <BillTimeline bill={bill} />
        )}
        
        {activeTab === 'podcast' && (
          <BillPodcastOverview 
            bill={bill} 
            onUpdateBill={onUpdateBill} // Pass the callback
          />
        )}
        
        {activeTab === 'video' && (
          <BillVideoBriefing bill={bill} />
        )}
        
        {activeTab === 'chat' && (
          <BillChat bill={bill} />
        )}
      </div>
    </div>
  );
};