import React, { useState, useEffect } from 'react';
import { MapPin, Users, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface LocationBannerProps {
  onEditLocation?: () => void;
}

export const LocationBanner: React.FC<LocationBannerProps> = ({ onEditLocation }) => {
  const { authState } = useAuth();
  const [location, setLocation] = useState<{
    state?: string;
    district?: number;
    zipCode?: string;
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState.user) {
      loadUserLocation();
    } else {
      setLoading(false);
    }
  }, [authState.user]);

  const loadUserLocation = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', authState.user?.id)
        .single();
      
      if (error) throw error;
      
      const userLocation = data?.preferences?.location || {};
      setLocation(userLocation);
    } catch (err) {
      console.error('Error loading user location:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  // If location is set, don't show the banner
  if (location.state) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Location Not Set</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Set your location to see personalized bill recommendations and find your representatives.
            </p>
          </div>
          <div className="mt-4">
            <Button
              size="sm"
              onClick={onEditLocation}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Set Your Location
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};