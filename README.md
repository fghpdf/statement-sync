# StatementSync

A minimalist Chrome extension that extracts credit card and bank statement data from financial institution portals and syncs them to your Google Drive as standard CSV files.

> **Status**: Active development. Amex JP support is live; more institutions coming.

---

## Supported Institutions

| Institution | Status | Content Script |
|---|---|---|
| American Express Japan | ✅ Live | `src/extension/institutions/amexjp.ts` |
| _Your bank here_ | 🗓 Planned | `src/extension/institutions/<name>.ts` |

---

## Features

- **Multi-institution architecture** — each financial portal gets its own isolated content script; adding support for a new bank is a single file.
- **Google Drive integration** — OAuth2-authenticated upload straight to a named folder in your Drive.
- **Smart file naming** — consistent, date-stamped filenames like `AmexJP_1234_2025-07_Statement.csv`.
- **Real-time page detection** — the popup automatically detects whether you're on a supported page and disables the button if not.
- **Settings** — toggle the `_Statement` filename suffix per your preference.

---

## Tech Stack

| Layer | Tool |
|---|---|
| UI | React + TypeScript |
| Styling | Tailwind CSS v4 |
| Bundler | Vite |
| Extension platform | Chrome MV3 (content scripts, service worker, `chrome.identity`) |

---

## Developer Guide

### 1. Install & Build

```bash
npm install
npm run build
```

The `dist/` directory is the compiled extension ready to load into Chrome.

### 2. Configure Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable the **Google Drive API**.
3. Configure the OAuth consent screen.
4. Create an **OAuth Client ID** (Application type: Chrome Extension).
5. In `public/manifest.json`, replace the placeholder:
   ```json
   "client_id": "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com"
   ```
6. Rebuild: `npm run build`.

### 3. Load in Chrome

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `dist/` folder

---

## Project Structure

```
src/
├── components/
│   └── ExtensionPopupMockup.tsx   # Popup UI (React)
├── extension/
│   ├── institutions/              # One file per financial institution
│   │   └── amexjp.ts             # Amex JP content script
│   ├── background.ts              # Service worker: Drive API + OAuth
│   ├── types.ts                   # Shared ExtractionResult interface
│   └── utils/
│       └── filename.ts            # CSV filename generator
├── main.tsx                       # Preview app entry
└── popup.tsx                      # Extension popup entry
public/
└── manifest.json                  # Chrome MV3 manifest
```

---

## Adding a New Institution

1. **Create** `src/extension/institutions/<name>.ts`.
   - Listen for `EXTRACT_STATEMENT` messages.
   - Respond with `ExtractionResponse` from `../types.ts`.
2. **Register** the content script in `public/manifest.json` under `content_scripts`.
3. **Add** the new entry to the `rollupOptions.input` in `vite.config.ts`.
4. **Update** the `host_permissions` array in `manifest.json` if the new domain is not already covered.

That's it — no changes needed to the popup or background worker.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values (used for local development only; never committed):

```bash
cp .env.example .env
```

---

## License

MIT
