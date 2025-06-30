import React from 'react';
import { CheckCircle, Circle, Clock, AlertTriangle } from 'lucide-react';
import type { Bill } from '../../types';

interface BillProgressProps {
  bill: Bill;
}

export const BillProgress: React.FC<BillProgressProps> = ({ bill }) => {
  // Define the stages a bill goes through
  const stages = [
    { id: 'introduced', label: 'Introduced' },
    { id: 'committee', label: 'Committee' },
    { id: 'floor', label: 'Floor Vote' },
    { id: 'otherChamber', label: 'Other Chamber' },
    { id: 'conference', label: 'Conference' },
    { id: 'president', label: 'President' },
    { id: 'law', label: 'Law' }
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

  // Get estimated completion date based on AI analysis
  const getEstimatedDate = () => {
    if (bill.ai_analysis?.passagePrediction?.timeline) {
      return bill.ai_analysis.passagePrediction.timeline;
    }
    return 'Unknown';
  };

  // Get passage probability
  const getPassageProbability = () => {
    if (bill.ai_analysis?.passagePrediction?.probability !== undefined) {
      return `${Math.round(bill.ai_analysis.passagePrediction.probability * 100)}%`;
    }
    return 'Unknown';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Bill Progress</h3>
      
      {/* Timeline */}
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
                
                {/* Current Stage Details */}
                {index === currentStageIndex && (
                  <div className="mt-2 text-sm">
                    <p className="text-gray-600">
                      {bill.latest_action?.text || 'No recent action'}
                    </p>
                    {bill.latest_action?.date && (
                      <p className="text-gray-500 mt-1">
                        {formatDate(bill.latest_action.date)}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Completed Stage */}
                {index < currentStageIndex && (
                  <p className="text-sm text-gray-500 mt-1">Completed</p>
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
      
      {/* Prediction Info */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-start space-x-6">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Estimated Timeline</h4>
            <p className="text-sm text-gray-600">{getEstimatedDate()}</p>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Passage Probability</h4>
            <div className="flex items-center">
              <div className="w-16 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500" 
                  style={{ 
                    width: bill.ai_analysis?.passagePrediction?.probability 
                      ? `${bill.ai_analysis.passagePrediction.probability * 100}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
              <span className="ml-2 text-sm text-gray-600">{getPassageProbability()}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Latest Action */}
      {bill.latest_action?.text && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Latest Action</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700">{bill.latest_action.text}</p>
            {bill.latest_action.date && (
              <p className="text-xs text-gray-500 mt-1">{formatDate(bill.latest_action.date)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};