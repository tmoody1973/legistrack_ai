import React, { useState, useEffect } from 'react';
import { Filter, X, Search, Calendar, MapPin, Users, Globe, Tag } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { billService } from '../../services/billService';
import type { BillSearchParams, BillSubject } from '../../types';

interface BillFiltersProps {
  filters: Partial<BillSearchParams>;
  onFiltersChange: (filters: Partial<BillSearchParams>) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onClearFilters: () => void;
  onAPISearch?: (query: string, filters: any) => void;
}

export const BillFilters: React.FC<BillFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  searchQuery,
  onClearFilters,
  onAPISearch,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [searchMode, setSearchMode] = useState<'database' | 'api'>('database');
  const [showSubjectsFilter, setShowSubjectsFilter] = useState(false);
  const [subjects, setSubjects] = useState<BillSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(filters.subjects || []);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');

  // Load available subjects
  useEffect(() => {
    if (showSubjectsFilter && subjects.length === 0) {
      loadSubjects();
    }
  }, [showSubjectsFilter]);

  // Load subjects from API
  const loadSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const allSubjects = await billService.getAllSubjects();
      setSubjects(allSubjects);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchMode === 'api' && onAPISearch) {
      // Search via Congress.gov API
      onAPISearch(localQuery, {
        congress: filters.congress,
        billType: filters.bill_type,
        limit: filters.limit || 20,
        subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined
      });
    } else {
      // Search in database
      onSearch(localQuery);
    }
  };

  const handleFilterChange = (key: keyof BillSearchParams, value: any) => {
    if (key === 'subjects') {
      setSelectedSubjects(value || []);
    }
    
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const handleSubjectToggle = (subjectId: string) => {
    const newSelectedSubjects = selectedSubjects.includes(subjectId)
      ? selectedSubjects.filter(id => id !== subjectId)
      : [...selectedSubjects, subjectId];
    
    setSelectedSubjects(newSelectedSubjects);
    handleFilterChange('subjects', newSelectedSubjects);
  };

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== undefined && value !== null && value !== '' && 
    !(Array.isArray(value) && value.length === 0)
  ).length;

  const congressOptions = [
    { value: 118, label: '118th (2023-2025) - Current' },
    { value: 117, label: '117th (2021-2023)' },
    { value: 116, label: '116th (2019-2021)' },
  ];

  const billTypeOptions = [
    { value: 'HR', label: 'House Bills (HR)' },
    { value: 'S', label: 'Senate Bills (S)' },
    { value: 'HJRES', label: 'House Joint Resolutions' },
    { value: 'SJRES', label: 'Senate Joint Resolutions' },
    { value: 'HCONRES', label: 'House Concurrent Resolutions' },
    { value: 'SCONRES', label: 'Senate Concurrent Resolutions' },
    { value: 'HRES', label: 'House Simple Resolutions' },
    { value: 'SRES', label: 'Senate Simple Resolutions' },
  ];

  const stateOptions = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const partyOptions = [
    { value: 'D', label: 'Democratic' },
    { value: 'R', label: 'Republican' },
    { value: 'I', label: 'Independent' },
  ];

  const sortOptions = [
    { value: 'introduced_date', label: 'Date Introduced' },
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'title', label: 'Title (A-Z)' },
    ...(searchQuery ? [{ value: 'relevance', label: 'Relevance' }] : []),
  ];

  // Filter subjects based on search query
  const filteredSubjects = subjects.filter(subject => 
    !subjectSearchQuery || 
    subject.name.toLowerCase().includes(subjectSearchQuery.toLowerCase())
  );

  // Group subjects by type
  const policyAreas = filteredSubjects.filter(subject => subject.type === 'policy');
  const legislativeSubjects = filteredSubjects.filter(subject => subject.type === 'legislative');

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Search Bar with Mode Toggle */}
      <div className="p-6 border-b border-gray-100">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          {/* Search Mode Toggle */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Search in:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setSearchMode('database')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  searchMode === 'database'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📦 Database
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('api')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  searchMode === 'api'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Globe className="w-3 h-3 inline mr-1" />
                Congress.gov API
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={
                  searchMode === 'api' 
                    ? "Search all bills on Congress.gov (will auto-save tracked bills)..."
                    : "Search bills in database..."
                }
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button type="submit" size="lg" className="px-8">
              {searchMode === 'api' ? 'Search API' : 'Search'}
            </Button>
          </div>

          {/* Search Mode Info */}
          <div className="text-xs text-gray-500">
            {searchMode === 'database' ? (
              <span>🔍 Searching cached bills in database (faster, limited to synced bills)</span>
            ) : (
              <span>🌐 Searching all bills on Congress.gov (slower, comprehensive, auto-saves tracked bills)</span>
            )}
          </div>
        </form>
      </div>

      {/* Filter Toggle */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <Filter className="w-5 h-5" />
            <span className="font-medium">Advanced Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-medium">
                {activeFilterCount}
              </span>
            )}
          </button>
          
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Basic Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Congress */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Congress
              </label>
              <select
                value={filters.congress || ''}
                onChange={(e) => handleFilterChange('congress', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Congresses</option>
                {congressOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bill Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Type
              </label>
              <select
                value={filters.bill_type || ''}
                onChange={(e) => handleFilterChange('bill_type', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                {billTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sponsor State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Sponsor State
              </label>
              <select
                value={filters.sponsor_state || ''}
                onChange={(e) => handleFilterChange('sponsor_state', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All States</option>
                {stateOptions.map(state => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Sponsor Party */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Sponsor Party
              </label>
              <select
                value={filters.sponsor_party || ''}
                onChange={(e) => handleFilterChange('sponsor_party', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Parties</option>
                {partyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* NEW: Subject Filter Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowSubjectsFilter(!showSubjectsFilter)}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <Tag className="w-4 h-4" />
              <span>{showSubjectsFilter ? 'Hide Subject Filters' : 'Show Subject Filters'}</span>
              {selectedSubjects.length > 0 && (
                <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs">
                  {selectedSubjects.length} selected
                </span>
              )}
            </button>
          </div>

          {/* NEW: Subject Filters */}
          {showSubjectsFilter && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Filter by Subject</h4>
                {selectedSubjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubjects([]);
                      handleFilterChange('subjects', []);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear subjects
                  </button>
                )}
              </div>

              {/* Subject Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {loadingSubjects ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading subjects...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Policy Areas */}
                  {policyAreas.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Policy Areas</h5>
                      <div className="flex flex-wrap gap-2">
                        {policyAreas.map(subject => (
                          <label
                            key={subject.id}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                              selectedSubjects.includes(subject.id)
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedSubjects.includes(subject.id)}
                              onChange={() => handleSubjectToggle(subject.id)}
                              className="sr-only"
                            />
                            {subject.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legislative Subjects */}
                  {legislativeSubjects.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Legislative Subjects</h5>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                        {legislativeSubjects.map(subject => (
                          <label
                            key={subject.id}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                              selectedSubjects.includes(subject.id)
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedSubjects.includes(subject.id)}
                              onChange={() => handleSubjectToggle(subject.id)}
                              className="sr-only"
                            />
                            {subject.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredSubjects.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No subjects match your search. Try a different term or clear the search.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sort and Order */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={filters.sort || 'introduced_date'}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order
              </label>
              <select
                value={filters.order || 'desc'}
                onChange={(e) => handleFilterChange('order', e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (!value || (Array.isArray(value) && value.length === 0)) return null;
                  
                  // Skip subjects as they're shown separately
                  if (key === 'subjects') return null;
                  
                  let displayValue = value.toString();
                  if (key === 'congress') {
                    const congress = congressOptions.find(c => c.value === value);
                    displayValue = congress ? congress.label : value.toString();
                  } else if (key === 'bill_type') {
                    const type = billTypeOptions.find(t => t.value === value);
                    displayValue = type ? type.label : value.toString();
                  } else if (key === 'sponsor_party') {
                    const party = partyOptions.find(p => p.value === value);
                    displayValue = party ? party.label : value.toString();
                  }
                  
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700"
                    >
                      {key.replace('_', ' ')}: {displayValue}
                      <button
                        onClick={() => handleFilterChange(key as keyof BillSearchParams, undefined)}
                        className="ml-2 hover:text-primary-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                {/* Show selected subjects */}
                {selectedSubjects.length > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                    Subjects: {selectedSubjects.length} selected
                    <button
                      onClick={() => {
                        setSelectedSubjects([]);
                        handleFilterChange('subjects', []);
                      }}
                      className="ml-2 hover:text-primary-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};