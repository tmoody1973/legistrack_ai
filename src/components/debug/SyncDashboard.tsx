import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, Clock, Database, AlertTriangle, CheckCircle, Loader2, FileText, Tag, Book } from 'lucide-react';
import { Button } from '../common/Button';
import { billSyncService } from '../../services/billSyncService';

export const SyncDashboard: React.FC = () => {
  const [syncStats, setSyncStats] = useState<{
    totalBills: number;
    recentlySynced: number;
    needsUpdate: number;
    lastSyncTime: string | null;
  } | null>(null);
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [initialCollection, setInitialCollection] = useState(false);
  const [collectionResult, setCollectionResult] = useState<any>(null);
  
  // Load sync stats on mount
  useEffect(() => {
    loadSyncStats();
  }, []);
  
  const loadSyncStats = async () => {
    try {
      setLoadingStats(true);
      const stats = await billSyncService.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      console.error('Error loading sync stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };
  
  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      
      const result = await billSyncService.syncAllBills(50);
      setSyncResult(result);
      
      // Reload stats after sync
      await loadSyncStats();
    } catch (error) {
      console.error('Error syncing bills:', error);
      setSyncResult({
        success: false,
        message: `Error syncing bills: ${error.message}`
      });
    } finally {
      setSyncing(false);
    }
  };
  
  const handleInitialCollection = async () => {
    try {
      setInitialCollection(true);
      setCollectionResult(null);
      
      const result = await billSyncService.initialDataCollection(118, 50);
      setCollectionResult(result);
      
      // Reload stats after collection
      await loadSyncStats();
    } catch (error) {
      console.error('Error in initial data collection:', error);
      setCollectionResult({
        success: false,
        message: `Error in initial data collection: ${error.message}`
      });
    } finally {
      setInitialCollection(false);
    }
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Database className="w-5 h-5 mr-2 text-primary-500" />
            Bill Sync Dashboard
          </h2>
          <p className="text-gray-600">Monitor and manage bill data synchronization</p>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadSyncStats}
            disabled={loadingStats}
          >
            {loadingStats ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Sync Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Total Bills</h3>
            <Database className="w-4 h-4 text-gray-400" />
          </div>
          {loadingStats ? (
            <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900">{syncStats?.totalBills.toLocaleString() || 0}</p>
          )}
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-700">Recently Synced</h3>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          {loadingStats ? (
            <div className="h-6 bg-green-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold text-green-700">{syncStats?.recentlySynced.toLocaleString() || 0}</p>
          )}
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-yellow-700">Needs Update</h3>
            <RefreshCw className="w-4 h-4 text-yellow-500" />
          </div>
          {loadingStats ? (
            <div className="h-6 bg-yellow-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold text-yellow-700">{syncStats?.needsUpdate.toLocaleString() || 0}</p>
          )}
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-700">Last Sync</h3>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          {loadingStats ? (
            <div className="h-6 bg-blue-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-sm font-medium text-blue-700">{formatDate(syncStats?.lastSyncTime || null)}</p>
          )}
        </div>
      </div>
      
      {/* Sync Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center mb-4">
            <RefreshCw className="w-5 h-5 text-primary-500 mr-2" />
            <h3 className="font-medium text-gray-900">Ongoing Synchronization</h3>
          </div>
          
          <p className="text-gray-600 text-sm mb-4">
            Update existing bills with the latest data from Congress.gov. This process will sync up to 50 bills that need updating.
          </p>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {syncStats?.needsUpdate} bills need updating
            </div>
            
            <Button 
              onClick={handleSync} 
              disabled={syncing}
              variant="primary"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Bills
                </>
              )}
            </Button>
          </div>
          
          {/* Sync Result */}
          {syncResult && (
            <div className={`mt-4 p-3 rounded-lg border ${
              syncResult.success 
                ? 'bg-success-50 border-success-200 text-success-700' 
                : 'bg-error-50 border-error-200 text-error-700'
            }`}>
              <div className="flex items-center">
                {syncResult.success ? (
                  <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                )}
                <p>{syncResult.message}</p>
              </div>
              
              {syncResult.success && syncResult.count > 0 && (
                <p className="text-sm mt-1">
                  Updated {syncResult.count} bills successfully
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center mb-4">
            <Database className="w-5 h-5 text-primary-500 mr-2" />
            <h3 className="font-medium text-gray-900">Initial Data Collection</h3>
          </div>
          
          <p className="text-gray-600 text-sm mb-4">
            Fetch new bills from Congress.gov that aren't in the database yet. This process will collect up to 50 bills.
          </p>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleInitialCollection} 
              disabled={initialCollection}
              variant="primary"
            >
              {initialCollection ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Collecting...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Collect New Bills
                </>
              )}
            </Button>
          </div>
          
          {/* Collection Result */}
          {collectionResult && (
            <div className={`mt-4 p-3 rounded-lg border ${
              collectionResult.success 
                ? 'bg-success-50 border-success-200 text-success-700' 
                : 'bg-error-50 border-error-200 text-error-700'
            }`}>
              <div className="flex items-center">
                {collectionResult.success ? (
                  <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                )}
                <p>{collectionResult.message}</p>
              </div>
              
              {collectionResult.success && collectionResult.count > 0 && (
                <p className="text-sm mt-1">
                  Collected {collectionResult.count} new bills
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Data Components */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 flex items-center">
          <FileText className="w-8 h-8 text-blue-500 mr-3" />
          <div>
            <h3 className="font-medium text-blue-800">Bill Summaries</h3>
            <p className="text-sm text-blue-600">Official summaries from Congress.gov</p>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-200 flex items-center">
          <Tag className="w-8 h-8 text-green-500 mr-3" />
          <div>
            <h3 className="font-medium text-green-800">Subjects & Policy Areas</h3>
            <p className="text-sm text-green-600">Legislative subjects and policy classifications</p>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 flex items-center">
          <Book className="w-8 h-8 text-purple-500 mr-3" />
          <div>
            <h3 className="font-medium text-purple-800">Full Text</h3>
            <p className="text-sm text-purple-600">Complete bill text for analysis</p>
          </div>
        </div>
      </div>
      
      {/* Sync Schedule Info */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center mb-2">
          <Calendar className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="font-medium text-gray-900">Sync Schedule</h3>
        </div>
        
        <p className="text-sm text-gray-600">
          For production use, set up a scheduled sync to run every hour using the <code className="bg-gray-100 px-1 py-0.5 rounded">billSyncService.scheduleRegularSync(60, 20)</code> method. This will keep your database up-to-date with the latest legislative data.
        </p>
      </div>
    </div>
  );
};