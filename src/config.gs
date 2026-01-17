function getDefaultConfig() {
  return {
    fontMappings: {
      'Comic Sans MS': 'Arial',
      'Arial': 'Comic Sans MS'
    },
    universalToggle: true,  // Enable universal font toggling
    toggleMode: 'to_comic_sans',  // 'to_comic_sans' or 'to_arial'
    processNotes: true,
    skipErrors: true,
    batchSize: 50,
    apiRetries: 3,
    apiRetryDelay: 1000
  };
}

function getConfigWithPersistedToggleMode(presentationId) {
  const config = getDefaultConfig();
  
  // Try to retrieve persisted toggle mode from presentation
  try {
    const persistedMode = getPersistedToggleMode(presentationId);
    if (persistedMode) {
      config.toggleMode = persistedMode;
      Logger.log(`Retrieved persisted toggle mode: ${persistedMode}`);
    } else {
      Logger.log(`No persisted toggle mode found, using default: ${config.toggleMode}`);
    }
  } catch (error) {
    Logger.log(`Error retrieving persisted toggle mode: ${error.toString()}`);
  }
  
  return config;
}

function getPersistedToggleMode(presentationId) {
  try {
    // Use PropertiesService for simple, reliable persistence
    const properties = PropertiesService.getScriptProperties();
    const key = `toggle_mode_${presentationId}`;
    const persistedMode = properties.getProperty(key);
    
    if (persistedMode && (persistedMode === 'to_comic_sans' || persistedMode === 'to_arial')) {
      Logger.log(`Found persisted toggle mode: ${persistedMode}`);
      return persistedMode;
    }
    
    return null; // No persisted mode found
  } catch (error) {
    Logger.log(`Error reading persisted toggle mode: ${error.toString()}`);
    return null;
  }
}

function persistToggleMode(presentationId, toggleMode) {
  try {
    // Use PropertiesService for simple, reliable persistence
    const properties = PropertiesService.getScriptProperties();
    const key = `toggle_mode_${presentationId}`;
    
    properties.setProperty(key, toggleMode);
    
    Logger.log(`Persisted toggle mode: ${toggleMode} for presentation ${presentationId}`);
    return true;
  } catch (error) {
    Logger.log(`Error persisting toggle mode: ${error.toString()}`);
    return false;
  }
}

function createUniversalFontMappings(discoveredFonts, toggleMode) {
  const mappings = {};
  
  Logger.log(`Creating universal font mappings in mode: ${toggleMode}`);
  Logger.log(`Discovered fonts: [${discoveredFonts.join(', ')}]`);
  
  // Add implicit Arial mapping for elements with no fontFamily (default font)
  const allFonts = [...discoveredFonts];
  if (!allFonts.includes('Arial')) {
    allFonts.push('Arial');
    Logger.log(`Added implicit Arial font for default elements`);
  }
  
  if (toggleMode === 'to_comic_sans') {
    // Toggle everything TO Comic Sans MS (except if already Comic Sans MS)
    for (const font of allFonts) {
      if (font !== 'Comic Sans MS') {
        mappings[font] = 'Comic Sans MS';
      }
    }
    // Special mapping for elements with no fontFamily (default = Arial)
    mappings['DEFAULT_FONT'] = 'Comic Sans MS';
  } else if (toggleMode === 'to_arial') {
    // Toggle everything TO Arial (except if already Arial)  
    for (const font of allFonts) {
      if (font !== 'Arial') {
        mappings[font] = 'Arial';
      }
    }
    // Special mapping for elements with no fontFamily (default = Arial stays Arial)
    // mappings['DEFAULT_FONT'] = 'Arial'; // Not needed, already default
  }
  
  Logger.log(`Generated universal mappings: ${JSON.stringify(mappings)}`);
  return mappings;
}

function parseYamlConfig(yamlString) {
  try {
    const config = parseSimpleYaml(yamlString);
    validateConfig(config);
    return config;
  } catch (error) {
    throw new Error('Invalid YAML configuration: ' + error.message);
  }
}

