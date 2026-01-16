# Distribution Architecture

How ITV Slides Formatter is developed and distributed to users.

## Overview

```
GitHub: spm1001/itv-slides-formatter
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
  Dev A     Dev B    Production
 (sandbox) (sandbox)  (shared)
                         │
                         ▼
                    ~20 users
```

## Three-Project Model

| Project | Owner | Script ID | Purpose |
|---------|-------|-----------|---------|
| Slides Formatter - Sameer Dev | Sameer | `1FDkshN59...` | Personal sandbox |
| Slides Formatter - [Colleague] Dev | Colleague | TBD | Their sandbox |
| Slides Formatter - Production | MIT service account | TBD | What users install |

All three link to the same GCP project: `itv-mit-slides-formatter`

## OAuth Scopes

The add-on uses **minimal scopes** (unlike the MCP's super token):

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/script.container.ui"
  ]
}
```

Users only authorize what the add-on actually needs.

## Config Files

### deploy.json (gitignored)

Each developer's local config pointing to their sandbox:

```json
{
  "scriptId": "YOUR_DEV_SCRIPT_ID",
  "gcpProjectId": "itv-mit-slides-formatter",
  "src": "./src",
  "credentials": "/path/to/credentials.json",
  "token": "/path/to/token.json"
}
```

### deploy.json.template (committed)

Shows structure without secrets:

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "gcpProjectId": "itv-mit-slides-formatter",
  "src": "./src",
  "credentials": "/path/to/your/credentials.json",
  "token": "/path/to/your/token.json"
}
```

### deploy.production.json (committed)

Production script ID, credentials path TBD based on service account setup:

```json
{
  "scriptId": "PRODUCTION_SCRIPT_ID",
  "gcpProjectId": "itv-mit-slides-formatter",
  "src": "./src",
  "credentials": "/path/to/service/credentials.json",
  "token": "/path/to/service/token.json"
}
```

## Development Workflow

### Daily iteration (~20s cycle)

```bash
# Edit src/*.gs
itv-appscript deploy
itv-appscript run testFunction --dev
itv-appscript logs -n 5
```

### Collaboration

```bash
# You
git commit -am "Add feature X" && git push

# Colleague
git pull
itv-appscript deploy  # Deploys to THEIR sandbox
# Test...
```

No merge conflicts in Apps Script because each dev has their own project.

## Release Process

### Deploy to Production

```bash
# 1. Ensure you're on main, tests pass
git checkout main && git pull

# 2. Switch to production config
cp deploy.production.json deploy.json

# 3. Deploy code
itv-appscript deploy

# 4. Create new version (users auto-update)
itv-appscript versions create "v1.2 - Added feature X"

# 5. Restore dev config
git checkout deploy.json
```

### Deployment Types

| Type | Behavior | Use For |
|------|----------|---------|
| HEAD | Always runs latest pushed code | Dev testing |
| Versioned | Runs specific version; new version = users auto-update | Production |

**Production uses versioned deployments.** When you create a new version, users automatically get it next time they use the add-on.

## User Installation

### First-time install (one-time per user)

**Option A: Direct URL** (preferred)
```
https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
```

**Option B: From shared project**
1. Open the Apps Script project (shared with them as Viewer)
2. Deploy → Test deployments → Install

### User experience after install

1. Open any Google Slides presentation
2. Extensions → ITV Slides Formatter
3. Use the add-on

Updates are automatic - no user action needed.

## Service Account Setup

The production script is owned by a shared MIT service account to avoid single-person dependency.

### Creating the service account

1. Create Google account: `mit-slides-tools@itv.com` (or similar)
2. Add to GCP project `itv-mit-slides-formatter` with Editor role
3. Create Apps Script project under this account
4. Share with developers as Editors

### Authenticating as service account

For deploying to production, you need the service account's token:

**Option A: Shared credentials (simpler)**
- Store service account's credentials.json securely
- Use `itv-appscript auth --manual` to generate token
- Store token.json securely

**Option B: Machine-based (more secure)**
- Dedicated machine/VM logged in as service account
- Deploy from there

## Future: Marketplace Publishing

When user base grows beyond ~50, consider publishing to Google Workspace Marketplace:

- **Private publishing**: ITV domain only, no Google review
- **Benefits**: Easier discovery, admin can push org-wide
- **Trade-off**: More formal release process

For now, direct installation is sufficient for ~20 users.

## Checklist: Setting Up New Developer

1. [ ] Clone repo: `git clone https://github.com/spm1001/itv-slides-formatter`
2. [ ] Copy template: `cp deploy.json.template deploy.json`
3. [ ] Create personal Apps Script project at script.google.com
4. [ ] Link to GCP project `itv-mit-slides-formatter`
5. [ ] Update deploy.json with their script ID and credential paths
6. [ ] Run: `itv-appscript deploy`
7. [ ] Test: Open Slides, check add-on appears

## Checklist: Production Setup (One-Time)

1. [ ] Create MIT service account
2. [ ] Create production Apps Script project under service account
3. [ ] Link to GCP project
4. [ ] Share with developers as Editors
5. [ ] Create versioned deployment (type: Add-on)
6. [ ] Update deploy.production.json with script ID
7. [ ] Document install URL for users
