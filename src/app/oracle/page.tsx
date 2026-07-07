'use client';

import React, { useState } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import OracleChat from '@/components/oracle/OracleChat';
import BlueprintContextViewer from '@/components/oracle/BlueprintContextViewer';

export default function OraclePage() {
  // On desktop we support 'split' (default), on mobile we default to 'chat'
  const [activeTab, setActiveTab] = useState<'split' | 'chat' | 'context'>('split');

  return (
    <div className="animate-page-enter max-w-7xl mx-auto w-full h-full min-h-0 flex flex-col pb-4 md:pb-12 px-0 sm:px-4">
      {/* Desktop Header (Hidden on Mobile) */}
      <div className="hidden md:block mb-8 shrink-0">
        <SectionHeader
          title="Oracle"
          subtitle="Your LifeOS context, ready for conversation."
        />
      </div>

      {/* Tab Switcher - Segmented Control (Adaptive desktop/mobile) */}
      <div className="flex border border-border bg-surface p-0.5 w-full md:max-w-md mx-auto mb-6 shrink-0 shadow-[0_2px_8px_rgba(26,28,30,0.04)]">
        <button
          onClick={() => setActiveTab('split')}
          className={`hidden md:block flex-1 py-2 text-xs font-label uppercase tracking-widest text-center transition-colors cursor-pointer rounded-none ${
            activeTab === 'split'
              ? 'bg-primary text-on-primary'
              : 'text-primary hover:bg-neutral-bg'
          }`}
        >
          Split View
        </button>
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
      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-5 items-stretch flex-1 md:h-[calc(100vh-240px)] md:max-h-[calc(100vh-240px)] md:min-h-[550px] md:flex-none min-h-0">
        {/* Left Column / Context Viewer */}
        <div className={`h-[550px] md:h-full min-h-0 ${
          activeTab === 'context'
            ? 'block md:block md:col-span-5'
            : activeTab === 'split'
              ? 'hidden md:block md:col-span-2'
              : 'hidden'
        }`}>
          <BlueprintContextViewer />
        </div>

        {/* Right Column / Oracle Chat */}
        <div className={`h-[600px] md:h-full min-h-0 ${
          activeTab === 'context'
            ? 'hidden'
            : activeTab === 'split'
              ? 'block md:block md:col-span-3'
              : 'block md:col-span-5'
        }`}>
          <OracleChat />
        </div>
      </div>
    </div>
  );
}
