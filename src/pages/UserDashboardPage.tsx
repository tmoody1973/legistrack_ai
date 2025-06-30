import React, { useState } from 'react';
import { UserEngagementStats } from '../components/dashboard/UserEngagementStats';
import { PersonalizedRecommendations } from '../components/dashboard/PersonalizedRecommendations';
import { UserActivityFeed } from '../components/dashboard/UserActivityFeed';
import { UserProfileCompleteness } from '../components/profile/UserProfileCompleteness';
import { UserActivityHistory } from '../components/profile/UserActivityHistory';
import { UserPreferencesForm } from '../components/profile/UserPreferencesForm';
import { ProfileSetupModal } from '../components/profile/ProfileSetupModal';
import { useAuth } from '../hooks/useAuth';
import { User, Settings, Activity, ChevronRight } from 'lucide-react';
import { Button } from '../components/common/Button';
import type { Bill } from '../types';

export const UserDashboardPage: React.FC = () => {
  const { authState } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPreferencesForm, setShowPreferencesForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'preferences'>('overview');

  const handleEditProfile = () => {
    setShowProfileModal(true);
  };

  const handleProfileUpdate = () => {
    setShowProfileModal(false);
    // Reload the page to reflect changes
    window.location.reload();
  };

  const handlePreferencesSaved = () => {
    setShowPreferencesForm(false);
    // Reload the page to reflect changes
    window.location.reload();
  };

  const handleBillClick = (bill: Bill) => {
    // Navigate to bill detail page
    console.log('Clicked on bill:', bill.id);
  };

  if (!authState.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please sign in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Your Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Track your activity and manage your preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'activity'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Activity History
            </button>
            <button 
              onClick={() => setActiveTab('preferences')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'preferences'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Preferences
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Engagement Stats */}
            <div className="mb-8">
              <UserEngagementStats />
            </div>
            
            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personalized Recommendations */}
                <PersonalizedRecommendations onBillClick={handleBillClick} />
                
                {/* Activity Feed */}
                <UserActivityFeed 
                  limit={5} 
                  onViewAll={() => setActiveTab('activity')} 
                />
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                {/* Profile Completeness */}
                <UserProfileCompleteness onEditProfile={handleEditProfile} />
                
                {/* Quick Links */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Quick Links</h3>
                  <div className="space-y-3">
                    <a 
                      href="#" 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-primary-500 mr-3" />
                        <span className="text-gray-700">Edit Profile</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </a>
                    <a 
                      href="#" 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <Settings className="w-5 h-5 text-primary-500 mr-3" />
                        <span className="text-gray-700">Notification Settings</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </a>
                    <a 
                      href="#" 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <Activity className="w-5 h-5 text-primary-500 mr-3" />
                        <span className="text-gray-700">View All Activity</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'activity' && (
          <UserActivityHistory limit={50} />
        )}
        
        {activeTab === 'preferences' && (
          <UserPreferencesForm onSaved={handlePreferencesSaved} />
        )}
      </div>

      {/* Profile Setup Modal */}
      <ProfileSetupModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSuccess={handleProfileUpdate}
      />
    </div>
  );
};