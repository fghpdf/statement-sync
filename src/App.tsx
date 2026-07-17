import React from 'react';
import { PlanDocument } from './components/PlanDocument';
import { ExtensionPopupMockup } from './components/ExtensionPopupMockup';

export default function App() {
  return (
    <div className="min-h-screen bg-[#fafafa] p-4 md:p-12 font-sans flex justify-center">
      <div className="max-w-6xl w-full mx-auto flex flex-col lg:flex-row gap-16 items-start mt-4">
        {/* Left: Plan Document */}
        <div className="flex-1 w-full lg:h-[calc(100vh-8rem)]">
          <PlanDocument />
        </div>

        {/* Right: Mockup */}
        <div className="w-full lg:w-auto flex flex-col items-center">
          <div className="mb-6 text-[10px] uppercase tracking-widest text-gray-400">
            Popup UI 预览
          </div>
          <ExtensionPopupMockup />
        </div>
      </div>
    </div>
  );
}
