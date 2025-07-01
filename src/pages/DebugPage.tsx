import React, { useState, useEffect } from 'react';
import { ApiTestPanel } from '../components/debug/ApiTestPanel';
import { EdgeFunctionDebug } from '../components/debug/EdgeFunctionDebug';
import { Button } from '../components/common/Button';
import { SubjectImportService } from '../services/subjectImportService';
import { billDataSyncService } from '../services/billDataSyncService';
import { billSummaryService } from '../services/billSummaryService';
import { billFullTextService } from '../services/billFullTextService';
import { billBatchUpdateService } from '../services/billBatchUpdateService';
import { geminiService } from '../services/geminiService';
import { openaiService } from '../services/openaiService';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, AlertCircle, Database, Tag, FileText, FileText as FileText2, Book, RefreshCw, Globe, Volume2 } from 'lucide-react';

export const DebugPage: React.FC = () => {
  const [importingSubjects, setImportingSubjects] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [updatingPolicyAreas, setUpdatingPolicyAreas] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);
  const [updatingBillData, setUpdatingBillData] = useState(false);
  const [billDataResult, setBillDataResult] = useState<any>(null);
  const [updatingSummaries, setUpdatingSummaries] = useState(false);
  const [summariesResult, setSummariesResult] = useState<any>(null);
  const [updatingFullText, setUpdatingFullText] = useState(false);
  const [fullTextResult, setFullTextResult] = useState<any>(null);
  const [updatingAllBills, setUpdatingAllBills] = useState(false);
  const [allBillsResult, setAllBillsResult] = useState<any>(null);
  const [generatingWebSearchSummary, setGeneratingWebSearchSummary] = useState(false);
  const [webSearchResult, setWebSearchResult] = useState<any>(null);
  const [generatingPodcastOverviews, setGeneratingPodcastOverviews] = useState(false);
  const [podcastOverviewsResult, setPodcastOverviewsResult] = useState<any>(null);

  const handleImportSubjects = async () => {
    try {
      setImportingSubjects(true);
      setImportResult(null);
      
      const result = await SubjectImportService.importAllSubjects();
      setImportResult(result);
    } catch (error) {
      setImportResult({
        success: false,
        message: `Error importing subjects: ${error.message}`
      });
    } finally {
      setImportingSubjects(false);
    }
  };

  const handleUpdatePolicyAreas = async () => {
    try {
      setUpdatingPolicyAreas(true);
      setUpdateResult(null);
      
      const result = await SubjectImportService.updatePolicyAreasForExistingBills();
      setUpdateResult(result);
    } catch (error) {
      setUpdateResult({
        success: false,
        message: `Error updating policy areas: ${error.message}`
      });
    } finally {
      setUpdatingPolicyAreas(false);
    }
  };

  const handleUpdateBillData = async () => {
    try {
      setUpdatingBillData(true);
      setBillDataResult(null);
      
      const result = await billDataSyncService.syncAllBills(50);
      setBillDataResult(result);
    } catch (error) {
      setBillDataResult({
        success: false,
        message: `Error updating bill data: ${error.message}`
      });
    } finally {
      setUpdatingBillData(false);
    }
  };

  const handleUpdateSummaries = async () => {
    try {
      setUpdatingSummaries(true);
      setSummariesResult(null);
      
      const result = await billSummaryService.updateMissingSummaries(10);
      setSummariesResult(result);
    } catch (error) {
      setSummariesResult({
        success: false,
        message: `Error updating summaries: ${error.message}`
      });
    } finally {
      setUpdatingSummaries(false);
    }
  };

  const handleUpdateFullText = async () => {
    try {
      setUpdatingFullText(true);
      setFullTextResult(null);
      
      const result = await billFullTextService.updateMissingFullText(10);
      setFullTextResult(result);
    } catch (error) {
      setFullTextResult({
        success: false,
        message: `Error updating full text: ${error.message}`
      });
    } finally {
      setUpdatingFullText(false);
    }
  };

  const handleUpdateAllBills = async () => {
    try {
      setUpdatingAllBills(true);
      setAllBillsResult(null);
      
      const result = await billBatchUpdateService.updateAllBills(50);
      setAllBillsResult(result);
    } catch (error) {
      setAllBillsResult({
        success: false,
        message: `Error updating all bills: ${error.message}`
      });
    } finally {
      setUpdatingAllBills(false);
    }
  };

  const handleGenerateWebSearchSummary = async () => {
    try {
      setGeneratingWebSearchSummary(true);
      setWebSearchResult(null);
      
      // Get a bill to test with
      const { data: bills, error } = await supabase
        .from('bills')
        .select('id')
        .limit(1);
      
      if (error || !bills || bills.length === 0) {
        throw new Error('No bills found to test with');
      }
      
      const billId = bills[0].id;
      const result = await billSummaryService.generateEnhancedSummary(billId);
      
      setWebSearchResult({
        success: result.success,
        message: result.message,
        billId
      });
    } catch (error) {
      setWebSearchResult({
        success: false,
        message: `Error generating web search summary: ${error.message}`
      });
    } finally {
      setGeneratingWebSearchSummary(false);
    }
  };

  // NEW: Handle generating podcast overviews
  const handleGeneratePodcastOverviews = async () => {
    try {
      setGeneratingPodcastOverviews(true);
      setPodcastOverviewsResult(null);
      
      // Get bills that have comprehensive analysis but no podcast overview
      const { data: bills, error } = await supabase
        .from('bills')
        .select('*')
        .not('ai_analysis', 'is', null) // Ensure comprehensive analysis exists
        .is('podcast_overview', null)
        .limit(5);
      
      if (error || !bills || bills.length === 0) {
        throw new Error('No suitable bills found for podcast overview generation');
      }
      
      let successCount = 0;
      
      // Process each bill
      for (const bill of bills) {
        try {
          await openaiService.generatePodcastOverview(bill);
          successCount++;
        } catch (billError) {
          console.error(`Error generating podcast overview for bill ${bill.id}:`, billError);
        }
      }
      
      setPodcastOverviewsResult({
        success: true,
        count: successCount,
        total: bills.length,
        message: `Successfully generated ${successCount} of ${bills.length} podcast overviews`
      });
    } catch (error) {
      setPodcastOverviewsResult({
        success: false,
        message: `Error generating podcast overviews: ${error.message}`
      });
    } finally {
      setGeneratingPodcastOverviews(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Debug & Testing</h1>
          <p className="text-gray-600">
            Test your API integrations and database setup to ensure everything is working correctly.
          </p>
        </div>
        
        <div className="space-y-8">
          {/* NEW: Podcast Overview Generation Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Volume2 className="w-5 h-5 mr-2 text-purple-500" />
                  Podcast Overview Generation
                </h2>
                <p className="text-gray-600">Generate podcast-style overviews for bills using OpenAI</p>
              </div>
              
              <Button 
                onClick={handleGeneratePodcastOverviews} 
                disabled={generatingPodcastOverviews}
                variant="primary"
              >
                {generatingPodcastOverviews ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Generate Podcast Overviews
                  </>
                )}
              </Button>
            </div>
            
            {/* Podcast Overviews Results */}
            {podcastOverviewsResult && (
              <div className={`p-4 rounded-lg border mb-4 ${
                podcastOverviewsResult.success 
                  ? 'bg-success-50 border-success-200 text-success-700' 
                  : 'bg-error-50 border-error-200 text-error-700'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {podcastOverviewsResult.success ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{podcastOverviewsResult.message}</p>
                    {podcastOverviewsResult.success && podcastOverviewsResult.count !== undefined && (
                      <p className="text-sm">Generated {podcastOverviewsResult.count} podcast overviews</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-purple-800 mb-2 flex items-center">
                <Volume2 className="w-4 h-4 mr-2" />
                About Podcast Overviews
              </h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• <strong>Engaging Summaries</strong>: Creates podcast-style overviews of bills</li>
                <li>• <strong>Based on Analysis</strong>: Uses comprehensive analysis as source material</li>
                <li>• <strong>Audio-Friendly Format</strong>: Written in a conversational style suitable for audio</li>
                <li>• <strong>Concise Format</strong>: 150-250 words, perfect for short audio segments</li>
                <li>• <strong>Accessible Content</strong>: Makes complex legislation more approachable</li>
                <li>• <strong>Stored in Database</strong>: Saved to the new podcast_overview field in bills table</li>
                <li>• This feature requires a valid OpenAI API key and comprehensive analysis</li>
              </ul>
            </div>
          </div>
          
          {/* Web Search Summary Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-primary-500" />
                  Gemini Web Search Summary
                </h2>
                <p className="text-gray-600">Generate enhanced bill summaries using Google Gemini with web search</p>
              </div>
              
              <Button 
                onClick={handleGenerateWebSearchSummary} 
                disabled={generatingWebSearchSummary}
                variant="primary"
              >
                {generatingWebSearchSummary ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Test Web Search Summary
                  </>
                )}
              </Button>
            </div>
            
            {/* Web Search Results */}
            {webSearchResult && (
              <div className={`p-4 rounded-lg border mb-4 ${
                webSearchResult.success 
                  ? 'bg-success-50 border-success-200 text-success-700' 
                  : 'bg-error-50 border-error-200 text-error-700'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {webSearchResult.success ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{webSearchResult.message}</p>
                    {webSearchResult.billId && (
                      <p className="text-sm">Bill ID: {webSearchResult.billId}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                About Web Search Summaries
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Enhanced Summaries</strong>: Uses Google Gemini API with web search grounding</li>
                <li>• <strong>Up-to-date Information</strong>: Searches the web for the latest information about bills</li>
                <li>• <strong>Full Text Access</strong>: Can access and summarize bill full text even when not available in database</li>
                <li>• <strong>Comprehensive Analysis</strong>: Combines official data with web search results</li>
                <li>• <strong>Automatic Updates</strong>: Can be used to update bills without summaries</li>
                <li>• This feature requires a valid Google Gemini API key with web search enabled</li>
              </ul>
            </div>
          </div>
          
          {/* Comprehensive Bill Update Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2 text-primary-500" />
                  Comprehensive Bill Update
                </h2>
                <p className="text-gray-600">Update all bills with complete data in one operation</p>
              </div>
              
              <Button 
                onClick={handleUpdateAllBills} 
                disabled={updatingAllBills}
                variant="primary"
              >
                {updatingAllBills ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating All Bills...
                  </>
                ) : (
                  'Update All Bills'
                )}
              </Button>
            </div>
            
            {/* Update Results */}
            {allBillsResult && (
              <div className={`p-4 rounded-lg border mb-4 ${
                allBillsResult.success 
                  ? 'bg-success-50 border-success-200 text-success-700' 
                  : 'bg-error-50 border-error-200 text-error-700'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {allBillsResult.success ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{allBillsResult.message}</p>
                  </div>
                </div>
                
                {allBillsResult.success && allBillsResult.details && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white rounded p-2 border border-success-100">
                      <span className="font-medium">Bills Updated:</span> {allBillsResult.details.billsUpdated}
                    </div>
                    <div className="bg-white rounded p-2 border border-success-100">
                      <span className="font-medium">Summaries Updated:</span> {allBillsResult.details.summariesUpdated}
                    </div>
                    <div className="bg-white rounded p-2 border border-success-100">
                      <span className="font-medium">Full Text Updated:</span> {allBillsResult.details.fullTextUpdated}
                    </div>
                    <div className="bg-white rounded p-2 border border-success-100">
                      <span className="font-medium">Policy Areas Updated:</span> {allBillsResult.details.policyAreasUpdated}
                    </div>
                    <div className="bg-white rounded p-2 border border-success-100">
                      <span className="font-medium">Podcast Overviews:</span> {allBillsResult.details.podcastOverviewsUpdated}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                <Database className="w-4 h-4 mr-2" />
                About Comprehensive Bill Update
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>One-Click Update</strong>: Updates all bill data in a single operation</li>
                <li>• <strong>Complete Data</strong>: Fetches and updates summaries, full text, policy areas, and more</li>
                <li>• <strong>Efficient Batching</strong>: Processes bills in batches to avoid API rate limits</li>
                <li>• <strong>Intelligent Caching</strong>: Minimizes API calls by using cached data when possible</li>
                <li>• <strong>Comprehensive Results</strong>: Provides detailed statistics on what was updated</li>
                <li>• <strong>Podcast Overviews</strong>: Now generates podcast-style overviews for bills</li>
                <li>• This process may take several minutes to complete as it makes multiple API calls</li>
              </ul>
            </div>
          </div>
          
          {/* Subject Import Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Tag className="w-5 h-5 mr-2 text-primary-500" />
                  Bill Subjects Import
                </h2>
                <p className="text-gray-600">Import policy areas and legislative subjects from Congress.gov API</p>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  onClick={handleImportSubjects} 
                  disabled={importingSubjects}
                  variant="primary"
                >
                  {importingSubjects ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import All Subjects'
                  )}
                </Button>
                
                <Button 
                  onClick={handleUpdatePolicyAreas} 
                  disabled={updatingPolicyAreas}
                  variant="outline"
                >
                  {updatingPolicyAreas ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Policy Areas'
                  )}
                </Button>
              </div>
            </div>
            
            {/* Import Results */}
            {importResult && (
              <div className={`p-4 rounded-lg border mb-4 ${
                importResult.success 
                  ? 'bg-success-50 border-success-200 text-success-700' 
                  : 'bg-error-50 border-error-200 text-error-700'
              }`}>
                <div className="flex items-center space-x-2">
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{importResult.message}</p>
                    {importResult.success && importResult.count && (
                      <p className="text-sm">Imported {importResult.count} subjects</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Update Results */}
            {updateResult && (
              <div className={`p-4 rounded-lg border mb-4 ${
                updateResult.success 
                  ? 'bg-success-50 border-success-200 text-success-700' 
                  : 'bg-error-50 border-error-200 text-error-700'
              }`}>
                <div className="flex items-center space-x-2">
                  {updateResult.success ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{updateResult.message}</p>
                    {updateResult.success && (
                      <p className="text-sm">Updated {updateResult.count} bills</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                <Database className="w-4 h-4 mr-2" />
                About Bill Subjects
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Policy Areas</strong> are broad categories assigned to bills (e.g., "Health", "Education")</li>
                <li>• <strong>Legislative Subjects</strong> are more specific topics covered by the bill</li>
                <li>• Each bill has one Policy Area and multiple Legislative Subjects</li>
                <li>• Importing subjects allows filtering bills by subject in the UI</li>
                <li>• The import process fetches subjects from a sample of bills across multiple congresses</li>
                <li>• The "Update Policy Areas" button adds missing policy areas to existing bills</li>
              </ul>
            </div>
          </div>
          
          {/* Bill Data Update Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-primary-500" />
                  Bill Data Enrichment
                </h2>
                <p className="text-gray-600">Update bills with full text, cosponsors, and related data from Congress.gov API</p>
              </div>
              
              <Button 
                onClick={handleUpdateBillData} 
                disabled={updatingBillData}
                variant="primary"
              >
                {updatingBillData ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating Bills...
                  </>
                ) : (
                  'Update Bill Data'
                )}
              </Button>
            </div>
            
            {/* Bill Data Update Results */}
            {billDataResult && (
              <div className={`p-4 rounded-lg border ${
                billDataResult.success 
                  ? 'bg-success-50 border-success-200 text-success-700' 
                  : 'bg-error-50 border-error-200 text-error-700'
              }`}>
                <div className="flex items-center space-x-2">
                  {billDataResult.success ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{billDataResult.message}</p>
                    {billDataResult.success && (
                      <p className="text-sm">Updated {billDataResult.count} bills with comprehensive data</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                About Bill Data Enrichment
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Full Text</strong>: Retrieves complete bill text from Congress.gov</li>
                <li>• <strong>Cosponsors</strong>: Updates bill with complete list of cosponsors</li>
                <li>• <strong>Subjects & Policy Areas</strong>: Adds detailed subject classifications</li>
                <li>• <strong>Related Bills</strong>: Identifies and links related legislation</li>
                <li>• <strong>Timeline</strong>: Adds comprehensive action history and timeline</li>
                <li>• <strong>Committee Information</strong>: Updates with detailed committee data</li>
                <li>• This process may take some time as it makes multiple API calls per bill</li>
              </ul>
            </div>
          </div>
          
          {/* Bill Summaries Update Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText2 className="w-5 h-5 mr-2 text-primary-500" />
                  Bill Summaries Update
                </h2>
                <p className="text-gray-600">Fetch and update bill summaries from Congress.gov API</p>
              </div>
              
              <Button 
                onClick={handleUpdateSummaries} 
                disabled={updatingSummaries}
                variant="primary"
              >
                {updatingSummaries ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating Summaries...
                  </>
                ) : (
                  'Update Bill Summaries'
                )}
              </Button>
            </div>
            
            {/* Summaries Update Results */}
            {summariesResult && (
              <div className={`p-4 rounded-lg border ${
                summariesResult.success 
                  ? 'bg-success-50 border-success-200 text-success-700' 
                  : 'bg-error-50 border-error-200 text-error-700'
              }`}>
                <div className="flex items-center space-x-2">
                  {summariesResult.success ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{summariesResult.message}</p>
                    {summariesResult.success && (
                      <p className="text-sm">Updated {summariesResult.count} bills with official summaries</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                <FileText2 className="w-4 h-4 mr-2" />
                About Bill Summaries
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Official Summaries</strong>: Fetches official bill summaries from Congress.gov</li>
                <li>• <strong>Web Search Summaries</strong>: Uses Google Gemini with web search for bills without official summaries</li>
                <li>• <strong>Multiple Versions</strong>: Bills may have multiple summaries at different stages</li>
                <li>• <strong>Latest Summary</strong>: The system stores the most recent summary available</li>
                <li>• <strong>HTML Content</strong>: Summaries may contain HTML formatting that needs to be handled</li>
                <li>• <strong>Automatic Updates</strong>: Summaries are updated as bills progress through Congress</li>
                <li>• This process fetches summaries for bills that don't have them yet</li>
              </ul>
            </div>
          </div>
          
          {/* Bill Full Text Update Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Book className="w-5 h-5 mr-2 text-primary-500" />
                  Bill Full Text Update
                </h2>
                <p className="text-gray-600">Fetch and update bill full text content from Congress.gov API</p>
              </div>
              
              <Button 
                onClick={handleUpdateFullText} 
                disabled={updatingFullText}
                variant="primary"
              >
                {updatingFullText ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating Full Text...
                  </>
                ) : (
                  'Update Bill Full Text'
                )}
              </Button>
            </div>
            
            {/* Full Text Update Results */}
            {fullTextResult && (
              <div className={`p-4 rounded-lg border ${
                fullTextResult.success 
                  ? 'bg-success-50 border-success-200 text-success-700' 
                  : 'bg-error-50 border-error-200 text-error-700'
              }`}>
                <div className="flex items-center space-x-2">
                  {fullTextResult.success ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{fullTextResult.message}</p>
                    {fullTextResult.success && (
                      <p className="text-sm">Updated {fullTextResult.count} bills with full text content</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                <Book className="w-4 h-4 mr-2" />
                About Bill Full Text
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Text Versions</strong>: Bills may have multiple text versions as they progress</li>
                <li>• <strong>Multiple Formats</strong>: Text is available in Formatted XML, PDF, and other formats</li>
                <li>• <strong>Direct Links</strong>: The system stores links to the official text on Congress.gov</li>
                <li>• <strong>Latest Version</strong>: The system uses the most recent text version available</li>
                <li>• <strong>Formatted XML</strong>: Prioritizes HTML/XML format over PDF for better accessibility</li>
                <li>• <strong>Full Text Storage</strong>: Now stores the complete text content in the database</li>
                <li>• <strong>Search Capability</strong>: Enables full-text search within bill content</li>
                <li>• <strong>AI Analysis</strong>: Provides complete text for more accurate AI analysis</li>
                <li>• <strong>CORS Avoidance</strong>: Eliminates cross-origin issues by storing content locally</li>
              </ul>
            </div>
          </div>
          
          <EdgeFunctionDebug />
          <ApiTestPanel />
        </div>
      </div>
    </div>
  );
};