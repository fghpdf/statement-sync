import { generateStatementFilename } from '../utils/filename';

/**
 * Content Script for American Express Japan
 * Matches: https://*.americanexpress.com/*
 */

console.log('[StatementSync] Amex JP Content Script loaded.');

// Inject interceptor script into the page context to capture clicks on hidden download links
function injectInterceptor() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        const isCsvDownload = this.download && (
          this.download.endsWith('.csv') || 
          this.href.startsWith('blob:') || 
          this.href.startsWith('data:')
        );
        if (isCsvDownload) {
          console.log('[StatementSync] Intercepted CSV download click:', this.href, this.download);
          window.dispatchEvent(new CustomEvent('SYNC_DOWNLOAD_INTERCEPTED', {
            detail: { href: this.href, download: this.download }
          }));
        }
        return originalClick.apply(this, arguments);
      };
    })();
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

try {
  injectInterceptor();
} catch (e) {
  console.error('[StatementSync] Failed to inject interceptor:', e);
}

// Listen to download interceptions
window.addEventListener('SYNC_DOWNLOAD_INTERCEPTED', async (event: any) => {
  const { href, download } = event.detail;
  console.log('[StatementSync] Processing intercepted CSV download...', download);
  
  // Update state in storage to show syncing
  updateSyncStatus({ isSyncing: true, synced: false, toast: null });

  try {
    let csvData = '';
    if (href.startsWith('blob:') || href.startsWith('data:')) {
      const res = await fetch(href);
      csvData = await res.text();
    } else {
      const res = await fetch(href);
      csvData = await res.text();
    }

    if (!csvData || csvData.trim().length === 0) {
      throw new Error('CSV 数据为空');
    }

    // Upload to Google Drive via background script
    chrome.runtime.sendMessage({
      action: 'UPLOAD_TO_DRIVE',
      payload: {
        filename: download || 'AmexJP_Statement.csv',
        csvData: csvData,
        folderName: 'Amex JP Statements'
      }
    }, (response) => {
      if (response?.success) {
        updateSyncStatus({
          isSyncing: false,
          synced: true,
          toast: { message: '已通过官方 CSV 成功同步至 Google Drive！', type: 'success' }
        });
        // Reset synced state after 4 seconds
        setTimeout(() => {
          updateSyncStatus({ synced: false });
        }, 4000);
      } else {
        updateSyncStatus({
          isSyncing: false,
          synced: false,
          toast: { message: `同步失败: ${response?.error || '未知错误'}`, type: 'error' }
        });
      }
    });

  } catch (err: any) {
    console.error('[StatementSync] Failed to process intercepted CSV:', err);
    updateSyncStatus({
      isSyncing: false,
      synced: false,
      toast: { message: `处理下载失败: ${err.message}`, type: 'error' }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_STATEMENT') {
    try {
      const data = extractAmexJPCsv();
      const accountSuffix = extractAccountSuffix();
      const includeStatementSuffix = request.payload?.includeStatementSuffix !== false;

      const filename = generateStatementFilename('AmexJP', accountSuffix, undefined, includeStatementSuffix);
      const folderName = 'Amex JP Statements';

      sendResponse({ success: true, data, filename, folderName });
    } catch (error: any) {
      console.error('[StatementSync] Extraction error:', error);
      sendResponse({ success: false, error: error.message || 'Unknown error' });
    }
  }

  if (request.action === 'CHECK_STATEMENT_PAGE') {
    const onStatementPage = window.location.href.includes('/activity/statement');
    const hasNativeDownloadBtn = !!findPageDownloadButton();
    sendResponse({ onStatementPage, hasNativeDownloadBtn, url: window.location.href });
  }

  if (request.action === 'TRIGGER_NATIVE_DOWNLOAD') {
    triggerAutoDownloadFlow()
      .then((msg) => sendResponse({ success: true, message: msg }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  return true;
});

// Storing sync status helper
function updateSyncStatus(status: any) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['syncStatus'], (result) => {
      const current = result.syncStatus || {};
      chrome.storage.local.set({ syncStatus: { ...current, ...status } });
    });
  }
}

/**
 * Tries to find the main "ダウンロード" (Download) button on the Amex JP statements page.
 */
function findPageDownloadButton(): HTMLElement | null {
  const elements = Array.from(document.querySelectorAll('button, a, [role="button"], span, div'));
  for (const el of elements) {
    const text = el.textContent?.trim() || '';
    // We target the one exactly matching "ダウンロード" that is not inside a modal
    if (text === 'ダウンロード' && !el.closest('[role="dialog"], .modal, [class*="dialog"], [class*="modal"]')) {
      if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button') {
        return el as HTMLElement;
      }
      const clickable = el.closest('button, a, [role="button"]');
      if (clickable) return clickable as HTMLElement;
      return el as HTMLElement;
    }
  }
  return null;
}

/**
 * Automates opening the modal, selecting CSV, and triggering download.
 */
async function triggerAutoDownloadFlow(): Promise<string> {
  const pageBtn = findPageDownloadButton();
  if (!pageBtn) {
    throw new Error('未找到页面上的“ダウンロード”(下载)按钮。请确认您在账单明细页。');
  }

  // Click the page download button to open the format dialog
  pageBtn.click();

  // Wait up to 5 seconds for the modal to open
  for (let i = 0; i < 25; i++) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const dialog = document.querySelector('[role="dialog"], .modal, [class*="dialog"], [class*="modal"]');
    if (dialog) {
      const success = await selectCsvAndDownloadInModal(dialog as HTMLElement);
      if (success) {
        return '已成功触发官方 CSV 下载。请等待同步完成。';
      }
      throw new Error('已打开下载格式选择弹窗，但未成功选择 CSV 选项。');
    }
  }

  throw new Error('点击了“ダウンロード”按钮，但格式选择弹窗未在 5 秒内打开。');
}

