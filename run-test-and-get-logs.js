#!/usr/bin/env node

/**
 * Apps Script Test Runner & Log Retriever
 *
 * Uses itv-auth CLI for authentication. Run `npm run auth` first to create token.json.
 */

const { google } = require('googleapis');
const { getAuthClient } = require('./lib/auth');

class AppsScriptTestRunner {
  constructor() {
    this.auth = null;
    this.script = null;
    this.projectId = '1I2dUX4hBHie4JvxELe5Mog8PxHXRWLUDACYzw94NqMrQr-YGawsNsouu';
    this.testFunction = 'testFontSwap';

    require('dotenv').config();
    this.deploymentApiKey = process.env.DEPLOYMENT_API_KEY;
  }

  async initialize() {
    console.log('🚀 Apps Script Test Runner & Log Retriever');
    console.log('==========================================');

    this.auth = getAuthClient();

    // Initialize API clients
    this.script = google.script({ version: 'v1', auth: this.auth });
    this.logging = google.logging({ version: 'v2', auth: this.auth });

    console.log('✅ Authentication initialized');
  }

  async runTest() {
    console.log(`\n🧪 Running test function: ${this.testFunction}`);
    console.log('─'.repeat(50));
    
    try {
      // Execute the test function
      const response = await this.script.scripts.run({
        scriptId: this.projectId,
        resource: {
          function: this.testFunction,
          devMode: true  // Run in development mode for latest code
        }
      });
      
      console.log('✅ Test execution completed successfully');
      
      if (response.data.error) {
        console.log('\n❌ Script Error:');
        console.log('Message:', response.data.error.details[0].errorMessage);
        console.log('Type:', response.data.error.details[0].errorType);
        
        if (response.data.error.details[0].scriptStackTraceElements) {
          console.log('\nStack Trace:');
          response.data.error.details[0].scriptStackTraceElements.forEach(trace => {
            console.log(`  ${trace.function}:${trace.lineNumber}`);
          });
        }
        return false;
      }
      
      if (response.data.response && response.data.response.result) {
        console.log('\n📊 Test Results:');
        console.log(JSON.stringify(response.data.response.result, null, 2));
      }
      
      return true;
    } catch (error) {
      console.error('❌ API Error:', error.message);
      if (error.response && error.response.data) {
        console.error('Details:', JSON.stringify(error.response.data, null, 2));
      }
      return false;
    }
  }

  async getExecutionLogs() {
    console.log('\n📋 Retrieving Recent Execution Logs');
    console.log('─'.repeat(50));
    
    try {
      // Use Cloud Logging API (the working method!)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (10 * 60 * 1000)); // Last 10 minutes
      
      const filter = [
        `timestamp >= "${startTime.toISOString()}"`,
        `timestamp <= "${endTime.toISOString()}"`,
        `resource.type="app_script_function"`
      ].join(' AND ');
      
      const response = await this.logging.entries.list({
        requestBody: {
          resourceNames: [`projects/${process.env.GOOGLE_CLOUD_PROJECT_ID || 'mit-dev-362409'}`],
          filter: filter,
          orderBy: 'timestamp desc',
          pageSize: 20
        }
      });
      
      if (response.data.entries && response.data.entries.length > 0) {
        console.log(`✅ Found ${response.data.entries.length} log entries from recent execution:\n`);
        
        response.data.entries.slice(0, 10).forEach((entry, i) => {
          const timestamp = new Date(entry.timestamp).toLocaleString();
          console.log(`${i + 1}. [${timestamp}] ${entry.severity || 'INFO'}`);
          
          if (entry.jsonPayload && entry.jsonPayload.message) {
            console.log(`   ${entry.jsonPayload.message}`);
          } else if (entry.textPayload) {
            console.log(`   ${entry.textPayload}`);
          }
        });
        
        if (response.data.entries.length > 10) {
          console.log(`\n... and ${response.data.entries.length - 10} more entries`);
        }
      } else {
        console.log('No recent log entries found');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to retrieve execution logs:', error.message);
      return false;
    }
  }

  async getCloudLogs() {
    console.log('\n☁️ Cloud Logging Integration Options');
    console.log('─'.repeat(50));
    
    console.log(`
🔍 For detailed logs, you have several options:

1. **Apps Script Dashboard**: 
   https://script.google.com/home/executions
   - View execution history and basic logs
   - Filter by project and time range

2. **Cloud Console** (if using standard GCP project):
   https://console.cloud.google.com/logs/query
   - Advanced filtering and search
   - Persistent log retention
   - Requires standard GCP project setup

3. **Manual Log Access**: 
   - Open Apps Script project: https://script.google.com/d/${this.projectId}/edit
   - Click "Executions" tab in left sidebar
   - View detailed logs for each execution

📚 **Automated Log Retrieval Notes**:
- Apps Script API has limited log access (execution metadata only)
- Full log content requires Cloud Logging API with standard GCP project
- Console logs can be accessed via Cloud Logging API with proper setup
`);
  }
}

async function main() {
  const runner = new AppsScriptTestRunner();
  
  try {
    await runner.initialize();
    
    // Run the font discovery test
    const testSuccess = await runner.runTest();
    
    // Get execution information
    await runner.getExecutionLogs();
    
    // Show cloud logging options
    await runner.getCloudLogs();
    
    console.log('\n🎯 Next Steps:');
    console.log('─'.repeat(30));
    
    if (testSuccess) {
      console.log('✅ Test completed successfully');
      console.log('📊 Check the results above for font discovery data');
      console.log('🔗 For detailed logs, visit the Apps Script project:');
      console.log(`   https://script.google.com/d/${runner.projectId}/edit`);
    } else {
      console.log('❌ Test failed - check error details above');
      console.log('🔧 Debug by examining the script code and logs');
    }
    
  } catch (error) {
    console.error('💥 Fatal Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}