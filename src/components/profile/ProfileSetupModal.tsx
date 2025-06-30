import React, { useState, useEffect } from 'react';
import { X, MapPin, User, Save, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { authState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    state: '',
    district: '',
    zipCode: '',
    interests: [] as string[],
    ageGroup: '',
    occupation: '',
  });

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const interestOptions = [
    'Healthcare', 'Education', 'Environment', 'Economy', 'Defense',
    'Immigration', 'Technology', 'Agriculture', 'Energy', 'Transportation',
    'Civil Rights', 'Criminal Justice', 'Foreign Policy', 'Social Security'
  ];

  const ageGroups = [
    '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
  ];

  // Load existing profile data when modal opens
  useEffect(() => {
    if (isOpen && authState.user) {
      loadExistingProfile();
    }
  }, [isOpen, authState.user]);

  const loadExistingProfile = async () => {
    try {
      if (!authState.user) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authState.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading existing profile:', error);
        return;
      }

      if (data) {
        // Populate form with existing data
        setFormData({
          full_name: data.full_name || authState.user.user_metadata?.full_name || '',
          state: data.preferences?.location?.state || '',
          district: data.preferences?.location?.district?.toString() || '',
          zipCode: data.preferences?.location?.zipCode || '',
          interests: data.preferences?.interests || [],
          ageGroup: data.profile?.demographics?.ageGroup || '',
          occupation: data.profile?.demographics?.occupation || '',
        });
      } else {
        // Set defaults from auth metadata
        setFormData(prev => ({
          ...prev,
          full_name: authState.user?.user_metadata?.full_name || '',
        }));
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!authState.user) {
        throw new Error('User not authenticated');
      }

      console.log('Saving profile for user:', authState.user.id);
      console.log('Form data to be saved:', formData);

      // Prepare the data to save
      const profileData = {
        id: authState.user.id,
        email: authState.user.email,
        full_name: formData.full_name,
        preferences: {
          location: {
            state: formData.state,
            district: formData.district ? parseInt(formData.district) : null,
            zipCode: formData.zipCode
          },
          interests: formData.interests,
          notifications: {
            frequency: 'daily',
            email: true,
            push: false
          },
          contentTypes: ['text']
        },
        profile: {
          demographics: {
            ageGroup: formData.ageGroup,
            occupation: formData.occupation
          },
          civicEngagement: {
            votingFrequency: null,
            organizationMemberships: [],
            issueAdvocacy: formData.interests
          }
        },
        updated_at: new Date().toISOString()
      };

      console.log('Profile data to save:', profileData);

      // Check auth
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('Auth check:', { user: authData?.user?.id, error: authError });
      
      if (authError || !authData.user) {
        throw new Error('User authentication error: ' + (authError?.message || 'No user found'));
      }

      // Use upsert to handle both insert and update cases
      const { data, error: upsertError } = await supabase
        .from('users')
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        throw upsertError;
      }

      console.log('Profile saved successfully:', data);

      // Update auth metadata as well (optional, for backup)
      try {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: formData.full_name,
            location: {
              state: formData.state,
              district: formData.district ? parseInt(formData.district) : null,
              zipCode: formData.zipCode
            },
            preferences: {
              interests: formData.interests
            }
          }
        });

        if (authError) {
          console.warn('Could not update auth metadata:', authError);
          // Don't throw here, as the main profile save succeeded
        }
      } catch (authErr) {
        console.warn('Auth metadata update failed:', authErr);
        // Continue anyway
      }

      console.log('Profile update completed successfully');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
              <p className="text-gray-600">Help us personalize your experience</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-error-50 border border-error-200 rounded-lg p-4">
                <p className="text-error-700 text-sm">{error}</p>
              </div>
            )}

            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Personal Information
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age Group
                  </label>
                  <select
                    value={formData.ageGroup}
                    onChange={(e) => handleInputChange('ageGroup', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select age group</option>
                    {ageGroups.map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
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

            {/* Location */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Location
              </h3>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Policy Interests
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Select topics you're interested in to get personalized bill recommendations
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

            {/* Submit */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.state}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};