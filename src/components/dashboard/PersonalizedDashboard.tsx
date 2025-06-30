import React, { useState } from 'react';
import { UserEngagementStats } from './UserEngagementStats';
import { PersonalizedRecommendations } from './PersonalizedRecommendations';
import { TrendingLegislation } from './TrendingLegislation';
import { StatisticsPanel } from './StatisticsPanel';
import { BillFeed } from './BillFeed';
import { UserLocationInfo } from './UserLocationInfo';
import { UserInterestTags } from './UserInterestTags';
import { LocationBanner } from './LocationBanner';
import { ProfileSetupModal } from '../profile/ProfileSetupModal';
import { UserPreferencesForm } from '../profile/UserPreferencesForm';
import { useAuth } from '../../hooks/useAuth';
import type { Bill } from '../../types';

interface PersonalizedDashboardProps {
  onBillClick?: (bill: Bill) => void;
}

const PersonalizedDashboard: React.FC<PersonalizedDashboardProps> = ({ onBillClick }) => {
  const { authState } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPreferencesForm, setShowPreferencesForm] = useState(false);

  const handleEditLocation = () => {
    setShowProfileModal(true);
  };

  const handleEditInterests = () => {
    setShowPreferencesForm(true);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {authState.user?.user_metadata?.full_name || 'there'}
          </h1>
          <p className="text-gray-600 mt-1">
            Stay informed with the latest legislative updates and insights
          </p>
        </div>

        {/* Location Banner (shows only if location not set) */}
        <LocationBanner onEditLocation={handleEditLocation} />

        {/* User Engagement Stats */}
        <div className="mb-8">
          <UserEngagementStats />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Bill Feed */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Statistics Panel */}
              <StatisticsPanel />
              
              {/* Bill Feed */}
              <BillFeed onBillClick={onBillClick} />
            </div>
          </div>
          
          {/* Right Column - Personalized Content */}
          <div className="space-y-6">
            {/* User Profile Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h3>
              
              <div className="space-y-6">
                {/* Location */}
                <UserLocationInfo onEdit={handleEditLocation} />
                
                {/* Interests */}
                <UserInterestTags onEdit={handleEditInterests} />
              </div>
            </div>
            
            {/* Personalized Recommendations */}
            <PersonalizedRecommendations onBillClick={onBillClick} />
            
            {/* Trending Legislation */}
            <TrendingLegislation onBillClick={onBillClick} />
          </div>
        </div>
      </div>

      {/* Profile Setup Modal */}
      <ProfileSetupModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSuccess={handleProfileUpdate}
      />

      {/* Preferences Form Modal */}
      {showPreferencesForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowPreferencesForm(false)}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Preferences</h2>
                <p className="text-gray-600">Customize your experience and recommendations</p>
              </div>
              
              <UserPreferencesForm onSaved={handlePreferencesSaved} />
              
              <div className="mt-6 flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreferencesForm(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalizedDashboard;