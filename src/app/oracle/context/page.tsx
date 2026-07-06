'use client';

import React from 'react';
import BlueprintContextViewer from '@/components/oracle/BlueprintContextViewer';
import OraclePageNav from '@/components/oracle/OraclePageNav';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';

export default function OracleContextPage() {
  return (
    <PageShell className="max-w-6xl">
      <SectionHeader
        title="Context"
        action={<OraclePageNav />}
      />

      <div className="pb-6">
        <BlueprintContextViewer />
      </div>
    </PageShell>
  );
}
