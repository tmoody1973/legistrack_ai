import React, { useState } from 'react';
import { Tag, Loader2, CheckCircle, AlertCircle, RefreshCw, Database, Search } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { aiTaggingService } from '../../services/aiTaggingService';
import { billService } from '../../services/billService';
import { supabase } from '../../lib/supabase';
import type { Bill, BillTag } from '../../types';

export const TaggingDebugPanel: React.FC = () => {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [billId, setBillId] = useState('');
  const [billSearchLoading, setBillSearchLoading] = useState(false);
  const [billSearchResult, setBillSearchResult] = useState<Bill | null>(null);
  const [billTags, setBillTags] = useState<BillTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [processingAllBills, setProcessingAllBills] = useState(false);
  const [allBillsResult, setAllBillsResult] = useState<any>(null);

  const handleProcessBill = async () => {
    if (!billSearchResult) {
      alert('Please search for a bill first');
      return;
    }

    try {
      setProcessing(true);
      setResult(null);
      
      // Generate tags for the bill
      const tags = await aiTaggingService.generateTagsForBill(billSearchResult);
      
      // Save tags to database
      const success = await aiTaggingService.saveTagsForBill(billSearchResult.id, tags);
      
      setResult({
        success,
        tags,
        message: success 
          ? `Successfully generated and saved ${tags.length} tags for bill ${billSearchResult.id}` 
          : 'Failed to save tags to database'
      });
      
      // Refresh tags
      fetchBillTags(billSearchResult.id);
    } catch (error) {
      console.error('Error processing bill:', error);
      setResult({
        success: false,
        message: `Error processing bill: ${error.message}`
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessAllBills = async () => {
    try {
      setProcessingAllBills(true);
      setAllBillsResult(null);
      
      // Process all bills
      const result = await aiTaggingService.processAllBills(20, true);
      
      setAllBillsResult(result);
    } catch (error) {
      console.error('Error processing all bills:', error);
      setAllBillsResult({
        success: false,
        message: `Error processing all bills: ${error.message}`
      });
    } finally {
      setProcessingAllBills(false);
    }
  };

  const handleBillSearch = async () => {
    if (!billId) return;
    
    try {
      setBillSearchLoading(true);
      setBillSearchResult(null);
      setBillTags([]);
      
      // Get bill from database
      const bill = await billService.getBillWithAutoFetch(billId);
      
      if (bill) {
        setBillSearchResult(bill);
        fetchBillTags(bill.id);
      } else {
        alert('Bill not found');
      }
    } catch (error) {
      console.error('Error searching for bill:', error);
      alert(`Error searching for bill: ${error.message}`);
    } finally {
      setBillSearchLoading(false);
    }
  };

  const fetchBillTags = async (billId: string) => {
    try {
      setTagsLoading(true);
      
      // Get tags for the bill
      const tags = await aiTaggingService.getTagsForBill(billId);
      setBillTags(tags);
    } catch (error) {
      console.error('Error fetching bill tags:', error);
    } finally {
      setTagsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Tag className="w-5 h-5 mr-2 text-primary-500" />
            AI Tagging Debug Panel
          </h2>
          <p className="text-gray-600">Test and debug the AI-powered bill tagging system</p>
        </div>
      </div>
      
      {/* Bill Search */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-3">Search for a Bill</h3>
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Enter bill ID (e.g., 118-HR-1234)"
              value={billId}
              onChange={(e) => setBillId(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleBillSearch}
            disabled={billSearchLoading || !billId}
          >
            {billSearchLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Bill Search Result */}
        {billSearchResult && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-1">{billSearchResult.bill_type} {billSearchResult.number}: {billSearchResult.short_title || billSearchResult.title}</h4>
            <p className="text-sm text-gray-600 mb-2">{billSearchResult.summary?.substring(0, 200)}...</p>
            <div className="flex justify-end">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleProcessBill}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Tag className="w-4 h-4 mr-2" />
                    Generate Tags
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Bill Tags */}
      {billTags.length > 0 && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Bill Tags</h3>
            {tagsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          <div className="space-y-2">
            {billTags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                <div>
                  <span className="font-medium text-gray-900">{tag.name}</span>
                  <span className="ml-2 text-xs text-gray-500">({tag.type})</span>
                </div>
                <div className="flex items-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    tag.confidence_score >= 80 ? 'bg-green-100 text-green-700' :
                    tag.confidence_score >= 60 ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {tag.confidence_score}%
                  </span>
                  <span className="ml-2 text-xs text-gray-500">{tag.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Process Result */}
      {result && (
        <div className={`mb-6 p-4 rounded-lg border ${
          result.success ? 'bg-success-50 border-success-200' : 'bg-error-50 border-error-200'
        }`}>
          <div className="flex items-start">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-success-500 mr-2 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-error-500 mr-2 mt-0.5" />
            )}
            <div>
              <p className={result.success ? 'text-success-700' : 'text-error-700'}>
                {result.message}
              </p>
              {result.tags && result.tags.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-1">Generated Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.tags.map((tag: any, index: number) => (
                      <span key={index} className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                        {tag.name} ({tag.confidence_score}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Process All Bills */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Process All Bills</h3>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleProcessAllBills}
            disabled={processingAllBills}
          >
            {processingAllBills ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Process 20 Bills
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          This will process up to 20 bills that don't have tags yet, generating and saving AI-powered tags for each bill.
        </p>
        
        {/* All Bills Result */}
        {allBillsResult && (
          <div className={`p-3 rounded-lg border ${
            allBillsResult.success ? 'bg-success-50 border-success-200' : 'bg-error-50 border-error-200'
          }`}>
            <div className="flex items-start">
              {allBillsResult.success ? (
                <CheckCircle className="w-5 h-5 text-success-500 mr-2 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-error-500 mr-2 mt-0.5" />
              )}
              <div>
                <p className={allBillsResult.success ? 'text-success-700' : 'text-error-700'}>
                  {allBillsResult.message}
                </p>
                {allBillsResult.success && (
                  <p className="text-sm text-gray-700 mt-1">
                    Processed: {allBillsResult.processed}, Failed: {allBillsResult.failed}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* About AI Tagging */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">About AI Tagging</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>AI-Powered Analysis</strong>: Uses OpenAI or Gemini to analyze bill content</li>
          <li>• <strong>Subject Matching</strong>: Matches bill content against standardized subject taxonomy</li>
          <li>• <strong>Confidence Scoring</strong>: Assigns confidence scores (0-100%) to each tag</li>
          <li>• <strong>User Feedback</strong>: Allows users to rate tag accuracy to improve the system</li>
          <li>• <strong>Personalized Recommendations</strong>: Uses tags to match bills with user interests</li>
          <li>• <strong>Boolean Logic</strong>: Supports matching all interests (AND) or any interest (OR)</li>
          <li>• <strong>Fallback Mechanism</strong>: Uses existing subjects and policy areas when AI is unavailable</li>
        </ul>
      </div>
    </div>
  );
};