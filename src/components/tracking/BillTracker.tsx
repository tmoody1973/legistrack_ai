import React, { useState, useEffect } from 'react';
import { Star, Bell, Tag, Trash2, Eye, Calendar } from 'lucide-react';
import { BillCard } from '../bills/BillCard';
import { Button } from '../common/Button';
import { trackingService } from '../../services/trackingService';
import { useAuth } from '../../hooks/useAuth';
import type { Bill } from '../../types';

interface TrackedBillWithSettings extends Bill {
  tracking: {
    tracked_at: string;
    notification_settings: {
      statusChanges: boolean;
      votingUpdates: boolean;
      aiInsights: boolean;
      majorMilestones: boolean;
    };
    user_notes?: string;
    user_tags: string[];
    view_count: number;
    last_viewed?: string;
  };
}

export const BillTracker: React.FC = () => {
  const { authState } = useAuth();
  const [trackedBills, setTrackedBills] = useState<TrackedBillWithSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authState.user) {
      loadTrackedBills();
    }
  }, [authState.user]);

  const loadTrackedBills = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const tracked = await trackingService.getTrackedBills();
      setTrackedBills(tracked);
    } catch (err) {
      setError('Failed to load tracked bills. Please try again.');
      console.error('Error loading tracked bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUntrack = async (billId: string) => {
    try {
      await trackingService.untrackBill(billId);
      setTrackedBills(prev => prev.filter(bill => bill.id !== billId));
    } catch (err) {
      setError('Failed to untrack bill. Please try again.');
      console.error('Error untracking bill:', err);
    }
  };

  const handleUpdateNotifications = async (billId: string, settings: any) => {
    try {
      await trackingService.updateNotificationSettings(billId, settings);
      setTrackedBills(prev => 
        prev.map(bill => 
          bill.id === billId 
            ? { ...bill, tracking: { ...bill.tracking, notification_settings: settings } }
            : bill
        )
      );
    } catch (err) {
      setError('Failed to update notification settings.');
      console.error('Error updating notifications:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your tracked bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Tracked Bills</h2>
          <p className="text-gray-600 mt-1">
            {trackedBills.length} bill{trackedBills.length !== 1 ? 's' : ''} you're following
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Notification Settings
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <p className="text-error-700">{error}</p>
        </div>
      )}

      {/* Tracked Bills */}
      {trackedBills.length > 0 ? (
        <div className="space-y-6">
          {trackedBills.map((bill) => (
            <div key={bill.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Bill Card */}
              <div className="p-6">
                <BillCard
                  bill={bill}
                  showTrackButton={false}
                />
              </div>

              {/* Tracking Details */}
              <div className="border-t border-gray-100 bg-gray-50 p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Tracking Info */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Tracking Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        Tracked since {formatDate(bill.tracking.tracked_at)}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Eye className="w-4 h-4 mr-2" />
                        Viewed {bill.tracking.view_count} times
                      </div>
                      {bill.tracking.last_viewed && (
                        <div className="flex items-center text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          Last viewed {formatDate(bill.tracking.last_viewed)}
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {bill.tracking.user_tags.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Your Tags</h5>
                        <div className="flex flex-wrap gap-2">
                          {bill.tracking.user_tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700"
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {bill.tracking.user_notes && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Your Notes</h5>
                        <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border">
                          {bill.tracking.user_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notification Settings */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Notification Settings</h4>
                    <div className="space-y-3">
                      {Object.entries(bill.tracking.notification_settings).map(([key, enabled]) => (
                        <label key={key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => {
                              const newSettings = {
                                ...bill.tracking.notification_settings,
                                [key]: e.target.checked
                              };
                              handleUpdateNotifications(bill.id, newSettings);
                            }}
                            className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {key === 'statusChanges' && 'Status changes'}
                            {key === 'votingUpdates' && 'Voting updates'}
                            {key === 'aiInsights' && 'AI insights'}
                            {key === 'majorMilestones' && 'Major milestones'}
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUntrack(bill.id)}
                        className="text-error-600 hover:text-error-700 hover:bg-error-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Untrack
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tracked bills yet</h3>
            <p className="text-gray-600 mb-6">
              Start tracking bills that matter to you to get updates and stay informed about their progress.
            </p>
            <Button variant="primary">
              Browse Bills
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};