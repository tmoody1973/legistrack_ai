import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { 
  User, 
  MapPin, 
  Bell, 
  Shield, 
  Edit3, 
  Save, 
  X,
  Camera,
  Mail,
  Calendar,
  Briefcase,
  Heart,
  Settings,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  preferences?: {
    location?: {
      state?: string;
      district?: number;
      zipCode?: string;
    };
    interests?: string[];
    notifications?: {
      frequency?: string;
      email?: boolean;
      push?: boolean;
    };
  };
  profile?: {
    demographics?: {
      ageGroup?: string;
      occupation?: string;
    };
    civicEngagement?: {
      votingFrequency?: string;
      organizationMemberships?: string[];
      issueAdvocacy?: string[];
    };
  };
}

export const ProfilePage: React.FC = () => {
  const { authState } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

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

  useEffect(() => {
    if (authState.user) {
      loadUserProfile();
    }
  }, [authState.user]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      if (!authState.user) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authState.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUserProfile(data);
      } else {
        // Create default profile structure
        const defaultProfile = {
          id: authState.user.id,
          email: authState.user.email || '',
          full_name: authState.user.user_metadata?.full_name || '',
          preferences: {
            location: {},
            interests: [],
            notifications: {
              frequency: 'daily',
              email: true,
              push: false
            }
          },
          profile: {
            demographics: {},
            civicEngagement: {
              organizationMemberships: [],
              issueAdvocacy: []
            }
          }
        };
        setUserProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (section: string) => {
    setEditingSection(section);
    
    // Initialize form data based on section
    switch (section) {
      case 'personal':
        setFormData({
          full_name: userProfile?.full_name || '',
          email: userProfile?.email || ''
        });
        break;
      case 'location':
        setFormData({
          state: userProfile?.preferences?.location?.state || '',
          district: userProfile?.preferences?.location?.district || '',
          zipCode: userProfile?.preferences?.location?.zipCode || ''
        });
        break;
      case 'interests':
        setFormData({
          interests: userProfile?.preferences?.interests || []
        });
        break;
      case 'demographics':
        setFormData({
          ageGroup: userProfile?.profile?.demographics?.ageGroup || '',
          occupation: userProfile?.profile?.demographics?.occupation || ''
        });
        break;
      case 'notifications':
        setFormData({
          frequency: userProfile?.preferences?.notifications?.frequency || 'daily',
          email: userProfile?.preferences?.notifications?.email ?? true,
          push: userProfile?.preferences?.notifications?.push ?? false
        });
        break;
    }
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setFormData({});
  };

  const saveSection = async () => {
    try {
      setSaving(true);
      if (!authState.user || !userProfile) return;

      let updatedProfile = { ...userProfile };

      switch (editingSection) {
        case 'personal':
          updatedProfile.full_name = formData.full_name;
          break;
        case 'location':
          updatedProfile.preferences = {
            ...updatedProfile.preferences,
            location: {
              state: formData.state,
              district: formData.district ? parseInt(formData.district) : undefined,
              zipCode: formData.zipCode
            }
          };
          break;
        case 'interests':
          updatedProfile.preferences = {
            ...updatedProfile.preferences,
            interests: formData.interests
          };
          break;
        case 'demographics':
          updatedProfile.profile = {
            ...updatedProfile.profile,
            demographics: {
              ageGroup: formData.ageGroup,
              occupation: formData.occupation
            }
          };
          break;
        case 'notifications':
          updatedProfile.preferences = {
            ...updatedProfile.preferences,
            notifications: {
              frequency: formData.frequency,
              email: formData.email,
              push: formData.push
            }
          };
          break;
      }

      const { error } = await supabase
        .from('users')
        .upsert({
          ...updatedProfile,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setUserProfile(updatedProfile);
      setEditingSection(null);
      setFormData({});
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (interest: string) => {
    const currentInterests = formData.interests || [];
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter((i: string) => i !== interest)
      : [...currentInterests, interest];
    
    setFormData({ ...formData, interests: newInterests });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {userProfile?.full_name || 'Your Profile'}
              </h1>
              <p className="text-gray-600 mt-1">{userProfile?.email}</p>
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                Member since {new Date(authState.user?.created_at || '').toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              </div>
              {editingSection !== 'personal' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing('personal')}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            
            <div className="p-6">
              {editingSection === 'personal' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <Input
                      value={formData.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button onClick={saveSection} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={cancelEditing}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                    <p className="text-gray-900">{userProfile?.full_name || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <p className="text-gray-900">{userProfile?.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Location</h2>
              </div>
              {editingSection !== 'location' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing('location')}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            
            <div className="p-6">
              {editingSection === 'location' ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select state</option>
                        {states.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        District
                      </label>
                      <Input
                        type="number"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        placeholder="e.g., 12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code
                      </label>
                      <Input
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        placeholder="12345"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button onClick={saveSection} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={cancelEditing}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">State</label>
                    <p className="text-gray-900">{userProfile?.preferences?.location?.state || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">District</label>
                    <p className="text-gray-900">{userProfile?.preferences?.location?.district || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">ZIP Code</label>
                    <p className="text-gray-900">{userProfile?.preferences?.location?.zipCode || 'Not set'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interests */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Heart className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Policy Interests</h2>
              </div>
              {editingSection !== 'interests' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing('interests')}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            
            <div className="p-6">
              {editingSection === 'interests' ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Select topics you're interested in to get personalized bill recommendations
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {interestOptions.map(interest => (
                      <label
                        key={interest}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                          (formData.interests || []).includes(interest)
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={(formData.interests || []).includes(interest)}
                          onChange={() => toggleInterest(interest)}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{interest}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button onClick={saveSection} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={cancelEditing}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {userProfile?.preferences?.interests && userProfile.preferences.interests.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {userProfile.preferences.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No interests selected</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Demographics */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Briefcase className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Demographics</h2>
              </div>
              {editingSection !== 'demographics' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing('demographics')}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            
            <div className="p-6">
              {editingSection === 'demographics' ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age Group
                      </label>
                      <select
                        value={formData.ageGroup}
                        onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select age group</option>
                        <option value="18-24">18-24</option>
                        <option value="25-34">25-34</option>
                        <option value="35-44">35-44</option>
                        <option value="45-54">45-54</option>
                        <option value="55-64">55-64</option>
                        <option value="65+">65+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Occupation
                      </label>
                      <Input
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        placeholder="e.g., Teacher, Engineer, Student"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button onClick={saveSection} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={cancelEditing}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Age Group</label>
                    <p className="text-gray-900">{userProfile?.profile?.demographics?.ageGroup || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Occupation</label>
                    <p className="text-gray-900">{userProfile?.profile?.demographics?.occupation || 'Not set'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              </div>
              {editingSection !== 'notifications' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing('notifications')}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            
            <div className="p-6">
              {editingSection === 'notifications' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.checked })}
                        className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Email notifications</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.push}
                        onChange={(e) => setFormData({ ...formData, push: e.target.checked })}
                        className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Push notifications</span>
                    </label>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button onClick={saveSection} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={cancelEditing}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Frequency</label>
                    <p className="text-gray-900 capitalize">
                      {userProfile?.preferences?.notifications?.frequency || 'Daily'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Email notifications</span>
                      <span className={`text-sm font-medium ${
                        userProfile?.preferences?.notifications?.email ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {userProfile?.preferences?.notifications?.email ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Push notifications</span>
                      <span className={`text-sm font-medium ${
                        userProfile?.preferences?.notifications?.push ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {userProfile?.preferences?.notifications?.push ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <button className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Privacy Settings</p>
                    <p className="text-sm text-gray-500">Manage your data and privacy preferences</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
              
              <button className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Change Password</p>
                    <p className="text-sm text-gray-500">Update your account password</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};