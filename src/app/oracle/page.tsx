'use client';

import React, { useState } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import OracleChat from '@/components/oracle/OracleChat';
import BlueprintContextViewer from '@/components/oracle/BlueprintContextViewer';

export default function OraclePage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'context'>('chat');

  const tabSwitcher = (
    <div className="app-panel-subtle flex w-full max-w-[220px] shrink-0 p-1 select-none">
      <button
        onClick={() => setActiveTab('chat')}
        className={`flex-1 rounded-xl px-3 py-2 text-[10px] font-label uppercase tracking-[0.2em] text-center transition-all cursor-pointer ${
          activeTab === 'chat'
            ? 'bg-surface border border-border text-primary font-bold shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
            : 'text-secondary/80 hover:text-primary border border-transparent bg-transparent'
        }`}
      >
        Chat
      </button>
      <button
        onClick={() => setActiveTab('context')}
        className={`flex-1 rounded-xl px-3 py-2 text-[10px] font-label uppercase tracking-[0.2em] text-center transition-all cursor-pointer ${
          activeTab === 'context'
            ? 'bg-surface border border-border text-primary font-bold shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
            : 'text-secondary/80 hover:text-primary border border-transparent bg-transparent'
        }`}
      >
        Context
      </button>
    </div>
  );

  return (
    <div className="animate-page-enter mx-auto flex h-[calc(100vh-148px-env(safe-area-inset-bottom))] min-h-0 w-full max-w-[1180px] flex-col gap-4 px-0 pb-0 sm:px-2 md:h-[calc(100vh-120px)] md:gap-6 md:pb-8">
      {/* Desktop Header - Switches to the right side of the title on desktop */}
      <div className="hidden shrink-0 md:block">
        <SectionHeader
          title="Oracle"
          subtitle="Talk to your personal context without losing orientation."
          meta={activeTab === 'chat' ? 'Conversation' : 'Context'}
          action={tabSwitcher}
        />
      </div>

      {/* Mobile Tab Switcher - Centered at the top on mobile */}
      <div className="app-panel flex shrink-0 flex-col gap-3 px-4 py-4 md:hidden">
        <div>
          <p className="app-kicker">Oracle</p>
          <h1 className="mt-2 font-display text-3xl tracking-[-0.04em] text-primary">Context On Demand</h1>
        </div>
        <div className="flex justify-center">
          {tabSwitcher}
        </div>
      </div>

      {/* Main Content Area - Full-width single panel viewport */}
      <div className="app-panel relative flex-1 min-h-0 overflow-hidden">
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
