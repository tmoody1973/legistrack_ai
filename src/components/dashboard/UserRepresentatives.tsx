import React, { useState, useEffect } from 'react';
import { MapPin, Users, Loader2, Settings, RefreshCw, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { RepresentativeCard } from '../representatives/RepresentativeCard';
import { ProfileSetupModal } from '../profile/ProfileSetupModal';
import { Button } from '../common/Button';
import { representativeService } from '../../services/representativeService';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Representative } from '../../types';

export const UserRepresentatives: React.FC = () => {
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

  const hasCompleteLocation = userLocation.state;

  if (profileLoading || (loading && !representatives.length && !error)) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-primary-500" />
            Your Representatives
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500 mr-2" />
          <p className="text-gray-600">Loading your representatives...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-primary-500" />
            Your Representatives
          </h3>
          {hasCompleteLocation && (
            <p className="text-gray-600 text-sm">
              Representing {userLocation.state}
              {userLocation.district && ` District ${userLocation.district}`}
            </p>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowProfileModal(true)}
        >
          <Settings className="w-4 h-4 mr-2" />
          {hasCompleteLocation ? 'Update Location' : 'Set Location'}
        </Button>
      </div>

      {/* Profile Setup Prompt */}
      {!hasCompleteLocation && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-primary-900 mb-2">
                Complete Your Profile
              </h3>
              <p className="text-primary-700 mb-4 text-sm">
                To see your representatives and get personalized bill recommendations, 
                we need to know your location.
              </p>
              <Button 
                variant="primary"
                size="sm"
                onClick={() => setShowProfileModal(true)}
              >
                Set Your Location
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-500 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-700">{error}</p>
              {databaseInfo && databaseInfo.stateFormats.length > 0 && (
                <p className="text-amber-600 text-sm mt-1">
                  Database uses state format: {databaseInfo.stateFormats.slice(0, 3).join(', ')}
                  {databaseInfo.stateFormats.length > 3 && '...'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {syncMessage && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-success-500 mr-3 mt-0.5" />
            <p className="text-success-700">{syncMessage}</p>
          </div>
        </div>
      )}

      {/* Representatives List */}
      {representatives.length > 0 ? (
        <div className="space-y-4">
          {representatives.map((representative) => (
            <RepresentativeCard
              key={representative.bioguide_id}
              representative={representative}
              onContact={handleContact}
              onClick={() => window.location.href = '/representatives'}
            />
          ))}
          
          <div className="text-center pt-4 border-t border-gray-100">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/representatives'}
            >
              View All Representatives
            </Button>
          </div>
        </div>
      ) : hasCompleteLocation && !loading ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No representatives found</h3>
          <p className="text-gray-600 mb-6">
            We couldn't find representatives for your location ({userLocation.state}
            {userLocation.district && ` District ${userLocation.district}`}).
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
      ) : null}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 className="font-medium text-blue-900 mb-2">About Your Representatives</h3>
        <p className="text-blue-700 text-sm">
          These are your elected officials in Congress. You have two Senators representing your entire state 
          and one Representative for your specific congressional district. You can contact them about legislation 
          that matters to you.
        </p>
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