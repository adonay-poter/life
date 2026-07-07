'use client';

import React, { useState } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import OracleChat from '@/components/oracle/OracleChat';
import BlueprintContextViewer from '@/components/oracle/BlueprintContextViewer';

export default function OraclePage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'context'>('chat');

  return (
    <div className="animate-page-enter max-w-7xl mx-auto w-full h-full min-h-0 flex flex-col pb-4 md:pb-12 px-0 sm:px-4">
      {/* Desktop Header (Hidden on Mobile) */}
      <div className="hidden md:block mb-8 shrink-0">
        <SectionHeader
          title="Oracle"
          subtitle="Your LifeOS context, ready for conversation."
        />
      </div>

      {/* Mobile Tab Switcher (More compact, full width) */}
      <div className="flex border border-border bg-surface p-0.5 w-full md:hidden mb-4 shrink-0 shadow-[0_2px_8px_rgba(26,28,30,0.04)]">
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

      {/* Main Responsive Grid Layout - Enforces fixed height on desktop */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-5 items-stretch flex-1 md:h-[calc(100vh-240px)] md:min-h-[550px] min-h-0">
        {/* Left Column / Mobile Context Tab */}
        <div className={`md:col-span-2 h-[550px] md:h-full min-h-0 ${
          activeTab === 'context' ? 'block' : 'hidden md:block'
        }`}>
          <BlueprintContextViewer />
        </div>

        {/* Right Column / Mobile Chat Tab */}
        <div className={`md:col-span-3 h-[600px] md:h-full min-h-0 ${
          activeTab === 'chat' ? 'block' : 'hidden md:block'
        }`}>
          <OracleChat />
        </div>
      </div>
    </div>
  );
}
