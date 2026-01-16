# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Google Apps Script tool for automated Google Slides presentation formatting. Processes slides and linked objects (charts, tables) to ensure consistent formatting according to configurable rules.

**Current Phase**: Phase 1 - Font swapping with hardcoded rules (Comic Sans MS ↔ Arial)

## OAuth: Consumer Project

**⚠️ DO NOT RUN `npm run auth` HERE**

This project uses the centralized token from `mcp-google-workspace`:
- Token: `/Users/modha/Repos/mcp-google-workspace/token.json`
- Credentials: `/Users/modha/Repos/mcp-google-workspace/credentials.json`

**If auth is needed:**
```bash
cd ~/Repos/mcp-google-workspace && uv run python -m workspace_mcp.auth
```

The `npm run auth` command just prints a reminder to run auth at the canonical location.

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

### CLI Tools (installed via pipx)

- **itv-auth**: OAuth authentication (from itv-google-auth)
- **itv-appscript**: Deploy, run, logs (from itv-appscript-deploy)

## Development Workflow

### First-Time Setup

```bash
# 1. Install CLI tools
pipx install ~/Repos/itv-google-auth
pipx install ~/Repos/itv-appscript-deploy

# 2. Add OAuth credentials
# Place credentials.json in project root (Web Application type)
# Download from: https://console.cloud.google.com/apis/credentials

# 3. Enable user-level Apps Script API
# Visit: https://script.google.com/home/usersettings
# Toggle ON: "Google Apps Script API"

# 4. Authenticate
npm run auth  # or: itv-auth -s drive -s script.projects -s slides -s sheets -s logging.read

# 5. Deploy
itv-appscript deploy
```

### Regular Development

```bash
# Edit source
vim src/formatter.gs

# Deploy
itv-appscript deploy

# Test (run in Apps Script editor, then check logs)
itv-appscript logs -n 10

# Or stream logs
itv-appscript logs --follow
```

### Key Commands

```bash
# Authentication
npm run auth              # OAuth flow (auto mode)
npm run auth:manual       # OAuth flow (manual mode, for SSH)

# Deployment & Logs (itv-appscript CLI)
itv-appscript deploy      # Deploy .gs files
itv-appscript logs -n 20  # View recent logs
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

# 2. Run test in Apps Script editor
# Open: https://script.google.com/d/1FDkshN59SqLSNzORh2VVoE0_PIZ5_Sqv3Dq7krtwvIL4nV_lI3LrJlin/edit
# Run testFontSwap()

# 3. Check logs
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

## Known Issues

### Remote Execution Not Working (Jan 2026)

`itv-appscript run` fails. Root cause: **GCP project mismatch**.

The execution API requires OAuth credentials from the **same** GCP project the script is linked to.

| Component | Project |
|-----------|---------|
| Apps Script project linked to | `itv-mit-slides-formatter` |
| Credentials in mcp-google-workspace | `mit-workspace-mcp-server` |

**Deploy works** (uses script.projects scope) but **run fails** (execution API checks project match).

**Workaround:** Run functions manually in Apps Script editor, check logs via `itv-appscript logs`.

**Fix path:** Either:
1. Change Apps Script linking to `mit-workspace-mcp-server`, or
2. Use credentials from `itv-mit-slides-formatter` with separate token

Also: `itv-appscript-deploy` has a bug with `scriptProcessFilter` parameter — use `--force` to bypass process checking.
