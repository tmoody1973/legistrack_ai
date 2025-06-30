import React, { useState, useEffect } from 'react';
import { MapPin, Users, Loader2, Settings, RefreshCw, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { RepresentativeCard } from './RepresentativeCard';
import { RepresentativeDetail } from './RepresentativeDetail';
import { ProfileSetupModal } from '../profile/ProfileSetupModal';
import { Button } from '../common/Button';
import { representativeService } from '../../services/representativeService';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Representative } from '../../types';

export const RepresentativesList: React.FC = () => {
  const { authState } = useAuth();
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ state?: string; district?: number }>({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [databaseInfo, setDatabaseInfo] = useState<any>(null);
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);

  useEffect(() => {
    if (authState.user) {
      loadUserProfile();
      checkDatabaseContents();
    } else {
      setLoading(false);
      setProfileLoading(false);
    }
  }, [authState.user]);

  const checkDatabaseContents = async () => {
    try {
      const dbInfo = await representativeService.checkDatabaseContents();
      setDatabaseInfo(dbInfo);
      console.log('📊 Database contents:', dbInfo);
      console.log('📊 State formats in database:', dbInfo.stateFormats);
    } catch (err) {
      console.error('Error checking database contents:', err);
    }
  };

  const loadUserProfile = async () => {
    try {
      setProfileLoading(true);
      setError(null);
      
      if (!authState.user) {
        console.log('❌ No authenticated user found');
        setProfileLoading(false);
        setLoading(false);
        return;
      }

      console.log('🔍 Loading user profile for:', authState.user.id);

      const { data, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authState.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Error loading user profile:', profileError);
        setError('Failed to load user profile');
        setProfileLoading(false);
        setLoading(false);
        return;
      }

      console.log('📋 User profile data:', data);

      if (data && data.preferences?.location) {
        console.log('✅ Found location in profile:', data.preferences.location);
        setUserProfile(data);
        setUserLocation(data.preferences.location);
        
        // Load representatives immediately after setting location
        await loadRepresentativesForLocation(data.preferences.location);
      } else {
        console.log('⚠️ No location found in user profile');
        
        // Check if we can get location from auth metadata as fallback
        const authLocation = authState.user.user_metadata?.location;
        if (authLocation && authLocation.state) {
          console.log('📋 Using location from auth metadata:', authLocation);
          setUserLocation(authLocation);
          await loadRepresentativesForLocation(authLocation);
        } else {
          console.log('❌ No location found in auth metadata either');
          setUserLocation({});
          setRepresentatives([]);
        }
        
        setUserProfile(data);
      }
    } catch (err) {
      console.error('❌ Error loading user profile:', err);
      setError('Failed to load user profile');
    } finally {
      setProfileLoading(false);
      setLoading(false);
    }
  };

  const loadRepresentativesForLocation = async (location: { state?: string; district?: number }) => {
    try {
      console.log('🔍 Loading representatives for location:', location);
      
      if (!location.state) {
        console.log('❌ No state provided, skipping representative lookup');
        setRepresentatives([]);
        return;
      }

      setLoading(true);
      setError(null);

      // Get representatives for user's location
      const reps = await representativeService.getRepresentativesByLocation(
        location.state,
        location.district
      );
      
      console.log('✅ Found representatives:', reps);
      setRepresentatives(reps);
      
      if (reps.length === 0) {
        console.log('⚠️ No representatives found for location, user may need to sync data');
        setError(`No representatives found for ${location.state}${location.district ? ` District ${location.district}` : ''}. The database may be using a different state format. Try syncing representative data.`);
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('❌ Error loading representatives:', err);
      setError('Failed to load representatives. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRepresentatives = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSyncMessage(null);
      
      console.log('🔄 Starting representatives sync...');
      
      const result = await representativeService.syncRepresentativesFromCongress();
      
      console.log('✅ Representatives sync completed:', result);
      
      setSyncMessage(`Successfully synced ${result.count} representatives from Congress.gov`);
      
      // Reload representatives after sync
      if (userLocation.state) {
        await loadRepresentativesForLocation(userLocation);
      }

      // Update database info
      await checkDatabaseContents();
      
    } catch (err) {
      console.error('❌ Representatives sync failed:', err);
      setError(`Failed to sync representatives: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleContact = (representative: Representative) => {
    // Open contact modal or redirect to contact form
    const subject = encodeURIComponent('Constituent Inquiry');
    const body = encodeURIComponent(`Dear ${representative.full_name},\n\nI am writing as your constituent to...\n\nThank you for your time and service.\n\nSincerely,\n${authState.user?.user_metadata?.full_name || 'Your Constituent'}`);
    
    if (representative.contact_info?.email) {
      window.open(`mailto:${representative.contact_info.email}?subject=${subject}&body=${body}`);
    } else if (representative.contact_info?.website) {
      window.open(representative.contact_info.website, '_blank');
    }
  };

  const handleProfileUpdate = () => {
    setShowProfileModal(false);
    loadUserProfile(); // Reload profile after update
  };

  const handleRepresentativeClick = (representative: Representative) => {
    setSelectedRepresentative(representative);
  };

  const hasCompleteLocation = userLocation.state;

  if (profileLoading || (loading && !representatives.length && !error)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">
            {profileLoading ? 'Loading your profile...' : 'Loading your representatives...'}
          </p>
        </div>
      </div>
    );
  }

  if (selectedRepresentative) {
    return (
      <RepresentativeDetail 
        representative={selectedRepresentative}
        onBack={() => setSelectedRepresentative(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Your Representatives</h2>
          <p className="text-gray-600 mt-1">
            {hasCompleteLocation ? (
              <>
                Representing {userLocation.state}
                {userLocation.district && ` District ${userLocation.district}`}
              </>
            ) : (
              'Complete your profile to see your specific representatives'
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleSyncRepresentatives}
            variant="outline" 
            size="sm"
            disabled={syncing}
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Representatives
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowProfileModal(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            {hasCompleteLocation ? 'Update Location' : 'Complete Profile'}
          </Button>
        </div>
      </div>

      {/* Enhanced Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 text-sm space-y-2">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
            <Database className="w-4 h-4 mr-2" />
            Debug Info:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>User Location:</strong> {JSON.stringify(userLocation)}</p>
              <p><strong>Representatives Found:</strong> {representatives.length}</p>
              <p><strong>Profile Loaded:</strong> {userProfile ? 'Yes' : 'No'}</p>
              {userProfile && (
                <p><strong>Profile Location:</strong> {JSON.stringify(userProfile.preferences?.location)}</p>
              )}
            </div>
            <div>
              {databaseInfo && (
                <>
                  <p><strong>Total Reps in DB:</strong> {databaseInfo.total}</p>
                  <p><strong>Sample States:</strong> {Object.keys(databaseInfo.byState).slice(0, 5).join(', ')}</p>
                  <p><strong>State Formats:</strong> {databaseInfo.stateFormats.slice(0, 5).join(', ')}</p>
                  {userLocation.state && (
                    <p><strong>{userLocation.state} Reps in DB:</strong> {databaseInfo.byState[userLocation.state] || 0}</p>
                  )}
                  {databaseInfo.sampleData.length > 0 && (
                    <p><strong>Sample Rep:</strong> {databaseInfo.sampleData[0].full_name} ({databaseInfo.sampleData[0].state})</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync Success/Error Messages */}
      {syncMessage && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0" />
          <p className="text-success-700">{syncMessage}</p>
        </div>
      )}

      {/* Profile Setup Prompt */}
      {!hasCompleteLocation && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-primary-900 mb-2">
                Complete Your Profile
              </h3>
              <p className="text-primary-700 mb-4">
                To see your representatives and get personalized bill recommendations, 
                we need to know your location and interests.
              </p>
              <Button 
                variant="primary"
                onClick={() => setShowProfileModal(true)}
              >
                Complete Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-error-700">{error}</p>
            {databaseInfo && databaseInfo.stateFormats.length > 0 && (
              <p className="text-error-600 text-sm mt-1">
                Database uses state format: {databaseInfo.stateFormats.slice(0, 3).join(', ')}
                {databaseInfo.stateFormats.length > 3 && '...'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Representatives Grid */}
      {representatives.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {representatives.map((representative) => (
            <RepresentativeCard
              key={representative.bioguide_id}
              representative={representative}
              onContact={handleContact}
              onClick={() => handleRepresentativeClick(representative)}
            />
          ))}
        </div>
      ) : hasCompleteLocation && !loading && !error && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No representatives found</h3>
            <p className="text-gray-600 mb-6">
              We couldn't find representatives for your location ({userLocation.state}
              {userLocation.district && ` District ${userLocation.district}`}). 
              {databaseInfo && databaseInfo.total === 0 
                ? ' The database appears to be empty.'
                : ' This might be due to different state name formats in the database.'
              }
            </p>
            <div className="space-y-3">
              <Button 
                variant="primary"
                onClick={handleSyncRepresentatives}
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing Representatives...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Representatives from Congress.gov
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowProfileModal(true)}
              >
                Update Location
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-2">About Your Representatives</h3>
        <p className="text-blue-700 text-sm">
          These are your elected officials in Congress. You have two Senators representing your entire state 
          and one Representative for your specific congressional district. You can contact them about legislation 
          that matters to you.
        </p>
        {representatives.length === 0 && hasCompleteLocation && (
          <p className="text-blue-700 text-sm mt-2">
            <strong>Note:</strong> If no representatives appear, this might be because the database stores state names 
            in a different format (full names vs abbreviations). Try clicking "Sync Representatives\" to fetch 
            the latest data from Congress.gov.
            {databaseInfo && (
              <span> Currently {databaseInfo.total} representatives in database using format: {databaseInfo.stateFormats.slice(0, 2).join(', ')}.</span>
            )}
          </p>
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