import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertTriangle, Star, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { BillCard } from '../bills/BillCard';
import { recommendationService } from '../../services/recommendationService';
import { useAuth } from '../../hooks/useAuth';
import type { Bill } from '../../types';

interface PersonalizedRecommendationsProps {
  onBillClick?: (bill: Bill) => void;
}

export const PersonalizedRecommendations: React.FC<PersonalizedRecommendationsProps> = ({ onBillClick }) => {
  const { authState } = useAuth();
  const [recommendations, setRecommendations] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load recommendations
  useEffect(() => {
    if (authState.user) {
      loadRecommendations();
    } else {
      setLoading(false);
    }
  }, [authState.user]);

  const loadRecommendations = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const result = await recommendationService.getPersonalizedRecommendations(forceRefresh);
      setRecommendations(result);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError('Failed to load recommendations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh recommendations
  const handleRefresh = () => {
    loadRecommendations(true);
  };

  if (!authState.user) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-6">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sign In for Recommendations</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Create an account or sign in to get personalized bill recommendations based on your interests and location.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !refreshing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mr-3" />
          <div>
            <p className="font-medium text-gray-900">Generating Recommendations</p>
            <p className="text-sm text-gray-600">Finding bills that match your interests and location...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-primary-500" />
            Recommended for You
          </h3>
          <p className="text-gray-600 text-sm">
            Bills tailored to your interests and location
          </p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-error-50 rounded-lg p-4 border border-error-200 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-error-500 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-error-800 mb-1">Error</h4>
              <p className="text-error-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Recommendations */}
      {recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              onClick={() => onBillClick?.(bill)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Yet</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-4">
            Complete your profile with more interests and location information to get personalized recommendations.
          </p>
          <Button variant="primary">
            Update Preferences
          </Button>
        </div>
      )}
      
      {/* Refreshing Overlay */}
      {refreshing && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-xl">
          <div className="bg-white p-4 rounded-lg shadow-md flex items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500 mr-3" />
            <p className="text-gray-700">Refreshing recommendations...</p>
          </div>
        </div>
      )}
    </div>
  );
};