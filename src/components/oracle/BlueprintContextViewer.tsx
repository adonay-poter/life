'use client';

import React, { useMemo, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import { useSoulBlueprint } from '@/context/SoulBlueprintContext';
import { useToast } from '@/context/ToastContext';
import {
  getSoulBlueprintSectionContent,
  SOUL_BLUEPRINT_SECTION_LABELS,
  SoulBlueprintSectionKey,
} from '@/utils/soulBlueprint';

function formatTimestamp(value: string | null | undefined) {
  if (!value) return 'Not generated yet';
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function BlueprintContextViewer() {
  const { snapshot, loading, regenerating, regenerateBlueprint } = useSoulBlueprint();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<SoulBlueprintSectionKey>('core');

  const sectionKeys = useMemo<SoulBlueprintSectionKey[]>(
    () => ['core', 'projects', 'learning', 'journal', 'review', 'full'],
    []
  );

  const activeMarkdown = getSoulBlueprintSectionContent(snapshot, activeSection);

  const handleCopy = async () => {
    if (!activeMarkdown) {
      showToast('Nothing to copy yet.', 'info');
      return;
    }

    try {
      await navigator.clipboard.writeText(activeMarkdown);
      showToast(`${SOUL_BLUEPRINT_SECTION_LABELS[activeSection]} copied.`, 'success');
    } catch {
      showToast('Failed to copy text.', 'error');
    }
  };

  const handleRegenerate = async () => {
    try {
      const result = await regenerateBlueprint();
      showToast(
        result.status === 'updated'
          ? 'Soul Blueprint regenerated.'
          : 'Soul Blueprint unchanged.',
        result.status === 'updated' ? 'success' : 'info'
      );
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : 'Failed to regenerate Soul Blueprint.', 'error');
    }
  };

  return (
    <article className="bg-surface border border-border p-6 rounded-none relative flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-baseline mb-4 pb-2 border-b border-border w-full shrink-0">
        <div>
          <h3 className="font-display text-lg font-bold text-primary">
            Operating Context
          </h3>
          <span className="font-label text-xs text-secondary uppercase tracking-wider block mt-0.5">
            Latest Soul Blueprint context snapshot
          </span>
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={handleCopy} disabled={!snapshot || !activeMarkdown} className="!py-1.5 !px-2.5 text-[10px]">
            <Copy className="h-3 w-3" />
            Copy
          </SecondaryButton>
          <PrimaryButton onClick={handleRegenerate} disabled={regenerating} className="!py-1.5 !px-2.5 text-[10px]">
            <RefreshCw className={`h-3 w-3 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </PrimaryButton>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-neutral-bg border border-border shrink-0">
        <div>
          <span className="font-mono text-[9px] text-secondary uppercase block">Generated</span>
          <span className="font-sans text-xs text-primary">{snapshot ? formatTimestamp(snapshot.generated_at) : 'N/A'}</span>
        </div>
        <div>
          <span className="font-mono text-[9px] text-secondary uppercase block">Token Est.</span>
          <span className="font-sans text-xs text-primary">{snapshot?.token_estimate ?? 0}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-3 shrink-0">
        {sectionKeys.map((section) => {
          const isActive = activeSection === section;
          return (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`px-2.5 py-1.5 text-[10px] font-label uppercase tracking-widest border transition-colors cursor-pointer rounded-none ${
                isActive
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface text-primary border-border hover:border-primary'
              }`}
            >
              {SOUL_BLUEPRINT_SECTION_LABELS[section]}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="pt-4 flex-1 min-h-0 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8 flex-1 border border-border bg-neutral-bg">
            <span className="font-serif italic text-secondary text-sm">Loading snapshot...</span>
          </div>
        ) : !snapshot ? (
          <div className="border border-border bg-neutral-bg p-6 text-center flex-1 flex items-center justify-center">
            <p className="font-serif italic text-secondary text-sm">
              No operating context has been generated yet.
            </p>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words bg-neutral-bg border border-border p-4 text-xs leading-6 text-primary font-sans flex-1 overflow-y-auto min-h-0">
            {activeMarkdown}
          </pre>
        )}
      </div>
    </article>
  );
}
