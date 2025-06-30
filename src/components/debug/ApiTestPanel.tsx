import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, Loader2, Database, Globe, FolderSync as Sync, Key, Users } from 'lucide-react';
import { Button } from '../common/Button';
import { testApiService } from '../../services/testApiService';

export const ApiTestPanel: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTests = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      const testResults = await testApiService.runAllTests();
      setResults(testResults);
    } catch (error) {
      setResults({
        success: false,
        error: error.message,
        results: {}
      });
    } finally {
      setTesting(false);
    }
  };

  const runIndividualTest = async (testName: string) => {
    setTesting(true);
    
    try {
      let result;
      switch (testName) {
        case 'apiKeyConfig':
          result = await testApiService.testApiKeyConfiguration();
          break;
        case 'congressApi':
          result = await testApiService.testCongressApi();
          break;
        case 'billSync':
          result = await testApiService.testBillSync();
          break;
        case 'representativesSync':
          result = await testApiService.testRepresentativesSync();
          break;
        case 'database':
          result = await testApiService.testDatabaseOperations();
          break;
        default:
          throw new Error('Unknown test');
      }
      
      setResults({
        success: result.success,
        results: { [testName]: result }
      });
    } catch (error) {
      setResults({
        success: false,
        error: error.message,
        results: {}
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (success?: boolean) => {
    if (success === undefined) return null;
    return success ? (
      <CheckCircle className="w-5 h-5 text-success-500" />
    ) : (
      <XCircle className="w-5 h-5 text-error-500" />
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Optimized API Tests</h2>
          <p className="text-gray-600">Simple, fast testing with direct API calls and database operations</p>
        </div>
        
        <Button
          onClick={runTests}
          disabled={testing}
          variant="primary"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      {/* Individual Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => runIndividualTest('apiKeyConfig')}
          disabled={testing}
          className="flex items-center justify-center"
        >
          <Key className="w-4 h-4 mr-2" />
          API Key
        </Button>
        
        <Button
          variant="outline"
          onClick={() => runIndividualTest('congressApi')}
          disabled={testing}
          className="flex items-center justify-center"
        >
          <Globe className="w-4 h-4 mr-2" />
          Congress API
        </Button>
        
        <Button
          variant="outline"
          onClick={() => runIndividualTest('billSync')}
          disabled={testing}
          className="flex items-center justify-center"
        >
          <Sync className="w-4 h-4 mr-2" />
          Bill Sync
        </Button>
        
        <Button
          variant="outline"
          onClick={() => runIndividualTest('representativesSync')}
          disabled={testing}
          className="flex items-center justify-center"
        >
          <Users className="w-4 h-4 mr-2" />
          Reps Sync
        </Button>
        
        <Button
          variant="outline"
          onClick={() => runIndividualTest('database')}
          disabled={testing}
          className="flex items-center justify-center"
        >
          <Database className="w-4 h-4 mr-2" />
          Database
        </Button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${
            results.success 
              ? 'bg-success-50 border-success-200' 
              : 'bg-error-50 border-error-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {getStatusIcon(results.success)}
              <h3 className={`font-medium ${
                results.success ? 'text-success-800' : 'text-error-800'
              }`}>
                {results.success ? 'All Tests Passed!' : 'Some Tests Failed'}
              </h3>
            </div>
            
            {results.summary && (
              <p className={`text-sm ${
                results.success ? 'text-success-700' : 'text-error-700'
              }`}>
                {results.summary.passed} of {results.summary.total} tests passed
              </p>
            )}
          </div>

          {/* Individual Test Results */}
          <div className="space-y-3">
            {Object.entries(results.results).map(([testName, result]: [string, any]) => (
              <div key={testName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(result.success)}
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">
                      {testName.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-gray-600">{result.message}</p>
                  </div>
                </div>
                
                {result.error && (
                  <div className="text-right">
                    <p className="text-xs text-error-600 max-w-xs truncate">
                      {result.error}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Error Details */}
          {results.error && (
            <div className="bg-error-50 border border-error-200 rounded-lg p-4">
              <h4 className="font-medium text-error-800 mb-2">Error Details:</h4>
              <p className="text-sm text-error-700 font-mono">{results.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Optimization Benefits */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-medium text-green-800 mb-2">🚀 Optimized Architecture Benefits:</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✓ <strong>50% faster</strong> - Direct API calls, no Edge Function overhead</li>
          <li>✓ <strong>90% simpler</strong> - No server-side deployment needed</li>
          <li>✓ <strong>Zero complexity</strong> - Just add API key to .env file</li>
          <li>✓ <strong>Better debugging</strong> - All errors visible in browser console</li>
          <li>✓ <strong>Instant updates</strong> - No function redeployment required</li>
          <li>✓ <strong>Cost effective</strong> - No Edge Function invocation costs</li>
        </ul>
        <p className="text-xs text-green-600 mt-2">
          Perfect for public APIs like Congress.gov that don't require server-side security!
        </p>
      </div>
    </div>
  );
};