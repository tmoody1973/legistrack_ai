import React, { useState, useEffect } from 'react';
import { MapPin, Users, Edit2 } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface UserLocationInfoProps {
  onEdit?: () => void;
}

export const UserLocationInfo: React.FC<UserLocationInfoProps> = ({ onEdit }) => {
  const { authState } = useAuth();
  const [location, setLocation] = useState<{
    state?: string;
    district?: number;
    zipCode?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [representatives, setRepresentatives] = useState<number>(0);

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
      
      // Count representatives (simplified - in a real app, would fetch from database)
      if (userLocation.state) {
        // 2 senators for every state
        let repCount = 2;
        
        // 1 house representative for the district
        if (userLocation.district) {
          repCount += 1;
        }
        
        setRepresentatives(repCount);
      }
    } catch (err) {
      console.error('Error loading user location:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 h-8">
        <MapPin className="w-4 h-4 text-gray-400" />
        <span className="text-gray-400 text-sm">Loading location...</span>
      </div>
    );
  }

  if (!location.state) {
    return (
      <div className="flex items-center space-x-2">
        <MapPin className="w-4 h-4 text-gray-400" />
        <span className="text-gray-500 text-sm">Location not set</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onEdit}
          className="text-primary-500 hover:text-primary-600 text-xs"
        >
          Set Location
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-2">
        <MapPin className="w-4 h-4 text-gray-500 mr-2" />
        <h4 className="text-sm font-medium text-gray-700">Your Location</h4>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onEdit}
          className="ml-2 text-primary-500 hover:text-primary-600 text-xs"
        >
          <Edit2 className="w-3 h-3 mr-1" />
          Edit
        </Button>
      </div>
      
      <div className="flex flex-col space-y-1 text-sm">
        <div className="flex items-center">
          <span className="text-gray-700">
            {location.state}
            {location.district && ` District ${location.district}`}
            {location.zipCode && ` (${location.zipCode})`}
          </span>
        </div>
        
        {representatives > 0 && (
          <div className="flex items-center text-gray-600">
            <Users className="w-3 h-3 mr-1" />
            <span>{representatives} Representatives</span>
          </div>
        )}
      </div>
    </div>
  );
};