function parseSimpleYaml(yamlString) {
  const lines = yamlString.split('\n');
  const config = {
    fontMappings: {},
    processNotes: true,
    skipErrors: true,
    batchSize: 50,
    apiRetries: 3,
    apiRetryDelay: 1000
  };
  
  let currentSection = null;
  let inFontMappings = false;
  
  for (let line of lines) {
    line = line.trim();
    
    if (line.startsWith('#') || line === '') {
      continue;
    }
    
    if (line === 'fontMappings:') {
      inFontMappings = true;
      continue;
    }
    
    if (line.match(/^[a-zA-Z]/)) {
      inFontMappings = false;
    }
    
    if (inFontMappings && line.startsWith('-')) {
      const mapping = line.substring(1).trim();
      const parts = mapping.split(':');
      if (parts.length === 2) {
        const from = parts[0].trim().replace(/['"]/g, '');
        const to = parts[1].trim().replace(/['"]/g, '');
        config.fontMappings[from] = to;
      }
    } else {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        switch (key) {
          case 'processNotes':
            config.processNotes = value === 'true';
            break;
          case 'skipErrors':
            config.skipErrors = value === 'true';
            break;
          case 'batchSize':
            config.batchSize = parseInt(value) || 50;
            break;
          case 'apiRetries':
            config.apiRetries = parseInt(value) || 3;
            break;
          case 'apiRetryDelay':
            config.apiRetryDelay = parseInt(value) || 1000;
            break;
        }
      }
    }
  }
  
  return config;
}

function validateConfig(config) {
  if (!config) {
    throw new Error('Configuration is null or undefined');
  }
  
  if (!config.fontMappings || typeof config.fontMappings !== 'object') {
    throw new Error('fontMappings must be an object');
  }
  
  if (Object.keys(config.fontMappings).length === 0) {
    throw new Error('fontMappings cannot be empty');
  }
  
  if (typeof config.processNotes !== 'boolean') {
    throw new Error('processNotes must be a boolean');
  }
  
  if (typeof config.skipErrors !== 'boolean') {
    throw new Error('skipErrors must be a boolean');
  }
  
  if (!Number.isInteger(config.batchSize) || config.batchSize < 1 || config.batchSize > 100) {
    throw new Error('batchSize must be an integer between 1 and 100');
  }
  
  if (!Number.isInteger(config.apiRetries) || config.apiRetries < 1 || config.apiRetries > 10) {
    throw new Error('apiRetries must be an integer between 1 and 10');
  }
  
  if (!Number.isInteger(config.apiRetryDelay) || config.apiRetryDelay < 100) {
    throw new Error('apiRetryDelay must be an integer >= 100 milliseconds');
  }
  
  return true;
}

function getConfigFromStorage(presentationId) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const key = `config_${presentationId || 'global'}`;
    const jsonString = properties.getProperty(key);

    if (!jsonString) {
      return getDefaultConfig();
    }

    const config = JSON.parse(jsonString);
    validateConfig(config);
    return config;
  } catch (error) {
    Logger.log('Error loading config from storage: ' + error.toString());
    return getDefaultConfig();
  }
}

// Legacy function name for compatibility with ui.gs
function getConfigFromSheet() {
  // Get active presentation ID for per-presentation settings
  try {
    const presentation = SlidesApp.getActivePresentation();
    const presentationId = presentation ? presentation.getId() : null;
    return getConfigFromStorage(presentationId);
  } catch (error) {
    Logger.log('Error getting presentation ID: ' + error.toString());
    return getConfigFromStorage(null);
  }
}

function saveConfigToStorage(config, presentationId) {
  try {
    validateConfig(config);
    const properties = PropertiesService.getScriptProperties();
    const key = `config_${presentationId || 'global'}`;
    const jsonString = JSON.stringify(config);

    properties.setProperty(key, jsonString);
    Logger.log(`Saved config for ${key}`);
    return true;
  } catch (error) {
    Logger.log('Error saving config to storage: ' + error.toString());
    return false;
  }
}

// Legacy function name for compatibility with ui.gs
function saveConfigToSheet(config) {
  try {
    const presentation = SlidesApp.getActivePresentation();
    const presentationId = presentation ? presentation.getId() : null;
    return saveConfigToStorage(config, presentationId);
  } catch (error) {
    Logger.log('Error getting presentation ID: ' + error.toString());
    return saveConfigToStorage(config, null);
  }
}

function configToYaml(config) {
  let yaml = '';
  yaml += 'fontMappings:\n';
  
  for (const [from, to] of Object.entries(config.fontMappings)) {
    yaml += `  - "${from}": "${to}"\n`;
  }
  
  yaml += `\nprocessNotes: ${config.processNotes}\n`;
  yaml += `skipErrors: ${config.skipErrors}\n`;
  yaml += `batchSize: ${config.batchSize}\n`;
  yaml += `apiRetries: ${config.apiRetries}\n`;
  yaml += `apiRetryDelay: ${config.apiRetryDelay}\n`;
  
  return yaml;
}