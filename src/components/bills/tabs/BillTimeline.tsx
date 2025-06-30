import React from 'react';
import { CheckCircle, Circle, Clock, Calendar, AlertTriangle } from 'lucide-react';
import type { Bill } from '../../../types';

interface BillTimelineProps {
  bill: Bill;
}

export const BillTimeline: React.FC<BillTimelineProps> = ({ bill }) => {
  // Define the stages a bill goes through
  const stages = [
    { id: 'introduced', label: 'Introduced', description: 'Bill is introduced in the chamber of origin' },
    { id: 'committee', label: 'Committee', description: 'Bill is referred to committee for review, hearings, and markup' },
    { id: 'floor', label: 'Floor Vote', description: 'Bill is debated, amended, and voted on by the full chamber' },
    { id: 'otherChamber', label: 'Other Chamber', description: 'Bill is sent to the other chamber for consideration' },
    { id: 'conference', label: 'Conference', description: 'If versions differ, a conference committee resolves differences' },
    { id: 'president', label: 'President', description: 'Bill is sent to the President for signature or veto' },
    { id: 'law', label: 'Law', description: 'Bill becomes law after presidential signature or veto override' }
  ];

  // Determine current stage based on bill status
  const getCurrentStage = (bill: Bill): number => {
    const status = bill.status?.toLowerCase() || '';
    
    if (status.includes('enacted') || status.includes('became law')) {
      return 6; // Law
    } else if (status.includes('president') || status.includes('vetoed')) {
      return 5; // President
    } else if (status.includes('conference')) {
      return 4; // Conference
    } else if (
      (bill.bill_type.startsWith('H') && status.includes('senate')) ||
      (bill.bill_type.startsWith('S') && status.includes('house'))
    ) {
      return 3; // Other Chamber
    } else if (status.includes('vote') || status.includes('passed')) {
      return 2; // Floor Vote
    } else if (status.includes('committee')) {
      return 1; // Committee
    } else {
      return 0; // Introduced
    }
  };

  const currentStageIndex = getCurrentStage(bill);

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get status color based on stage
  const getStatusColor = (index: number) => {
    if (index < currentStageIndex) return 'text-success-500'; // Completed
    if (index === currentStageIndex) return 'text-primary-500'; // Current
    return 'text-gray-300'; // Future
  };

  // Get line color between stages
  const getLineColor = (index: number) => {
    if (index < currentStageIndex) return 'bg-success-500'; // Completed
    return 'bg-gray-200'; // Future
  };

  // Get icon for stage
  const getStageIcon = (index: number) => {
    if (index < currentStageIndex) {
      return <CheckCircle className="w-6 h-6 text-success-500" />;
    } else if (index === currentStageIndex) {
      return <Clock className="w-6 h-6 text-primary-500" />;
    } else {
      return <Circle className="w-6 h-6 text-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Legislative Timeline</h2>
      
      {/* Bill Introduction */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Calendar className="w-5 h-5 text-primary-500" />
          <h3 className="font-medium text-gray-900">Bill Introduction</h3>
        </div>
        <p className="text-gray-700 mb-3">
          {bill.bill_type} {bill.number} was introduced on {formatDate(bill.introduced_date)} in the {bill.bill_type.startsWith('H') ? 'House' : 'Senate'}.
        </p>
        {bill.sponsors && bill.sponsors.length > 0 && (
          <p className="text-gray-600 text-sm">
            Introduced by: {bill.sponsors[0].full_name} ({bill.sponsors[0].party}-{bill.sponsors[0].state})
            {bill.cosponsors_count > 0 && ` with ${bill.cosponsors_count} cosponsor${bill.cosponsors_count !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>
      
      {/* Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="relative">
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          {stages.map((stage, index) => (
            <div key={stage.id} className="relative mb-8 last:mb-0">
              <div className="flex items-start">
                {/* Stage Icon */}
                <div className="absolute left-0 mt-1">
                  {getStageIcon(index)}
                </div>
                
                {/* Stage Content */}
                <div className="ml-10">
                  <h4 className={`font-medium ${getStatusColor(index)}`}>
                    {stage.label}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                  
                  {/* Current Stage Details */}
                  {index === currentStageIndex && (
                    <div className="mt-2 bg-primary-50 rounded-lg p-3 border border-primary-100">
                      <p className="text-primary-700 text-sm">
                        <strong>Current Status:</strong> {bill.latest_action?.text || 'No recent action'}
                      </p>
                      {bill.latest_action?.date && (
                        <p className="text-primary-600 text-xs mt-1">
                          {formatDate(bill.latest_action.date)}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Completed Stage */}
                  {index < currentStageIndex && (
                    <div className="mt-2 bg-success-50 rounded-lg p-2 border border-success-100">
                      <p className="text-success-700 text-xs">Completed</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div className={`absolute left-3 top-6 bottom-0 w-0.5 ${getLineColor(index)}`}></div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Prediction Info */}
      {bill.ai_analysis?.passagePrediction && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">AI Predictions</h3>
          
          {bill.ai_analysis.passagePrediction.probability !== undefined && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Probability of Passage</span>
                <span className="text-sm font-medium text-primary-600">
                  {Math.round(bill.ai_analysis.passagePrediction.probability * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500" 
                  style={{ width: `${bill.ai_analysis.passagePrediction.probability * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {bill.ai_analysis.passagePrediction.timeline && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Estimated Timeline</h4>
              <p className="text-gray-600 text-sm">{bill.ai_analysis.passagePrediction.timeline}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Latest Action */}
      {bill.latest_action?.text && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-2">Latest Action</h3>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-700">{bill.latest_action.text}</p>
            {bill.latest_action.date && (
              <p className="text-xs text-gray-500 mt-1">{formatDate(bill.latest_action.date)}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 mb-1">Timeline Disclaimer</h3>
            <p className="text-yellow-700 text-sm">
              This timeline is a simplified representation of the legislative process. The actual journey of a bill can be more complex and may include additional steps or variations depending on procedural decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};