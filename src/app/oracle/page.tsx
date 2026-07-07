'use client';

import React, { useState } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import OracleChat from '@/components/oracle/OracleChat';
import BlueprintContextViewer from '@/components/oracle/BlueprintContextViewer';

export default function OraclePage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'context'>('chat');

  // Shared Tab Switcher Markup
  const tabSwitcher = (
    <div className="flex border border-border bg-surface p-0.5 w-full max-w-[240px] shrink-0 shadow-[0_2px_8px_rgba(26,28,30,0.04)]">
      <button
        onClick={() => setActiveTab('chat')}
        className={`flex-1 py-1.5 text-xs font-label uppercase tracking-widest text-center transition-colors cursor-pointer rounded-none ${
          activeTab === 'chat'
            ? 'bg-primary text-on-primary'
            : 'text-primary hover:bg-neutral-bg'
        }`}
      >
        Chat
      </button>
      <button
        onClick={() => setActiveTab('context')}
        className={`flex-1 py-1.5 text-xs font-label uppercase tracking-widest text-center transition-colors cursor-pointer rounded-none ${
          activeTab === 'context'
            ? 'bg-primary text-on-primary'
            : 'text-primary hover:bg-neutral-bg'
        }`}
      >
        Context
      </button>
    </div>
  );

  return (
    <div className="animate-page-enter max-w-7xl mx-auto w-full h-full min-h-0 flex flex-col pb-4 md:pb-12 px-0 sm:px-4">
      {/* Desktop Header - Switches to the right side of the title on desktop */}
      <div className="hidden md:block mb-8 shrink-0">
        <SectionHeader
          title="Oracle"
          subtitle="Your LifeOS context, ready for conversation."
          action={tabSwitcher}
        />
      </div>

      {/* Mobile Tab Switcher - Centered at the top on mobile */}
      <div className="flex justify-center md:hidden mb-4 shrink-0 px-4">
        {tabSwitcher}
      </div>

      {/* Main Content Area - Full-width single panel viewport with fixed height on desktop */}
      <div className="flex-1 md:h-[calc(100vh-240px)] md:max-h-[calc(100vh-240px)] md:min-h-[550px] min-h-0 relative">
        {/* Context Viewer Panel */}
        <div className={`h-full min-h-0 w-full ${
          activeTab === 'context' ? 'block' : 'hidden'
        }`}>
          <BlueprintContextViewer />
        </div>

        {/* Oracle Chat Panel */}
        <div className={`h-full min-h-0 w-full ${
          activeTab === 'chat' ? 'block' : 'hidden'
        }`}>
          <OracleChat />
        </div>
      </div>
    </div>
  );
}
