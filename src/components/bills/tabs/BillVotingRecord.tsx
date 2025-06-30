import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, AlertTriangle, TrendingUp, Filter, Search, Calendar, Loader2 } from 'lucide-react';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { congressVotingService } from '../../../services/congressVotingService';
import { govtrackApiService } from '../../../services/govtrackApiService';
import type { Bill, Vote } from '../../../types';

interface BillVotingRecordProps {
  bill: Bill;
}

export const BillVotingRecord: React.FC<BillVotingRecordProps> = ({ bill }) => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null);
  const [voteDetails, setVoteDetails] = useState<any | null>(null);
  const [voteVoters, setVoteVoters] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filterParty, setFilterParty] = useState<string | null>(null);
  const [filterPosition, setFilterPosition] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBillVotes();
  }, [bill.id]);

  const loadBillVotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Parse bill ID to get congress, type, and number
      const [congress, billType, number] = bill.id.split('-');
      
      if (!congress || !billType || !number) {
        throw new Error('Invalid bill ID format');
      }

      // Fetch votes for this bill
      const response = await congressVotingService.getBillVotes(
        parseInt(congress),
        billType,
        parseInt(number)
      );

      setVotes(response.votes || []);
      
      // If we have votes in the bill's voting_data, use those as a fallback
      if ((!response.votes || response.votes.length === 0) && bill.voting_data?.votes?.length > 0) {
        setVotes(bill.voting_data.votes);
      }
    } catch (error) {
      console.error('Error loading bill votes:', error);
      setError(`Error loading bill votes: ${error.message}`);
      
      // Fallback to bill's voting_data if available
      if (bill.voting_data?.votes?.length > 0) {
        setVotes(bill.voting_data.votes);
        setError('Could not load fresh voting data. Using cached data instead.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVoteDetails = async (vote: Vote) => {
    try {
      setLoadingDetails(true);
      setSelectedVote(vote);
      setVoteDetails(null);
      setVoteVoters([]);
      
      // Fetch vote details from GovTrack
      const details = await govtrackApiService.getVoteDetails(vote.govtrack_vote_id);
      setVoteDetails(details);
      
      // Fetch vote voters (how members voted)
      const voters = await govtrackApiService.getVoteVoters(vote.govtrack_vote_id);
      setVoteVoters(voters);
    } catch (error) {
      console.error('Error loading vote details:', error);
      setError(`Error loading vote details: ${error.message}`);
    } finally {
      setLoadingDetails(false);
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

  // Filter vote voters by party and position
  const filteredVoters = voteVoters.filter(voter => {
    // Filter by party
    if (filterParty && voter.person_role?.party !== filterParty) {
      return false;
    }
    
    // Filter by position
    if (filterPosition && voter.option?.key !== filterPosition) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !voter.person?.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Get vote option display text
  const getVoteOptionText = (option: string) => {
    switch (option) {
      case '+': return 'Yea/Yes';
      case '-': return 'Nay/No';
      case '0': return 'Not Voting';
      case 'P': return 'Present';
      default: return option;
    }
  };

  // Get vote option color class
  const getVoteOptionColor = (option: string) => {
    switch (option) {
      case '+': return 'text-success-600';
      case '-': return 'text-error-600';
      case '0': return 'text-gray-400';
      case 'P': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Voting Record</h2>
      
      {bill.voting_data && bill.voting_data.vote_count > 0 ? (
        <div className="space-y-6">
          {/* Vote Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2">Vote Summary</h3>
              <p className="text-gray-700">
                This bill has {bill.voting_data.vote_count} recorded vote{bill.voting_data.vote_count !== 1 ? 's' : ''}.
              </p>
              {bill.voting_data.last_vote_date && (
                <p className="text-sm text-gray-500 mt-1">
                  Last vote: {formatDate(bill.voting_data.last_vote_date)}
                </p>
              )}
            </div>
            
            {/* Vote Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{bill.voting_data.vote_count}</p>
                <p className="text-xs text-gray-500">Total Votes</p>
              </div>
              
              {votes.length > 0 && (
                <>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {votes.reduce((sum, vote) => sum + vote.total_plus, 0)}
                    </p>
                    <p className="text-xs text-gray-500">Total Yeas</p>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {votes.reduce((sum, vote) => sum + vote.total_minus, 0)}
                    </p>
                    <p className="text-xs text-gray-500">Total Nays</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-600">
                      {votes.reduce((sum, vote) => sum + vote.total_other, 0)}
                    </p>
                    <p className="text-xs text-gray-500">Not Voting/Present</p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Vote List */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Vote History</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500 mr-3" />
                <p className="text-gray-600">Loading votes...</p>
              </div>
            ) : votes.length > 0 ? (
              <div className="space-y-4">
                {votes.map((vote, index) => (
                  <div 
                    key={vote.id || index} 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedVote?.id === vote.id 
                        ? 'border-primary-300 bg-primary-50' 
                        : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
                    }`}
                    onClick={() => loadVoteDetails(vote)}
                  >
                    <div className="flex justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{vote.question}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        vote.result.toLowerCase().includes('pass') ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700'
                      }`}>
                        {vote.result}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {formatDate(vote.created)} • {vote.chamber === 'house' ? 'House' : 'Senate'}
                    </p>
                    
                    {/* Vote Breakdown */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center mb-1">
                          <CheckCircle className="w-4 h-4 text-success-600" />
                        </div>
                        <div className="text-sm font-bold text-success-600">{vote.total_plus}</div>
                        <div className="text-xs text-gray-500">Yea/Yes</div>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-error-100 flex items-center justify-center mb-1">
                          <XCircle className="w-4 h-4 text-error-600" />
                        </div>
                        <div className="text-sm font-bold text-error-600">{vote.total_minus}</div>
                        <div className="text-xs text-gray-500">Nay/No</div>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                          <Users className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="text-sm font-bold text-gray-600">{vote.total_other}</div>
                        <div className="text-xs text-gray-500">Not Voting/Present</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Votes Recorded</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  There are no recorded votes for this bill yet. Votes will appear here as the bill progresses through Congress.
                </p>
              </div>
            )}
          </div>
          
          {/* Vote Details */}
          {selectedVote && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Vote Details: {selectedVote.question}</h3>
              
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500 mr-3" />
                  <p className="text-gray-600">Loading vote details...</p>
                </div>
              ) : voteDetails ? (
                <div className="space-y-4">
                  {/* Vote Information */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-1">Vote Information</h4>
                      <p className="text-sm text-gray-600">Date: {formatDate(voteDetails.created)}</p>
                      <p className="text-sm text-gray-600">Congress: {voteDetails.congress}</p>
                      <p className="text-sm text-gray-600">Chamber: {voteDetails.chamber === 'h' ? 'House' : 'Senate'}</p>
                      <p className="text-sm text-gray-600">Session: {voteDetails.session}</p>
                      <p className="text-sm text-gray-600">Number: {voteDetails.number}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-1">Result</h4>
                      <p className="text-sm text-gray-600">Result: {voteDetails.result}</p>
                      <p className="text-sm text-gray-600">Required: {voteDetails.required || 'Simple Majority'}</p>
                      <p className="text-sm text-gray-600">Category: {voteDetails.category || 'N/A'}</p>
                      {voteDetails.link && (
                        <p className="text-sm text-gray-600 mt-2">
                          <a 
                            href={`https://www.govtrack.us${voteDetails.link}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline"
                          >
                            View on GovTrack
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Vote Breakdown */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Vote Breakdown</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <div className="text-lg font-bold text-success-600">{voteDetails.total_plus}</div>
                        <div className="text-xs text-gray-500">Yea/Yes</div>
                      </div>
                      
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <div className="text-lg font-bold text-error-600">{voteDetails.total_minus}</div>
                        <div className="text-xs text-gray-500">Nay/No</div>
                      </div>
                      
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <div className="text-lg font-bold text-gray-600">{voteDetails.total_other}</div>
                        <div className="text-xs text-gray-500">Not Voting/Present</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Party Breakdown */}
                  {voteDetails.party_votes && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Party Breakdown</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Yea/Yes</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Nay/No</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Not Voting/Present</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(voteDetails.party_votes).map(([party, votes]: [string, any]) => (
                              <tr key={party}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{party}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-success-600 font-medium">{votes['+'] || 0}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-error-600 font-medium">{votes['-'] || 0}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">{(votes['0'] || 0) + (votes['P'] || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {/* Member Votes */}
                  {voteVoters.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Member Votes</h4>
                      
                      {/* Filters */}
                      <div className="flex flex-wrap gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Party</label>
                          <select
                            value={filterParty || ''}
                            onChange={(e) => setFilterParty(e.target.value || null)}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">All Parties</option>
                            <option value="Democrat">Democrat</option>
                            <option value="Republican">Republican</option>
                            <option value="Independent">Independent</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Vote</label>
                          <select
                            value={filterPosition || ''}
                            onChange={(e) => setFilterPosition(e.target.value || null)}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">All Votes</option>
                            <option value="+">Yea/Yes</option>
                            <option value="-">Nay/No</option>
                            <option value="0">Not Voting</option>
                            <option value="P">Present</option>
                          </select>
                        </div>
                        
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Search Members</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                              type="text"
                              placeholder="Search by name..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-9 py-1.5 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Member List */}
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="max-h-96 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vote</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredVoters.length > 0 ? (
                                filteredVoters.map((voter) => (
                                  <tr key={voter.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {voter.person?.name || 'Unknown'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {voter.person_role?.party || 'Unknown'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {voter.person_role?.state || 'Unknown'}
                                      {voter.person_role?.district && ` (${voter.person_role.district})`}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                      <span className={getVoteOptionColor(voter.option?.key)}>
                                        {getVoteOptionText(voter.option?.key)}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                                    No members match the current filters
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Filter Summary */}
                        <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            Showing {filteredVoters.length} of {voteVoters.length} members
                            {filterParty && ` • Party: ${filterParty}`}
                            {filterPosition && ` • Vote: ${getVoteOptionText(filterPosition)}`}
                            {searchTerm && ` • Search: "${searchTerm}"`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Vote Details Not Available</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Detailed information for this vote could not be loaded. Please try again later.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Voting Predictions */}
          {bill.ai_analysis?.passagePrediction && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">
                <TrendingUp className="w-5 h-5 inline mr-2 text-primary-500" />
                Voting Predictions
              </h3>
              
              {bill.ai_analysis.passagePrediction.probability !== undefined && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Probability of Passage</span>
                    <span className="text-sm font-medium text-primary-600">
                      {Math.round(bill.ai_analysis.passagePrediction.probability * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-500" 
                      style={{ width: `${bill.ai_analysis.passagePrediction.probability * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {bill.ai_analysis.passagePrediction.reasoning && (
                <p className="text-gray-700 text-sm">{bill.ai_analysis.passagePrediction.reasoning}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Votes Recorded</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            There are no recorded votes for this bill yet. Votes will appear here as the bill progresses through Congress.
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
              Voting data is sourced from GovTrack.us. Predictions are generated by AI based on historical patterns and current political factors. Actual results may vary.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};