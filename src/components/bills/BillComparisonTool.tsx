import React, { useState, useEffect } from 'react';
import { FileText, X, Plus, ArrowLeft, ArrowRight, Download, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { openaiService } from '../../services/openaiService';
import type { Bill } from '../../types';

interface BillComparisonToolProps {
  initialBills?: Bill[];
  onClose?: () => void;
}

export const BillComparisonTool: React.FC<BillComparisonToolProps> = ({ 
  initialBills = [],
  onClose
}) => {
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [selectedAspect, setSelectedAspect] = useState<'summary' | 'provisions' | 'sponsors' | 'timeline' | 'analysis'>('summary');
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if OpenAI API is available
  const isOpenAIAvailable = openaiService.isAvailable();

  // Generate comparison when bills change
  useEffect(() => {
    if (bills.length >= 2 && isOpenAIAvailable) {
      generateComparison();
    }
  }, [bills]);

  const handleRemoveBill = (billId: string) => {
    setBills(bills.filter(bill => bill.id !== billId));
    
    // Clear comparison if fewer than 2 bills
    if (bills.length <= 2) {
      setComparison(null);
    }
  };

  const handleAddBill = () => {
    // In a real implementation, this would open a bill search modal
    console.log('Add bill to comparison');
  };

  const generateComparison = async () => {
    if (bills.length < 2 || !isOpenAIAvailable) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await openaiService.generateBillComparison(bills);
      setComparison(result);
    } catch (err) {
      console.error('Error generating bill comparison:', err);
      setError(err.message || 'Failed to generate comparison. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Bill Comparison Tool</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Bills Selection */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900 mb-3">Selected Bills</h3>
        <div className="flex flex-wrap gap-3">
          {bills.map(bill => (
            <div 
              key={bill.id}
              className="flex items-center bg-gray-100 rounded-lg px-3 py-2"
            >
              <FileText className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium text-gray-700 mr-2">
                {bill.bill_type} {bill.number}
              </span>
              <button 
                onClick={() => handleRemoveBill(bill.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {bills.length < 3 && (
            <button 
              onClick={handleAddBill}
              className="flex items-center bg-primary-50 text-primary-600 rounded-lg px-3 py-2 hover:bg-primary-100"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Add Bill</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Comparison Aspects */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900 mb-3">Compare By</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAspect('summary')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              selectedAspect === 'summary'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setSelectedAspect('provisions')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              selectedAspect === 'provisions'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Key Provisions
          </button>
          <button
            onClick={() => setSelectedAspect('sponsors')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              selectedAspect === 'sponsors'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sponsors
          </button>
          <button
            onClick={() => setSelectedAspect('timeline')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              selectedAspect === 'timeline'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setSelectedAspect('analysis')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              selectedAspect === 'analysis'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            AI Analysis
          </button>
        </div>
      </div>
      
      {/* Comparison Content */}
      <div className="p-4">
        {bills.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Bills Selected</h3>
            <p className="text-gray-600 mb-4">Add bills to compare their details side by side.</p>
            <Button onClick={handleAddBill}>
              <Plus className="w-4 h-4 mr-2" />
              Add Bill
            </Button>
          </div>
        ) : bills.length === 1 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Add Another Bill</h3>
            <p className="text-gray-600 mb-4">Select at least one more bill to compare.</p>
            <Button onClick={handleAddBill}>
              <Plus className="w-4 h-4 mr-2" />
              Add Bill
            </Button>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Comparison</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Our AI is analyzing the bills to provide a detailed comparison of their similarities, differences, and relative merits.
            </p>
          </div>
        ) : error ? (
          <div className="bg-error-50 rounded-lg p-4 border border-error-200 mb-4">
            <div className="flex items-start">
              <X className="w-5 h-5 text-error-500 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-error-800 mb-1">Error Generating Comparison</h4>
                <p className="text-error-700 text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generateComparison} 
                  className="mt-3"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        ) : comparison ? (
          <div>
            {/* AI-Generated Comparison */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">AI-Generated Comparison</h3>
              
              {/* Common Goal */}
              {comparison.commonGoal && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-4">
                  <h4 className="font-medium text-blue-800 mb-1">Common Goal</h4>
                  <p className="text-blue-700">{comparison.commonGoal}</p>
                </div>
              )}
              
              {/* Key Differences */}
              {comparison.keyDifferences && comparison.keyDifferences.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Key Differences</h4>
                  <ul className="space-y-2">
                    {comparison.keyDifferences.map((difference, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium mr-2 flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{difference}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Approach Comparison */}
              {comparison.approachComparison && (
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {bills.map((bill, index) => {
                    const billKey = `bill${index + 1}`;
                    return comparison.approachComparison[billKey] ? (
                      <div key={bill.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {bill.bill_type} {bill.number} Approach
                        </h4>
                        <p className="text-gray-700">{comparison.approachComparison[billKey]}</p>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              
              {/* Strengths and Weaknesses */}
              {comparison.strengthsAndWeaknesses && (
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {bills.map((bill, index) => {
                    const billKey = `bill${index + 1}`;
                    const strengths = comparison.strengthsAndWeaknesses[billKey]?.strengths;
                    const weaknesses = comparison.strengthsAndWeaknesses[billKey]?.weaknesses;
                    
                    return (strengths || weaknesses) ? (
                      <div key={bill.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 className="font-medium text-gray-900 mb-3">
                          {bill.bill_type} {bill.number} Strengths & Weaknesses
                        </h4>
                        
                        {strengths && strengths.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium text-green-700 mb-1">Strengths</h5>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                              {strengths.map((strength, i) => (
                                <li key={i}>{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {weaknesses && weaknesses.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-red-700 mb-1">Weaknesses</h5>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                              {weaknesses.map((weakness, i) => (
                                <li key={i}>{weakness}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              
              {/* Recommendation */}
              {comparison.recommendation && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <h4 className="font-medium text-green-800 mb-1">Recommendation</h4>
                  <p className="text-green-700">{comparison.recommendation}</p>
                </div>
              )}
            </div>
            
            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-3 bg-gray-50 border-b border-gray-200 w-1/4">Aspect</th>
                    {bills.map(bill => (
                      <th key={bill.id} className="text-left p-3 bg-gray-50 border-b border-gray-200">
                        {bill.bill_type} {bill.number}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Basic Info */}
                  <tr>
                    <td className="p-3 border-b border-gray-200 font-medium">Title</td>
                    {bills.map(bill => (
                      <td key={bill.id} className="p-3 border-b border-gray-200">
                        {bill.short_title || bill.title}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 border-b border-gray-200 font-medium">Introduced</td>
                    {bills.map(bill => (
                      <td key={bill.id} className="p-3 border-b border-gray-200">
                        {formatDate(bill.introduced_date)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 border-b border-gray-200 font-medium">Status</td>
                    {bills.map(bill => (
                      <td key={bill.id} className="p-3 border-b border-gray-200">
                        {bill.status || 'Unknown'}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Dynamic Content Based on Selected Aspect */}
                  {selectedAspect === 'summary' && (
                    <tr>
                      <td className="p-3 border-b border-gray-200 font-medium">Summary</td>
                      {bills.map(bill => (
                        <td key={bill.id} className="p-3 border-b border-gray-200">
                          {bill.summary || 'No summary available'}
                        </td>
                      ))}
                    </tr>
                  )}
                  
                  {selectedAspect === 'provisions' && (
                    <tr>
                      <td className="p-3 border-b border-gray-200 font-medium">Key Provisions</td>
                      {bills.map(bill => (
                        <td key={bill.id} className="p-3 border-b border-gray-200">
                          {bill.ai_analysis?.keyProvisions && bill.ai_analysis.keyProvisions.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {bill.ai_analysis.keyProvisions.map((provision, index) => (
                                <li key={index} className="text-sm">{provision}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-gray-500 italic">No key provisions available</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                  
                  {selectedAspect === 'sponsors' && (
                    <>
                      <tr>
                        <td className="p-3 border-b border-gray-200 font-medium">Primary Sponsor</td>
                        {bills.map(bill => (
                          <td key={bill.id} className="p-3 border-b border-gray-200">
                            {bill.sponsors && bill.sponsors.length > 0 ? (
                              <div>
                                <p>{bill.sponsors[0].full_name}</p>
                                <p className="text-sm text-gray-500">
                                  {bill.sponsors[0].party}-{bill.sponsors[0].state}
                                  {bill.sponsors[0].district && ` (District ${bill.sponsors[0].district})`}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">No sponsor information</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3 border-b border-gray-200 font-medium">Cosponsors</td>
                        {bills.map(bill => (
                          <td key={bill.id} className="p-3 border-b border-gray-200">
                            {bill.cosponsors_count > 0 ? (
                              <span>{bill.cosponsors_count} cosponsor{bill.cosponsors_count !== 1 ? 's' : ''}</span>
                            ) : (
                              <span className="text-gray-500 italic">No cosponsors</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                  
                  {selectedAspect === 'timeline' && (
                    <tr>
                      <td className="p-3 border-b border-gray-200 font-medium">Latest Action</td>
                      {bills.map(bill => (
                        <td key={bill.id} className="p-3 border-b border-gray-200">
                          {bill.latest_action?.text ? (
                            <div>
                              <p>{bill.latest_action.text}</p>
                              {bill.latest_action.date && (
                                <p className="text-sm text-gray-500 mt-1">{formatDate(bill.latest_action.date)}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">No action information</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                  
                  {selectedAspect === 'analysis' && (
                    <>
                      <tr>
                        <td className="p-3 border-b border-gray-200 font-medium">Passage Probability</td>
                        {bills.map(bill => (
                          <td key={bill.id} className="p-3 border-b border-gray-200">
                            {bill.ai_analysis?.passagePrediction?.probability !== undefined ? (
                              <div>
                                <span className="font-medium text-primary-600">
                                  {Math.round(bill.ai_analysis.passagePrediction.probability * 100)}%
                                </span>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                                  <div 
                                    className="h-full bg-primary-500" 
                                    style={{ width: `${bill.ai_analysis.passagePrediction.probability * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">No prediction available</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3 border-b border-gray-200 font-medium">Impact Assessment</td>
                        {bills.map(bill => (
                          <td key={bill.id} className="p-3 border-b border-gray-200">
                            {bill.ai_analysis?.impactAssessment ? (
                              <div className="space-y-2">
                                {bill.ai_analysis.impactAssessment.economic && (
                                  <p className="text-sm"><strong>Economic:</strong> {bill.ai_analysis.impactAssessment.economic}</p>
                                )}
                                {bill.ai_analysis.impactAssessment.social && (
                                  <p className="text-sm"><strong>Social:</strong> {bill.ai_analysis.impactAssessment.social}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">No impact assessment available</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Actions */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={onClose}>
                Close Comparison
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Comparison
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Compare</h3>
            <p className="text-gray-600 mb-4">
              {isOpenAIAvailable 
                ? "Click the button below to generate an AI-powered comparison of these bills."
                : "AI-powered comparison requires a valid OpenAI API key to be configured."}
            </p>
            {isOpenAIAvailable && (
              <Button onClick={generateComparison}>
                Generate Comparison
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};