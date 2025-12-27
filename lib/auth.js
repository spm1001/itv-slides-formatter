/**
 * Shared OAuth authentication helper for itv-slides-formatter.
 *
 * All scripts use this module to load tokens created by itv-auth CLI.
 * Token format: { token, refresh_token, client_id, client_secret, scopes, expiry }
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Default token path relative to project root
const DEFAULT_TOKEN_PATH = path.join(__dirname, '..', 'token.json');

/**
 * Load and validate token from file.
 *
 * @param {string} tokenPath - Path to token.json (optional, defaults to project root)
 * @returns {object} Parsed token data
 * @throws {Error} If token is missing or invalid
 */
function loadToken(tokenPath = DEFAULT_TOKEN_PATH) {
  if (!fs.existsSync(tokenPath)) {
    throw new Error(`
❌ No token.json found

Run authentication first:
  npm run auth          # Auto mode (opens browser)
  npm run auth:manual   # Manual mode (for SSH/remote)

This uses itv-auth CLI with these scopes:
  drive, script.projects, slides, sheets, logging.read
`);
  }

  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

  // itv-auth embeds client_id and client_secret in token.json
  if (!token.client_id || !token.client_secret) {
    throw new Error(`
❌ Token missing client_id/client_secret

Your token.json may be from an older auth flow that didn't embed credentials.
Re-authenticate with itv-auth:
  rm token.json
  npm run auth

itv-auth saves client_id and client_secret directly in token.json,
so Node.js scripts don't need credentials.json at runtime.
`);
  }

  return token;
}

/**
 * Create an authenticated OAuth2 client from token.json.
 *
 * Automatically handles:
 * - Token format mapping (itv-auth → googleapis)
 * - Auto-refresh of expired tokens
 * - Saving refreshed tokens back to token.json
 *
 * @param {string} tokenPath - Path to token.json (optional)
 * @returns {google.auth.OAuth2} Configured OAuth2 client
 */
function getAuthClient(tokenPath = DEFAULT_TOKEN_PATH) {
  const token = loadToken(tokenPath);

  const auth = new google.auth.OAuth2(
    token.client_id,
    token.client_secret
  );

  // Map itv-auth token format to googleapis format
  auth.setCredentials({
    access_token: token.token,
    refresh_token: token.refresh_token,
    expiry_date: token.expiry ? new Date(token.expiry).getTime() : null,
    token_type: 'Bearer',
    scope: Array.isArray(token.scopes) ? token.scopes.join(' ') : (token.scopes || '')
  });

  // Auto-save refreshed tokens back to itv-auth format
  auth.on('tokens', (newTokens) => {
    console.log('🔄 Token refreshed, saving...');
    const updated = {
      ...token,
      token: newTokens.access_token || token.token,
      expiry: newTokens.expiry_date
        ? new Date(newTokens.expiry_date).toISOString()
        : token.expiry
    };
    if (newTokens.refresh_token) {
      updated.refresh_token = newTokens.refresh_token;
    }
    fs.writeFileSync(tokenPath, JSON.stringify(updated, null, 2));
  });

  return auth;
}

/**
 * Check if a valid token exists (without loading the full client).
 *
 * @param {string} tokenPath - Path to token.json (optional)
 * @returns {boolean} True if token exists and has required fields
 */
function hasValidToken(tokenPath = DEFAULT_TOKEN_PATH) {
  try {
    loadToken(tokenPath);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  loadToken,
  getAuthClient,
  hasValidToken,
  DEFAULT_TOKEN_PATH
};
