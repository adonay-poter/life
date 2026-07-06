'use client';

import React from 'react';
import OracleConversationRail from '@/components/oracle/OracleConversationRail';
import OraclePageNav from '@/components/oracle/OraclePageNav';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';

export default function OracleConversationsPage() {
  return (
    <PageShell className="max-w-5xl">
      <SectionHeader
        title="Conversations"
        action={<OraclePageNav />}
      />

      <div className="pb-6">
        <OracleConversationRail standalone />
      </div>
    </PageShell>
  );
}
