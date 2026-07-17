import React, { useState, useEffect } from 'react';
import { Check, Settings, Download, FileText, Loader2, AlertCircle } from 'lucide-react';

export function ExtensionPopupMockup() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isExtension, setIsExtension] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [includeSuffix, setIncludeSuffix] = useState(true);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    if (typeof window.chrome !== 'undefined' && window.chrome.runtime?.sendMessage) {
      setIsExtension(true);
      // Check auth status on mount
      chrome.runtime.sendMessage({ action: 'CHECK_AUTH' }, (response) => {
        if (response?.authenticated) {
          setIsAuthenticated(true);
        }
      });
    } else {
      // Mock authenticated state in preview
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticating(true);
    setToast(null);
    if (isExtension) {
      chrome.runtime.sendMessage({ action: 'LOGIN' }, (response) => {
        setIsAuthenticating(false);
        if (response?.success) {
          setIsAuthenticated(true);
        } else {
          showToast(response?.error || '登录失败', 'error');
        }
      });
    } else {
      setTimeout(() => {
        setIsAuthenticating(false);
        setIsAuthenticated(true);
      }, 1000);
    }
  };

  const handleLogout = () => {
    if (isExtension) {
      chrome.runtime.sendMessage({ action: 'LOGOUT' }, (response) => {
        setIsAuthenticated(false);
      });
    } else {
      setIsAuthenticated(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setToast(null);
    setSynced(false);

    if (isExtension) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        
        if (!activeTab?.id) throw new Error('No active tab found.');

        chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_STATEMENT', payload: { includeStatementSuffix: includeSuffix } }, (extractResponse) => {
          if (chrome.runtime.lastError) {
            showToast('请在支持的账单页面运行 (Amex JP)。', 'error');
            setIsSyncing(false);
            return;
          }
          if (!extractResponse?.success) {
            showToast(extractResponse?.error || '提取数据失败', 'error');
            setIsSyncing(false);
            return;
          }

          chrome.runtime.sendMessage({
            action: 'UPLOAD_TO_DRIVE',
            payload: { filename: extractResponse.filename, csvData: extractResponse.data, folderName: extractResponse.folderName || 'Exports' }
          }, (uploadResponse: any) => {
            setIsSyncing(false);
            if (uploadResponse?.success) {
              setSynced(true);
              showToast('已成功保存至 Google Drive', 'success');
              setTimeout(() => setSynced(false), 3000);
            } else {
              showToast(uploadResponse?.error || '上传失败', 'error');
            }
          });
        });
      } catch (err: any) {
        showToast(err.message || '发生未知错误', 'error');
        setIsSyncing(false);
      }
    } else {
      // 预览环境 Mock 逻辑
      setTimeout(() => {
        setIsSyncing(false);
        setSynced(true);
        showToast('已成功保存至 Google Drive', 'success');
        setTimeout(() => setSynced(false), 3000);
      }, 1500);
    }
  };

  return (
    <div className="w-[320px] h-[480px] bg-white border border-gray-200 flex flex-col font-sans text-gray-900 shadow-sm relative mx-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex justify-between items-center">
        <span className="text-sm font-medium tracking-wide">
          {showSettings ? 'Settings.' : 'Sync.'}
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
        <div className="flex-1 px-6 pb-6 flex flex-col">
          <div className="w-full h-px bg-gray-100 mb-6"></div>
          
          <div className="mb-8">
            <h4 className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">命名约定 (Naming Convention)</h4>
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-gray-700 group-hover:text-black transition-colors">包含 "_Statement" 后缀</span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={includeSuffix}
                  onChange={(e) => setIncludeSuffix(e.target.checked)}
                />
                <div className={`block w-8 h-4 rounded-full transition-colors ${includeSuffix ? 'bg-black' : 'bg-gray-200'}`}></div>
                <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${includeSuffix ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </label>
            <p className="text-[10px] text-gray-400 mt-2">
              示例: AmexJP_XXXX_2023-10{includeSuffix ? '_Statement' : ''}.csv
            </p>
          </div>

          <div className="mb-8">
            <h4 className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">账户 (Account)</h4>
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-xs">
                 <div className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                 <span className="truncate text-gray-600">{isAuthenticated ? '已连接 Drive' : '未连接 Drive'}</span>
               </div>
               {isAuthenticated && (
                 <button 
                   onClick={handleLogout}
                   className="text-[10px] text-red-500 hover:text-red-600 transition-colors uppercase tracking-widest"
                 >
                   断开连接 (Disconnect)
                 </button>
               )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Account Status - Minimal */}
          <div className="px-6 pb-6">
             <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Drive 账号</div>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-xs">
                 <div className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                 <span className="truncate text-gray-600">{isAuthenticated ? '已连接 Google Drive' : '未连接 Drive'}</span>
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

          <div className="w-full h-px bg-gray-100"></div>

          {/* Main Content */}
          <div className="flex-1 p-6 flex flex-col">
            {/* Status Card (Minimalist left border style) */}
            <div className="border-l-2 border-black pl-4 py-1 mb-6">
              <h3 className="text-sm font-medium text-black">已检测到账单</h3>
              <p className="text-xs text-gray-500 mt-1">American Express JP • Credit Card</p>
            </div>

            <button
              onClick={handleSync}
              disabled={isSyncing || synced || !isAuthenticated}
              className={`w-full py-2.5 text-sm transition-all flex items-center justify-center gap-2 border ${
                synced
                  ? 'border-gray-200 text-gray-400 bg-transparent cursor-default'
                  : !isAuthenticated
                  ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                  : 'bg-black text-white border-black hover:bg-gray-800'
              } disabled:opacity-50`}
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

            {/* Recent Files */}
            <div className="mt-10 flex-1">
              <h4 className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">最近归档</h4>
              <div className="space-y-4">
                {[
                  { name: `AmexJP_1234_2023-10${includeSuffix ? '_Statement' : ''}.csv`, folder: 'Amex JP' },
                  { name: `AmexJP_1234_2023-09${includeSuffix ? '_Statement' : ''}.csv`, folder: 'Amex JP' },
                  { name: `Chase_5678_2023-09${includeSuffix ? '_Statement' : ''}.csv`, folder: 'Chase' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 cursor-pointer group">
                    <FileText className="w-4 h-4 text-gray-300 group-hover:text-black transition-colors" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <p className="text-xs font-medium text-gray-700 truncate group-hover:text-black transition-colors">{item.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{item.folder}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`absolute bottom-4 left-4 right-4 p-3 rounded shadow-lg flex items-start gap-2 text-sm z-50 transition-all ${
          toast.type === 'success' ? 'bg-black text-white' : 'bg-red-50 border border-red-100 text-red-600'
        }`}>
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
