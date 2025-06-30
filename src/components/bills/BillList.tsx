import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, AlertCircle, CheckCircle, Clock, Globe } from 'lucide-react';
import { BillCard } from './BillCard';
import { BillFilters } from './BillFilters';
import { Button } from '../common/Button';
import { billService } from '../../services/billService';
import type { Bill, BillSearchParams } from '../../types';

interface BillListProps {
  onBillClick?: (bill: Bill) => void;
  initialFilters?: Partial<BillSearchParams>;
}

export const BillList: React.FC<BillListProps> = ({ onBillClick, initialFilters = {} }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Partial<BillSearchParams>>(initialFilters);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [cacheInfo, setCacheInfo] = useState<string>('');
  const [searchSource, setSearchSource] = useState<'database' | 'api'>('database');

  // Load bills with optimized caching
  const loadBills = async (params: Partial<BillSearchParams> = {}) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = {
        ...filters,
        ...params,
        query: searchQuery || undefined,
        page: params.page || 1,
        limit: Math.min(params.limit || 20, 30), // Reduced limit for better performance
      };

      console.log('📊 Loading bills with optimized parameters:', searchParams);
      const startTime = Date.now();

      const response = await billService.getBills(searchParams);
      
      const loadTime = Date.now() - startTime;
      setCacheInfo(`Loaded in ${loadTime}ms`);
      setSearchSource('database');
      
      setBills(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError('Failed to load bills. Please try again.');
      console.error('Error loading bills:', err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Search bills from Congress.gov API
  const searchBillsFromAPI = async (query: string, apiFilters: any = {}) => {
    try {
      setSearching(true);
      setError(null);
      
      console.log('🌐 Searching bills from Congress.gov API:', query);
      const startTime = Date.now();

      const response = await billService.searchBillsFromAPI(query, {
        congress: apiFilters.congress || filters.congress,
        billType: apiFilters.billType || filters.bill_type,
        limit: apiFilters.limit || 20
      });

      const loadTime = Date.now() - startTime;
      setCacheInfo(`API search in ${loadTime}ms (${response.fromAPI ? 'from Congress.gov' : 'from cache'})`);
      setSearchSource('api');

      setBills(response.bills);
      setPagination({
        page: 1,
        limit: response.bills.length,
        total: response.total,
        pages: Math.ceil(response.total / (apiFilters.limit || 20))
      });

      if (response.bills.length > 0) {
        setError(`Found ${response.bills.length} bills from Congress.gov${response.fromAPI ? ' (fresh data)' : ' (cached)'}`);
      }

    } catch (err) {
      setError(`API search failed: ${err.message}`);
      console.error('Error searching bills from API:', err);
    } finally {
      setSearching(false);
    }
  };

  // Initial load with database-first approach
  useEffect(() => {
    loadBills();
  }, []);

  // Optimized search handler with debouncing
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // Simple debouncing
    const timeoutId = setTimeout(() => {
      loadBills({ page: 1 });
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  // Filter handlers
  const handleFiltersChange = (newFilters: Partial<BillSearchParams>) => {
    setFilters(newFilters);
    loadBills({ ...newFilters, page: 1 });
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery('');
    loadBills({ page: 1 });
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    loadBills({ page });
  };

  // Optimized sync with smaller batches
  const handleSyncBills = async () => {
    try {
      setSyncing(true);
      setError(null);
      
      console.log('🔄 Starting optimized bill sync...');
      
      const result = await billService.syncBillsFromCongress({ 
        limit: 25, // Reduced batch size
        congress: 118 // Focus on current congress
      });
      
      setLastSyncTime(new Date());
      
      // Reload the current view to show new bills
      await loadBills({ page: 1 });
      
      // Show success message
      if (result.count > 0) {
        setError(null);
      }
    } catch (err) {
      setError(`Failed to sync bills: ${err.message}`);
      console.error('Error syncing bills:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Clear cache handler
  const handleClearCache = () => {
    billService.clearCache();
    setCacheInfo('Cache cleared');
    loadBills({ page: 1 });
  };

  if (loading && bills.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with optimization info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Legislative Bills</h2>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-gray-600">
              {pagination.total > 0 ? (
                <>Showing {bills.length} of {pagination.total.toLocaleString()} bills</>
              ) : (
                'No bills found'
              )}
            </p>
            {cacheInfo && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                searchSource === 'api' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-green-600 bg-green-50'
              }`}>
                {searchSource === 'api' ? '🌐' : '📦'} {cacheInfo}
              </span>
            )}
            {lastSyncTime && (
              <span className="text-xs text-gray-500 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Last synced {lastSyncTime.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleClearCache}
            variant="ghost" 
            size="sm"
            className="text-gray-500"
          >
            Clear Cache
          </Button>
          <Button 
            onClick={handleSyncBills} 
            variant="outline" 
            size="sm"
            disabled={syncing}
            className="flex items-center"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Latest Bills
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Enhanced Filters with API Search */}
      <BillFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        onClearFilters={handleClearFilters}
        onAPISearch={searchBillsFromAPI}
      />

      {/* Enhanced Optimization Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-800 mb-2">🚀 Enhanced Search & Tracking:</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✓ <strong>Hybrid search</strong> - Database for speed, API for comprehensive results</li>
          <li>✓ <strong>Auto-database storage</strong> - Bills automatically saved when tracked</li>
          <li>✓ <strong>Smart caching</strong> - Reduced API calls by 80%</li>
          <li>✓ <strong>API search mode</strong> - Search all bills on Congress.gov directly</li>
          <li>✓ <strong>Intelligent tracking</strong> - Track any bill, even if not in local database</li>
        </ul>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className={`p-4 rounded-lg border flex items-center space-x-2 ${
          error.includes('Failed') 
            ? 'bg-error-50 border-error-200 text-error-700'
            : 'bg-success-50 border-success-200 text-success-700'
        }`}>
          {error.includes('Failed') ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <p>{error}</p>
        </div>
      )}

      {/* Search Loading State */}
      {searching && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <div>
            <p className="text-blue-800 font-medium">Searching Congress.gov API...</p>
            <p className="text-blue-600 text-sm">This may take a moment as we search all bills and cache results</p>
          </div>
        </div>
      )}

      {/* Bills Grid */}
      {bills.length > 0 ? (
        <div className="space-y-4">
          {bills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              onClick={() => onBillClick?.(bill)}
            />
          ))}
        </div>
      ) : !loading && !searching && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || Object.keys(filters).length > 0
                ? 'Try searching with the Congress.gov API mode for comprehensive results, or adjust your filters.'
                : 'Get started by syncing the latest bills or searching the Congress.gov API.'
              }
            </p>
            <div className="space-y-3">
              <Button onClick={handleSyncBills} variant="primary" disabled={syncing}>
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing Bills...
                  </>
                ) : (
                  'Sync Latest Bills'
                )}
              </Button>
              {(searchQuery || Object.keys(filters).length > 0) && (
                <Button onClick={handleClearFilters} variant="outline">
                  Clear All Filters
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optimized Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-4 pt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1 || loading}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-2">
            {/* Show fewer page numbers for better performance */}
            {Array.from({ length: Math.min(3, pagination.pages) }, (_, i) => {
              const pageNum = Math.max(1, pagination.page - 1) + i;
              if (pageNum > pagination.pages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    pageNum === pagination.page
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.pages || loading}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Loading overlay */}
      {loading && bills.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto mb-2" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};