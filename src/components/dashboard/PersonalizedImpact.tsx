import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Users, MapPin, AlertCircle } from 'lucide-react';
import { openaiService } from '../../services/openaiService';
import type { Bill } from '../../types';

interface UserProfile {
  id: string;
  preferences: {
    location?: {
      state?: string;
      district?: string;
      zipCode?: string;
    };
    interests?: string[];
  };
  profile: {
    demographics?: {
      ageGroup?: string;
      occupation?: string;
    };
    civicEngagement?: {
      issueAdvocacy?: string[];
      votingFrequency?: string;
    };
  };
}

interface TrackedBill {
  bill_id: string;
  tracked_at: string;
  bills: {
    title: string;
    status: string;
    policy_area: string;
    latest_action: {
      text: string;
      date: string;
    };
  };
}

interface PersonalizedImpactProps {
  bill?: Bill;
}

export const PersonalizedImpact: React.FC<PersonalizedImpactProps> = ({ bill }) => {
  const { authState } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [trackedBills, setTrackedBills] = useState<TrackedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personalizedImpact, setPersonalizedImpact] = useState<any>(null);
  const [generatingImpact, setGeneratingImpact] = useState(false);

  const loadUserProfile = async () => {
    if (!authState.user?.id) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Load user profile with error handling
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, preferences, profile')
        .eq('id', authState.user.id)
        .single();

      if (profileError) {
        console.error('Error loading user profile:', profileError);
        throw new Error(`Failed to load user profile: ${profileError.message}`);
      }

      if (!profile) {
        throw new Error('User profile not found');
      }

      setUserProfile(profile);

      // Load tracked bills with error handling
      const { data: bills, error: billsError } = await supabase
        .from('user_tracked_bills')
        .select(`
          bill_id,
          tracked_at,
          bills (
            title,
            status,
            policy_area,
            latest_action
          )
        `)
        .eq('user_id', authState.user.id)
        .order('tracked_at', { ascending: false })
        .limit(5);

      if (billsError) {
        console.warn('Failed to load tracked bills:', billsError.message);
        // Don't throw here, just log the warning and continue without tracked bills
        setTrackedBills([]);
      } else {
        setTrackedBills(bills || []);
      }

      // If we have a bill and user profile, generate personalized impact
      if (bill && profile) {
        try {
          setGeneratingImpact(true);
          const impact = await openaiService.generatePersonalizedImpact(bill, profile);
          setPersonalizedImpact(impact);
        } catch (impactError) {
          console.warn('Could not generate personalized impact:', impactError);
          // Don't set error state for this, just log the warning
        } finally {
          setGeneratingImpact(false);
        }
      }

    } catch (err: any) {
      console.error('Error loading user profile:', err);
      setError(err.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, [authState.user?.id, bill?.id]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 text-red-600 mb-4">
          <AlertCircle className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Error Loading Profile</h3>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadUserProfile}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Not Found</h3>
          <p className="text-gray-600">Unable to load your profile information.</p>
        </div>
      </div>
    );
  }

  // If no bill is provided, show general impact
  if (!bill) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Legislative Impact</h3>
        
        <div className="space-y-4">
          {/* Location Impact */}
          {userProfile.preferences?.location?.state && (
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Local Representation</h4>
                <p className="text-sm text-gray-600">
                  Tracking legislation affecting {userProfile.preferences.location.state}
                  {userProfile.preferences.location.district && ` District ${userProfile.preferences.location.district}`}
                </p>
              </div>
            </div>
          )}

          {/* Interest-based Impact */}
          {userProfile.preferences?.interests && userProfile.preferences.interests.length > 0 && (
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Your Interests</h4>
                <p className="text-sm text-gray-600">
                  Following {userProfile.preferences.interests.length} topic{userProfile.preferences.interests.length !== 1 ? 's' : ''}: {userProfile.preferences.interests.join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Tracked Bills Impact */}
          {trackedBills.length > 0 && (
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Bills You're Tracking</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Actively following {trackedBills.length} bill{trackedBills.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {trackedBills.slice(0, 3).map((trackedBill) => (
                    <div key={trackedBill.bill_id} className="bg-gray-50 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-gray-900 mb-1">
                        {trackedBill.bills?.title || 'Unknown Bill'}
                      </h5>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Status: {trackedBill.bills?.status || 'Unknown'}</span>
                        {trackedBill.bills?.policy_area && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {trackedBill.bills.policy_area}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {trackedBills.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{trackedBills.length - 3} more bills
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Engagement Level */}
          {userProfile.profile?.demographics?.occupation && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Professional Impact</h4>
              <p className="text-sm text-blue-700">
                As a {userProfile.profile.demographics.occupation}, certain legislation may directly affect your profession and industry.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If a bill is provided, show bill-specific impact
  const userLocation = userProfile.preferences?.location;
  const userInterests = userProfile.preferences?.interests || [];
  const userOccupation = userProfile.profile?.demographics?.occupation;

  // Check if bill matches user's interests
  const matchesInterests = userInterests.some(interest => 
    bill.subjects?.some(subject => subject.toLowerCase().includes(interest.toLowerCase())) ||
    bill.policy_area?.toLowerCase().includes(interest.toLowerCase()) ||
    bill.title.toLowerCase().includes(interest.toLowerCase())
  );

  // Check if bill is from user's state
  const isFromUserState = bill.sponsors?.some(sponsor => 
    sponsor.state === userLocation?.state
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">How This Bill Affects You</h3>
      
      {generatingImpact ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500 mr-2" />
          <span className="text-gray-600">Generating personalized impact assessment...</span>
        </div>
      ) : personalizedImpact ? (
        <div className="space-y-4">
          {/* AI-Generated Personalized Impact */}
          <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
            <h4 className="font-medium text-primary-900 mb-2">Personalized Impact</h4>
            <p className="text-primary-700">{personalizedImpact.personalImpact}</p>
            
            {personalizedImpact.relevanceScore !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-primary-700">Relevance to You</span>
                  <span className="text-sm font-medium text-primary-700">
                    {personalizedImpact.relevanceScore}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-500" 
                    style={{ width: `${personalizedImpact.relevanceScore}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {personalizedImpact.keyPoints && personalizedImpact.keyPoints.length > 0 && (
              <div className="mt-3">
                <h5 className="text-sm font-medium text-primary-800 mb-1">Key Points</h5>
                <ul className="list-disc list-inside text-sm text-primary-700 space-y-1">
                  {personalizedImpact.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {personalizedImpact.recommendedAction && (
              <div className="mt-3 bg-white rounded-lg p-3 border border-primary-200">
                <h5 className="text-sm font-medium text-primary-800 mb-1">Recommended Action</h5>
                <p className="text-sm text-primary-700">{personalizedImpact.recommendedAction}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Location-based Impact */}
          {userLocation?.state && (
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Geographic Impact</h4>
                <p className="text-sm text-gray-600">
                  {isFromUserState 
                    ? `This bill was sponsored by a representative from your state (${userLocation.state}).`
                    : `This bill may affect policies in your state (${userLocation.state}).`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Interest-based Impact */}
          {matchesInterests && (
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Interest Alignment</h4>
                <p className="text-sm text-gray-600">
                  This bill relates to your interests: {userInterests.filter(interest => 
                    bill.subjects?.some(subject => subject.toLowerCase().includes(interest.toLowerCase())) ||
                    bill.policy_area?.toLowerCase().includes(interest.toLowerCase()) ||
                    bill.title.toLowerCase().includes(interest.toLowerCase())
                  ).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Professional Impact */}
          {userOccupation && (
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Professional Relevance</h4>
                <p className="text-sm text-gray-600">
                  As a {userOccupation}, this bill may affect your professional sector through changes to {bill.policy_area || 'relevant policy areas'}.
                </p>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {bill.ai_analysis && (
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
              <h4 className="font-medium text-primary-900 mb-2">AI Impact Analysis</h4>
              {bill.ai_analysis.impactAssessment?.economic && (
                <p className="text-sm text-primary-700 mb-2">
                  <strong>Economic Impact:</strong> {bill.ai_analysis.impactAssessment.economic}
                </p>
              )}
              {bill.ai_analysis.impactAssessment?.social && (
                <p className="text-sm text-primary-700 mb-2">
                  <strong>Social Impact:</strong> {bill.ai_analysis.impactAssessment.social}
                </p>
              )}
              {bill.ai_analysis.passagePrediction?.probability !== undefined && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-primary-700">Passage Probability</span>
                    <span className="text-sm font-medium text-primary-700">
                      {Math.round(bill.ai_analysis.passagePrediction.probability * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-500" 
                      style={{ width: `${bill.ai_analysis.passagePrediction.probability * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No personalized impact available */}
          {!userLocation?.state && !matchesInterests && !userOccupation && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Complete Your Profile</h4>
                  <p className="text-sm text-gray-600">
                    Add your location, interests, and occupation to see how this bill specifically affects you.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PersonalizedImpact;