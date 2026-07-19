/**
 * Main World Content Script for American Express Japan
 * 
 * Runs in the main page context (MAIN world) to bypass strict CSP (Content Security Policy)
 * which blocks inline scripts injected via DOM manipulation.
 * 
 * Intercepts download clicks and dispatches custom events back to the ISOLATED content script.
 */

(function() {
  console.log('[StatementSync] Amex JP Main World Interceptor loaded.');
  
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
