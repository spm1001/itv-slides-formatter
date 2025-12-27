# Google Slides Formatter

Google Apps Script tool for automated Google Slides presentation formatting.

## Features

- **Smart Font Swapping**: Comic Sans MS ↔ Arial (configurable)
- **Batch Processing**: Efficient API usage with intelligent batching
- **Notes Support**: Includes presentation notes pages
- **Universal Toggle**: Each run toggles between font styles

## Quick Start

### Prerequisites

- Python 3.x with pipx
- Google Cloud Project with OAuth credentials
- Google Account with access to target presentations

### Setup

```bash
# 1. Install CLI tools
pipx install ~/Repos/itv-google-auth
pipx install ~/Repos/itv-appscript-deploy

# 2. Place OAuth credentials
# Download credentials.json from Google Cloud Console
# Must be Web Application type, not Desktop

# 3. Enable user-level Apps Script API
# Visit: https://script.google.com/home/usersettings
# Toggle ON: "Google Apps Script API"

# 4. Authenticate
npm run auth

# 5. Deploy
itv-appscript deploy
```

### Usage

```bash
# Deploy changes
itv-appscript deploy

# Run test (in Apps Script editor)
# Open: https://script.google.com/d/1FDkshN59SqLSNzORh2VVoE0_PIZ5_Sqv3Dq7krtwvIL4nV_lI3LrJlin/edit
# Run testFontSwap()

# View logs
itv-appscript logs -n 10
```

## Project Structure

```
src/                # Apps Script source files
  main.gs           # Entry points: onOpen(), testFontSwap()
  formatter.gs      # Font swap logic
  slides-api.gs     # Google Slides API client
  config.gs         # Configuration
  ui.gs             # User interface
  utils.gs          # Helpers
  constants.gs      # Constants
  appsscript.json   # Manifest

deploy.json         # itv-appscript config
package.json        # npm scripts (auth only)
```

## Configuration

Edit `src/config.gs` for font mappings:

```yaml
fontMappings:
  - "Comic Sans MS": "Arial"
  - "Arial": "Comic Sans MS"

processNotes: true
skipErrors: true
batchSize: 50
```

## Commands

```bash
# Authentication
npm run auth              # Auto mode (opens browser)
npm run auth:manual       # Manual mode (for SSH)

# Deployment & Logs
itv-appscript deploy      # Deploy .gs files
itv-appscript logs -n 20  # View recent logs
itv-appscript logs --follow  # Stream logs

# Security
npm run security:check    # Pre-commit validation
npm run clean             # Remove token.json
```

## Test Presentation

Use presentation `1_WxqIvBQ2ArGjUqamVhVYKdAie5YrEgXmmUFMgNNpPA` for testing.

Expected: Comic Sans MS ↔ Arial swap, 0 errors.

## Troubleshooting

**"Permission denied" on deploy**
- Enable Apps Script API at user level: https://script.google.com/home/usersettings

**No logs appearing**
- Ensure script is associated with GCP project mit-dev-362409
- Check Apps Script editor → Project Settings → GCP Project

**OAuth errors**
- Ensure credentials.json is Web Application type (not Desktop)
- Run `npm run clean` then `npm run auth` to re-authenticate

## License

MIT
