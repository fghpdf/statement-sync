import React from 'react';

export function PlanDocument() {
  return (
    <div className="bg-white p-8 md:p-12 h-full overflow-y-auto border border-gray-200 font-sans">
      <div className="mb-12 border-b border-black pb-6">
        <h1 className="text-2xl font-medium text-black tracking-wide mb-2">银行账单同步插件</h1>
        <p className="text-sm text-gray-500 uppercase tracking-widest">项目规划与架构设计</p>
      </div>

      <div className="space-y-12">
        {/* Section 1 */}
        <section>
          <h2 className="text-sm font-medium text-black mb-6 uppercase tracking-widest flex items-center gap-2">
            一、系统架构
          </h2>
          <div className="space-y-4 text-sm text-gray-600 font-light leading-relaxed">
            <p>基于 <strong>Manifest V3</strong> 标准开发，分为三个核心模块：</p>
            <ul className="space-y-4 mt-4">
              <li className="flex gap-4">
                <span className="text-black text-xs font-mono mt-0.5">01</span>
                <div>
                  <strong className="text-black block mb-1 font-medium">Popup UI (交互界面)</strong>
                  提供用户手动触发导出、查看同步历史、配置云盘授权的极简界面。
                </div>
              </li>
              <li className="flex gap-4">
                <span className="text-black text-xs font-mono mt-0.5">02</span>
                <div>
                  <strong className="text-black block mb-1 font-medium">Content Scripts (内容脚本)</strong>
                  按域名注入账单页。负责解析 DOM 提取账单明细，或拦截下载请求。
                </div>
              </li>
              <li className="flex gap-4">
                <span className="text-black text-xs font-mono mt-0.5">03</span>
                <div>
                  <strong className="text-black block mb-1 font-medium">Background Service Worker</strong>
                  处理 Google Drive OAuth 2.0 验证，调用 Drive API 创建机构文件夹并上传 CSV。
                </div>
              </li>
            </ul>
          </div>
        </section>

        <div className="w-full h-px bg-gray-100"></div>

        {/* Section 2 */}
        <section>
          <h2 className="text-sm font-medium text-black mb-6 uppercase tracking-widest">
            二、核心业务流程
          </h2>
          <div className="space-y-8">
            <div className="border-l-2 border-black pl-5">
              <h3 className="text-sm font-medium text-black mb-2">1. 数据获取 (Extraction)</h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed">使用策略模式，根据当前 URL 匹配对应的解析器。拦截官方 CSV 下载，或将页面表格转换为 CSV。</p>
            </div>
            <div className="border-l-2 border-black pl-5">
              <h3 className="text-sm font-medium text-black mb-2">2. 文件重命名 (Formatting)</h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed">根据站点上下文提取元数据，按 [机构名]_[账户尾号]_[年月]_Statement.csv 的标准化格式重命名。</p>
            </div>
            <div className="border-l-2 border-black pl-5">
              <h3 className="text-sm font-medium text-black mb-2">3. 云端归档 (Cloud Sync)</h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed">调用 Drive API：检查根目录是否存在机构文件夹，不存在则创建。上传文件并记录同步状态。</p>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-gray-100"></div>

        {/* Section 3 */}
        <section>
          <h2 className="text-sm font-medium text-black mb-6 uppercase tracking-widest">
            三、技术选型与难点
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium text-black text-sm mb-4">技术栈</h4>
              <ul className="text-sm text-gray-500 font-light space-y-2">
                <li>React 18 + Tailwind CSS</li>
                <li>Vite + CRXJS Vite Plugin</li>
                <li>chrome.identity OAuth</li>
                <li>Google Drive API v3</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-black text-sm mb-4">潜在难点</h4>
              <ul className="text-sm text-gray-500 font-light space-y-4">
                <li>
                  <strong className="text-black block text-xs mb-1 font-medium">DOM 脆弱性</strong>
                  银行网站前端改版会导致提取失效，需配置化解析规则。
                </li>
                <li>
                  <strong className="text-black block text-xs mb-1 font-medium">CSP/CORS 限制</strong>
                  跨域上传需在 manifest.json 声明 host permissions。
                </li>
              </ul>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-gray-100"></div>

        {/* Section 4 */}
        <section>
          <h2 className="text-sm font-medium text-black mb-6 uppercase tracking-widest">
            四、支持的机构 (Supported Banks)
          </h2>
          <div className="space-y-4">
            <div className="border border-gray-200 p-5">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-medium text-black">American Express Japan (Amex JP)</h3>
                 <span className="text-[10px] bg-black text-white px-2 py-1 uppercase tracking-wider">Priority</span>
              </div>
              <ul className="text-sm text-gray-500 font-light space-y-2">
                <li><strong className="text-gray-900 font-medium mr-2">匹配规则:</strong><code>americanexpress.com/ja-jp</code></li>
                <li><strong className="text-gray-900 font-medium mr-2">数据提取:</strong>拦截 API 响应或解析特定 DOM（如 <code>.statement-table</code>）提取账单记录。</li>
                <li><strong className="text-gray-900 font-medium mr-2">重命名:</strong><code>AmexJP_[账户尾号]_[YYYY-MM]_Statement.csv</code></li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
