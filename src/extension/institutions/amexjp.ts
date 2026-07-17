import { generateStatementFilename } from '../utils/filename';

/**
 * Content Script for American Express Japan
 * Matches: https://*.americanexpress.com/*
 */

console.log('[StatementSync] Amex JP Content Script loaded.');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_STATEMENT') {
    try {
      const data = extractAmexJPCsv();

      // Try to extract account suffix from the DOM
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
  return true;
});

/**
 * Tries to extract the last 4 digits of the card number from the Amex JP DOM.
 */
function extractAccountSuffix(): string {
  // Try common selectors used across Amex JP layouts
  const candidates = [
    document.querySelector('[class*="account-ending"]'),
    document.querySelector('[class*="card-number"]'),
    document.querySelector('[class*="accountNumber"]'),
    document.querySelector('[data-testid*="account"]'),
  ];

  for (const el of candidates) {
    const text = el?.textContent?.trim() || '';
    // Look for a 4-digit sequence (e.g. "ending in 1234", "末尾1234", "-1234")
    const match = text.match(/\d{4}$/);
    if (match) return match[0];
  }

  // Fallback: search all visible text for patterns like "****-1234" or "末尾1234"
  const bodyText = document.body.innerText;
  const fallbackMatch = bodyText.match(/[\*\-]\s*(\d{4})\b/);
  if (fallbackMatch) return fallbackMatch[1];

  return 'XXXX';
}

/**
 * Extracts statement data from the Amex JP DOM and formats it as CSV.
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
