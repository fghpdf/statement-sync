import React, { useState, useEffect } from 'react';
import { Check, Settings, Download, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

type PageStatus = 'checking' | 'on-amex' | 'off-amex';

export function ExtensionPopupMockup() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isExtension, setIsExtension] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [includeSuffix, setIncludeSuffix] = useState(true);
  const [pageStatus, setPageStatus] = useState<PageStatus>('checking');
  const [activeTabUrl, setActiveTabUrl] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const checkCurrentTab = async () => {
    if (!isExtension) return;
    setPageStatus('checking');
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tabs[0]?.url || '';
      setActiveTabUrl(url);
      if (url.includes('americanexpress.com')) {
        setPageStatus('on-amex');
      } else {
        setPageStatus('off-amex');
      }
    } catch {
      setPageStatus('off-amex');
    }
  };

  useEffect(() => {
    if (typeof window.chrome !== 'undefined' && window.chrome.runtime?.sendMessage) {
      setIsExtension(true);
      // Check auth status on mount
      chrome.runtime.sendMessage({ action: 'CHECK_AUTH' }, (response) => {
        if (response?.authenticated) setIsAuthenticated(true);
      });
    }
  }, []);

  useEffect(() => {
    if (isExtension) checkCurrentTab();
  }, [isExtension]);

  const handleLogin = () => {
    setIsAuthenticating(true);
    setToast(null);
    chrome.runtime.sendMessage({ action: 'LOGIN' }, (response) => {
      setIsAuthenticating(false);
      if (response?.success) {
        setIsAuthenticated(true);
      } else {
        showToast(response?.error || '登录失败', 'error');
      }
    });
  };

  const handleLogout = () => {
    chrome.runtime.sendMessage({ action: 'LOGOUT' }, () => {
      setIsAuthenticated(false);
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setToast(null);
    setSynced(false);

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (!activeTab?.id) throw new Error('无法获取当前标签页。');

      chrome.tabs.sendMessage(
        activeTab.id,
        { action: 'EXTRACT_STATEMENT', payload: { includeStatementSuffix: includeSuffix } },
        (extractResponse) => {
          if (chrome.runtime.lastError) {
            showToast('请在 AmexJP 账单页面运行此插件。', 'error');
            setIsSyncing(false);
            return;
          }
          if (!extractResponse?.success) {
            showToast(extractResponse?.error || '提取数据失败', 'error');
            setIsSyncing(false);
            return;
          }

          chrome.runtime.sendMessage(
            {
              action: 'UPLOAD_TO_DRIVE',
              payload: {
                filename: extractResponse.filename,
                csvData: extractResponse.data,
                folderName: extractResponse.folderName || 'Amex JP Statements',
              },
            },
            (uploadResponse: any) => {
              setIsSyncing(false);
              if (uploadResponse?.success) {
                setSynced(true);
                showToast('已成功保存至 Google Drive', 'success');
                setTimeout(() => setSynced(false), 4000);
              } else {
                showToast(uploadResponse?.error || '上传失败', 'error');
              }
            }
          );
        }
      );
    } catch (err: any) {
      showToast(err.message || '发生未知错误', 'error');
      setIsSyncing(false);
    }
  };

  // Non-extension environment: show a clear message
  if (!isExtension) {
    return (
      <div className="w-[320px] h-[480px] bg-white border border-gray-200 flex flex-col items-center justify-center font-sans text-gray-900 shadow-sm">
        <div className="text-center px-8">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">需要在 Chrome 插件环境中运行</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            请将此插件加载到 Chrome，然后点击工具栏图标打开。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[320px] bg-white border border-gray-200 flex flex-col font-sans text-gray-900 shadow-sm relative">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex justify-between items-center">
        <span className="text-sm font-medium tracking-wide">
          {showSettings ? 'Settings.' : 'StatementSync.'}
        </span>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-gray-400 hover:text-black transition-colors"
        >
          {showSettings ? (
            <span className="text-xs uppercase tracking-widest font-medium">Done</span>
          ) : (
            <Settings className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {showSettings ? (
        <div className="px-6 pb-6 flex flex-col">
          <div className="w-full h-px bg-gray-100 mb-6" />

          {/* Naming convention */}
          <div className="mb-8">
            <h4 className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">命名约定</h4>
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-gray-700 group-hover:text-black transition-colors">
                包含 "_Statement" 后缀
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={includeSuffix}
                  onChange={(e) => setIncludeSuffix(e.target.checked)}
                />
                <div className={`block w-8 h-4 rounded-full transition-colors ${includeSuffix ? 'bg-black' : 'bg-gray-200'}`} />
                <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${includeSuffix ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </label>
            <p className="text-[10px] text-gray-400 mt-2">
              示例: AmexJP_XXXX_2025-07{includeSuffix ? '_Statement' : ''}.csv
            </p>
          </div>

          {/* Account */}
          <div className="mb-6">
            <h4 className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">账户</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-gray-600">{isAuthenticated ? '已连接 Google Drive' : '未连接 Drive'}</span>
              </div>
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="text-[10px] text-red-500 hover:text-red-600 transition-colors uppercase tracking-widest"
                >
                  断开连接
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Auth row */}
          <div className="px-6 pb-5">
            <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Drive 账号</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-gray-600">
                  {isAuthenticated ? '已连接 Google Drive' : '未连接 Drive'}
                </span>
              </div>
              {!isAuthenticated && (
                <button
                  onClick={handleLogin}
                  disabled={isAuthenticating}
                  className="text-[10px] bg-black text-white px-3 py-1.5 rounded disabled:opacity-50 transition-opacity"
                >
                  {isAuthenticating ? '连接中...' : '连接'}
                </button>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-gray-100" />

          {/* Page status */}
          <div className="px-6 py-5">
            <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
              <span>当前页面</span>
              <button
                onClick={checkCurrentTab}
                className="text-gray-300 hover:text-gray-500 transition-colors"
                title="刷新检测"
              >
                <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>

            {pageStatus === 'checking' && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                检测中...
              </div>
            )}

            {pageStatus === 'on-amex' && (
              <div className="border-l-2 border-black pl-4 py-1">
                <p className="text-sm font-medium text-black">已检测到 Amex JP 页面</p>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{activeTabUrl}</p>
              </div>
            )}

            {pageStatus === 'off-amex' && (
              <div className="border-l-2 border-gray-200 pl-4 py-1">
                <p className="text-sm text-gray-500">未在 Amex JP 页面</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  请前往{' '}
                  <a
                    href="https://global.americanexpress.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-black transition-colors"
                  >
                    americanexpress.com
                  </a>{' '}
                  账单详情页
                </p>
              </div>
            )}
          </div>

          <div className="w-full h-px bg-gray-100" />

          {/* Sync button */}
          <div className="px-6 py-5">
            <button
              onClick={handleSync}
              disabled={isSyncing || synced || !isAuthenticated || pageStatus !== 'on-amex'}
              className={`w-full py-2.5 text-sm transition-all flex items-center justify-center gap-2 border ${
                synced
                  ? 'border-gray-200 text-gray-400 bg-transparent cursor-default'
                  : !isAuthenticated || pageStatus !== 'on-amex'
                  ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                  : 'bg-black text-white border-black hover:bg-gray-800'
              }`}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                  提取并上传中...
                </>
              ) : synced ? (
                <>
                  <Check className="w-4 h-4" strokeWidth={1.5} />
                  已保存至 Drive
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" strokeWidth={1.5} />
                  导出并归档
                </>
              )}
            </button>
            {pageStatus === 'off-amex' && !isSyncing && (
              <p className="text-[10px] text-gray-400 text-center mt-2">
                请先导航至 AmexJP 账单页面
              </p>
            )}
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`absolute bottom-4 left-4 right-4 p-3 rounded shadow-lg flex items-start gap-2 text-sm z-50 ${
            toast.type === 'success' ? 'bg-black text-white' : 'bg-red-50 border border-red-100 text-red-600'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          )}
          <span className="leading-relaxed text-xs">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
