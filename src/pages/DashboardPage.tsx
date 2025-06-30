import React, { useState } from 'react';
import { UserDashboard } from '../components/dashboard/UserDashboard';
import { BillDetailTabs } from '../components/bills/BillDetailTabs';
import { billService } from '../services/billService';
import { trackingService } from '../services/trackingService';
import { billDataSyncService } from '../services/billDataSyncService';
import { openaiService } from '../services/openaiService';
import { useAuth } from '../hooks/useAuth';
import { Loader2, AlertTriangle, ArrowLeft, Calendar } from 'lucide-react';
import type { Bill } from '../types';

export const DashboardPage: React.FC = () => {
  const { authState } = useAuth();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTracked, setIsTracked] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);

  const handleBillClick = async (bill: Bill) => {
    try {
      setLoading(true);
      setError(null);
      
      // For bills from API search, we might need to get full details
      if (!bill.summary || !bill.sponsors || !bill.committees) {
        console.log('🔍 Getting full bill details for:', bill.id);
        
        // First try to get from database
        const dbBill = await billService.getBillWithAutoFetch(bill.id);
        
        if (dbBill) {
          setSelectedBill(dbBill);
          // Auto-generate comprehensive analysis
          generateComprehensiveAnalysis(dbBill);
        } else {
          // If not in database, sync from Congress.gov API
          const syncedBill = await billDataSyncService.syncBillData(bill.id);
          
          if (syncedBill) {
            setSelectedBill(syncedBill);
            // Auto-generate comprehensive analysis
            generateComprehensiveAnalysis(syncedBill);
          } else {
            setSelectedBill(bill);
            // Auto-generate comprehensive analysis
            generateComprehensiveAnalysis(bill);
            setError('Could not load complete bill details. Some information may be missing.');
          }
        }
      } else {
        setSelectedBill(bill);
        // Auto-generate comprehensive analysis
        generateComprehensiveAnalysis(bill);
      }

      // Check if bill is tracked
      if (authState.user) {
        const tracked = await trackingService.isBillTracked(bill.id);
        setIsTracked(tracked);
      }
    } catch (err) {
      console.error('Error loading bill details:', err);
      setError('Failed to load complete bill details');
      setSelectedBill(bill); // Still show what we have
      // Auto-generate comprehensive analysis
      generateComprehensiveAnalysis(bill);
    } finally {
      setLoading(false);
    }
  };

  const generateComprehensiveAnalysis = async (bill: Bill) => {
    // Only generate if OpenAI is available
    if (!openaiService.isAvailable()) {
      console.log('OpenAI not available, skipping comprehensive analysis generation');
      return;
    }

    try {
      setGeneratingAnalysis(true);
      
      // Check if we already have comprehensive analysis
      const existingAnalysis = await openaiService.getComprehensiveAnalysis(bill.id);
      if (existingAnalysis) {
        console.log('✅ Comprehensive analysis already exists for bill:', bill.id);
        setGeneratingAnalysis(false);
        return;
      }
      
      console.log('🧠 Auto-generating comprehensive analysis for bill:', bill.id);
      await openaiService.generateComprehensiveAnalysis(bill);
      console.log('✅ Successfully generated comprehensive analysis');
    } catch (error) {
      console.error('❌ Error generating comprehensive analysis:', error);
      // Don't show error to user, just log it
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const handleBackToFeed = () => {
    setSelectedBill(null);
    setError(null);
  };

  const handleTrackBill = async () => {
    if (!authState.user || !selectedBill) return;
    
    try {
      setTrackingLoading(true);
      
      if (isTracked) {
        await trackingService.untrackBill(selectedBill.id);
        setIsTracked(false);
      } else {
        await trackingService.trackBill(selectedBill.id, {
          notification_settings: {
            statusChanges: true,
            votingUpdates: true,
            aiInsights: false,
            majorMilestones: true,
          },
          user_notes: '',
          user_tags: [],
        });
        setIsTracked(true);
      }
    } catch (error) {
      console.error('Error toggling bill tracking:', error);
    } finally {
      setTrackingLoading(false);
    }
  };

  // New function to handle bill updates from child components
  const handleUpdateSelectedBill = (updatedBill: Bill) => {
    console.log('🔄 Updating selected bill with new data:', updatedBill.id);
    setSelectedBill(updatedBill);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {authState.user?.user_metadata?.full_name || 'there'}
          </h1>
          <p className="text-gray-600 mt-1">
            Stay informed with the latest legislative updates and insights
          </p>
        </div>

        {selectedBill ? (
          <div className="space-y-6">
            <button
              onClick={handleBackToFeed}
              className="flex items-center text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
            
            {error && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                <p className="text-yellow-800">{error}</p>
              </div>
            )}
            
            {generatingAnalysis && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-2" />
                <p className="text-blue-800">Generating comprehensive analysis for this bill...</p>
              </div>
            )}
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
                  <p className="text-gray-600">Loading bill details...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Bill Header */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg font-semibold text-primary-600">
                          {selectedBill.bill_type} {selectedBill.number}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">
                          {selectedBill.congress}th Congress
                        </span>
                      </div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {selectedBill.title}
                      </h1>
                      {selectedBill.short_title && selectedBill.short_title !== selectedBill.title && (
                        <p className="text-lg text-gray-600 mb-4">
                          "{selectedBill.short_title}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status and Date */}
                  <div className="flex items-center space-x-6 mb-6">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">
                        Introduced {formatDate(selectedBill.introduced_date)}
                      </span>
                    </div>
                    
                    {selectedBill.status && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedBill.status)}`}>
                        {selectedBill.status}
                      </span>
                    )}
                  </div>

                  {/* Latest Action */}
                  {selectedBill.latest_action?.text && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">Latest Action</h3>
                      <p className="text-gray-700">{selectedBill.latest_action.text}</p>
                      {selectedBill.latest_action.date && (
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(selectedBill.latest_action.date)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Tabbed Interface */}
                <BillDetailTabs 
                  bill={selectedBill} 
                  onTrackBill={handleTrackBill}
                  isTracked={isTracked}
                  trackingLoading={trackingLoading}
                  onUpdateBill={handleUpdateSelectedBill} // Pass the update callback
                />
              </div>
            )}
          </div>
        ) : (
          <UserDashboard onBillClick={handleBillClick} />
        )}
      </div>
    </div>
  );

  function formatDate(dateString?: string) {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function getStatusColor(status: string) {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('passed') || lowerStatus.includes('enacted')) {
      return 'bg-success-100 text-success-700';
    }
    if (lowerStatus.includes('failed') || lowerStatus.includes('rejected')) {
      return 'bg-error-100 text-error-700';
    }
    if (lowerStatus.includes('committee')) {
      return 'bg-warning-100 text-warning-700';
    }
    return 'bg-primary-100 text-primary-700';
  }
};