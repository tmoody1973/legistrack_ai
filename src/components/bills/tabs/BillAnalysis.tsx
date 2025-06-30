import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Bookmark, FileText, Loader2, RefreshCw, Globe } from 'lucide-react';
import { Button } from '../../common/Button';
import { openaiService } from '../../../services/openaiService';
import type { Bill } from '../../../types';

interface BillAnalysisProps {
  bill: Bill;
  onTrackBill?: () => void;
  isTracked?: boolean;
}

export const BillAnalysis: React.FC<BillAnalysisProps> = ({ 
  bill,
  onTrackBill,
  isTracked = false
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingWithSearch, setIsGeneratingWithSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState(bill.ai_analysis);

  // Check if OpenAI API is available
  const isOpenAIAvailable = openaiService.isAvailable();

  // Generate analysis if not available
  const handleGenerateAnalysis = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const generatedAnalysis = await openaiService.generateBillAnalysis(bill);
      setAnalysis(generatedAnalysis);
    } catch (err) {
      console.error('Error generating analysis:', err);
      setError(err.message || 'Failed to generate analysis. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate analysis with web search
  const handleGenerateAnalysisWithSearch = async () => {
    try {
      setIsGeneratingWithSearch(true);
      setError(null);
      
      const generatedAnalysis = await openaiService.generateBillAnalysisWithWebSearch(bill);
      setAnalysis(generatedAnalysis);
    } catch (err) {
      console.error('Error generating analysis with web search:', err);
      setError(err.message || 'Failed to generate analysis with web search. Please try again.');
    } finally {
      setIsGeneratingWithSearch(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">AI-Powered Analysis</h2>
        
        {isOpenAIAvailable && (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateAnalysis}
              disabled={isGenerating || isGeneratingWithSearch}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Analysis
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateAnalysisWithSearch}
              disabled={isGenerating || isGeneratingWithSearch}
            >
              {isGeneratingWithSearch ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching Web...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Web Search Analysis
                </>
              )}
            </Button>
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-error-50 rounded-lg p-4 border border-error-200">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-error-500 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-error-800 mb-1">Analysis Error</h4>
              <p className="text-error-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {isGenerating || isGeneratingWithSearch ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isGeneratingWithSearch ? 'Generating AI Analysis with Web Search' : 'Generating AI Analysis'}
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {isGeneratingWithSearch 
              ? 'Our AI is searching the web and analyzing this bill to provide insights on its key provisions, potential impact, and passage probability.'
              : 'Our AI is analyzing this bill to provide insights on its key provisions, potential impact, and passage probability.'}
          </p>
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          {/* Web Search Info */}
          {analysis.webSearchSummary && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <div className="flex items-start">
                <Globe className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">Web Search Enhanced Analysis</h4>
                  <p className="text-blue-700">{analysis.webSearchSummary}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* AI Summary */}
          {analysis.summary && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-2">AI Summary</h3>
              <p className="text-gray-700">{analysis.summary}</p>
              {analysis.generated_at && (
                <p className="text-xs text-gray-500 mt-2">
                  Analysis generated on {new Date(analysis.generated_at).toLocaleDateString()} at {new Date(analysis.generated_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
          
          {/* Key Provisions */}
          {analysis.keyProvisions && analysis.keyProvisions.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Key Provisions</h3>
              <ul className="space-y-2">
                {analysis.keyProvisions.map((provision, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium mr-3 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{provision}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Impact Assessment */}
          {analysis.impactAssessment && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Impact Assessment</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {analysis.impactAssessment.economic && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-1">Economic Impact</h4>
                    <p className="text-blue-700 text-sm">{analysis.impactAssessment.economic}</p>
                  </div>
                )}
                {analysis.impactAssessment.social && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <h4 className="font-medium text-green-800 mb-1">Social Impact</h4>
                    <p className="text-green-700 text-sm">{analysis.impactAssessment.social}</p>
                  </div>
                )}
                {analysis.impactAssessment.regional && (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <h4 className="font-medium text-purple-800 mb-1">Regional Impact</h4>
                    <p className="text-purple-700 text-sm">{analysis.impactAssessment.regional}</p>
                  </div>
                )}
                {analysis.impactAssessment.demographic && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                    <h4 className="font-medium text-orange-800 mb-1">Demographic Impact</h4>
                    <p className="text-orange-700 text-sm">{analysis.impactAssessment.demographic}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Passage Prediction */}
          {analysis.passagePrediction && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Passage Prediction</h3>
              
              {analysis.passagePrediction.probability !== undefined && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Probability of Passage</span>
                    <span className="text-sm font-medium text-primary-600">
                      {Math.round(analysis.passagePrediction.probability * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-500" 
                      style={{ width: `${analysis.passagePrediction.probability * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {analysis.passagePrediction.reasoning && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Reasoning</h4>
                  <p className="text-gray-600 text-sm">{analysis.passagePrediction.reasoning}</p>
                </div>
              )}
              
              {analysis.passagePrediction.keyFactors && analysis.passagePrediction.keyFactors.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Key Factors</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {analysis.passagePrediction.keyFactors.map((factor, index) => (
                      <li key={index}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysis.passagePrediction.timeline && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Estimated Timeline</h4>
                  <p className="text-gray-600 text-sm">{analysis.passagePrediction.timeline}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Analysis Disclaimer */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-gray-500 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Analysis Disclaimer</h4>
                <p className="text-gray-600 text-sm">
                  This analysis is generated by OpenAI GPT-4o AI and should be used as a general guide only. It is based on historical data, current political climate, and bill content. Actual outcomes may vary.
                  {analysis.webSearchSummary ? ' This analysis includes data from web search to provide the most up-to-date information.' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">AI Analysis Not Available</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            AI-powered analysis is not available for this bill yet. You can generate an analysis using OpenAI GPT-4o.
          </p>
          {isOpenAIAvailable ? (
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button onClick={handleGenerateAnalysis} disabled={isGenerating || isGeneratingWithSearch}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Analysis...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate AI Analysis
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleGenerateAnalysisWithSearch} 
                disabled={isGenerating || isGeneratingWithSearch}
                variant="outline"
              >
                {isGeneratingWithSearch ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching Web...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Analysis with Web Search
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {!isTracked && (
                <Button onClick={onTrackBill}>
                  <Bookmark className="w-4 h-4 mr-2" />
                  Track Bill to Generate Analysis
                </Button>
              )}
              <p className="text-sm text-gray-500 mt-4">
                Note: AI analysis requires a valid OpenAI API key to be configured.
              </p>
            </>
          )}
        </div>
      )}
      
      {/* Compare with Other Bills */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mt-6">
        <h3 className="font-medium text-gray-900 mb-3">Compare with Other Bills</h3>
        <p className="text-gray-600 mb-3">
          Compare this bill with other similar legislation to understand different approaches to the same issue.
        </p>
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Add to Comparison Tool
        </Button>
      </div>
    </div>
  );
};