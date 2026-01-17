function showSettings() {
  const htmlTemplate = HtmlService.createTemplate(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .container { max-width: 600px; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
          textarea { height: 200px; font-family: monospace; }
          button { background-color: #4285f4; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
          button:hover { background-color: #3367d6; }
          .secondary { background-color: #6c757d; }
          .secondary:hover { background-color: #545b62; }
          .error { color: #d32f2f; margin-top: 10px; }
          .success { color: #388e3c; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Slide Formatter Settings</h2>
          
          <form id="settingsForm">
            <div class="form-group">
              <label for="yamlConfig">Configuration (YAML):</label>
              <textarea id="yamlConfig" placeholder="Enter YAML configuration..."><?= yamlConfig ?></textarea>
            </div>
            
            <div class="form-group">
              <button type="button" onclick="loadDefaults()">Load Defaults</button>
              <button type="button" onclick="saveConfig()" class="primary">Save Configuration</button>
              <button type="button" onclick="validateConfig()" class="secondary">Validate</button>
            </div>
            
            <div id="message"></div>
          </form>
          
          <hr style="margin: 30px 0;">
          
          <h3>Quick Actions</h3>
          <div class="form-group">
            <button type="button" onclick="testConfiguration()">Test Configuration</button>
            <button type="button" onclick="runFontSwapTest()">Run Font Swap Test</button>
          </div>
          
          <div id="testResults"></div>
        </div>
        
        <script>
          function loadDefaults() {
            const defaultConfig = \`fontMappings:
  - "Comic Sans MS": "Arial"
  - "Arial": "Comic Sans MS"

processNotes: true
skipErrors: true
batchSize: 50
apiRetries: 3
apiRetryDelay: 1000\`;
            
            document.getElementById('yamlConfig').value = defaultConfig;
            showMessage('Default configuration loaded.', 'success');
          }
          
          function saveConfig() {
            const yamlConfig = document.getElementById('yamlConfig').value;
            
            google.script.run
              .withSuccessHandler(onSaveSuccess)
              .withFailureHandler(onSaveFailure)
              .saveConfigFromUI(yamlConfig);
          }
          
          function validateConfig() {
            const yamlConfig = document.getElementById('yamlConfig').value;
            
            google.script.run
              .withSuccessHandler(onValidateSuccess)
              .withFailureHandler(onValidateFailure)
              .validateConfigFromUI(yamlConfig);
          }
          
          function testConfiguration() {
            showMessage('Testing configuration...', 'info');
            
            google.script.run
              .withSuccessHandler(onTestSuccess)
              .withFailureHandler(onTestFailure)
              .testConfigurationFromUI();
          }
          
          function runFontSwapTest() {
            showMessage('Running font swap test...', 'info');
            
            google.script.run
              .withSuccessHandler(onFontSwapTestSuccess)
              .withFailureHandler(onFontSwapTestFailure)
              .testFontSwap();
          }
          
          function onSaveSuccess(result) {
            showMessage('Configuration saved successfully!', 'success');
          }
          
          function onSaveFailure(error) {
            showMessage('Error saving configuration: ' + error.message, 'error');
          }
          
          function onValidateSuccess(result) {
            showMessage('Configuration is valid!', 'success');
          }
          
          function onValidateFailure(error) {
            showMessage('Configuration validation failed: ' + error.message, 'error');
          }
          
          function onTestSuccess(result) {
            showMessage('Configuration test passed!', 'success');
          }
          
          function onTestFailure(error) {
            showMessage('Configuration test failed: ' + error.message, 'error');
          }
          
          function onFontSwapTestSuccess(result) {
            showMessage('Font swap test completed successfully!', 'success');
            document.getElementById('testResults').innerHTML = 
              '<h4>Test Results:</h4><pre>' + JSON.stringify(result, null, 2) + '</pre>';
          }
          
          function onFontSwapTestFailure(error) {
            showMessage('Font swap test failed: ' + error.message, 'error');
          }
          
          function showMessage(message, type) {
            const messageDiv = document.getElementById('message');
            messageDiv.innerHTML = '<div class="' + type + '">' + message + '</div>';
            
            setTimeout(() => {
              if (type !== 'error') {
                messageDiv.innerHTML = '';
              }
            }, 5000);
          }
          
          // Load current configuration on page load
          window.onload = function() {
            google.script.run
              .withSuccessHandler(function(config) {
                document.getElementById('yamlConfig').value = config;
              })
              .getCurrentConfigYaml();
          };
        </script>
      </body>
    </html>
  `);
  
  htmlTemplate.yamlConfig = getCurrentConfigYaml();
  
  const htmlOutput = htmlTemplate.evaluate()
    .setWidth(700)
    .setHeight(600)
    .setTitle('Slide Formatter Settings');
  
  SlidesApp.getUi().showModalDialog(htmlOutput, 'Settings');
}

function getCurrentConfigYaml() {
  try {
    const config = getConfigFromSheet();
    return configToYaml(config);
  } catch (error) {
    Logger.log('Error getting current config: ' + error.toString());
    return configToYaml(getDefaultConfig());
  }
}

function saveConfigFromUI(yamlString) {
  try {
    const config = parseYamlConfig(yamlString);
    saveConfigToSheet(config);
    return { success: true };
  } catch (error) {
    throw new Error('Failed to save configuration: ' + error.message);
  }
}

function validateConfigFromUI(yamlString) {
  try {
    const config = parseYamlConfig(yamlString);
    validateConfig(config);
    return { valid: true };
  } catch (error) {
    throw new Error('Validation failed: ' + error.message);
  }
}

function testConfigurationFromUI() {
  try {
    const config = getConfigFromSheet();
    validateConfig(config);
    
    if (Object.keys(config.fontMappings).length === 0) {
      throw new Error('No font mappings configured');
    }
    
    return { 
      success: true, 
      message: 'Configuration is valid and ready to use',
      fontMappings: Object.keys(config.fontMappings).length
    };
  } catch (error) {
    throw new Error('Configuration test failed: ' + error.message);
  }
}

function showProgressDialog() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
          .progress-container { margin: 20px 0; }
          .spinner { 
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4285f4;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .status { margin: 10px 0; font-size: 16px; }
          button { 
            background-color: #d32f2f; 
            color: white; 
            padding: 10px 20px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer;
            margin-top: 20px;
          }
          button:hover { background-color: #b71c1c; }
        </style>
      </head>
      <body>
        <h3>Processing Presentation</h3>
        <div class="progress-container">
          <div class="spinner"></div>
          <div class="status">Analyzing presentation structure...</div>
          <div class="status" style="font-size: 14px; color: #666;">
            This may take a few moments for large presentations
          </div>
        </div>
        <button onclick="haltProcessing()">Halt Processing</button>
        
        <script>
          let processingHalted = false;
          
          function haltProcessing() {
            processingHalted = true;
            document.querySelector('.status').textContent = 'Halting processing...';
            document.querySelector('button').disabled = true;
            
            google.script.run
              .withSuccessHandler(() => {
                google.script.host.close();
              })
              .haltProcessing();
          }
          
          function updateStatus(message) {
            if (!processingHalted) {
              document.querySelector('.status').textContent = message;
            }
          }
          
          setTimeout(() => {
            if (!processingHalted) {
              updateStatus('Processing font changes...');
            }
          }, 3000);
          
          setTimeout(() => {
            if (!processingHalted) {
              updateStatus('Finalizing changes...');
            }
          }, 6000);
          
          setTimeout(() => {
            if (!processingHalted) {
              google.script.host.close();
            }
          }, 10000);
        </script>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(400)
    .setHeight(300)
    .setTitle('Processing...');
  
  SlidesApp.getUi().showModelessDialog(htmlOutput, 'Processing Presentation');
}

function haltProcessing() {
  PropertiesService.getScriptProperties().setProperty('HALT_PROCESSING', 'true');
  Logger.log('Processing halt requested by user');
}

function isProcessingHalted() {
  const haltFlag = PropertiesService.getScriptProperties().getProperty('HALT_PROCESSING');
  return haltFlag === 'true';
}

function clearHaltFlag() {
  PropertiesService.getScriptProperties().deleteProperty('HALT_PROCESSING');
}