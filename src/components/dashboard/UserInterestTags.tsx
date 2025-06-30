import React, { useState, useEffect } from 'react';
import { Tag, Plus, X, Edit2 } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface UserInterestTagsProps {
  onEdit?: () => void;
  maxTags?: number;
}

export const UserInterestTags: React.FC<UserInterestTagsProps> = ({ 
  onEdit,
  maxTags = 5
}) => {
  const { authState } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState.user) {
      loadUserInterests();
    } else {
      setLoading(false);
    }
  }, [authState.user]);

  const loadUserInterests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', authState.user?.id)
        .single();
      
      if (error) throw error;
      
      const userInterests = data?.preferences?.interests || [];
      setInterests(userInterests);
    } catch (err) {
      console.error('Error loading user interests:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 h-8">
        <Tag className="w-4 h-4 text-gray-400" />
        <span className="text-gray-400 text-sm">Loading interests...</span>
      </div>
    );
  }

  if (interests.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <Tag className="w-4 h-4 text-gray-400" />
        <span className="text-gray-500 text-sm">No interests set</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onEdit}
          className="text-primary-500 hover:text-primary-600 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Interests
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-2">
        <Tag className="w-4 h-4 text-gray-500 mr-2" />
        <h4 className="text-sm font-medium text-gray-700">Your Interests</h4>
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
      
      <div className="flex flex-wrap gap-2">
        {interests.slice(0, maxTags).map((interest, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
          >
            {interest}
          </span>
        ))}
        
        {interests.length > maxTags && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            +{interests.length - maxTags} more
          </span>
        )}
      </div>
    </div>
  );
};