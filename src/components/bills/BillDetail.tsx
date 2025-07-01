import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Users, Building, Tag, ExternalLink, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { billDataSyncService } from '../../services/billDataSyncService';
import type { Bill } from '../../types';

interface BillDetailProps {
  bill: Bill;
  onBack: () => void;
}

export const BillDetail: React.FC<BillDetailProps> = ({ bill, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentBill, setCurrentBill] = useState<Bill>(bill);

  // Sync bill data when component mounts
  useEffect(() => {
    const syncData = async () => {
      // Only sync if we're missing important data
      if (!bill.summary || !bill.sponsors || bill.sponsors.length === 0 || !bill.subjects || bill.subjects.length === 0) {
        setIsLoading(true);
        try {
          console.log('🔄 Syncing missing bill data for:', bill.id);
          const updatedBill = await billDataSyncService.syncBillData(bill.id);
          if (updatedBill) {
            console.log('✅ Successfully synced bill data');
            setCurrentBill(updatedBill);
          }
        } catch (error) {
          console.error('❌ Error syncing bill data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    syncData();
  }, [bill.id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date not available';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bills
        </Button>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <div>
            <p className="text-blue-700">Syncing bill data from Congress.gov...</p>
            <p className="text-blue-600 text-sm">This may take a moment as we fetch the latest information</p>
          </div>
        </div>
      )}

      {/* Bill Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg font-semibold text-primary-600">
                {currentBill.bill_type} {currentBill.number}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-600">
                {currentBill.congress}th Congress
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentBill.title}
            </h1>
            {currentBill.short_title && currentBill.short_title !== currentBill.title && (
              <p className="text-lg text-gray-600 mb-4">
                "{currentBill.short_title}"
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="primary">
              Track Bill
            </Button>
            {currentBill.congress_url && (
              <Button variant="outline" asChild>
                <a href={currentBill.congress_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Congress.gov
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Status and Date */}
        <div className="flex items-center space-x-6 mb-6">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">
              {currentBill.introduced_date ? `Introduced ${formatDate(currentBill.introduced_date)}` : 'Introduction date not available'}
            </span>
          </div>
          
          {currentBill.status && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentBill.status)}`}>
              {currentBill.status}
            </span>
          )}
        </div>

        {/* Latest Action */}
        {currentBill.latest_action?.text && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Latest Action</h3>
            <p className="text-gray-700">{currentBill.latest_action.text}</p>
            {currentBill.latest_action.date && (
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(currentBill.latest_action.date)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bill Summary */}
      {currentBill.summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Official Summary</h2>
          <p className="text-gray-700 leading-relaxed">{currentBill.summary}</p>
        </div>
      )}

      {/* Sponsors and Committees */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Sponsors */}
        {currentBill.sponsors && currentBill.sponsors.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900">Sponsors</h2>
            </div>
            
            <div className="space-y-3">
              {currentBill.sponsors.map((sponsor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{sponsor.full_name}</p>
                    <p className="text-sm text-gray-600">
                      {sponsor.party}-{sponsor.state}
                      {sponsor.district && ` (District ${sponsor.district})`}
                    </p>
                  </div>
                  {index === 0 && (
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                      Primary
                    </span>
                  )}
                </div>
              ))}
              
              {currentBill.cosponsors_count > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    + {currentBill.cosponsors_count} cosponsors
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Committees */}
        {currentBill.committees && currentBill.committees.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Building className="w-5 h-5 text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900">Committees</h2>
            </div>
            
            <div className="space-y-3">
              {currentBill.committees.map((committee, index) => (
                <div key={index}>
                  <p className="font-medium text-gray-900">{committee.name}</p>
                  <p className="text-sm text-gray-600 capitalize">{committee.chamber}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Subjects */}
      {(currentBill.subjects && currentBill.subjects.length > 0) || currentBill.policy_area ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Tag className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900">Subjects</h2>
          </div>
          
          <div className="space-y-4">
            {/* Policy Area */}
            {currentBill.policy_area && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Policy Area</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  {currentBill.policy_area}
                </span>
              </div>
            )}
            
            {/* Legislative Subjects */}
            {currentBill.subjects && currentBill.subjects.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Legislative Subjects</h3>
                <div className="flex flex-wrap gap-2">
                  {currentBill.subjects.map((subject, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Voting Data */}
      {currentBill.voting_data && currentBill.voting_data.vote_count > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Voting History</h2>
          <p className="text-gray-600">
            This bill has {currentBill.voting_data.vote_count} recorded votes.
          </p>
          {currentBill.voting_data.last_vote_date && (
            <p className="text-sm text-gray-500 mt-1">
              Last vote: {formatDate(currentBill.voting_data.last_vote_date)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};