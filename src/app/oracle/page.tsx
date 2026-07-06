'use client';

import React, { useState } from 'react';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import OracleChat from '@/components/oracle/OracleChat';
import BlueprintContextViewer from '@/components/oracle/BlueprintContextViewer';

export default function OraclePage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'context'>('chat');

  return (
    <PageShell className="max-w-7xl">
      <SectionHeader
        title="Oracle"
        subtitle="Your LifeOS context, ready for conversation."
      />

      {/* Mobile Tab Switcher */}
      <div className="flex border border-border bg-surface p-1 max-w-[280px] mx-auto md:hidden mb-6 shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-xs font-label uppercase tracking-widest text-center transition-colors cursor-pointer rounded-none ${
            activeTab === 'chat'
              ? 'bg-primary text-on-primary'
              : 'text-primary hover:bg-neutral-bg'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('context')}
          className={`flex-1 py-2 text-xs font-label uppercase tracking-widest text-center transition-colors cursor-pointer rounded-none ${
            activeTab === 'context'
              ? 'bg-primary text-on-primary'
              : 'text-primary hover:bg-neutral-bg'
          }`}
        >
          Context
        </button>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 items-stretch md:h-[calc(100vh-240px)] md:min-h-[600px] pb-6 min-h-0">
        {/* Desktop Left Column / Mobile Context Tab */}
        <div className={`md:col-span-2 h-[550px] md:h-full min-h-0 ${
          activeTab === 'context' ? 'block' : 'hidden md:block'
        }`}>
          <BlueprintContextViewer />
        </div>

        {/* Desktop Right Column / Mobile Chat Tab */}
        <div className={`md:col-span-3 h-[600px] md:h-full min-h-0 ${
          activeTab === 'chat' ? 'block' : 'hidden md:block'
        }`}>
          <OracleChat />
        </div>
      </div>
    </PageShell>
  );
}
