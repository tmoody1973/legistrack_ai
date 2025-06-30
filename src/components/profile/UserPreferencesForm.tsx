import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface UserPreferencesFormProps {
  onSaved?: () => void;
}

export const UserPreferencesForm: React.FC<UserPreferencesFormProps> = ({ onSaved }) => {
  const { authState } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    // Location
    state: '',
    district: '',
    zipCode: '',
    
    // Demographics
    ageGroup: '',
    occupation: '',
    
    // Interests
    interests: [] as string[],
    
    // Notifications
    notificationFrequency: 'daily',
    emailNotifications: true,
    pushNotifications: false,
    
    // Content preferences
    contentTypes: ['text'] as ('text' | 'audio' | 'video')[],
  });

  // Available options
  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const ageGroups = [
    '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
  ];

  const interestOptions = [
    'Agriculture', 'Armed Forces and National Security', 'Arts, Culture, Religion',
    'Civil Rights and Liberties', 'Commerce', 'Congress', 'Crime and Law Enforcement',
    'Economics and Public Finance', 'Education', 'Emergency Management',
    'Energy', 'Environmental Protection', 'Families', 'Finance and Financial Sector',
    'Foreign Trade and International Finance', 'Government Operations and Politics',
    'Health', 'Housing and Community Development', 'Immigration',
    'International Affairs', 'Labor and Employment', 'Law', 'Native Americans',
    'Public Lands and Natural Resources', 'Science, Technology, Communications',
    'Social Sciences and History', 'Social Welfare', 'Sports and Recreation',
    'Taxation', 'Transportation and Public Works', 'Water Resources Development'
  ];

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
      setError(null);
      
      if (!authState.user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      console.log('Starting profile load...', authState.user.id);
      
      // Check auth
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('Auth check:', { user: authData?.user?.id, error: authError });
      
      if (authError || !authData.user) {
        throw new Error('User authentication error: ' + (authError?.message || 'No user found'));
      }

      // Get user profile
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (error) {
        console.error('Error loading user profile:', error);
        setDebugInfo({ error, message: 'Error loading profile' });
        
        // Try a simple select to test permissions
        const { data: testData, error: testError } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        
        console.log('Test select result:', { data: testData, error: testError });
        
        throw new Error(`Failed to load user profile: ${error.message}`);
      }

      console.log('Profile loaded successfully:', data);
      setUserProfile(data);
      
      // Initialize form data from profile
      setFormData({
        state: data?.preferences?.location?.state || '',
        district: data?.preferences?.location?.district?.toString() || '',
        zipCode: data?.preferences?.location?.zipCode || '',
        ageGroup: data?.profile?.demographics?.ageGroup || '',
        occupation: data?.profile?.demographics?.occupation || '',
        interests: data?.preferences?.interests || [],
        notificationFrequency: data?.preferences?.notifications?.frequency || 'daily',
        emailNotifications: data?.preferences?.notifications?.email ?? true,
        pushNotifications: data?.preferences?.notifications?.push ?? false,
        contentTypes: data?.preferences?.contentTypes || ['text'],
      });
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle interest toggle
  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  // Handle content type toggle
  const handleContentTypeToggle = (type: 'text' | 'audio' | 'video') => {
    setFormData(prev => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(type)
        ? prev.contentTypes.filter(t => t !== type)
        : [...prev.contentTypes, type]
    }));
  };

  // Save preferences
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      if (!authState.user || !userProfile) {
        throw new Error('User not authenticated or profile not loaded');
      }

      console.log('Starting profile update...');
      
      // Check auth
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('Auth check:', { user: authData?.user?.id, error: authError });
      
      if (!authData.user) {
        throw new Error('User not authenticated');
      }
      
      // Try a simple insert/upsert
      const updateData = {
        id: authData.user.id,
        email: authData.user.email,
        full_name: userProfile.full_name || 'Test User',
        updated_at: new Date().toISOString(),
        preferences: {
          ...userProfile.preferences,
          location: {
            state: formData.state,
            district: formData.district ? parseInt(formData.district) : null,
            zipCode: formData.zipCode
          },
          interests: formData.interests,
          notifications: {
            frequency: formData.notificationFrequency,
            email: formData.emailNotifications,
            push: formData.pushNotifications
          },
          contentTypes: formData.contentTypes
        },
        profile: {
          ...userProfile.profile,
          demographics: {
            ...userProfile.profile?.demographics,
            ageGroup: formData.ageGroup,
            occupation: formData.occupation
          }
        }
      };
      
      console.log('Attempting to upsert:', updateData);
      
      const { data, error } = await supabase
        .from('users')
        .upsert(updateData)
        .select();
      
      console.log('Upsert result:', { data, error });
      
      if (error) {
        setDebugInfo({ error, updateData });
        throw error;
      }

      setSuccess(true);
      onSaved?.();
      
      // Reset success message after a delay
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Detailed error:', err);
      setError(err.message || 'Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Debug Info */}
      {debugInfo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-yellow-800 mb-2">Debug Information</h3>
          <pre className="text-xs overflow-auto max-h-40 bg-yellow-100 p-2 rounded">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Location Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Preferences</h3>
        <p className="text-gray-600 mb-4">
          Your location helps us show you relevant legislation and representatives.
        </p>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State *
            </label>
            <select
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select state</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Congressional District
            </label>
            <Input
              type="number"
              value={formData.district}
              onChange={(e) => handleInputChange('district', e.target.value)}
              placeholder="e.g., 12"
              min="1"
              max="53"
            />
            <p className="text-xs text-gray-500 mt-1">
              Find your district at <a href="https://www.house.gov/representatives/find-your-representative" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">house.gov</a>
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP Code
            </label>
            <Input
              type="text"
              value={formData.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              placeholder="12345"
              maxLength={5}
            />
          </div>
        </div>
      </div>
      
      {/* Interests */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Policy Interests</h3>
        <p className="text-gray-600 mb-4">
          Select topics you're interested in to get personalized bill recommendations.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {interestOptions.map(interest => (
            <label
              key={interest}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                formData.interests.includes(interest)
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.interests.includes(interest)}
                onChange={() => handleInterestToggle(interest)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{interest}</span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Demographics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Demographics</h3>
        <p className="text-gray-600 mb-4">
          This optional information helps us provide more personalized impact analysis.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age Group
            </label>
            <select
              value={formData.ageGroup}
              onChange={(e) => handleInputChange('ageGroup', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select age group</option>
              {ageGroups.map(age => (
                <option key={age} value={age}>{age}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Occupation
            </label>
            <Input
              type="text"
              value={formData.occupation}
              onChange={(e) => handleInputChange('occupation', e.target.value)}
              placeholder="e.g., Teacher, Engineer, Student"
            />
          </div>
        </div>
      </div>
      
      {/* Notification Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
        <p className="text-gray-600 mb-4">
          Customize how and when you receive updates about legislation.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Frequency
            </label>
            <select
              value={formData.notificationFrequency}
              onChange={(e) => handleInputChange('notificationFrequency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="immediate">Immediate</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Digest</option>
              <option value="never">Never</option>
            </select>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.emailNotifications}
                onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Email notifications</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.pushNotifications}
                onChange={(e) => handleInputChange('pushNotifications', e.target.checked)}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Push notifications</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Content Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Preferences</h3>
        <p className="text-gray-600 mb-4">
          Select your preferred content formats.
        </p>
        
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.contentTypes.includes('text')}
              onChange={() => handleContentTypeToggle('text')}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Text (Summaries and Analysis)</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.contentTypes.includes('audio')}
              onChange={() => handleContentTypeToggle('audio')}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Audio (Bill Summaries and Briefings)</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.contentTypes.includes('video')}
              onChange={() => handleContentTypeToggle('video')}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Video (Explainers and Analysis)</span>
          </label>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        {error && (
          <div className="mr-4 flex-1 bg-error-50 border border-error-200 rounded-lg p-3 flex items-center">
            <AlertTriangle className="w-5 h-5 text-error-500 mr-2" />
            <span className="text-error-700">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mr-4 flex-1 bg-success-50 border border-success-200 rounded-lg p-3 flex items-center">
            <CheckCircle className="w-5 h-5 text-success-500 mr-2" />
            <span className="text-success-700">Preferences saved successfully!</span>
          </div>
        )}
        
        <Button 
          onClick={handleSave} 
          disabled={saving || !formData.state}
          className="min-w-[150px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
};