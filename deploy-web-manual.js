#!/usr/bin/env node

/**
 * Apps Script Deployment Tool
 *
 * Uses itv-auth CLI for authentication. Run `npm run auth` first to create token.json.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { getAuthClient } = require('./lib/auth');

class AppsScriptDeployer {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.scriptsFolder = __dirname;
    this.projectName = 'Slide Formatter';

    // Load environment variables
    this.loadEnvVars();
  }

  loadEnvVars() {
    require('dotenv').config();
    this.deploymentApiKey = process.env.DEPLOYMENT_API_KEY;

    if (!this.deploymentApiKey) {
      console.warn('⚠️  DEPLOYMENT_API_KEY not found in environment variables');
      console.warn('   Add DEPLOYMENT_API_KEY=your_key_here to .env file');
    } else {
      console.log('✅ Deployment API key loaded from environment');
    }
  }

  async initializeAPIs() {
    const driveConfig = { version: 'v2', auth: this.auth };
    if (this.deploymentApiKey) {
      driveConfig.key = this.deploymentApiKey;
      console.log('🔑 Using deployment API key for enhanced authentication');
    }
    this.drive = google.drive(driveConfig);

    const scriptConfig = { version: 'v1', auth: this.auth };
    if (this.deploymentApiKey) {
      scriptConfig.key = this.deploymentApiKey;
    }
    this.script = google.script(scriptConfig);
    console.log('🔧 APIs initialized (Drive v2, Script v1)');
  }

  async authenticate() {
    console.log('🔐 Authenticating with Google APIs...');

    this.auth = getAuthClient();
    console.log('✅ Using token from token.json');

    await this.initializeAPIs();

    // Validate token by making a test API call
    try {
      await this.drive.about.get();
      console.log('✅ Token is valid');
    } catch (error) {
      if (error.code === 401) {
        throw new Error(`
❌ Token expired and could not refresh

Re-authenticate:
  rm token.json
  npm run auth
`);
      }
      throw error;
    }
  }

  async loadProjectFiles() {
    console.log('📁 Loading Apps Script project files...');
    
    const files = [];
    const fileExtensions = ['.gs'];
    
    // Read all .gs files in the src directory
    const srcFolder = path.join(this.scriptsFolder, 'src');
    const dirFiles = fs.readdirSync(srcFolder);
    
    for (const fileName of dirFiles) {
      const filePath = path.join(srcFolder, fileName);
      const ext = path.extname(fileName);
      
      if (fileExtensions.includes(ext)) {
        const baseName = path.basename(fileName, ext);
        const source = fs.readFileSync(filePath, 'utf8');
        
        files.push({
          name: baseName,
          type: 'server_js',
          source: source
        });
        
        console.log(`  ✓ Loaded ${fileName} (${source.length} characters)`);
      }
    }
    
    // Add manifest file
    const manifest = this.generateManifest();
    files.push({
      name: 'appsscript',
      type: 'json',
      source: JSON.stringify(manifest, null, 2)
    });
    
    console.log(`  ✓ Generated appsscript.json manifest`);
    console.log(`📊 Total files: ${files.length}`);
    
    return files;
  }

  generateManifest() {
    return {
      timeZone: 'America/New_York',
      dependencies: {
        enabledAdvancedServices: [
          {
            userSymbol: 'Slides',
            serviceId: 'slides',
            version: 'v1'
          },
          {
            userSymbol: 'Drive',
            serviceId: 'drive',
            version: 'v2'
          },
          {
            userSymbol: 'Sheets',
            serviceId: 'sheets',
            version: 'v4'
          }
        ]
      },
      oauthScopes: [
        'https://www.googleapis.com/auth/presentations',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
      runtimeVersion: 'V8',
      executionApi: {
        access: 'ANYONE'
      }
    };
  }

  async createApiExecutableDeployment(scriptId) {
    console.log('🔧 Creating API executable deployment...');
    
    try {
      // Check if deployment already exists
      const deployments = await this.script.projects.deployments.list({
        scriptId: scriptId
      });
      
      // Look for existing API executable deployment
      let apiDeployment = null;
      if (deployments.data.deployments) {
        apiDeployment = deployments.data.deployments.find(d => 
          d.deploymentConfig && 
          d.deploymentConfig.description === 'API Executable Deployment'
        );
      }
      
      if (apiDeployment) {
        console.log('📋 API executable deployment already exists');
        console.log(`🔗 Deployment ID: ${apiDeployment.deploymentId}`);
        return apiDeployment.deploymentId;
      }
      
      // Create new API executable deployment
      const deployment = await this.script.projects.deployments.create({
        scriptId: scriptId,
        resource: {
          deploymentConfig: {
            scriptId: scriptId,
            description: 'API Executable Deployment',
            manifestFileName: 'appsscript',
            versionNumber: 'HEAD'
          }
        }
      });
      
      console.log('✅ API executable deployment created successfully!');
      console.log(`🔗 Deployment ID: ${deployment.data.deploymentId}`);
      return deployment.data.deploymentId;
      
    } catch (error) {
      console.log('⚠️  API deployment creation failed (continuing anyway):');
      console.log('   This may be expected if using default execution permissions');
      console.log('   Error:', error.message);
      return null;
    }
  }

  async findExistingProject() {
    console.log('🔍 Checking for existing Apps Script project...');
    
    try {
      const response = await this.drive.files.list({
        q: `mimeType='application/vnd.google-apps.script' and title='${this.projectName}' and trashed=false`,
        fields: 'items(id,title,modifiedDate)'
      });
      
      if (response.data.items && response.data.items.length > 0) {
        const project = response.data.items[0];
        console.log(`✅ Found existing project: ${project.title} (${project.id})`);
        console.log(`   Last modified: ${project.modifiedDate}`);
        return project.id;
      }
      
      console.log('📝 No existing project found, will create new one');
      return null;
    } catch (error) {
      console.warn(`⚠️  Error searching for existing project: ${error.message}`);
      return null;
    }
  }

  async createNewProject(files) {
    console.log('🚀 Creating new Apps Script project...');
    
    const projectData = {
      files: files
    };
    
    try {
      const response = await this.drive.files.insert({
        requestBody: {
          title: this.projectName,
          mimeType: 'application/vnd.google-apps.script'
        },
        media: {
          mimeType: 'application/vnd.google-apps.script+json',
          body: JSON.stringify(projectData)
        },
        uploadType: 'multipart',
        convert: true
      });
      
      const projectId = response.data.id;
      const projectUrl = `https://script.google.com/d/${projectId}/edit`;
      
      console.log('✅ Apps Script project created successfully!');
      console.log(`📋 Project ID: ${projectId}`);
      console.log(`🌐 Project URL: ${projectUrl}`);
      
      return { projectId, projectUrl };
    } catch (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  async updateExistingProject(projectId, files) {
    console.log(`🔄 Updating existing Apps Script project (${projectId})...`);
    
    try {
      console.log(`📋 Updating project with ${files.length} files...`);
      const response = await this.script.projects.updateContent({
        scriptId: projectId,
        resource: {
          files: files
        }
      });
      
      const projectUrl = `https://script.google.com/d/${projectId}/edit`;
      
      console.log('✅ Apps Script project updated successfully!');
      console.log(`🌐 Project URL: ${projectUrl}`);
      
      // Create API executable deployment
      await this.createApiExecutableDeployment(projectId);
      
      return { projectId, projectUrl };
    } catch (error) {
      console.error('❌ Detailed error information:');
      console.error('   Status:', error.code || 'Unknown');
      console.error('   Message:', error.message);
      if (error.response) {
        console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  async deployProject() {
    try {
      console.log('🎯 Starting Apps Script project deployment...');
      console.log('   Perfect for SSH/remote development environments!');
      console.log('');
      
      // Authenticate
      await this.authenticate();
      
      // Load project files
      const files = await this.loadProjectFiles();
      
      if (files.length === 0) {
        throw new Error('No .gs files found to deploy');
      }
      
      // Check for existing project
      const existingProjectId = await this.findExistingProject();
      
      let result;
      if (existingProjectId) {
        // Update existing project
        result = await this.updateExistingProject(existingProjectId, files);
      } else {
        // Create new project
        result = await this.createNewProject(files);
      }
      
      console.log('');
      console.log('🎉 Deployment completed successfully!');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('1. Open the project URL above');
      console.log('2. Run the testFontSwap() function to verify installation');
      console.log('3. Open any Google Sheets to see the "Slide Formatter" menu');
      console.log('4. Test with target presentation: 1_WxqIvBQ2ArGjUqamVhVYKdAie5YrEgXmmUFMgNNpPA');
      console.log('');
      console.log('💡 For enterprise deployment:');
      console.log('   - The token.json can be reused for automated deployments');
      console.log('   - This same process can be scripted for CI/CD pipelines');
      console.log('   - Multiple projects can be deployed with the same token');
      console.log('');
      
      return result;
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('- Ensure credentials.json is in the project directory');
      console.log('- Check that required APIs are enabled in Google Cloud Console');
      console.log('- Verify OAuth scopes match the required permissions');
      console.log('- Try refreshing the authorization if token expired');
      throw error;
    }
  }
}

// Main execution
async function main() {
  const deployer = new AppsScriptDeployer();

  try {
    console.log('🔧 Required APIs (ensure these are enabled):');
    console.log('  • Google Drive API');
    console.log('  • Google Slides API');
    console.log('  • Google Sheets API');
    console.log('  • Apps Script API');
    console.log('🌐 Enable at: https://console.cloud.google.com/apis/dashboard');
    console.log('');

    await deployer.deployProject();
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AppsScriptDeployer;