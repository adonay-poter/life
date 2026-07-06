'use client';

import React from 'react';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import OracleChat from '@/components/oracle/OracleChat';
import OraclePageNav from '@/components/oracle/OraclePageNav';

export default function OraclePage() {
  return (
    <PageShell className="max-w-6xl">
      <SectionHeader title="Oracle" action={<OraclePageNav />} />

      <div className="pb-6">
        <OracleChat />
      </div>
    </PageShell>
  );
}
