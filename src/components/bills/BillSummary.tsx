import React from 'react';
import { Calendar, Users, Tag, ExternalLink, TrendingUp, Clock } from 'lucide-react';
import { Button } from '../common/Button';
import type { Bill } from '../../types';

interface BillSummaryProps {
  bill: Bill;
  onViewDetails?: () => void;
}

export const BillSummary: React.FC<BillSummaryProps> = ({ bill, onViewDetails }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  // Generate a plain English summary if AI analysis is available
  const getPlainEnglishSummary = () => {
    if (bill.ai_analysis?.summary) {
      return bill.ai_analysis.summary;
    }
    
    if (bill.summary) {
      // Return first 200 characters of summary
      return bill.summary.length > 200 
        ? `${bill.summary.substring(0, 200)}...` 
        : bill.summary;
    }
    
    return 'No summary available for this bill.';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg font-semibold text-primary-600">
              {bill.bill_type} {bill.number}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">
              {bill.congress}th Congress
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {bill.short_title || bill.title}
          </h2>
        </div>
        
        {bill.status && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bill.status)}`}>
            {bill.status}
          </span>
        )}
      </div>
      
      {/* Key Information */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          <span>Introduced {formatDate(bill.introduced_date)}</span>
        </div>
        
        {bill.sponsors && bill.sponsors.length > 0 && (
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2 text-gray-400" />
            <span>
              Sponsored by {bill.sponsors[0].full_name} ({bill.sponsors[0].party}-{bill.sponsors[0].state})
              {bill.cosponsors_count > 0 && ` with ${bill.cosponsors_count} cosponsor${bill.cosponsors_count !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}
        
        {bill.latest_action?.text && (
          <div className="flex items-start text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
            <div>
              <p><strong>Latest Action:</strong> {bill.latest_action.text}</p>
              {bill.latest_action.date && (
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(bill.latest_action.date)}</p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* AI Summary */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
        <p className="text-gray-700">{getPlainEnglishSummary()}</p>
      </div>
      
      {/* Subjects */}
      {(bill.subjects?.length > 0 || bill.policy_area) && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Subjects</h3>
          <div className="flex flex-wrap gap-2">
            {bill.policy_area && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                {bill.policy_area}
              </span>
            )}
            {bill.subjects?.slice(0, 5).map((subject, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {subject}
              </span>
            ))}
            {bill.subjects && bill.subjects.length > 5 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                +{bill.subjects.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* AI Analysis Preview */}
      {bill.ai_analysis?.passagePrediction?.probability !== undefined && (
        <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-primary-900">AI Analysis</h3>
            <span className="text-sm font-medium text-primary-700">
              {Math.round(bill.ai_analysis.passagePrediction.probability * 100)}% passage probability
            </span>
          </div>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-primary-500" 
              style={{ width: `${bill.ai_analysis.passagePrediction.probability * 100}%` }}
            ></div>
          </div>
          {bill.ai_analysis.passagePrediction.reasoning && (
            <p className="text-sm text-primary-700">{bill.ai_analysis.passagePrediction.reasoning}</p>
          )}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button onClick={onViewDetails}>
          View Full Details
        </Button>
        
        {bill.congress_url && (
          <Button variant="outline" asChild>
            <a href={bill.congress_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Congress.gov
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};