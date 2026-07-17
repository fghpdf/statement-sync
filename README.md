# StatementSync

StatementSync is a minimalist Chrome extension designed to automatically extract credit card statement data from supported banking portals (starting with American Express Japan) and securely sync them directly to your Google Drive as standard CSV files.

## Features

- **Amex JP Support**: Automatically detects and extracts statement data from `americanexpress.com/ja-jp`.
- **Google Drive Integration**: Securely uploads your statements to a dedicated "Amex JP Statements" folder in your Google Drive using OAuth2.
- **Smart Naming**: Generates consistent, date-stamped file names (e.g., `AmexJP_XXXX_2023-10_Statement.csv`).
- **Settings Toggle**: Customize whether your file names include a `_Statement` suffix.
- **Real-time Feedback**: Clean toast notifications in the extension popup let you know when syncs succeed or fail.

## Tech Stack

- **React & TypeScript**: For the extension popup UI.
- **Tailwind CSS**: For minimalist, clean styling.
- **Vite**: For fast building and bundling of the extension's background and content scripts.
- **Chrome Extensions API (Manifest V3)**: For content scripts, background service workers, and identity (OAuth2).

## Developer Guide & Testing

To test this extension locally, follow these steps:

### 1. Build the Extension

First, install the dependencies and build the extension:

```bash
npm install
npm run build
```

This will generate a `dist/` directory containing the compiled extension.

### 2. Configure Google OAuth2

To test the Google Drive integration, you need a valid Google OAuth Client ID:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and enable the **Google Drive API**.
3. Configure the OAuth consent screen.
4. Create credentials for an **OAuth client ID** (Application type: Chrome app/extension). You will need the extension ID from Chrome (see step 3) to configure it fully, or just use a generic ID for local testing.
5. Open `public/manifest.json` in this project.
6. Replace `"YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com"` with your actual Client ID.
7. Rebuild the project (`npm run build`).

### 3. Load the Extension in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top right corner.
3. Click the **Load unpacked** button in the top left.
4. Select the `dist/` folder generated in Step 1.
5. The StatementSync extension should now appear in your list of installed extensions.

### 4. Testing the Extraction

1. Navigate to the American Express Japan portal (`americanexpress.com/ja-jp`) and log in to your account.
2. Go to a statement or transaction history page.
3. Click on the StatementSync extension icon in your browser toolbar.
4. Click **连接 (Connect)** to authenticate with your Google Drive account.
5. Once connected, click **导出并归档 (Export and Sync)**.
6. A toast notification will appear confirming the success, and a new CSV file will be available in your Google Drive under the "Amex JP Statements" folder.

## Project Structure

- `src/components/ExtensionPopupMockup.tsx`: The main React component for the extension popup UI.
- `src/extension/background.ts`: The background service worker handling Google Drive API requests and Auth.
- `src/extension/content-amexjp.ts`: The content script injected into Amex JP to extract DOM table data.
- `src/extension/utils/filename.ts`: Utility for consistent CSV filename generation.
- `public/manifest.json`: The Chrome Extension Manifest V3 configuration.
