# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Google Apps Script tool for automated Google Slides presentation formatting. Processes slides and linked objects (charts, tables) to ensure consistent formatting according to configurable rules.

**Current Phase**: Phase 1 - Font swapping with hardcoded rules (Comic Sans MS ↔ Arial)

**Distribution**: See `docs/DISTRIBUTION.md` for the three-project model (dev sandboxes + production) and release workflow.

## OAuth: Standalone Project

This project has its own OAuth credentials and token (decoupled from mcp-google-workspace as of Jan 2026):
- **Credentials**: `./credentials.json` (from GCP project `itv-mit-slides-formatter`)
- **Token**: `./token.json` (local, not symlinked)

**To re-authenticate:**
```bash
itv-appscript auth
```

Scopes are automatically read from `src/appsscript.json` and merged with CLI scopes.

## Architecture

### Simple Two-Environment Model

1. **Local** (this repo): Apps Script source files (.gs) + configuration
2. **Remote** (Google's servers): Deployed Apps Script that runs in Google Sheets

You edit `.gs` files locally, deploy via CLI, and they run on Google's servers.

### Apps Script Files (src/)

```
main.gs          - Entry points: onOpen(), testFontSwap(), formatPresentation()
formatter.gs     - SlideFormatter class, font discovery, universal toggle
slides-api.gs    - SlidesApiClient, retry logic, intelligent batching
config.gs        - YAML config parsing, font mappings
constants.gs     - OAuth scopes, element types, defaults
ui.gs            - Progress dialogs, error reporting
utils.gs         - Helper functions, toggle persistence
appsscript.json  - Manifest (scopes, advanced services)
```

### CLI Tools

Install once:
```bash
uv tool install git+ssh://git@github.com/spm1001/itv-appscript-deploy
```

Then use directly:
```bash
itv-appscript auth          # OAuth (itv-google-auth is a transitive dependency)
itv-appscript deploy        # Deploy to Apps Script
itv-appscript run <func>    # Run function remotely
itv-appscript logs -n 20    # View logs
```

## Development Workflow

### First-Time Setup

```bash
# 1. Install CLI (if not already)
uv tool install git+ssh://git@github.com/spm1001/itv-appscript-deploy

# 2. Get credentials.json (see docs/DISTRIBUTION.md)

# 3. Set up deploy.json
cp deploy.json.template deploy.json
# Edit deploy.json with your script ID

# 4. Authenticate and deploy
itv-appscript auth
itv-appscript deploy
```

### Regular Development

```bash
# Edit source
vim src/formatter.gs

# Deploy
itv-appscript deploy

# Check logs
itv-appscript logs -n 10
```

### Key Commands

```bash
# Authentication
itv-appscript auth           # OAuth flow (auto mode)
itv-appscript auth --manual  # OAuth flow (manual mode, for SSH)

# Deployment & Logs
itv-appscript deploy         # Deploy to Apps Script
itv-appscript logs -n 20     # View recent logs
itv-appscript logs --follow  # Stream logs

# Security
npm run security:check    # Pre-commit secret scanning
npm run clean             # Remove token.json (force re-auth)
```

## Testing

**Test Presentation**: `1_WxqIvBQ2ArGjUqamVhVYKdAie5YrEgXmmUFMgNNpPA`

**Test Function**: `testFontSwap()` in `main.gs`

```bash
# 1. Deploy latest code
itv-appscript deploy

# 2. Run test function
itv-appscript run testFontSwap

# 3. Check logs (if needed)
itv-appscript logs -n 20
```

**Expected output**: Comic Sans MS ↔ Arial swap, 0 errors.

## Configuration

### Font Mapping (config.gs)

```yaml
fontMappings:
  - "Comic Sans MS": "Arial"
  - "Arial": "Comic Sans MS"

processNotes: true
skipErrors: true
batchSize: 50
```

### Universal Toggle Mode

Each run toggles between Comic Sans MS and Arial. State persists per-presentation.

## Security

### Pre-Commit Checklist

- [ ] Run `npm run security:check`
- [ ] No API keys in code
- [ ] No credentials in git

### Files That Must NEVER Be Committed

```
credentials.json    # OAuth client config
token.json          # OAuth tokens
.env                # Environment variables (if used)
```

## Project Files

```
src/                # Apps Script source (.gs files)
deploy.json         # itv-appscript config (scriptId, gcpProjectId)
credentials.json    # OAuth client (not committed)
token.json          # OAuth tokens (not committed)
package.json        # npm scripts for auth
scripts/            # Security check scripts
```

## Repository Information

- **GitHub**: https://github.com/spm1001/slider
- **Apps Script Project**: `1FDkshN59SqLSNzORh2VVoE0_PIZ5_Sqv3Dq7krtwvIL4nV_lI3LrJlin`
- **GCP Project**: `itv-mit-slides-formatter`
- **Test Presentation**: `1_WxqIvBQ2ArGjUqamVhVYKdAie5YrEgXmmUFMgNNpPA`

## Slides API Learnings (Jan 2026)

### The Goblin Census

**Non-placeholder elements don't inherit from master template.** They have hardcoded defaults:

| Element Type | Default Font | Inherits? | Formatter Strategy |
|--------------|--------------|-----------|-------------------|
| Title/Body/Subtitle placeholders | (from master) | ✅ Yes | Clear overrides |
| Speaker notes | (from master) | ✅ Yes | Clear overrides |
| Plain text boxes | Arial 18pt | ❌ No | Explicit SET |
| Shapes with text | Arial 14pt | ❌ No | Explicit SET |
| Table cells | Arial 14pt | ❌ No | Explicit SET |
| Chart text | Roboto (Sheets) | ❌ No | Sheets API |

### Field Mask Pattern for Bulk Reset

To clear overrides and let inheritance take over (placeholders only):
```python
{
    "updateTextStyle": {
        "objectId": "...",
        "style": {},  # Empty = clear
        "fields": "fontFamily,fontSize,bold,foregroundColor"  # What to clear
    }
}
```
- Property in body but NOT in mask → silently ignored
- Property in mask but NOT in body → cleared to default

### Two-API Reality for Charts

Embedded charts require TWO APIs:
- **Slides API**: Position, size, linking (that's all)
- **Sheets API**: All styling — series colors, fonts, axes, legends

Chart text defaults to Roboto, not Arial.

### Units

EMU (English Metric Units): 914400 EMU = 1 inch = 72 points
- 12700 EMU = 1 point
- Common outline: 9525 EMU ≈ 0.75pt

### Grid System (16:9 Widescreen)

Standard 16:9 slide: **9,144,000 × 5,143,500 EMU** (10" × 5.625")

Grid units that divide evenly into both dimensions:

| Grid Unit (EMU) | Grid Size | Cell Size | Notes |
|-----------------|-----------|-----------|-------|
| 571,500 | 16 × 9 | 0.625" | Very coarse (aspect ratio itself) |
| 285,750 | 32 × 18 | 0.31" | Major zones |
| **114,300** | **80 × 45** | **⅛"** | Recommended — clean imperial |
| 57,150 | 160 × 90 | 1/16" | Fine |

### Colors: RGB vs Theme References

Two ways to specify colors in the API:

```javascript
// Hardcoded RGB (doesn't change with theme)
{ rgbColor: { red: 0.9, green: 0.2, blue: 0.2 } }

// Theme reference (updates when theme changes)
{ themeColor: "ACCENT1" }
```

Theme palette is readable via `master.pageProperties.colorScheme.colors`. Each slot (DARK1, LIGHT1, ACCENT1-6, etc.) has RGB values.

### Reading Master Template

`Slides.Presentations.get()` returns:
- `masters[].pageProperties.colorScheme` — the 12-slot theme palette
- `masters[].pageElements[].shape.placeholder` — TITLE, BODY, etc. with font/size
- `layouts[]` — available layout templates with names

## Architecture Notes (Jan 2026)

### Slides Add-on Conversion

This project was originally designed as a **Sheets-bound add-on** that processed external presentations (prompted for URL). It's now a **Slides editor add-on** that formats the active presentation directly.

**Key changes made:**
- `SpreadsheetApp.getUi()` → `SlidesApp.getUi()` (menu, dialogs)
- `HtmlService.createHtml()` → `HtmlService.createHtmlOutput()`
- Added `script.container.ui` scope for modal dialogs
- `formatPresentation()` now uses `SlidesApp.getActivePresentation()` instead of URL prompt

**Fully migrated (Jan 2026):**
- `config.gs` now uses PropertiesService for settings persistence (per-presentation via `config_${presentationId}` keys).

### Marketplace Publishing Required

For non-developer users, **Google Workspace Marketplace publishing** is required. The test deployment flow requires Editor access to the Apps Script project.

- Private publishing (ITV domain only) is straightforward
- No Google review needed for internal tools
- Enables Extensions → Add-ons → Get add-ons installation

## Known Issues

None currently.
