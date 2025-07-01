import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { TrendingUp, Users, MapPin, AlertCircle, Edit2, Loader2, Globe, CheckCircle, Clock, BookOpen, FileText, Calendar, RefreshCw, BarChart3, MessageSquare, Share2, ExternalLink, Volume2, Tag } from 'lucide-react';
import { Button } from '../../common/Button';
import { openaiService } from '../../../services/openaiService';
import { billSummaryService } from '../../../services/billSummaryService';
import { PersonalizedImpact } from '../../dashboard/PersonalizedImpact';
import type { Bill } from '../../../types';

interface BillOverviewProps {
  bill: Bill;
  onTrackBill?: () => void;
  isTracked?: boolean;
  trackingLoading?: boolean;
  onUpdateBill?: (updatedBill: Bill) => void; // New prop for updating bill data
}

export const BillOverview: React.FC<BillOverviewProps> = ({ 
  bill, 
  onTrackBill,
  isTracked = false,
  trackingLoading = false,
  onUpdateBill // New prop
}) => {
  const { authState } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [relatedBills, setRelatedBills] = useState<Bill[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [showNotesForm, setShowNotesForm] = useState(false);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<any | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisChecked, setAnalysisChecked] = useState(false);
  const [podcastOverview, setPodcastOverview] = useState<string | null>(null); // NEW: State for podcast overview
  const [generatingPodcast, setGeneratingPodcast] = useState(false); // NEW: State for podcast generation loading

  useEffect(() => {
    fetchBillSubjects();
    loadRelatedBills();
    
    // Reset analysis state when bill changes
    setComprehensiveAnalysis(null);
    setAnalysisError(null);
    setAnalysisChecked(false);
    
    // Try to get comprehensive analysis if it exists
    fetchComprehensiveAnalysis();

    // NEW: Fetch podcast overview
    fetchPodcastOverview();
  }, [bill.id]);

  const fetchBillSubjects = async () => {
    try {
      setLoadingSubjects(true);
      
      // Fetch subjects from database
      const { data, error } = await supabase
        .from('bill_subjects')
        .select('*')
        .limit(20);
      
      if (error) throw error;
      
      setSubjects(data || []);
    } catch (err) {
      console.error('Error fetching bill subjects:', err);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchComprehensiveAnalysis = async () => {
    try {
      setLoadingAnalysis(true);
      
      // First check if we have the analysis in local storage
      const storageKey = `bill-analysis-${bill.id}`;
      const storedAnalysis = localStorage.getItem(storageKey);
      
      if (storedAnalysis) {
        try {
          const parsedAnalysis = JSON.parse(storedAnalysis);
          setComprehensiveAnalysis(parsedAnalysis);
          setAnalysisId(`comprehensive-analysis-${bill.id}`);
          console.log('✅ Loaded comprehensive analysis from local storage');
          setAnalysisChecked(true);
          setLoadingAnalysis(false);
          return;
        } catch (parseError) {
          console.warn('Error parsing stored analysis, fetching from database:', parseError);
          // Continue to fetch from database if parsing fails
        }
      }
      
      // Try to get from database
      const analysis = await openaiService.getComprehensiveAnalysis(bill.id);
      
      if (analysis) {
        setComprehensiveAnalysis(analysis);
        setAnalysisId(`comprehensive-analysis-${bill.id}`);
        
        // Store in local storage for future sessions
        localStorage.setItem(storageKey, JSON.stringify(analysis));
        console.log('✅ Loaded comprehensive analysis from database and cached locally');
      } else {
        // If no analysis exists, auto-generate it
        generateComprehensiveAnalysis();
      }
      
      // Mark that we've checked for analysis
      setAnalysisChecked(true);
    } catch (error) {
      console.error('❌ Error fetching comprehensive analysis:', error);
      setAnalysisChecked(true);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // NEW: Fetch podcast overview
  const fetchPodcastOverview = async () => {
    try {
      if (bill.podcast_overview) {
        setPodcastOverview(bill.podcast_overview);
        console.log('✅ Loaded podcast overview from bill data');
        return;
      }
      
      // If not in bill data, try to fetch from database
      const { data, error } = await supabase
        .from('bills')
        .select('podcast_overview')
        .eq('id', bill.id)
        .single();
        
      if (error) {
        console.warn('Error fetching podcast overview:', error);
        return;
      }
      
      if (data && data.podcast_overview) {
        setPodcastOverview(data.podcast_overview);
        
        // Update the bill object with the podcast overview
        if (onUpdateBill) {
          onUpdateBill({
            ...bill,
            podcast_overview: data.podcast_overview
          });
        }
        
        console.log('✅ Loaded podcast overview from database');
      }
    } catch (error) {
      console.error('❌ Error fetching podcast overview:', error);
      // Don't set error state for this, just log the warning
    }
  };

  const generateComprehensiveAnalysis = async () => {
    // Only generate if OpenAI is available
    if (!openaiService.isAvailable()) {
      console.log('OpenAI not available, skipping comprehensive analysis generation');
      return;
    }
    
    try {
      setGeneratingAnalysis(true);
      setAnalysisError(null);
      
      // Generate comprehensive analysis
      const analysis = await openaiService.generateComprehensiveAnalysis(bill);
      setComprehensiveAnalysis(analysis);
      setAnalysisId(`comprehensive-analysis-${bill.id}`);
      
      // Store in local storage for future sessions
      const storageKey = `bill-analysis-${bill.id}`;
      localStorage.setItem(storageKey, JSON.stringify(analysis));
      console.log('✅ Generated and cached comprehensive analysis locally');
      
    } catch (error) {
      console.error('❌ Error generating comprehensive analysis:', error);
      
      // Handle specific error types
      let errorMessage = 'Failed to generate comprehensive analysis. Please try again later.';
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('429') || errorText.includes('quota') || errorText.includes('exceeded')) {
          errorMessage = 'AI analysis generation is temporarily unavailable due to daily usage limits. Please try again tomorrow or consider upgrading your API plan for higher limits.';
        } else if (errorText.includes('401') || errorText.includes('unauthorized')) {
          errorMessage = 'AI service configuration error. Please contact support.';
        } else if (errorText.includes('network') || errorText.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (errorText.includes('source_id')) {
          errorMessage = 'Database schema error. The generated_content table is missing required columns. Please run the latest migrations.';
        }
      }
      
      setAnalysisError(errorMessage);
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  // NEW: Handle manual podcast overview generation
  const handleGeneratePodcastOverview = async () => {
    if (!openaiService.isAvailable()) {
      alert('OpenAI API is not available. Please configure your API key.');
      return;
    }
    if (!comprehensiveAnalysis) {
      alert('Comprehensive analysis is required to generate a podcast overview. Please generate it first.');
      return;
    }

    try {
      setGeneratingPodcast(true);
      const overview = await openaiService.generatePodcastOverview(bill);
      setPodcastOverview(overview);
      
      // Update the bill object with the podcast overview
      if (onUpdateBill) {
        onUpdateBill({
          ...bill,
          podcast_overview: overview
        });
      }
      
      alert('Podcast overview generated successfully!');
    } catch (error) {
      console.error('Error generating podcast overview:', error);
      alert(`Failed to generate podcast overview: ${error.message}`);
    } finally {
      setGeneratingPodcast(false);
    }
  };

  const loadRelatedBills = async () => {
    try {
      setLoadingRelated(true);
      
      // Find related bills based on subjects or policy area
      let searchParams: any = {};
      
      if (bill.policy_area) {
        searchParams.policy_area = bill.policy_area;
      } else if (bill.subjects && bill.subjects.length > 0) {
        searchParams.subjects = [bill.subjects[0]]; // Use first subject
      }
      
      if (Object.keys(searchParams).length > 0) {
        // Fetch related bills from database
        const { data, error } = await supabase
          .from('bills')
          .select('*')
          .neq('id', bill.id)
          .limit(5);
        
        if (error) throw error;
        
        // Filter out the current bill
        setRelatedBills(data || []);
      }
    } catch (error) {
      console.error('Error loading related bills:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Comprehensive Analysis Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-primary-500" />
            Comprehensive Analysis
          </h2>
          {!comprehensiveAnalysis && !generatingAnalysis && !loadingAnalysis && analysisChecked && (
            <Button 
              onClick={generateComprehensiveAnalysis}
              variant="outline"
              size="sm"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate Analysis
            </Button>
          )}
        </div>

        {loadingAnalysis || generatingAnalysis ? (
          <div className="flex items-center justify-center py-8 bg-white rounded-lg border border-gray-200">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500 mr-2" />
            <span className="text-gray-600">
              {generatingAnalysis ? 'Generating comprehensive analysis...' : 'Loading analysis...'}
            </span>
          </div>
        ) : comprehensiveAnalysis ? (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <BookOpen className="w-4 h-4 mr-2 text-primary-600" />
                Executive Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">{comprehensiveAnalysis.executiveSummary}</p>
            </div>

            {/* Historical Context */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                Historical Context
              </h3>
              <p className="text-gray-700">{comprehensiveAnalysis.historicalContext}</p>
            </div>

            {/* Key Provisions */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-green-600" />
                Key Provisions
              </h3>
              <div className="space-y-4">
                {comprehensiveAnalysis.keyProvisions.map((provision: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-1">{provision.title}</h4>
                    <p className="text-sm text-gray-700 mb-2">{provision.description}</p>
                    <p className="text-sm text-gray-600 italic">{provision.significance}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stakeholder Impact */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2 text-purple-600" />
                Stakeholder Impact
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-1">Citizens</h4>
                  <p className="text-purple-800 text-sm">{comprehensiveAnalysis.stakeholderImpact.citizens}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-1">Businesses</h4>
                  <p className="text-blue-800 text-sm">{comprehensiveAnalysis.stakeholderImpact.businesses}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-1">Government</h4>
                  <p className="text-green-800 text-sm">{comprehensiveAnalysis.stakeholderImpact.government}</p>
                </div>
              </div>
            </div>

            {/* Political Landscape */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-red-600" />
                Political Landscape
              </h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Support</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {comprehensiveAnalysis.politicalLandscape.support.map((item: string, index: number) => (
                      <li key={index} className="text-gray-700 text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Opposition</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {comprehensiveAnalysis.politicalLandscape.opposition.map((item: string, index: number) => (
                      <li key={index} className="text-gray-700 text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Key Factors</h4>
                <ul className="list-disc list-inside space-y-1">
                  {comprehensiveAnalysis.politicalLandscape.keyFactors.map((factor: string, index: number) => (
                    <li key={index} className="text-gray-700 text-sm">{factor}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Implementation Analysis */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-orange-600" />
                Implementation Analysis
              </h3>
              <p className="text-gray-700 mb-3"><strong>Timeline:</strong> {comprehensiveAnalysis.implementationAnalysis.timeline}</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Challenges</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {comprehensiveAnalysis.implementationAnalysis.challenges.map((challenge: string, index: number) => (
                      <li key={index} className="text-gray-700 text-sm">{challenge}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Responsible Agencies</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {comprehensiveAnalysis.implementationAnalysis.agencies.map((agency: string, index: number) => (
                      <li key={index} className="text-gray-700 text-sm">{agency}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Expert Perspectives */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2 text-indigo-600" />
                Expert Perspectives
              </h3>
              <div className="space-y-3">
                {comprehensiveAnalysis.expertPerspectives.map((perspective: any, index: number) => (
                  <div key={index} className="bg-indigo-50 p-3 rounded-lg">
                    <p className="text-indigo-900 text-sm mb-1">{perspective.perspective}</p>
                    <p className="text-indigo-700 text-xs italic">Source: {perspective.source}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Potential Outcomes */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-cyan-600" />
                Potential Outcomes
              </h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-1">If Passed</h4>
                  <p className="text-green-800 text-sm">{comprehensiveAnalysis.potentialOutcomes.ifPassed}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-1">If Failed</h4>
                  <p className="text-red-800 text-sm">{comprehensiveAnalysis.potentialOutcomes.ifFailed}</p>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Alternative Scenarios</h4>
                <p className="text-blue-800 text-sm">{comprehensiveAnalysis.potentialOutcomes.alternativeScenarios}</p>
              </div>
            </div>

            {/* Analysis Timestamp */}
            {comprehensiveAnalysis.generated_at && (
              <p className="text-xs text-gray-500 text-right">
                Analysis generated on {new Date(comprehensiveAnalysis.generated_at).toLocaleDateString()} at {new Date(comprehensiveAnalysis.generated_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            {analysisError ? (
              <div className="mb-4">
                <div className="flex items-start p-4 rounded-lg border bg-amber-50 border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">Analysis Generation Unavailable</p>
                    <p className="text-sm mt-1 text-amber-700">{analysisError}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Comprehensive Analysis</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  Generate a detailed analytical summary of this bill with historical context, stakeholder impact, and expert perspectives.
                </p>
              </>
            )}
            
            <Button 
              onClick={generateComprehensiveAnalysis}
              disabled={generatingAnalysis}
              variant={analysisError ? "outline" : "primary"}
            >
              {generatingAnalysis ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Analysis...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {analysisError ? 'Try Again' : 'Generate Comprehensive Analysis'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* NEW: Podcast Overview Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Volume2 className="w-5 h-5 mr-2 text-purple-500" />
            Podcast Overview
          </h2>
          {!podcastOverview && !generatingPodcast && (
            <Button 
              onClick={handleGeneratePodcastOverview}
              variant="outline"
              size="sm"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Generate Podcast Overview
            </Button>
          )}
        </div>

        {generatingPodcast ? (
          <div className="flex items-center justify-center py-8 bg-white rounded-lg border border-gray-200">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500 mr-2" />
            <span className="text-gray-600">Generating podcast overview...</span>
          </div>
        ) : podcastOverview ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-gray-700 leading-relaxed">{podcastOverview}</p>
            <div className="mt-4 text-right">
              <Button variant="outline" size="sm" onClick={handleGeneratePodcastOverview}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <Volume2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Podcast Overview Available</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Generate a concise, engaging podcast overview for this bill. This requires the comprehensive analysis to be available.
            </p>
            <Button 
              onClick={handleGeneratePodcastOverview}
              disabled={!comprehensiveAnalysis}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Generate Podcast Overview
            </Button>
            {!comprehensiveAnalysis && (
              <p className="text-sm text-gray-500 mt-2">
                (Requires comprehensive analysis to be generated first)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Personalized Impact Section */}
      <PersonalizedImpact bill={bill} />

      {/* Key Provisions */}
      {bill.ai_analysis?.keyProvisions && bill.ai_analysis.keyProvisions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Provisions</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <ul className="space-y-2">
              {bill.ai_analysis.keyProvisions.map((provision, index) => (
                <li key={index} className="flex items-start">
                  <span className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium mr-3 flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{provision}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sponsors and Cosponsors */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Sponsors & Cosponsors</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {bill.sponsors && bill.sponsors.length > 0 ? (
            <div className="space-y-4">
              {/* Primary Sponsor */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Primary Sponsor</h3>
                <div className="flex items-center p-3 bg-primary-50 rounded-lg border border-primary-100">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{bill.sponsors[0].full_name}</p>
                    <p className="text-sm text-gray-600">
                      {bill.sponsors[0].party}-{bill.sponsors[0].state}
                      {bill.sponsors[0].district && ` (District ${bill.sponsors[0].district})`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cosponsors */}
              {bill.cosponsors_count > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Cosponsors</h3>
                  <p className="text-gray-700">
                    This bill has {bill.cosponsors_count} cosponsor{bill.cosponsors_count !== 1 ? 's' : ''}.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">No sponsor information available.</p>
          )}
        </div>
      </div>

      {/* Subjects and Policy Area */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Subjects & Policy Area</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {loadingSubjects ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Loading subjects...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Policy Area */}
              {bill.policy_area && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Policy Area</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {bill.policy_area}
                  </span>
                </div>
              )}
              
              {/* Legislative Subjects */}
              {bill.subjects && bill.subjects.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Legislative Subjects</h3>
                  <div className="flex flex-wrap gap-2">
                    {bill.subjects.map((subject, index) => (
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
              
              {/* No subjects message */}
              {!bill.policy_area && (!bill.subjects || bill.subjects.length === 0) && (
                <p className="text-gray-500 italic">No subjects or policy area information available for this bill.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Committees */}
      {bill.committees && bill.committees.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Committees</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <ul className="space-y-3">
              {bill.committees.map((committee, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-5 h-5 text-gray-400 mr-3 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
                      <path d="M9 22v-4h6v4" />
                      <path d="M8 6h.01" />
                      <path d="M16 6h.01" />
                      <path d="M12 6h.01" />
                      <path d="M12 10h.01" />
                      <path d="M12 14h.01" />
                      <path d="M16 10h.01" />
                      <path d="M16 14h.01" />
                      <path d="M8 10h.01" />
                      <path d="M8 14h.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{committee.name}</p>
                    <p className="text-sm text-gray-600 capitalize">{committee.chamber}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Related Bills */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Related Bills</h2>
        {loadingRelated ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-gray-600">Loading related bills...</span>
          </div>
        ) : relatedBills.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {relatedBills.map((relatedBill) => (
              <div key={relatedBill.id} className="p-4 hover:bg-gray-50">
                <h3 className="font-medium text-gray-900">
                  {relatedBill.bill_type} {relatedBill.number}: {relatedBill.short_title || relatedBill.title}
                </h3>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{formatDate(relatedBill.introduced_date)}</span>
                  {relatedBill.status && (
                    <>
                      <span className="mx-1">•</span>
                      <span>{relatedBill.status}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-gray-500 italic">
            No related bills found.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline">
          <MessageSquare className="w-4 h-4 mr-2" />
          Contact Representatives
        </Button>
        
        <Button variant="outline">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        
        {bill.congress_url && (
          <Button variant="outline" asChild>
            <a href={bill.congress_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Congress.gov
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};