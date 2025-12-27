# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Google Apps Script tool for automated Google Slides presentation formatting. Processes slides and linked objects (charts, tables) to ensure consistent formatting according to configurable rules.

**Current Phase**: Phase 1 - Font swapping with hardcoded rules (Comic Sans MS ↔ Arial)
**Future Phases**: Template-based formatting, UI selection, Sheets charts, external database, GCP integration

## Architecture

### Dual Environment Architecture

This project operates in **two distinct environments** that must work together:

1. **Local Node.js Environment** (development machine)
   - Deployment scripts (`deploy-web-manual.js`, `auth-with-monitoring.js`)
   - OAuth authentication management
   - Automated testing and log retrieval
   - MCP server for documentation access

2. **Remote Apps Script Environment** (Google's servers)
   - Execution of `.gs` files
   - Google Slides API access
   - User interface (menu in Google Sheets)
   - Presentation processing

**Key insight**: You edit files locally and deploy them to Google's servers where they actually run.

### Apps Script File Architecture

```
main.gs (orchestration)
  ├─ Handles onOpen() menu creation
  ├─ Extracts presentation IDs from URLs
  └─ Orchestrates formatting workflow

config.gs (configuration management)
  ├─ YAML configuration parsing
  ├─ Font mapping definitions
  └─ Toggle mode persistence

formatter.gs (core formatting logic)
  ├─ SlideFormatter class
  ├─ Font discovery and mapping
  ├─ Universal toggle logic (all fonts → target font)
  └─ Batch processing coordination

slides-api.gs (Google API client)
  ├─ SlidesApiClient class
  ├─ Retry logic with exponential backoff
  ├─ Intelligent batching (max 50 operations)
  └─ Element extraction (text, tables, shapes)

ui.gs (user interface)
  ├─ Progress dialog management
  ├─ Error reporting with deep links
  └─ Halt capability

utils.gs (helpers)
  ├─ Performance utilities
  ├─ Toggle mode persistence
  └─ Helper functions

constants.gs (configuration)
  ├─ OAuth scopes
  ├─ Element type mappings
  └─ Default configuration values
```

### Dual API Key Architecture

The project uses **two separate API keys** for security isolation:

1. **Development API Key** (`GOOGLE_API_KEY` in `.env`)
   - Used by MCP server for documentation lookup
   - Restricted to Custom Search API only
   - Lower security risk (read-only documentation access)

2. **Deployment API Key** (`DEPLOYMENT_API_KEY` in `.env`)
   - Used by deployment scripts for Apps Script operations
   - Requires Drive, Slides, Sheets, Apps Script APIs
   - Higher security risk (write access to Google Workspace)

**Why separate keys?** Different scopes and risk profiles. If one key is compromised, the other remains secure.

### Authentication via itv-auth CLI

Authentication uses the shared `itv-auth` CLI from `itv-google-auth` library:

```bash
npm run auth          # Auto mode (opens browser)
npm run auth:manual   # Manual mode (for SSH/remote)
```

The CLI:
1. Reads `credentials.json` (OAuth client config)
2. Runs the OAuth flow
3. Saves `token.json` with embedded `client_id` and `client_secret`

Node.js scripts then just read `token.json` - no need for `credentials.json`.

**Token Lifecycle:**
- Access token expires in 1 hour (auto-refreshed)
- Refresh token valid ~6 months to 1 year
- Scripts auto-save refreshed tokens to `token.json`

**Critical**: `credentials.json` must be **Web Application** type (not Desktop).

## Development Workflow

### First-Time Setup (New Machine)

```bash
# 1. Clone and install
git clone https://github.com/spm1001/slider.git
cd slider
npm install

# 2. Install itv-auth CLI (if not already installed)
pipx install ~/Repos/itv-google-auth

# 3. Configure environment (MANDATORY)
cp .env.template .env
# Edit .env and add:
#   - GOOGLE_API_KEY (development key)
#   - DEPLOYMENT_API_KEY (deployment key)

# 4. Add OAuth credentials
# Place credentials.json in project root (Web Application type)
# Download from: https://console.cloud.google.com/apis/credentials

# 5. Enable user-level Apps Script API (CRITICAL)
# Visit: https://script.google.com/home/usersettings
# Toggle ON: "Google Apps Script API"

# 6. Authenticate and deploy
npm run auth    # OAuth flow via itv-auth (creates token.json)
npm run deploy  # Deploy .gs files to Apps Script project
```

### Regular Development Workflow

```bash
# Edit .gs files locally
vim src/formatter.gs

# Deploy changes
npm run deploy

# Test and view logs
npm test        # Runs testFontSwap() and retrieves logs
npm run logs    # Standalone log retrieval
```

### Security Workflow

```bash
# Before ANY commit
npm run security:check

# Verify:
# - No API keys in files
# - All secrets in environment variables
# - Documentation uses placeholders only
```

### Git Identity (CRITICAL)

**ALWAYS use GitHub noreply identity:**
```bash
git config --global user.name "spm1001"
git config --global user.email "spm1001@users.noreply.github.com"
```

**NEVER commit with machine-specific identities** (e.g., `modha@kube.lan`).

## Key Development Commands

```bash
# Authentication (via itv-auth CLI)
npm run auth         # OAuth flow (auto mode, opens browser)
npm run auth:manual  # OAuth flow (manual mode, for SSH/remote)

# Deployment
npm run deploy       # Deploy .gs files to Apps Script project

# Testing
npm test             # Execute testFontSwap() → Retrieve logs
npm run logs         # Standalone log retrieval for debugging

# Security
npm run security:check   # Comprehensive security validation
npm run security:setup   # Install pre-commit hooks

# Utilities
npm run benchmark        # Performance benchmarking
npm run clean            # Remove token.json (force re-auth)
```

## Configuration System

### Font Mapping Configuration

Located in `config.gs`, editable via YAML:

```yaml
fontMappings:
  - "Comic Sans MS": "Arial"
  - "Arial": "Comic Sans MS"

processNotes: true
skipErrors: true
batchSize: 50
apiRetries: 3
apiRetryDelay: 1000
```

### Universal Toggle Mode

The system supports **universal font toggling** - all fonts → single target font:

```javascript
// First run: All fonts → Comic Sans MS
// Second run: All fonts → Arial
// Third run: All fonts → Comic Sans MS
// ... (toggles each run)
```

Toggle mode persists per-presentation in PropertiesService.

## Testing

### Primary Test Case

**Test Presentation**: `1_WxqIvBQ2ArGjUqamVhVYKdAie5YrEgXmmUFMgNNpPA`

**Test Function**: `testFontSwap()` in `main.gs`

**Expected Behavior**:
- Swap Comic Sans MS ↔ Arial
- Process all slides including notes pages
- Complete in <60 seconds
- Success rate >95%
- Detailed logs via `npm test`

### Running Tests

```bash
# Automated testing with log retrieval
npm test

# Manual testing
# 1. Open Apps Script project
# 2. Run testFontSwap() function
# 3. View execution logs
```

## Common Development Tasks

### Modifying Font Swapping Logic

1. Edit `src/formatter.gs` (SlideFormatter class)
2. Update font mappings in `src/config.gs`
3. Deploy: `npm run deploy`
4. Test: `npm test`

### Adding New Formatting Rules

1. Add configuration to `src/config.gs`
2. Implement logic in `src/formatter.gs`
3. Update API calls in `src/slides-api.gs` if needed
4. Test with `npm test`

### Debugging Failed Deployments

```bash
# Check API enablement
# Visit: https://console.cloud.google.com/apis/dashboard
# Required: Drive, Slides, Sheets, Apps Script APIs

# Check user-level Apps Script API
# Visit: https://script.google.com/home/usersettings
# Must be enabled

# Verify environment variables
cat .env
# Must contain DEPLOYMENT_API_KEY (GOOGLE_API_KEY optional for MCP)

# Check credentials.json exists (needed for itv-auth)
ls -la credentials.json

# Re-authenticate
rm token.json
npm run auth
npm run deploy
```

### Reading Execution Logs

```bash
# Automated log retrieval (20+ entries)
npm run logs

# View in Apps Script editor
# Open project → Executions → View execution details
```

## Security Requirements

### Pre-Commit Checklist

Before ANY commit:
- [ ] Run `npm run security:check` (must pass)
- [ ] Verify no API keys in code/configs
- [ ] Confirm all secrets in `.env`
- [ ] Check documentation uses placeholders

### Files That Must NEVER Be Committed

```
.env                    # Environment variables with real keys
credentials.json        # OAuth client configuration
token.json             # OAuth tokens
*.secret*              # Any file with "secret" in name
*key*                  # Files with "key" in name (with exceptions)
```

### If Secrets Are Exposed

**STOP all work immediately:**
1. Revoke credentials at Google Cloud Console
2. Follow `secrets/incident-response.md` procedures
3. Clean git history with filter-branch
4. Force push cleaned history
5. Generate new credentials
6. Document lessons learned

## MCP Server Configuration

**Custom Patched MCP Server**: `mcp-dev-assist-local/`

**Purpose**: Efficient access to Google Workspace API documentation

**Configuration**:
- Uses Custom Search API (not Discovery Engine)
- Requires `GOOGLE_API_KEY` in `.env`
- Search Engine ID: `701ecba480bf443fa`

**Usage**: Automatically configured in Claude Code workspace settings

## Key Technical Concepts

### Batch Processing

Apps Script API has strict quotas. Use batching:
- Max 50 operations per `batchUpdate` call
- Intelligent batching in `slides-api.gs`
- Retry logic with exponential backoff

### Font Discovery

Two approaches:
1. **Explicit mappings**: Define specific font pairs in config
2. **Universal toggle**: Discover all fonts → swap to single target

### Error Handling

**Philosophy**: Skip failed objects, continue processing
- Collect errors for final report
- Provide deep links to problematic slides
- Graceful degradation for partial completion

### Deep Links to Slides

Format: `https://docs.google.com/presentation/d/{presentationId}/edit#slide=id.{slideId}`

Generated automatically in error reports for quick navigation.

## Project Files Reference

### Documentation
- `README.md` - Setup and deployment instructions
- `SPECIFICATION.md` - Comprehensive technical specification
- `docs/MACHINE_TRANSFER.md` - New machine setup guide
- `secrets/` - Security procedures and incident response

### Deployment
- `deploy-web-manual.js` - Main deployment script (OAuth + Drive API)
- `auth-with-monitoring.js` - Professional OAuth flow
- `oauth-background.js` - Background OAuth server

### Testing
- `intelligent-log-retrieval.js` - Automated test execution and log retrieval
- `get-logs-programmatically.js` - Standalone log access
- `benchmark-toggle-loop.js` - Performance testing

### Security
- `scripts/security-check.sh` - Secret scanning
- `scripts/setup-security.sh` - Pre-commit hook installation
- `.env.template` - Environment variable template

## Repository Information

- **GitHub**: https://github.com/spm1001/slider
- **Apps Script Project**: `1I2dUX4hBHie4JvxELe5Mog8PxHXRWLUDACYzw94NqMrQr-YGawsNsouu`
- **Google Cloud Project**: `mit-dev-362409`
- **Test Presentation**: `1_WxqIvBQ2ArGjUqamVhVYKdAie5YrEgXmmUFMgNNpPA`

## Performance Requirements

- Process presentations up to 50 slides
- Handle 20+ objects per slide
- Complete processing in <60 seconds
- Memory usage <100MB peak
- Success rate >95%
- API efficiency via intelligent batching

## Learning Documentation

The user prefers **Socratic learning** - explain "how" and "why" when performing technical operations.

**When teaching new concepts**:
- Record in `LEARNING_LOG.md` (append, never overwrite)
- Structure: Question → Breakdown → Principles → Concepts
- Use Socratic method - guided discovery
- Connect to previous learning