async function selectCsvAndDownloadInModal(dialog: HTMLElement): Promise<boolean> {
  // Find the CSV radio button option
  const labels = Array.from(dialog.querySelectorAll('label, span, div, p'));
  let csvOption: HTMLElement | null = null;
  for (const label of labels) {
    if (label.textContent?.trim() === 'CSV') {
      csvOption = label as HTMLElement;
      break;
    }
  }

  if (csvOption) {
    const input = csvOption.querySelector('input') || dialog.querySelector(`input[id="${csvOption.getAttribute('for')}"]`);
    if (input) {
      (input as HTMLElement).click();
    } else {
      csvOption.click();
    }
  } else {
    console.warn('[StatementSync] CSV option not found in modal');
    return false;
  }

  // Wait a split second to ensure choice is registered
  await new Promise(resolve => setTimeout(resolve, 100));

  // Find and click the confirm "ダウンロード" button at the bottom of the dialog
  const buttons = Array.from(dialog.querySelectorAll('button, [role="button"]'));
  const confirmBtn = buttons.find(el => el.textContent?.trim() === 'ダウンロード');
  if (confirmBtn) {
    (confirmBtn as HTMLElement).click();
    return true;
  }

  return false;
}

/**
 * Tries to extract the last 4 digits of the card number from the Amex JP DOM (Fallback).
 */
function extractAccountSuffix(): string {
  const candidates = [
    document.querySelector('[class*="account-ending"]'),
    document.querySelector('[class*="card-number"]'),
    document.querySelector('[class*="accountNumber"]'),
    document.querySelector('[data-testid*="account"]'),
  ];

  for (const el of candidates) {
    const text = el?.textContent?.trim() || '';
    const match = text.match(/\d{4}$/);
    if (match) return match[0];
  }

  const bodyText = document.body.innerText;
  const fallbackMatch = bodyText.match(/[\*\-]\s*(\d{4})\b/);
  if (fallbackMatch) return fallbackMatch[1];

  return 'XXXX';
}

/**
 * Extracts statement data from the Amex JP DOM and formats it as CSV (Fallback).
 */
function extractAmexJPCsv(): string {
  const rows = document.querySelectorAll('.statement-row, table tr');

  if (!rows || rows.length === 0) {
    throw new Error('当前页面未检测到账单表格数据，请前往账单详情页再试。');
  }

  let csvContent = 'Date,Description,Amount\n';

  rows.forEach(row => {
    const cols = row.querySelectorAll('td, div.cell');
    if (cols.length >= 3) {
      const date = cols[0]?.textContent?.trim() || '';
      const desc = cols[1]?.textContent?.trim() || '';
      const amount = cols[2]?.textContent?.trim().replace(/,/g, '') || '';

      if (date && amount) {
        const safeDesc = `"${desc.replace(/"/g, '""')}"`;
        csvContent += `${date},${safeDesc},${amount}\n`;
      }
    }
  });

  if (csvContent === 'Date,Description,Amount\n') {
    throw new Error('页面上找到了表格，但无法解析交易行。请确认您在账单明细页。');
  }

  return csvContent;
}
