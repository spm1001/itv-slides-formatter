#!/usr/bin/env node

/**
 * Intelligent Log Retrieval for Apps Script
 *
 * Uses itv-auth CLI for authentication. Run `npm run auth` first to create token.json.
 */

const { google } = require('googleapis');
const { getAuthClient } = require('./lib/auth');

class IntelligentLogRetrieval {
  constructor() {
    this.auth = null;
    this.script = null;
    this.logging = null;
    this.projectId = '1I2dUX4hBHie4JvxELe5Mog8PxHXRWLUDACYzw94NqMrQr-YGawsNsouu';
    this.testFunction = 'testFontSwap';
    this.gcpProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'mit-dev-362409';

    require('dotenv').config();
    this.deploymentApiKey = process.env.DEPLOYMENT_API_KEY;
  }

  async initialize() {
    console.log('🔍 Intelligent Log Retrieval System');
    console.log('==================================');

    this.auth = getAuthClient();

    // Initialize API clients
    this.script = google.script({ version: 'v1', auth: this.auth });
    this.logging = google.logging({ version: 'v2', auth: this.auth });

    console.log('✅ Authentication initialized');
  }

  async executeTest() {
    console.log(`\n🧪 Executing test function: ${this.testFunction}`);
    console.log('─'.repeat(50));
    
    const executionStartTime = new Date();
    console.log(`📅 Execution started at: ${executionStartTime.toISOString()}`);
    
    try {
      // Execute the test function
      const response = await this.script.scripts.run({
        scriptId: this.projectId,
        resource: {
          function: this.testFunction,
          devMode: true
        }
      });
      
      const executionEndTime = new Date();
      console.log(`✅ Execution completed at: ${executionEndTime.toISOString()}`);
      
      // Return execution metadata for log correlation
      const executionData = {
        startTime: executionStartTime,
        endTime: executionEndTime,
        success: !response.data.error,
        response: response.data
      };
      
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
      }
      
      if (response.data.response && response.data.response.result) {
        console.log('\n📊 Test Results:');
        console.log(JSON.stringify(response.data.response.result, null, 2));
      }
      
      return executionData;
    } catch (error) {
      console.error('❌ API Error:', error.message);
      if (error.response && error.response.data) {
        console.error('Details:', JSON.stringify(error.response.data, null, 2));
      }
      
      return {
        startTime: executionStartTime,
        endTime: new Date(),
        success: false,
        error: error.message
      };
    }
  }

  async getLatestApiExecution() {
    console.log('\n🔍 Checking for latest "Execution API" execution...');
    
    try {
      // Search for recent API executions (not manual "Editor" ones)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (60 * 60 * 1000)); // Last 1 hour
      
      const filter = [
        `timestamp >= "${startTime.toISOString()}"`,
        `timestamp <= "${endTime.toISOString()}"`,
        `resource.type="app_script_function"`,
        // Filter specifically for API executions (not Editor)
        `resource.labels.invocation_type="apps script api"`
      ].join(' AND ');
      
      const response = await this.logging.entries.list({
        requestBody: {
          resourceNames: [`projects/${this.gcpProjectId}`],
          filter: filter,
          orderBy: 'timestamp desc',
          pageSize: 5
        }
      });
      
      if (response.data.entries && response.data.entries.length > 0) {
        const latestEntry = response.data.entries[0];
        const latestTime = new Date(latestEntry.timestamp);
        
        console.log(`📅 Latest "Execution API" log entry: ${latestTime.toISOString()}`);
        console.log(`🎯 This filters out manual "Editor" executions`);
        
        return {
          timestamp: latestTime,
          entries: response.data.entries,
          executionType: 'API'
        };
      } else {
        console.log('❌ No recent "Execution API" log entries found');
        console.log('🔍 Searching for any recent executions...');
        
        // Fallback: check for any executions
        const fallbackFilter = [
          `timestamp >= "${startTime.toISOString()}"`,
          `timestamp <= "${endTime.toISOString()}"`,
          `resource.type="app_script_function"`
        ].join(' AND ');
        
        const fallbackResponse = await this.logging.entries.list({
          requestBody: {
            resourceNames: [`projects/${this.gcpProjectId}`],
            filter: fallbackFilter,
            orderBy: 'timestamp desc',
            pageSize: 3
          }
        });
        
        if (fallbackResponse.data.entries && fallbackResponse.data.entries.length > 0) {
          console.log(`📊 Found ${fallbackResponse.data.entries.length} recent executions (any type)`);
          return {
            timestamp: new Date(fallbackResponse.data.entries[0].timestamp),
            entries: fallbackResponse.data.entries,
            executionType: 'unknown'
          };
        }
        
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to get latest execution:', error.message);
      return null;
    }
  }

  async getExecutionLogs(executionData, timeoutMs = 120000) { // 2 minute timeout
    console.log('\n📋 Smart Foreground Log Retrieval');
    console.log('─'.repeat(50));
    
    const expectedTime = executionData.endTime;
    console.log(`🎯 Looking for logs from execution ending at: ${expectedTime.toISOString()}`);
    
    // Check if logs are immediately available
    const latest = await this.getLatestApiExecution();
    
    if (latest && latest.timestamp >= expectedTime) {
      console.log(`✅ "Execution API" logs are immediately available!`);
      return await this.retrieveApiExecutionLogs(executionData);
    }
    
    // Logs not immediately available - enter smart polling mode
    console.log('⏳ Logs not immediately available, entering smart polling...');
    console.log('📊 Strategy: Exponential backoff starting at 10s (exponent 1.2, max 60s)');
    
    const startPolling = Date.now();
    let pollCount = 0;
    let currentDelay = 10; // Start with 10 seconds
    const maxDelay = 60; // Cap at 60 seconds
    const backoffExponent = 1.2;
    
    while (true) {
      const elapsed = (Date.now() - startPolling) / 1000;
      
      // Check timeout
      if (elapsed * 1000 > timeoutMs) {
        console.log(`⏰ Timeout reached after ${elapsed.toFixed(1)} seconds`);
        console.log('💡 Logs may still be available manually at:');
        console.log(`   https://script.google.com/d/${this.projectId}/edit`);
        
        // Offer partial results option
        console.log('🔄 Attempting final log retrieval...');
        return await this.retrieveApiExecutionLogs(executionData);
      }
      
      pollCount++;
      const remainingTime = Math.max(0, (timeoutMs / 1000) - elapsed);
      console.log(`🔄 Poll ${pollCount} (${elapsed.toFixed(1)}s elapsed, ${remainingTime.toFixed(1)}s remaining) [delay: ${currentDelay.toFixed(1)}s]`);
      
      try {
        const currentLatest = await this.getLatestApiExecution();
        
        // Allow for small timing differences (±5 seconds) between execution end and log timestamps
        const timeDiff = Math.abs(new Date(currentLatest.timestamp) - expectedTime);
        if (currentLatest && timeDiff <= 5000) {
          console.log(`✅ "Execution API" logs found after ${elapsed.toFixed(1)} seconds!`);
          console.log(`   Log timestamp: ${currentLatest.timestamp}, Expected: ${expectedTime.toISOString()}`);
          return await this.retrieveApiExecutionLogs(executionData);
        }
        
        // Wait for next poll with exponential backoff
        if (elapsed * 1000 < timeoutMs - (currentDelay * 1000)) {
          console.log(`⏱️  Waiting ${currentDelay.toFixed(1)}s for next poll (exponential backoff)...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay * 1000));
          
          // Calculate next delay: currentDelay ^ backoffExponent, capped at maxDelay
          currentDelay = Math.min(Math.pow(currentDelay, backoffExponent), maxDelay);
        }
        
      } catch (error) {
        console.error(`❌ Polling error: ${error.message}`);
        // Continue polling unless it's a critical error
        await new Promise(resolve => setTimeout(resolve, currentDelay * 1000));
        currentDelay = Math.min(Math.pow(currentDelay, backoffExponent), maxDelay);
      }
    }
  }

  async retrieveApiExecutionLogs(executionData) {
    console.log('\n📄 Retrieving "Execution API" logs...');
    
    try {
      // Search for logs in a window around the execution, filtering for API executions
      const searchStart = new Date(executionData.startTime.getTime() - (60 * 1000)); // 1 min before
      const searchEnd = new Date(executionData.endTime.getTime() + (120 * 1000)); // 2 min after
      
      const filter = [
        `timestamp >= "${searchStart.toISOString()}"`,
        `timestamp <= "${searchEnd.toISOString()}"`,
        `resource.type="app_script_function"`,
        // Filter specifically for API executions (excludes manual "Editor" runs)
        `resource.labels.invocation_type="apps script api"`
      ].join(' AND ');
      
      console.log('🔍 Filtering for "Execution API" logs only (excludes manual runs)');
      
      const response = await this.logging.entries.list({
        requestBody: {
          resourceNames: [`projects/${this.gcpProjectId}`],
          filter: filter,
          orderBy: 'timestamp desc',
          pageSize: 50
        }
      });
      
      if (response.data.entries && response.data.entries.length > 0) {
        console.log(`✅ Found ${response.data.entries.length} "Execution API" log entries`);
        
        // Display the logs
        console.log('\n📋 API Execution Logs:');
        console.log('═'.repeat(60));
        
        response.data.entries.forEach((entry, i) => {
          const timestamp = new Date(entry.timestamp).toLocaleString();
          const severity = entry.severity || 'INFO';
          
          console.log(`\n[${i + 1}] ${timestamp} [${severity}] API`);
          
          if (entry.jsonPayload && entry.jsonPayload.message) {
            console.log(`    ${entry.jsonPayload.message}`);
          } else if (entry.textPayload) {
            console.log(`    ${entry.textPayload}`);
          }
          
          // Show execution type if available
          if (entry.resource && entry.resource.labels && entry.resource.labels.invocation_type) {
            console.log(`    🤖 Invocation Type: ${entry.resource.labels.invocation_type}`);
          }
        });
        
        console.log('\n═'.repeat(60));
        console.log(`🎯 Filtered results show only API executions (not manual "Editor" runs)`);
        
        return response.data.entries;
      } else {
        console.log('❌ No "Execution API" logs found in execution window');
        console.log('🔍 Trying broader search...');
        
        // Fallback to any logs in the window
        return await this.retrieveExecutionLogsGeneral(executionData);
      }
    } catch (error) {
      console.error('❌ Failed to retrieve API execution logs:', error.message);
      console.log('🔄 Falling back to general log retrieval...');
      return await this.retrieveExecutionLogsGeneral(executionData);
    }
  }

  async retrieveExecutionLogsGeneral(executionData) {
    console.log('\n📄 Retrieving general execution logs...');
    
    try {
      // Search for logs in a window around the execution
      const searchStart = new Date(executionData.startTime.getTime() - (60 * 1000)); // 1 min before
      const searchEnd = new Date(executionData.endTime.getTime() + (120 * 1000)); // 2 min after
      
      const filter = [
        `timestamp >= "${searchStart.toISOString()}"`,
        `timestamp <= "${searchEnd.toISOString()}"`,
        `resource.type="app_script_function"`
      ].join(' AND ');
      
      const response = await this.logging.entries.list({
        requestBody: {
          resourceNames: [`projects/${this.gcpProjectId}`],
          filter: filter,
          orderBy: 'timestamp desc',
          pageSize: 50
        }
      });
      
      if (response.data.entries && response.data.entries.length > 0) {
        console.log(`✅ Found ${response.data.entries.length} log entries from execution window`);
        
        // Separate API vs Editor executions
        const apiLogs = [];
        const editorLogs = [];
        
        response.data.entries.forEach(entry => {
          const isApi = entry.resource?.labels?.invocation_type === "apps script api";
          if (isApi) {
            apiLogs.push(entry);
          } else {
            editorLogs.push(entry);
          }
        });
        
        // Display the logs
        console.log('\n📋 Execution Logs:');
        console.log('═'.repeat(60));
        
        if (apiLogs.length > 0) {
          console.log(`\n🤖 API EXECUTIONS (${apiLogs.length} entries):`);
          apiLogs.forEach((entry, i) => {
            const timestamp = new Date(entry.timestamp).toLocaleString();
            const severity = entry.severity || 'INFO';
            
            console.log(`\n[API-${i + 1}] ${timestamp} [${severity}]`);
            
            if (entry.jsonPayload && entry.jsonPayload.message) {
              console.log(`    ${entry.jsonPayload.message}`);
            } else if (entry.textPayload) {
              console.log(`    ${entry.textPayload}`);
            }
          });
        }
        
        if (editorLogs.length > 0) {
          console.log(`\n👤 EDITOR EXECUTIONS (${editorLogs.length} entries - manual runs):`);
          editorLogs.slice(0, 3).forEach((entry, i) => { // Show only first 3 editor logs
            const timestamp = new Date(entry.timestamp).toLocaleString();
            console.log(`[Editor-${i + 1}] ${timestamp} - Manual execution`);
          });
          
          if (editorLogs.length > 3) {
            console.log(`... and ${editorLogs.length - 3} more editor executions`);
          }
        }
        
        console.log('\n═'.repeat(60));
        
        return response.data.entries;
      } else {
        console.log('❌ No logs found in execution window');
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to retrieve execution logs:', error.message);
      return [];
    }
  }

  async runCompleteWorkflow() {
    try {
      await this.initialize();
      
      // Execute test and get execution metadata
      const executionData = await this.executeTest();
      
      // Intelligently retrieve logs with polling if needed
      const logs = await this.getExecutionLogs(executionData);
      
      console.log('\n🎯 Summary:');
      console.log('─'.repeat(30));
      
      if (logs && logs.length > 0) {
        console.log(`✅ Successfully retrieved ${logs.length} log entries`);
        console.log('📊 Review the detailed logs above');
      } else {
        console.log('⚠️  No logs retrieved automatically');
        console.log('🔗 Manual access available at:');
        console.log(`   https://script.google.com/d/${this.projectId}/edit`);
      }
      
      return { executionData, logs };
    } catch (error) {
      console.error('💥 Fatal Error:', error.message);
      throw error;
    }
  }
}

// Subprocess code removed - using smart foreground polling instead

async function main() {
  // Main workflow - subprocess polling removed for simplicity and reliability
  const retriever = new IntelligentLogRetrieval();
  await retriever.runCompleteWorkflow();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal Error:', error.message);
    process.exit(1);
  });
}

module.exports = { IntelligentLogRetrieval };