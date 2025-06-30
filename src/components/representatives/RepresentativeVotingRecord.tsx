import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, XCircle, Calendar, Clock, Loader2, Filter, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '../common/Button';
import { congressVotingService } from '../../services/congressVotingService';
import type { Representative } from '../../types';

interface RepresentativeVotingRecordProps {
  representative: Representative;
}

export const RepresentativeVotingRecord: React.FC<RepresentativeVotingRecordProps> = ({ representative }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votes, setVotes] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [congress, setCongress] = useState<number>(118); // Default to current congress
  const [session, setSession] = useState<number | undefined>(undefined);
  const [expandedVote, setExpandedVote] = useState<string | null>(null);
  const [voteStats, setVoteStats] = useState<{
    total: number;
    yeas: number;
    nays: number;
    present: number;
    notVoting: number;
    withParty: number;
    againstParty: number;
  }>({
    total: 0,
    yeas: 0,
    nays: 0,
    present: 0,
    notVoting: 0,
    withParty: 0,
    againstParty: 0
  });

  // Load votes when component mounts or filters change
  useEffect(() => {
    loadMemberVotes();
  }, [representative.bioguide_id, congress, session]);

  const loadMemberVotes = async () => {
    try {
      setLoading(true);
      setError(null);
      setVotes([]);
      
      // Get votes for this member
      const response = await congressVotingService.getMemberVotingRecord(
        congress,
        representative.bioguide_id,
        session,
        50 // Get more votes for better statistics
      );
      
      setVotes(response.votes || []);
      
      if (response.votes.length === 0) {
        setError('No votes found for this representative');
      } else {
        // Calculate voting statistics
        calculateVotingStats(response.votes);
      }
    } catch (error) {
      console.error('Error loading member votes:', error);
      setError(`Failed to load voting data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateVotingStats = (votes: any[]) => {
    const stats = {
      total: votes.length,
      yeas: 0,
      nays: 0,
      present: 0,
      notVoting: 0,
      withParty: 0,
      againstParty: 0
    };
    
    votes.forEach(vote => {
      // Count by position
      const position = vote.position?.toLowerCase() || '';
      if (position.includes('yea') || position.includes('aye') || position === 'yes') {
        stats.yeas++;
      } else if (position.includes('nay') || position === 'no') {
        stats.nays++;
      } else if (position.includes('present')) {
        stats.present++;
      } else if (position.includes('not voting')) {
        stats.notVoting++;
      }
      
      // Count party unity
      if (vote.partyPosition && vote.position) {
        if (vote.partyPosition === vote.position) {
          stats.withParty++;
        } else if (vote.position !== 'Not Voting' && vote.position !== 'Present') {
          stats.againstParty++;
        }
      }
    });
    
    setVoteStats(stats);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getVoteResultColor = (result: string) => {
    const lowerResult = result.toLowerCase();
    if (lowerResult.includes('passed') || lowerResult.includes('agreed')) {
      return 'bg-success-100 text-success-700';
    }
    if (lowerResult.includes('failed') || lowerResult.includes('rejected')) {
      return 'bg-error-100 text-error-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getVotePositionColor = (position: string) => {
    const lowerPosition = position.toLowerCase();
    if (lowerPosition.includes('yea') || lowerPosition.includes('aye') || lowerPosition === 'yes') {
      return 'text-success-600';
    }
    if (lowerPosition.includes('nay') || lowerPosition === 'no') {
      return 'text-error-600';
    }
    if (lowerPosition.includes('present')) {
      return 'text-yellow-600';
    }
    return 'text-gray-600';
  };

  const getVotePositionIcon = (position: string) => {
    const lowerPosition = position.toLowerCase();
    if (lowerPosition.includes('yea') || lowerPosition.includes('aye') || lowerPosition === 'yes') {
      return <CheckCircle className="w-4 h-4 text-success-600" />;
    }
    if (lowerPosition.includes('nay') || lowerPosition === 'no') {
      return <XCircle className="w-4 h-4 text-error-600" />;
    }
    return null;
  };

  const toggleVoteExpansion = (voteId: string) => {
    if (expandedVote === voteId) {
      setExpandedVote(null);
    } else {
      setExpandedVote(voteId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Voting Record</h2>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadMemberVotes}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
          <h3 className="font-medium text-gray-900 mb-3">Filter Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Congress
              </label>
              <select
                value={congress}
                onChange={(e) => setCongress(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="119">119th Congress (2025-2027)</option>
                <option value="118">118th Congress (2023-2025)</option>
                <option value="117">117th Congress (2021-2023)</option>
                <option value="116">116th Congress (2019-2021)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session
              </label>
              <select
                value={session || ''}
                onChange={(e) => setSession(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Sessions</option>
                <option value="1">Session 1</option>
                <option value="2">Session 2</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={loadMemberVotes}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Loading...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-error-500 mr-3 mt-0.5" />
            <p className="text-error-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Voting Statistics */}
      {!loading && votes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Voting Statistics</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{voteStats.total}</p>
              <p className="text-xs text-gray-500">Total Votes</p>
            </div>
            
            <div className="bg-success-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-success-600">{voteStats.yeas}</p>
              <p className="text-xs text-gray-500">Yea Votes</p>
            </div>
            
            <div className="bg-error-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-error-600">{voteStats.nays}</p>
              <p className="text-xs text-gray-500">Nay Votes</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-600">{voteStats.notVoting}</p>
              <p className="text-xs text-gray-500">Not Voting</p>
            </div>
          </div>
          
          {/* Party Unity */}
          {voteStats.withParty + voteStats.againstParty > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Party Unity</h4>
              <div className="bg-gray-100 h-4 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500"
                  style={{ 
                    width: `${Math.round((voteStats.withParty / (voteStats.withParty + voteStats.againstParty)) * 100)}%` 
                  }}
                ></div>
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>Votes with Party: {voteStats.withParty}</span>
                <span>
                  {Math.round((voteStats.withParty / (voteStats.withParty + voteStats.againstParty)) * 100)}% Party Unity
                </span>
                <span>Votes against Party: {voteStats.againstParty}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mr-3" />
          <p className="text-gray-600">Loading voting record...</p>
        </div>
      )}
      
      {/* Votes List */}
      {!loading && votes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">
              Voting Record: {representative.full_name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {votes.length} vote{votes.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {votes.map((vote) => (
              <div key={`${vote.congress}-${vote.session}-${vote.rollCall}`} className="p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleVoteExpansion(`${vote.congress}-${vote.session}-${vote.rollCall}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="font-medium text-gray-900">{vote.question}</h4>
                      <div className="flex items-center ml-3">
                        {getVotePositionIcon(vote.position)}
                        <span className={`ml-1 text-sm font-medium ${getVotePositionColor(vote.position)}`}>
                          {vote.position}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{formatDate(vote.date)}</span>
                      <span className="mx-2">•</span>
                      <span>Roll Call {vote.rollCall}</span>
                      <span className="mx-2">•</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getVoteResultColor(vote.result)}`}>
                        {vote.result}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {expandedVote === `${vote.congress}-${vote.session}-${vote.rollCall}` ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {/* Expanded Vote Details */}
                {expandedVote === `${vote.congress}-${vote.session}-${vote.rollCall}` && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {/* Bill Information */}
                    {vote.bill && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <h5 className="font-medium text-gray-900 mb-1">Related Bill</h5>
                        <p className="text-sm text-gray-700">
                          {vote.bill.type} {vote.bill.number}: {vote.bill.title}
                        </p>
                        {vote.bill.url && (
                          <a 
                            href={vote.bill.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
                          >
                            View Bill on Congress.gov
                          </a>
                        )}
                      </div>
                    )}
                    
                    {/* Vote Description */}
                    {vote.description && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <h5 className="font-medium text-gray-900 mb-1">Description</h5>
                        <p className="text-sm text-gray-700">{vote.description}</p>
                      </div>
                    )}
                    
                    {/* Party Position */}
                    {vote.partyPosition && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-1">Party Position</h5>
                        <div className="flex items-center">
                          {getVotePositionIcon(vote.partyPosition)}
                          <span className={`ml-1 text-sm ${getVotePositionColor(vote.partyPosition)}`}>
                            {representative.party === 'D' ? 'Democratic' : 
                             representative.party === 'R' ? 'Republican' : 
                             representative.party === 'I' ? 'Independent' : representative.party} Party Position: {vote.partyPosition}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Vote Links */}
                    <div className="flex justify-end">
                      {vote.url && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild
                        >
                          <a href={vote.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on Congress.gov
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* No Votes */}
      {!loading && votes.length === 0 && !error && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Votes Found</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            There are no recorded votes for this representative with the current filters. Try adjusting your filters or checking back later.
          </p>
        </div>
      )}
      
      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 mb-1">Voting Data Disclaimer</h3>
            <p className="text-yellow-700 text-sm">
              Voting data is sourced from the official Congress.gov API. The information shown here is for reference purposes only and may not include all votes or the most recent activity. For the most up-to-date and comprehensive voting information, please visit the official Congress.gov website.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};