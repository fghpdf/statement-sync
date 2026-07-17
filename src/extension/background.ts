/**
 * Background Service Worker
 * Handles Google Drive API integration and cross-origin requests.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'UPLOAD_TO_DRIVE') {
    handleDriveUpload(request.payload)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // async response
  }

  if (request.action === 'CHECK_AUTH') {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (chrome.runtime.lastError || !token) {
        sendResponse({ authenticated: false });
      } else {
        sendResponse({ authenticated: true });
      }
    });
    return true;
  }

  if (request.action === 'LOGIN') {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (request.action === 'LOGOUT') {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (!chrome.runtime.lastError && token) {
        chrome.identity.removeCachedAuthToken({ token: token as string }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true }); // Already logged out or error
      }
    });
    return true;
  }
});

async function handleDriveUpload({ filename, csvData, folderName }: { filename: string, csvData: string, folderName: string }) {
  try {
    const token = await getAuthToken();
    const folderId = await findOrCreateFolder(token, folderName);
    const result = await uploadCsvToDrive(token, filename, csvData, folderId);
    return result;
  } catch (error) {
    console.error('[StatementSync] Upload failed:', error);
    throw error;
  }
}

async function getAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token as any as string);
      }
    });
  });
}

async function findOrCreateFolder(token: string, folderName: string): Promise<string> {
  // 1. Search for folder
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!searchRes.ok) {
    throw new Error(`Drive API Error: Failed to search for folder ${folderName}`);
  }
  
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }
  
  // 2. Create folder if not found
  const createMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createMetadata)
  });
  
  if (!createRes.ok) {
    throw new Error(`Drive API Error: Failed to create folder ${folderName}`);
  }
  
  const createData = await createRes.json();
  return createData.id;
}

async function uploadCsvToDrive(token: string, filename: string, csvData: string, folderId: string) {
  const boundary = 'statement_sync_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: filename,
    mimeType: 'text/csv',
    parents: [folderId]
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/csv; charset=UTF-8\r\n\r\n' +
    csvData +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Drive API Error: ${err.error?.message || response.statusText}`);
  }

  return response.json();
}
