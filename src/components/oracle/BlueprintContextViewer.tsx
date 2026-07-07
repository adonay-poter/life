'use client';

import React, { useMemo, useState } from 'react';
import { Copy, RefreshCw, Search } from 'lucide-react';
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
  const [query, setQuery] = useState('');

  const sectionKeys = useMemo<SoulBlueprintSectionKey[]>(
    () => ['core', 'projects', 'learning', 'journal', 'review', 'full'],
    []
  );

  const activeMarkdown = getSoulBlueprintSectionContent(snapshot, activeSection);
  const searchTerm = query.trim();
  const searchPattern = searchTerm ? new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi') : null;
  const lineCount = activeMarkdown ? activeMarkdown.split('\n').length : 0;
  const matchCount = searchPattern ? (activeMarkdown.match(searchPattern) || []).length : 0;

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

  const renderContent = () => {
    if (!searchPattern) {
      return activeMarkdown;
    }

    return activeMarkdown.split(searchPattern).map((part, index) => {
      if (part.match(searchPattern)) {
        return (
          <mark key={`${part}-${index}`} className="bg-accent/20 px-0.5 text-primary">
            {part}
          </mark>
        );
      }

      return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    });
  };

  return (
    <article className="flex h-full sm:min-h-[620px] min-h-0 flex-col overflow-hidden border border-border bg-surface">
      {/* Desktop Header (Hidden on Mobile) */}
      <div className="hidden sm:block border-b border-border bg-[linear-gradient(180deg,rgba(247,245,242,0.92),rgba(247,245,242,0.72))] p-6 shrink-0">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
          <div className="max-w-lg">
            <h3 className="font-display text-2xl font-bold text-primary">
              Soul Blueprint
            </h3>
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
            <SecondaryButton onClick={handleCopy} disabled={!snapshot || !activeMarkdown} className="!px-3 !py-2 text-[10px]">
              <Copy className="h-3 w-3" />
              Copy
            </SecondaryButton>
            <PrimaryButton onClick={handleRegenerate} disabled={regenerating} className="!px-3 !py-2 text-[10px]">
              <RefreshCw className={`h-3 w-3 ${regenerating ? 'animate-spin' : ''}`} />
              Refresh
            </PrimaryButton>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="border border-border bg-surface p-3">
            <span className="font-label text-[10px] uppercase tracking-[0.24em] text-secondary block">Generated</span>
            <span className="mt-2 block text-sm text-primary">
              {snapshot ? formatTimestamp(snapshot.generated_at) : 'N/A'}
            </span>
          </div>
          <div className="border border-border bg-surface p-3">
            <span className="font-label text-[10px] uppercase tracking-[0.24em] text-secondary block">Token Estimate</span>
            <span className="mt-2 block text-sm text-primary">{snapshot?.token_estimate ?? 0}</span>
          </div>
          <div className="border border-border bg-surface p-3">
            <span className="font-label text-[10px] uppercase tracking-[0.24em] text-secondary block">
              {searchTerm ? 'Matches' : 'Visible Lines'}
            </span>
            <span className="mt-2 block text-sm text-primary">{searchTerm ? matchCount : lineCount}</span>
          </div>
        </div>
      </div>

      {/* Mobile Compact Header (Hidden on Desktop) */}
      <div className="flex sm:hidden items-center justify-between border-b border-border bg-[linear-gradient(180deg,rgba(247,245,242,0.92),rgba(247,245,242,0.72))] px-4 py-2.5 shrink-0">
        <h3 className="font-serif italic text-xs text-primary font-bold">
          Soul Blueprint
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            disabled={!snapshot || !activeMarkdown}
            className="flex h-7 w-7 items-center justify-center border border-border bg-surface text-primary transition-colors hover:border-primary disabled:opacity-50 cursor-pointer"
            title="Copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex h-7 w-7 items-center justify-center border border-border bg-surface text-primary transition-colors hover:border-primary disabled:opacity-50 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-5">
        <div className="flex h-full min-h-0 flex-col border border-border bg-neutral-bg/40">
          <div className="border-b border-border bg-surface/80 px-2 py-2 sm:px-4 sm:py-3 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sectionKeys.map((section) => {
                const isActive = activeSection === section;
                return (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setActiveSection(section)}
                    className={`shrink-0 border px-2.5 py-1.5 text-[9px] sm:px-3 sm:py-2 sm:text-[10px] font-label uppercase tracking-[0.24em] transition-colors ${
                      isActive
                        ? 'border-primary bg-primary text-on-primary font-bold'
                        : 'border-border bg-surface text-primary hover:border-primary'
                    }`}
                  >
                    {SOUL_BLUEPRINT_SECTION_LABELS[section]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-border bg-surface/80 px-2 py-2 sm:px-4 sm:py-3 shrink-0">
            <div className="flex items-center gap-2 border border-border bg-neutral-bg/40 px-3 py-1.5 sm:py-2 text-secondary">
              <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find in context"
                className="w-full bg-transparent text-xs sm:text-sm text-primary outline-none placeholder:text-secondary"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 p-2 sm:p-4">
            {loading ? (
              <div className="flex h-full items-center justify-center border border-border bg-surface p-8">
                <span className="font-serif italic text-secondary text-sm">Loading snapshot...</span>
              </div>
            ) : !snapshot ? (
              <div className="flex h-full items-center justify-center border border-border bg-surface p-6 text-center">
                <p className="font-serif italic text-secondary text-sm">
                  No operating context has been generated yet.
                </p>
              </div>
            ) : (
              <div className="h-full min-h-0 overflow-y-auto border border-border bg-surface p-3 sm:p-4 font-sans text-xs leading-6 text-primary whitespace-pre-wrap break-words">
                {renderContent()}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
