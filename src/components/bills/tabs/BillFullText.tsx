import React, { useState, useEffect } from 'react';
import { FileText, Printer, Download, Search, ExternalLink, AlertTriangle, MessageSquare, Bookmark, Loader2, RefreshCw, Globe } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { billFullTextService } from '../../../services/billFullTextService';
import { billTextFetcherService } from '../../../services/billTextFetcherService';
import type { Bill } from '../../../types';

interface BillFullTextProps {
  bill: Bill;
}

export const BillFullText: React.FC<BillFullTextProps> = ({ bill }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [fullTextUrl, setFullTextUrl] = useState<string | null>(null);
  const [formattedXmlUrl, setFormattedXmlUrl] = useState<string | null>(null);
  const [availableFormats, setAvailableFormats] = useState<{type: string; url: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [searchResults, setSearchResults] = useState<{index: number, text: string}[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(-1);
  const [fetchingSpecificBill, setFetchingSpecificBill] = useState(false);

  // Fetch full text when component mounts
  useEffect(() => {
    const fetchFullText = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First check if we already have the full text content in the database
        if (bill.full_text_content) {
          console.log('📦 Using full text content from database');
          setTextContent(bill.full_text_content);
          setLoading(false);
          return;
        }
        
        // Special case for HR 1 "One Big Beautiful Bill Act"
        if (bill.id === '119-HR-1' || (bill.congress === 119 && bill.bill_type === 'HR' && bill.number === 1)) {
          console.log('🔍 Detected HR 1 "One Big Beautiful Bill Act" - using direct fetching');
          await fetchHR1Text();
          return;
        }
        
        // Get available formats
        const formats = await billFullTextService.getAvailableFormats(bill.id);
        setAvailableFormats(formats);
        
        // Get Formatted XML URL first
        const xmlUrlResult = await billFullTextService.getFullTextUrl(bill.id, 'Formatted XML');
        if (xmlUrlResult.success && xmlUrlResult.url) {
          setFormattedXmlUrl(xmlUrlResult.url);
          setFullTextUrl(xmlUrlResult.url);
          
          // Try to fetch the formatted XML content
          setLoadingContent(true);
          try {
            // If we don't have content in the database, try to fetch it
            if (!bill.full_text_content) {
              const contentResult = await billFullTextService.getFormattedTextContent(bill.id);
              if (contentResult.success && contentResult.content) {
                setTextContent(contentResult.content);
                
                // Store the content in the database for future use
                await billFullTextService.updateBillWithTextContent(bill.id, contentResult.content);
              }
            }
          } catch (textError) {
            // Log the error but don't fail the entire batch
            console.warn(`Could not fetch text content for bill ${bill.id}:`, textError.message);
          } finally {
            setLoadingContent(false);
          }
        } else {
          // If Formatted XML not available, get PDF URL as fallback
          const pdfUrlResult = await billFullTextService.getFullTextUrl(bill.id, 'PDF');
          if (pdfUrlResult.success && pdfUrlResult.url) {
            setFullTextUrl(pdfUrlResult.url);
          }
        }
        
        if (!xmlUrlResult.success && !fullTextUrl && !bill.full_text_content) {
          setError('Full text not available for this bill. Please view on Congress.gov.');
        }
      } catch (error) {
        console.error('Error fetching full text:', error);
        setError('Could not load full text. Please try again or view on Congress.gov.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFullText();
  }, [bill.id, bill.full_text_content]);

  const fetchHR1Text = async () => {
    try {
      setFetchingSpecificBill(true);
      setError(null);
      
      console.log('🔍 Fetching HR 1 text directly...');
      
      // Use the specialized service to fetch HR 1 text
      const result = await billTextFetcherService.fetchSpecificBillText('119-HR-1');
      
      if (result.success && result.content) {
        setTextContent(result.content);
        setFullTextUrl('https://www.congress.gov/119/bills/hr1/BILLS-119hr1eas.htm');
        console.log('✅ Successfully fetched HR 1 text');
      } else {
        setError(`Could not fetch HR 1 text: ${result.message}`);
        console.error('❌ Failed to fetch HR 1 text:', result.message);
      }
    } catch (error) {
      console.error('❌ Error fetching HR 1 text:', error);
      setError(`Error fetching HR 1 text: ${error.message}`);
    } finally {
      setFetchingSpecificBill(false);
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || !textContent) return;
    
    setIsSearching(true);
    
    // Perform search in the text content
    const results: {index: number, text: string}[] = [];
    const regex = new RegExp(searchTerm, 'gi');
    let match;
    
    while ((match = regex.exec(textContent)) !== null) {
      // Get context around the match (50 chars before and after)
      const start = Math.max(0, match.index - 50);
      const end = Math.min(textContent.length, match.index + searchTerm.length + 50);
      const context = textContent.substring(start, end);
      
      results.push({
        index: match.index,
        text: '...' + context + '...'
      });
    }
    
    setSearchResults(results);
    setCurrentResultIndex(results.length > 0 ? 0 : -1);
    setIsSearching(false);
  };

  const handleNextResult = () => {
    if (searchResults.length === 0) return;
    setCurrentResultIndex((prevIndex) => (prevIndex + 1) % searchResults.length);
  };

  const handlePrevResult = () => {
    if (searchResults.length === 0) return;
    setCurrentResultIndex((prevIndex) => (prevIndex - 1 + searchResults.length) % searchResults.length);
  };

  const handlePrint = () => {
    if (fullTextUrl) {
      window.open(fullTextUrl, '_blank');
    }
  };

  const handleDownload = (url: string, format: string) => {
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bill.bill_type}${bill.number}-${bill.congress}-${format.toLowerCase()}.${format.toLowerCase() === 'pdf' ? 'pdf' : 'html'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Highlight search results in the text content
  const highlightSearchResults = (content: string): string => {
    if (!searchTerm || searchResults.length === 0) return content;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return content.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Full Bill Text</h2>
        <div className="flex space-x-2">
          {fullTextUrl && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                View Full Text
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload(fullTextUrl, formattedXmlUrl ? 'HTML' : 'PDF')}>
                <Download className="w-4 h-4 mr-2" />
                Download {formattedXmlUrl ? 'HTML' : 'PDF'}
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search within bill text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            disabled={!textContent}
          />
        </div>
        <Button type="submit" disabled={isSearching || !searchTerm || !textContent}>
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </form>
      
      {/* Search Results Navigation */}
      {searchResults.length > 0 && (
        <div className="bg-primary-50 p-4 rounded-lg border border-primary-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-primary-800">
              Found {searchResults.length} matches for "{searchTerm}"
            </h3>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handlePrevResult}>
                Previous
              </Button>
              <span className="text-sm text-primary-700">
                {currentResultIndex + 1} of {searchResults.length}
              </span>
              <Button variant="outline" size="sm" onClick={handleNextResult}>
                Next
              </Button>
            </div>
          </div>
          {currentResultIndex >= 0 && (
            <div className="bg-white p-3 rounded border border-primary-200">
              <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                __html: highlightSearchResults(searchResults[currentResultIndex].text) 
              }}></p>
            </div>
          )}
        </div>
      )}
      
      {/* Full Text Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
              <p className="text-gray-600">Loading bill text information...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
              {bill.congress_url && (
                <Button asChild className="mt-4">
                  <a href={bill.congress_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Full Text on Congress.gov
                  </a>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Special HR 1 Handling */}
            {bill.id === '119-HR-1' && !textContent && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <h4 className="font-medium text-blue-800">HR 1 "One Big Beautiful Bill Act"</h4>
                    <p className="text-blue-700 text-sm">This bill has a special text format. Click below to fetch it directly.</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button 
                    onClick={fetchHR1Text} 
                    disabled={fetchingSpecificBill}
                    variant="primary"
                    size="sm"
                  >
                    {fetchingSpecificBill ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Fetching HR 1 Text...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Fetch HR 1 Text
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Available Text Formats</h3>
              <div className="flex flex-wrap gap-2">
                {availableFormats.map((format, index) => (
                  <Button 
                    key={index} 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(format.url, '_blank')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {format.type}
                  </Button>
                ))}
                {availableFormats.length === 0 && bill.full_text_url && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(bill.full_text_url!, '_blank')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View on Congress.gov
                  </Button>
                )}
                {availableFormats.length === 0 && !bill.full_text_url && (
                  <span className="text-gray-500 italic">No text formats available</span>
                )}
              </div>
            </div>
            
            {loadingContent ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500 mr-2" />
                <span className="text-gray-600">Loading formatted text...</span>
              </div>
            ) : textContent ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 p-3 flex justify-between items-center">
                  <h3 className="font-medium text-gray-900">Bill Text</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(formattedXmlUrl || bill.full_text_url || '', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
                <div className="p-4 max-h-[600px] overflow-y-auto">
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: searchTerm && searchResults.length > 0 
                        ? highlightSearchResults(textContent) 
                        : textContent 
                    }}
                  />
                </div>
              </div>
            ) : fullTextUrl ? (
              <div className="text-center">
                <p className="text-gray-700 mb-4">
                  The full text of this bill is available in the formats listed above. 
                  Click on any format to view the bill text directly from Congress.gov.
                </p>
                
                <div className="aspect-video max-h-[600px] border border-gray-200 rounded-lg overflow-hidden">
                  <iframe 
                    src={fullTextUrl} 
                    title={`${bill.bill_type} ${bill.number} Full Text`}
                    className="w-full h-full"
                    sandbox="allow-same-origin allow-scripts allow-popups"
                  />
                </div>
                
                <p className="text-sm text-gray-500 mt-4">
                  Note: If the document doesn't load properly, please use the "View Full Text" button above.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center max-w-md">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Full text available on Congress.gov</h3>
                  <p className="text-gray-600 mb-6">
                    The complete text of this bill is available on the official Congress.gov website.
                  </p>
                  {bill.congress_url && (
                    <Button asChild>
                      <a href={bill.congress_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Full Text on Congress.gov
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 mb-1">Note on Bill Text</h3>
            <p className="text-yellow-700 text-sm">
              Bill text can be lengthy and complex. The official text is maintained by Congress.gov and may be updated as the bill progresses through the legislative process.
            </p>
          </div>
        </div>
      </div>
      
      {/* Text Highlighting and Annotation Tools */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Text Tools</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled>
            <span className="bg-yellow-200 px-1">Highlight</span>
          </Button>
          <Button variant="outline" size="sm" disabled>
            <MessageSquare className="w-4 h-4 mr-1" /> Add Note
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Bookmark className="w-4 h-4 mr-1" /> Bookmark Section
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Text tools are available when viewing the full bill text directly.
        </p>
      </div>
    </div>
  );
};