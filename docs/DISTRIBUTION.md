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
| itv-mit-slides-formatter-deploy | measurement@itv.com | `1vCtFsdMR1eTYvitf7kmIMUl5CWDon6kTjruqYxbu-yDxJWIuTjPmAOny` | Production |

All three link to the same GCP project: `itv-mit-slides-formatter`

## OAuth Scopes

Runtime scopes are defined in `src/appsscript.json` (the source of truth).
Deployment scopes are handled automatically by itv-appscript-deploy.

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

Production script ID, uses shared credentials and separate token:

```json
{
  "scriptId": "1vCtFsdMR1eTYvitf7kmIMUl5CWDon6kTjruqYxbu-yDxJWIuTjPmAOny",
  "gcpProjectId": "itv-mit-slides-formatter",
  "src": "./src",
  "credentials": "./credentials.json",
  "token": "./token.production.json"
}
```

Note: `token.production.json` is gitignored. For CI/CD, store in GitHub Secrets.

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

# 2. Deploy to production (uses separate config)
itv-appscript deploy --config deploy.production.json

# 3. Create new version (users auto-update)
itv-appscript versions create "v1.2 - Added feature X" --config deploy.production.json
```

No need to swap config files — the `--config` flag handles it.

### Deployment Types

| Type | Behavior | Use For |
|------|----------|---------|
| HEAD | Always runs latest pushed code | Dev testing |
| Versioned | Runs specific version; new version = users auto-update | Production |

**Production uses versioned deployments.** When you create a new version, users automatically get it next time they use the add-on.

## User Installation

### First-time install (one-time per user)

**Production Deployment ID:** `AKfycbwnnvFlFwfdN5BV-QXqF7QGfGGs5S82MIPRa0Qj8RTQn-EN-kveA9nhe31Ea1pefgal`

**Option A: From shared project** (recommended for ITV users)
1. Open the Apps Script project: https://script.google.com/home/projects/1vCtFsdMR1eTYvitf7kmIMUl5CWDon6kTjruqYxbu-yDxJWIuTjPmAOny
2. Click **Deploy** → **Test deployments**
3. Select the versioned deployment → **Install**

**Option B: Direct install URL**
```
https://script.google.com/macros/s/AKfycbwnnvFlFwfdN5BV-QXqF7QGfGGs5S82MIPRa0Qj8RTQn-EN-kveA9nhe31Ea1pefgal/exec
```

### User experience after install

1. Open any Google Slides presentation
2. Extensions → ITV Slides Formatter
3. Use the add-on

Updates are automatic - no user action needed.

## Shared Account Setup

The production script is owned by `measurement@itv.com` (shared MIT team account via Okta SSO).

### Setup (completed Jan 2026)

1. ✅ `measurement@itv.com` added to GCP project `itv-mit-slides-formatter` with Editor role
2. ✅ Apps Script project `itv-mit-slides-formatter-deploy` created under this account
3. ✅ Linked to GCP project
4. ✅ OAuth token generated and stored as `token.production.json`

### Re-authenticating (if token expires)

1. Log into Chrome as `measurement@itv.com` (via Okta)
2. Run: `itv-appscript auth --config deploy.production.json`
3. Token saved to `token.production.json`

Anyone who can Okta-auth as measurement@itv.com can refresh the token.

### For CI/CD

Store `token.production.json` contents in GitHub Secrets as `GOOGLE_PRODUCTION_TOKEN`.

## Future: Marketplace Publishing

When user base grows beyond ~50, consider publishing to Google Workspace Marketplace:

- **Private publishing**: ITV domain only, no Google review
- **Benefits**: Easier discovery, admin can push org-wide
- **Trade-off**: More formal release process

For now, direct installation is sufficient for ~20 users.

## Getting credentials.json

The OAuth client credentials are shared across all developers (same GCP project).

**Download from GCP Console:**

1. Go to [GCP Console Credentials](https://console.cloud.google.com/apis/credentials?project=itv-mit-slides-formatter)
2. Find "itv-slides-formatter OAuth" client (Web Application type)
3. Click download icon → Save as `credentials.json` in project root

You need Editor access to the GCP project. Ask Sameer if you don't have access.

The credentials.json is the same for everyone — it identifies the app, not the user. Your personal token.json (generated during auth) is what identifies you.

## Checklist: Setting Up New Developer

1. [ ] Clone repo: `git clone https://github.com/spm1001/itv-slides-formatter`
2. [ ] Get `credentials.json` (see above) → save to project root
3. [ ] Copy template: `cp deploy.json.template deploy.json`
4. [ ] Create personal Apps Script project at script.google.com
5. [ ] Link Apps Script project to GCP project `itv-mit-slides-formatter` (Resources → Cloud Platform project)
6. [ ] Update `deploy.json` with your script ID
7. [ ] Install CLI: `uv tool install git+ssh://git@github.com/spm1001/itv-appscript-deploy`
8. [ ] Authenticate: `itv-appscript auth`
9. [ ] Deploy: `itv-appscript deploy`
10. [ ] Test: Open any Google Slides → Extensions → Slide Formatter menu appears

## Checklist: Production Setup (One-Time)

1. [x] Add `measurement@itv.com` to GCP project as Editor
2. [x] Create production Apps Script project under shared account
3. [x] Link to GCP project `itv-mit-slides-formatter`
4. [x] Generate OAuth token (`itv-appscript auth --config deploy.production.json`)
5. [x] Update deploy.production.json with script ID
6. [ ] Share Apps Script project with developers as Editors
7. [x] Create versioned deployment (type: Add-on)
8. [x] Document install URL for users
9. [ ] Store token in GitHub Secrets for CI/CD
