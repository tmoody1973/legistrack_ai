import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Filter, TrendingUp, Clock, AlertTriangle, Search, Tag, RefreshCw, FileText } from 'lucide-react';
import { BillCard } from '../bills/BillCard';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { billService } from '../../services/billService';
import { billDataSyncService } from '../../services/billDataSyncService';
import { useAuth } from '../../hooks/useAuth';
import type { Bill, BillSearchParams, BillSubject } from '../../types';

interface BillFeedProps {
  onBillClick?: (bill: Bill) => void;
  initialFilters?: Partial<BillSearchParams>;
}

export const BillFeed: React.FC<BillFeedProps> = ({ 
  onBillClick,
  initialFilters = {}
}) => {
  const { authState } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Partial<BillSearchParams>>(initialFilters);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalBills, setTotalBills] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [subjects, setSubjects] = useState<BillSubject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastBillElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        loadMoreBills();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, isLoadingMore]);

  // Load initial bills
  useEffect(() => {
    loadBills();
    loadSubjects();
  }, []);

  // Load bills with current filters
  const loadBills = async (resetPage = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentPage = resetPage ? 1 : page;
      
      const searchParams: BillSearchParams = {
        ...filters,
        query: searchQuery || undefined,
        page: currentPage,
        limit: 10,
        sort: sortBy,
        order: sortOrder,
        subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined
      };

      const response = await billService.getBills(searchParams);
      
      setBills(resetPage ? response.data : [...bills, ...response.data]);
      setTotalBills(response.pagination.total);
      setHasMore(currentPage < response.pagination.pages);
      
      if (resetPage) {
        setPage(1);
      }
    } catch (err) {
      console.error('Error loading bills:', err);
      setError('Failed to load bills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load more bills for infinite scroll
  const loadMoreBills = async () => {
    if (!hasMore || isLoadingMore) return;
    
    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      
      const searchParams: BillSearchParams = {
        ...filters,
        query: searchQuery || undefined,
        page: nextPage,
        limit: 10,
        sort: sortBy,
        order: sortOrder,
        subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined
      };

      const response = await billService.getBills(searchParams);
      
      setBills(prevBills => [...prevBills, ...response.data]);
      setPage(nextPage);
      setHasMore(nextPage < response.pagination.pages);
    } catch (err) {
      console.error('Error loading more bills:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load available subjects for filtering
  const loadSubjects = async () => {
    try {
      const allSubjects = await billService.getAllSubjects();
      setSubjects(allSubjects);
    } catch (err) {
      console.error('Error loading subjects:', err);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadBills();
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof BillSearchParams, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Toggle subject selection
  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  // Apply filters
  const applyFilters = () => {
    loadBills();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({});
    setSearchQuery('');
    setSelectedSubjects([]);
    setSortBy('updated_at');
    setSortOrder('desc');
    loadBills();
  };

  // Sync bills from Congress.gov
  const handleSyncBills = async () => {
    try {
      setSyncing(true);
      setError(null);
      
      const result = await billService.syncBillsFromCongress({ 
        limit: 25,
        congress: 118
      });
      
      // Reload the current view to show new bills
      await loadBills();
      
      // Show success message
      if (result.count > 0) {
        setError(`Successfully synced ${result.count} bills from Congress.gov`);
      }
    } catch (err) {
      setError(`Failed to sync bills: ${err.message}`);
      console.error('Error syncing bills:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Group subjects by type
  const policyAreas = subjects.filter(subject => subject.type === 'policy');
  const legislativeSubjects = subjects.filter(subject => subject.type === 'legislative');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-primary-500" />
          Legislative Bills
        </h3>
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
      
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="primary">
            Search
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {Object.keys(filters).length > 0 && (
              <span className="ml-2 bg-primary-100 text-primary-700 rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {Object.keys(filters).length}
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Success/Error Messages */}
      {error && (
        <div className={`p-4 rounded-lg border flex items-center space-x-2 mb-4 ${
          error.includes('Failed') 
            ? 'bg-error-50 border-error-200 text-error-700'
            : 'bg-success-50 border-success-200 text-success-700'
        }`}>
          {error.includes('Failed') ? (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
          )}
          <p>{error}</p>
        </div>
      )}

      {/* Bills List */}
      {bills.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>Showing {bills.length} of {totalBills} bills</span>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  loadBills();
                }}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1"
              >
                <option value="updated_at">Last Updated</option>
                <option value="introduced_date">Date Introduced</option>
                <option value="title">Title</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as 'asc' | 'desc');
                  loadBills();
                }}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
          
          {bills.map((bill, index) => {
            if (bills.length === index + 1) {
              return (
                <div ref={lastBillElementRef} key={bill.id}>
                  <BillCard
                    bill={bill}
                    onClick={() => onBillClick?.(bill)}
                  />
                </div>
              );
            } else {
              return (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onClick={() => onBillClick?.(bill)}
                />
              );
            }
          })}
          
          {/* Loading More Indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading bills...</p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || Object.keys(filters).length > 0
              ? 'Try adjusting your filters or search criteria to find bills.'
              : 'Get started by syncing the latest bills from Congress.gov.'
            }
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="primary" onClick={handleSyncBills} disabled={syncing}>
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
              <Button variant="outline" onClick={resetFilters}>
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};