import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, User } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface UserProfileCompletenessProps {
  onEditProfile?: () => void;
}

export const UserProfileCompleteness: React.FC<UserProfileCompletenessProps> = ({ onEditProfile }) => {
  const { authState } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completeness, setCompleteness] = useState(0);
  const [incompleteItems, setIncompleteItems] = useState<string[]>([]);

  useEffect(() => {
    if (authState.user) {
      loadUserProfile();
    } else {
      setLoading(false);
    }
  }, [authState.user]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authState.user?.id)
        .single();
      
      if (error) throw error;
      
      setProfileData(data);
      
      // Calculate profile completeness
      const { score, incomplete } = calculateCompleteness(data);
      setCompleteness(score);
      setIncompleteItems(incomplete);
    } catch (err) {
      console.error('Error loading user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompleteness = (profile: any) => {
    const items = [
      { name: 'Location', complete: !!profile?.preferences?.location?.state },
      { name: 'Interests', complete: profile?.preferences?.interests?.length > 0 },
      { name: 'Demographics', complete: !!profile?.profile?.demographics?.ageGroup },
      { name: 'Notification settings', complete: !!profile?.preferences?.notifications },
      { name: 'Content preferences', complete: profile?.preferences?.contentTypes?.length > 0 }
    ];
    
    const completedItems = items.filter(item => item.complete).length;
    const score = Math.round((completedItems / items.length) * 100);
    const incomplete = items.filter(item => !item.complete).map(item => item.name);
    
    return { score, incomplete };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-center h-24">
        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-2"></div>
        <span className="text-gray-500">Loading profile...</span>
      </div>
    );
  }

  if (!authState.user) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">Profile Completeness</h3>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-2">
            <User className="w-4 h-4 text-primary-600" />
          </div>
          <span className="text-lg font-semibold text-primary-600">{completeness}%</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
        <div 
          className="h-full bg-primary-500 rounded-full" 
          style={{ width: `${completeness}%` }}
        ></div>
      </div>
      
      {/* Incomplete Items */}
      {incompleteItems.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Complete these items to improve your recommendations:</p>
          <ul className="space-y-1">
            {incompleteItems.map((item, index) => (
              <li key={index} className="flex items-center text-sm text-gray-600">
                <Circle className="w-4 h-4 mr-2 text-gray-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Complete Items */}
      {completeness > 0 && completeness < 100 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Completed items:</p>
          <ul className="space-y-1">
            {profileData && [
              { name: 'Location', complete: !!profileData?.preferences?.location?.state },
              { name: 'Interests', complete: profileData?.preferences?.interests?.length > 0 },
              { name: 'Demographics', complete: !!profileData?.profile?.demographics?.ageGroup },
              { name: 'Notification settings', complete: !!profileData?.preferences?.notifications },
              { name: 'Content preferences', complete: profileData?.preferences?.contentTypes?.length > 0 }
            ].filter(item => item.complete).map((item, index) => (
              <li key={index} className="flex items-center text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                {item.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Action Button */}
      <Button 
        variant={completeness === 100 ? "outline" : "primary"} 
        size="sm" 
        onClick={onEditProfile}
        className="w-full"
      >
        {completeness === 100 ? "Edit Profile" : "Complete Your Profile"}
      </Button>
    </div>
  );
};