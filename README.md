# Google Slides Formatter

Google Apps Script tool for automated Google Slides presentation formatting.

## Features

- **Smart Font Swapping**: Comic Sans MS ↔ Arial (configurable)
- **Batch Processing**: Efficient API usage with intelligent batching
- **Notes Support**: Includes presentation notes pages
- **Universal Toggle**: Each run toggles between font styles

## Quick Start

### Prerequisites

- Python 3.x with [uv](https://docs.astral.sh/uv/)
- [itv-google-auth](~/Repos/itv-google-auth) — OAuth authentication
- [itv-appscript-deploy](~/Repos/itv-appscript-deploy) — Apps Script CLI
- Google Cloud Project with OAuth credentials
- Google Account with access to target presentations

### Setup

1. Set up the CLI tools (see their respective repos)
2. Place OAuth credentials (`credentials.json` from GCP Console)
3. Enable user-level Apps Script API at https://script.google.com/home/usersettings
4. Run `npm run auth` to authenticate
5. Deploy with the command below

### Usage

```bash
# Deploy changes
uv run --directory ~/Repos/itv-appscript-deploy itv-appscript deploy --config ./deploy.json

# Run test (in Apps Script editor)
# Open: https://script.google.com/d/1FDkshN59SqLSNzORh2VVoE0_PIZ5_Sqv3Dq7krtwvIL4nV_lI3LrJlin/edit
# Run testFontSwap()

# View logs
uv run --directory ~/Repos/itv-appscript-deploy itv-appscript logs -n 10 --config ./deploy.json
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

# Deployment & Logs (use uv run --directory ~/Repos/itv-appscript-deploy itv-appscript ... --config ./deploy.json)
# deploy, logs -n 20, logs --follow

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
