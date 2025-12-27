# GCP Project Setup

Minimal steps to create a Google Cloud project for Apps Script deployment.

## 1. Create Project

[Create project →](https://console.cloud.google.com/projectcreate)

- **Project name**: `itv-mit-slides-formatter` (or your preferred name)
- Click **Create**

## 2. Enable APIs

Click each link, ensure project is selected, click **Enable**:

1. [Apps Script API →](https://console.cloud.google.com/apis/library/script.googleapis.com)
2. [Drive API →](https://console.cloud.google.com/apis/library/drive.googleapis.com)
3. [Slides API →](https://console.cloud.google.com/apis/library/slides.googleapis.com)
4. [Sheets API →](https://console.cloud.google.com/apis/library/sheets.googleapis.com)
5. [Cloud Logging API →](https://console.cloud.google.com/apis/library/logging.googleapis.com) (often pre-enabled)

## 3. Create OAuth Client

[Google Auth Platform →](https://console.cloud.google.com/auth/overview)

Click **Get started**, then:

1. **Application type**: Web application
2. **Name**: `Slides Formatter CLI`
3. **Authorized redirect URIs**: `http://localhost:3000/oauth/callback`
4. Click **Create**
5. **Download JSON** → save as `credentials.json` in project root

If download fails, go to [Credentials →](https://console.cloud.google.com/apis/credentials), click your client, add a new client secret, download.

## 4. Enable User-Level Apps Script API

[Apps Script settings →](https://script.google.com/home/usersettings)

Toggle **ON**: "Google Apps Script API"

## 5. Authenticate

```bash
npm run auth
```

## 6. Link Apps Script to GCP Project

Run any command that triggers the helpful error:

```bash
itv-appscript run testFontSwap --dev
```

The error message shows:
- Project number (e.g., `780647236756`)
- Direct link to Apps Script settings

Click the link, paste the project number.

## 7. Verify

```bash
itv-appscript deploy
itv-appscript run testFontSwap --dev
itv-appscript logs -n 5
```

All three should work.
