import { congressApiService } from './congressApiService';
import { billService } from './billService';
import { representativeService } from './representativeService';

export class TestApiService {
  // Test Congress.gov API directly
  async testCongressApi() {
    try {
      console.log('🔍 Testing Congress.gov API directly...');
      
      const response = await congressApiService.getBills({
        congress: 118,
        limit: 5
      });
      
      console.log('✅ Congress.gov API working!');
      console.log(`📊 Found ${response.bills?.length || 0} bills`);
      
      if (response.bills && response.bills.length > 0) {
        const firstBill = response.bills[0];
        console.log(`📋 Sample bill: ${firstBill.type} ${firstBill.number} - ${firstBill.title}`);
      }
      
      return {
        success: true,
        data: response,
        message: 'Congress.gov API is working correctly'
      };
    } catch (error) {
      console.error('❌ Congress.gov API test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Congress.gov API test failed'
      };
    }
  }

  // Test bill sync functionality (now without Edge Functions!)
  async testBillSync() {
    try {
      console.log('🔄 Testing bill sync functionality (direct database storage)...');
      
      const result = await billService.syncBillsFromCongress({
        congress: 118,
        limit: 5  // Smaller test batch
      });
      
      console.log('✅ Bill sync working!');
      console.log(`📊 Synced ${result.count} bills directly to database`);
      
      return {
        success: true,
        data: result,
        message: `Successfully synced ${result.count} bills (no Edge Functions needed!)`
      };
    } catch (error) {
      console.error('❌ Bill sync test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Bill sync test failed'
      };
    }
  }

  // Test representatives sync functionality
  async testRepresentativesSync() {
    try {
      console.log('🔄 Testing representatives sync functionality...');
      
      const result = await representativeService.syncRepresentativesFromCongress();
      
      console.log('✅ Representatives sync working!');
      console.log(`📊 Synced ${result.count} representatives directly to database`);
      
      return {
        success: true,
        data: result,
        message: `Successfully synced ${result.count} representatives`
      };
    } catch (error) {
      console.error('❌ Representatives sync test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Representatives sync test failed'
      };
    }
  }

  // Test database operations
  async testDatabaseOperations() {
    try {
      console.log('🗄️ Testing database operations...');
      
      // Test getting bills from database
      const billsResponse = await billService.getBills({
        limit: 5,
        congress: 118
      });
      
      // Test getting representatives from database
      const repsResponse = await representativeService.getRepresentatives({
        limit: 5
      });
      
      console.log('✅ Database operations working!');
      console.log(`📊 Found ${billsResponse.data.length} bills and ${repsResponse.length} representatives in database`);
      
      return {
        success: true,
        data: { bills: billsResponse.data.length, representatives: repsResponse.length },
        message: `Database contains ${billsResponse.data.length} bills and ${repsResponse.length} representatives`
      };
    } catch (error) {
      console.error('❌ Database test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Database test failed'
      };
    }
  }

  // Test API key configuration
  async testApiKeyConfiguration() {
    try {
      console.log('🔑 Testing API key configuration...');
      
      const apiKey = import.meta.env.VITE_CONGRESS_API_KEY;
      
      if (!apiKey) {
        throw new Error('VITE_CONGRESS_API_KEY not found in environment variables');
      }
      
      if (apiKey === 'your_congress_api_key_here') {
        throw new Error('Please replace the placeholder API key with your actual Congress.gov API key');
      }
      
      // Test the API key with a simple request
      const testResult = await congressApiService.testConnection();
      
      if (!testResult.success) {
        throw new Error(testResult.error);
      }
      
      console.log('✅ API key configuration working!');
      
      return {
        success: true,
        data: { apiKey: `${apiKey.substring(0, 8)}...` },
        message: 'API key is properly configured and working'
      };
    } catch (error) {
      console.error('❌ API key test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'API key configuration test failed'
      };
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting comprehensive API and database tests (no Edge Functions!)...');
    
    const results = {
      apiKeyConfig: await this.testApiKeyConfiguration(),
      congressApi: await this.testCongressApi(),
      billSync: await this.testBillSync(),
      representativesSync: await this.testRepresentativesSync(),
      database: await this.testDatabaseOperations()
    };
    
    const allPassed = Object.values(results).every(result => result.success);
    
    console.log('\n📋 Test Results Summary:');
    console.log(`API Key Configuration: ${results.apiKeyConfig.success ? '✅' : '❌'}`);
    console.log(`Congress.gov API: ${results.congressApi.success ? '✅' : '❌'}`);
    console.log(`Bill Sync (Direct DB): ${results.billSync.success ? '✅' : '❌'}`);
    console.log(`Representatives Sync: ${results.representativesSync.success ? '✅' : '❌'}`);
    console.log(`Database: ${results.database.success ? '✅' : '❌'}`);
    console.log(`\nOverall: ${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
    
    return {
      success: allPassed,
      results,
      summary: {
        passed: Object.values(results).filter(r => r.success).length,
        total: Object.keys(results).length
      }
    };
  }
}

export const testApiService = new TestApiService();