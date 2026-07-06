'use client';

import React from 'react';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import BlueprintContextViewer from '@/components/oracle/BlueprintContextViewer';
import OracleChat from '@/components/oracle/OracleChat';

export default function OraclePage() {
  return (
    <PageShell>
      <SectionHeader
        title="Oracle"
        subtitle="Your LifeOS context, ready for conversation."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 items-stretch md:h-[calc(100vh-240px)] md:min-h-[600px] pb-6">
        {/* Left Column: Context Viewer */}
        <div className="md:col-span-1 lg:col-span-2 h-[450px] md:h-full">
          <BlueprintContextViewer />
        </div>

        {/* Right Column: Chatbot Panel */}
        <div className="md:col-span-1 lg:col-span-3 h-[500px] md:h-full">
          <OracleChat />
        </div>
      </div>
    </PageShell>
  );
}
