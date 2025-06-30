import React from 'react';
import { AIChatInterface } from '../../chat/AIChatInterface';
import { MessageSquare, AlertTriangle } from 'lucide-react';
import type { Bill } from '../../../types';

interface BillChatProps {
  bill: Bill;
}

export const BillChat: React.FC<BillChatProps> = ({ bill }) => {
  // Initial suggested questions based on bill data
  const initialSuggestions = [
    `What are the key provisions of ${bill.bill_type} ${bill.number}?`,
    `Who sponsored ${bill.bill_type} ${bill.number}?`,
    `What's the current status of ${bill.bill_type} ${bill.number}?`,
    `How likely is ${bill.bill_type} ${bill.number} to pass?`,
    `How would ${bill.bill_type} ${bill.number} affect me?`
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-primary-500" />
          AI Legislative Assistant
        </h2>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 mb-1">About AI Chat</h3>
            <p className="text-blue-700 text-sm">
              This AI assistant can answer questions about {bill.bill_type} {bill.number} and help you understand its provisions, status, and potential impact. Powered by Google Gemini 2.5 Flash, it provides informative responses based on the bill's content and legislative data.
            </p>
          </div>
        </div>
      </div>
      
      <AIChatInterface bill={bill} suggestedQuestions={initialSuggestions} />
      
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-gray-500 mr-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-700 mb-1">AI Assistant Disclaimer</h4>
            <p className="text-gray-600 text-sm">
              This AI assistant provides information based on the bill's content and publicly available data. While it strives for accuracy, it may occasionally provide incomplete or incorrect information. Always verify important information with official sources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};